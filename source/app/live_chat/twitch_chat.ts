import WebSocket from "ws";
import { Message } from "../types/Message";
import { ILiveChat } from "./live_chat_interface";
import { wAIfu } from "../types/Waifu";
import { Result } from "../types/Result";
import { IO } from "../io/io";
import { removeNonAsciiSymbols } from "../sanitize/sanitize";
import { handleCommand } from "../commands/command_handler";
import { ChatterInfos } from "../chatter_info/chatter_status";

export class LiveChatTwitch implements ILiveChat {
    #websocket: WebSocket;

    msg_buffer: Message[] = [];
    prioritized_msg_buffer: Message[] = [];

    constructor() {
        this.#websocket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
    }

    initialize(): Promise<void> {
        return new Promise<void>((resolve) => {
            let resolved = false;
            this.#websocket.on("open", () => {
                this.#websocket.send(
                    "CAP REQ :twitch.tv/commands twitch.tv/membership twitch.tv/tags"
                );
                this.#websocket.send(
                    `PASS oauth:${wAIfu.state!.auth.twitch.oauth_token}`
                );
                this.#websocket.send(
                    `NICK ${wAIfu.state!.auth.twitch.channel_name.toLowerCase()}`
                );
                this.#websocket.send(
                    `JOIN #${wAIfu.state!.auth.twitch.channel_name.toLowerCase()}`
                );
            });
            this.#websocket.on("error", (data: WebSocket.RawData) => {
                let data_str = data.toString("utf8");
                IO.warn("Twitch:", data_str);
            });

            this.#websocket.on("message", (data: WebSocket.RawData) => {
                if (resolved === false) {
                    resolved = true;
                    IO.debug("Loaded LiveChatTwitch.");
                    resolve();
                }

                let data_str = data.toString("utf8");
                IO.quietPrint(data_str);

                if (data_str.includes("PING")) {
                    this.#websocket.send("PONG");
                    return;
                }
                let parsed_data = this.#parseMessage(data_str.trim());
                if (parsed_data === null) return;

                if (parsed_data.message.content.startsWith("!")) {
                    let handled = false;

                    for (let plugin of wAIfu.plugins) {
                        handled = plugin.onCommandHandling(
                            parsed_data.message.content,
                            false,
                            parsed_data.message.sender
                        );
                        if (handled) return;
                    }

                    handleCommand(parsed_data.message.content, false);
                    return;
                }

                if (parsed_data.prioritized === true) {
                    this.prioritized_msg_buffer.push(parsed_data.message);
                } else {
                    this.msg_buffer.push(parsed_data.message);
                }
            });
        });
    }

    free(): Promise<void> {
        return new Promise((resolve) => {
            if (
                this.#websocket.readyState !== WebSocket.CLOSED &&
                this.#websocket.readyState !== WebSocket.CLOSING
            ) {
                this.#websocket.close();
            }
            this.#websocket.removeAllListeners();
            resolve();
        });
    }

    send(message: string): void {
        this.#websocket.send(
            `PRIVMSG #${wAIfu
                .state!.auth.twitch.channel_name.trim()
                .toLowerCase()} :${message}`
        );
    }

    nextMessage(): Result<Message, null> {
        switch (wAIfu.state!.config.live_chat.chat_reading_mode.value) {
            case "latest":
                return this.#policyLatest();
            case "all":
                return this.#policyAll();
            case "latest-buffered":
                return this.#policyLatestBuffered();
            case "weighted-buffered":
                return this.#policyWeightedBuffered();
            default:
                return this.#policyLatestBuffered();
        }
    }

    #policyLatestBuffered(): Result<Message, null> {
        let BUFF_SIZE = wAIfu.state!.config.live_chat.message_buffer_size.value;
        while (true) {
            let message: Message | undefined = undefined;
            if (this.prioritized_msg_buffer.length !== 0) {
                message = this.prioritized_msg_buffer.shift();
            } else {
                if (this.msg_buffer.length === 0)
                    return new Result(false, new Message(), null);
                // Clear old buffer entries
                while (this.msg_buffer.length > BUFF_SIZE)
                    this.msg_buffer.shift();
                message = this.msg_buffer.pop();
            }
            if (message === undefined) continue;
            return new Result(true, message, null);
        }
    }

    #policyLatest(): Result<Message, null> {
        while (true) {
            let message: Message | undefined = undefined;
            if (this.prioritized_msg_buffer.length !== 0) {
                message = this.prioritized_msg_buffer.shift();
            } else {
                if (this.msg_buffer.length === 0)
                    return new Result(false, new Message(), null);
                message = this.msg_buffer.pop();
                this.msg_buffer = [];
            }
            if (message === undefined) continue;
            return new Result(true, message, null);
        }
    }

    #policyAll(): Result<Message, null> {
        while (true) {
            let message: Message | undefined = undefined;
            if (this.prioritized_msg_buffer.length !== 0) {
                message = this.prioritized_msg_buffer.shift();
            } else {
                if (this.msg_buffer.length === 0)
                    return new Result(false, new Message(), null);
                message = this.msg_buffer.shift();
            }
            if (message === undefined) continue;
            return new Result(true, message, null);
        }
    }

    #policyWeightedBuffered(): Result<Message, null> {
        let BUFF_SIZE = wAIfu.state!.config.live_chat.message_buffer_size.value;
        while (true) {
            let message: Message | undefined = undefined;
            if (this.prioritized_msg_buffer.length !== 0) {
                message = this.prioritized_msg_buffer.shift();
            } else {
                if (this.msg_buffer.length === 0)
                    return new Result(false, new Message(), null);
                // Clear old buffer entries
                while (this.msg_buffer.length > BUFF_SIZE)
                    this.msg_buffer.shift();
                message = this.#pickMessageFromWeight();
            }
            if (message === undefined) continue;
            return new Result(true, message, null);
        }
    }

    #getWeight(msg: Message): number {
        const enum PENALTY {
            TOO_SHORT = -0.5,
            SHORT = -0.25,
            LONG = -0.25,
            TOO_LONG = -0.5,
            REPETITION = -1.5,
            FIRST_MESSAGE = 0.4,
            IS_QUESTION = 0.15,
        }

        const PRIO_RETURNING =
            wAIfu.state!.config.live_chat.prioritize_returning_viewers_message
                .value;

        let lower_msg = msg.content.toLowerCase();
        let weight = 0;

        // NOTE: I could be using maps for the words/chars instead of arrays,
        // but considering the relatively small size of twitch chat messages
        // using maps would be actually slower.

        let words: string[] = [];
        const split_msg = lower_msg.split(" ");
        let total_length = split_msg.length;

        for (let i = total_length; i--; ) {
            let word = split_msg[i]!;
            if (!words.includes(word)) {
                words.push(word);
            }
        }

        IO.print("msg:", msg.content);

        if (total_length < 5) {
            IO.print("short");
            weight += PENALTY.SHORT;
        }
        if (total_length < 2) {
            IO.print("too short");
            weight += PENALTY.TOO_SHORT;
        }
        if (total_length > 35) {
            IO.print("long");
            weight += PENALTY.LONG;
        }
        if (total_length > 50) {
            IO.print("too long");
            weight += PENALTY.TOO_LONG;
        }
        let is_repetition = words.length < total_length * 0.5;
        if (is_repetition && total_length > 3) {
            IO.print("repetition");
            weight += PENALTY.REPETITION;
        }
        if (PRIO_RETURNING && ChatterInfos.isJustReturningChatter(msg.sender)) {
            IO.print("first message");
            weight += PENALTY.FIRST_MESSAGE;
        }
        if (msg.content.includes("?")) {
            IO.print("question");
            weight += PENALTY.IS_QUESTION;
        }

        IO.print("weight:", weight);

        return weight;
    }

    #pickMessageFromWeight(): Message {
        type IndexedWeight = [msg_idx: number, weight: number];

        let weights: IndexedWeight[] = [];

        for (let i = this.msg_buffer.length; i--; ) {
            weights.push([i, this.#getWeight(this.msg_buffer[i]!)]);
        }

        weights.sort((a: IndexedWeight, b: IndexedWeight) => b[1] - a[1]);

        let idx = weights[0]![0];
        let msg = structuredClone(this.msg_buffer[idx]!);
        this.msg_buffer.splice(idx, 1);
        return msg;
    }

    #parseMetadata(metadata: string): Record<string, string> {
        if (typeof metadata !== "string" || metadata === "") return {};

        let result: Record<string, string> = {};
        const entries = metadata.split(";");

        for (let entry of entries) {
            const split_entry = entry.split("=").filter((v) => v !== undefined);
            if (split_entry.length > 2 || split_entry.length <= 1) continue;
            result[split_entry[0]!] = split_entry[1]!;
        }
        return result;
    }

    #parseMessage(str: string): {
        message: Message;
        prioritized: boolean;
    } | null {
        let matches =
            /^(@.*?)(?: :)(.*?)(?:!.*? )(.*?)(?: )(?:#.*? :)(.*)$/g.exec(str);
        if (matches === null) return null;
        let type = matches[3];
        if (type !== "PRIVMSG") return null;
        let metadata: Record<string, string> = this.#parseMetadata(matches[1]!);
        let user = matches[2]!;
        let content = matches[4]!;
        let prioritized = false;

        if (/Cheer[0-9]+/g.test(content)) return null;

        let chat_cfg = wAIfu.state!.config.live_chat;
        let mod_cfg = wAIfu.state!.config.moderation;

        let is_highlighted = metadata["msg-id"] === "highlighted-message";
        if (
            is_highlighted === true &&
            chat_cfg.always_read_highlighted.value === true
        )
            prioritized = true;

        let is_first_message = metadata["first-msg"] !== "0";
        if (
            is_first_message &&
            chat_cfg.prioritize_first_messages.value === true
        )
            prioritized = true;

        // Fetch displayed user name from metadata
        let display_name = metadata["display-name"];
        if (display_name !== undefined) user = display_name;

        if (user === "RestreamBot") {
            let restream_matches = /\[\w+?: ([^]+)\] ([^]+)/g.exec(content);
            if (restream_matches === null) return null;
            user = restream_matches[1]!;
            content = restream_matches[2]!;
        }

        if (content.startsWith("ACTION")) {
            content = content.replaceAll("", "");
            content = content.replace("ACTION", user);
        }

        // If is in blacklist, skip
        if (mod_cfg.blacklisted_chatters.value.includes(user.toLowerCase()))
            return null;

        if (prioritized === false && is_highlighted === false) {
            // If message contains a mention, skip
            let contains_mention = /@\w+/g.test(content);
            if (contains_mention) return null;

            // If starts with ',' skip
            let starts_with_comma = /^\,/g.test(content);
            if (starts_with_comma) return null;
        }

        // Basic sanitization to prevent bypass of bad words filter
        if (mod_cfg.remove_non_ascii_from_chat.value === true)
            content = removeNonAsciiSymbols(content);

        return {
            message: {
                sender: user,
                content: content,
                trusted: false,
            },
            prioritized: prioritized,
        };
    }
}
