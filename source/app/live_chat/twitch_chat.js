"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveChatTwitch = void 0;
const ws_1 = __importDefault(require("ws"));
const Message_1 = require("../types/Message");
const Waifu_1 = require("../types/Waifu");
const Result_1 = require("../types/Result");
const io_1 = require("../io/io");
const sanitize_1 = require("../sanitize/sanitize");
const command_handler_1 = require("../commands/command_handler");
const chatter_status_1 = require("../chatter_info/chatter_status");
class LiveChatTwitch {
    #websocket;
    msg_buffer = [];
    prioritized_msg_buffer = [];
    constructor() {
        this.#websocket = new ws_1.default("wss://irc-ws.chat.twitch.tv:443");
    }
    initialize() {
        return new Promise((resolve) => {
            let resolved = false;
            this.#websocket.on("open", () => {
                this.#websocket.send("CAP REQ :twitch.tv/commands twitch.tv/membership twitch.tv/tags");
                this.#websocket.send(`PASS oauth:${Waifu_1.wAIfu.state.auth.twitch.oauth_token}`);
                this.#websocket.send(`NICK ${Waifu_1.wAIfu.state.auth.twitch.channel_name.toLowerCase()}`);
                this.#websocket.send(`JOIN #${Waifu_1.wAIfu.state.auth.twitch.channel_name.toLowerCase()}`);
            });
            this.#websocket.on("error", (data) => {
                let data_str = data.toString("utf8");
                io_1.IO.warn("Twitch:", data_str);
            });
            this.#websocket.on("message", (data) => {
                if (resolved === false) {
                    resolved = true;
                    io_1.IO.debug("Loaded LiveChatTwitch.");
                    resolve();
                }
                let data_str = data.toString("utf8");
                io_1.IO.quietPrint(data_str);
                if (data_str.includes("PING")) {
                    this.#websocket.send("PONG");
                    return;
                }
                let parsed_data = this.#parseMessage(data_str.trim());
                if (parsed_data === null)
                    return;
                if (parsed_data.message.content.startsWith("!")) {
                    let handled = false;
                    for (let plugin of Waifu_1.wAIfu.plugins) {
                        handled = plugin.onCommandHandling(parsed_data.message.content, false, parsed_data.message.sender);
                        if (handled)
                            return;
                    }
                    (0, command_handler_1.handleCommand)(parsed_data.message.content, false);
                    return;
                }
                if (parsed_data.prioritized === true) {
                    this.prioritized_msg_buffer.push(parsed_data.message);
                }
                else {
                    this.msg_buffer.push(parsed_data.message);
                }
            });
        });
    }
    free() {
        return new Promise((resolve) => {
            if (this.#websocket.readyState !== ws_1.default.CLOSED &&
                this.#websocket.readyState !== ws_1.default.CLOSING) {
                this.#websocket.close();
            }
            this.#websocket.removeAllListeners();
            resolve();
        });
    }
    send(message) {
        this.#websocket.send(`PRIVMSG #${Waifu_1.wAIfu
            .state.auth.twitch.channel_name.trim()
            .toLowerCase()} :${message}`);
    }
    nextMessage() {
        switch (Waifu_1.wAIfu.state.config.live_chat.chat_reading_mode.value) {
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
    #policyLatestBuffered() {
        let BUFF_SIZE = Waifu_1.wAIfu.state.config.live_chat.message_buffer_size.value;
        while (true) {
            let message = undefined;
            if (this.prioritized_msg_buffer.length !== 0) {
                message = this.prioritized_msg_buffer.shift();
            }
            else {
                if (this.msg_buffer.length === 0)
                    return new Result_1.Result(false, new Message_1.Message(), null);
                while (this.msg_buffer.length > BUFF_SIZE)
                    this.msg_buffer.shift();
                message = this.msg_buffer.pop();
            }
            if (message === undefined)
                continue;
            return new Result_1.Result(true, message, null);
        }
    }
    #policyLatest() {
        while (true) {
            let message = undefined;
            if (this.prioritized_msg_buffer.length !== 0) {
                message = this.prioritized_msg_buffer.shift();
            }
            else {
                if (this.msg_buffer.length === 0)
                    return new Result_1.Result(false, new Message_1.Message(), null);
                message = this.msg_buffer.pop();
                this.msg_buffer = [];
            }
            if (message === undefined)
                continue;
            return new Result_1.Result(true, message, null);
        }
    }
    #policyAll() {
        while (true) {
            let message = undefined;
            if (this.prioritized_msg_buffer.length !== 0) {
                message = this.prioritized_msg_buffer.shift();
            }
            else {
                if (this.msg_buffer.length === 0)
                    return new Result_1.Result(false, new Message_1.Message(), null);
                message = this.msg_buffer.shift();
            }
            if (message === undefined)
                continue;
            return new Result_1.Result(true, message, null);
        }
    }
    #policyWeightedBuffered() {
        let BUFF_SIZE = Waifu_1.wAIfu.state.config.live_chat.message_buffer_size.value;
        while (true) {
            let message = undefined;
            if (this.prioritized_msg_buffer.length !== 0) {
                message = this.prioritized_msg_buffer.shift();
            }
            else {
                if (this.msg_buffer.length === 0)
                    return new Result_1.Result(false, new Message_1.Message(), null);
                while (this.msg_buffer.length > BUFF_SIZE)
                    this.msg_buffer.shift();
                message = this.#pickMessageFromWeight();
            }
            if (message === undefined)
                continue;
            return new Result_1.Result(true, message, null);
        }
    }
    #getWeight(msg) {
        const PRIO_RETURNING = Waifu_1.wAIfu.state.config.live_chat.prioritize_returning_viewers_message
            .value;
        let lower_msg = msg.content.toLowerCase();
        let weight = 0;
        let words = [];
        const split_msg = lower_msg.split(" ");
        let total_length = split_msg.length;
        for (let i = total_length; i--;) {
            let word = split_msg[i];
            if (!words.includes(word)) {
                words.push(word);
            }
        }
        io_1.IO.print("msg:", msg.content);
        if (total_length < 5) {
            io_1.IO.print("short");
            weight += -0.25;
        }
        if (total_length < 2) {
            io_1.IO.print("too short");
            weight += -0.5;
        }
        if (total_length > 35) {
            io_1.IO.print("long");
            weight += -0.25;
        }
        if (total_length > 50) {
            io_1.IO.print("too long");
            weight += -0.5;
        }
        let is_repetition = words.length < total_length * 0.5;
        if (is_repetition && total_length > 3) {
            io_1.IO.print("repetition");
            weight += -1.5;
        }
        if (PRIO_RETURNING && chatter_status_1.ChatterInfos.isJustReturningChatter(msg.sender)) {
            io_1.IO.print("first message");
            weight += 0.4;
        }
        if (msg.content.includes("?")) {
            io_1.IO.print("question");
            weight += 0.15;
        }
        io_1.IO.print("weight:", weight);
        return weight;
    }
    #pickMessageFromWeight() {
        let weights = [];
        for (let i = this.msg_buffer.length; i--;) {
            weights.push([i, this.#getWeight(this.msg_buffer[i])]);
        }
        weights.sort((a, b) => b[1] - a[1]);
        let idx = weights[0][0];
        let msg = structuredClone(this.msg_buffer[idx]);
        this.msg_buffer.splice(idx, 1);
        return msg;
    }
    #parseMetadata(metadata) {
        if (typeof metadata !== "string" || metadata === "")
            return {};
        let result = {};
        const entries = metadata.split(";");
        for (let entry of entries) {
            const split_entry = entry.split("=").filter((v) => v !== undefined);
            if (split_entry.length > 2 || split_entry.length <= 1)
                continue;
            result[split_entry[0]] = split_entry[1];
        }
        return result;
    }
    #parseMessage(str) {
        let matches = /^(@.*?)(?: :)(.*?)(?:!.*? )(.*?)(?: )(?:#.*? :)(.*)$/g.exec(str);
        if (matches === null)
            return null;
        let type = matches[3];
        if (type !== "PRIVMSG")
            return null;
        let metadata = this.#parseMetadata(matches[1]);
        let user = matches[2];
        let content = matches[4];
        let prioritized = false;
        if (/Cheer[0-9]+/g.test(content))
            return null;
        let chat_cfg = Waifu_1.wAIfu.state.config.live_chat;
        let mod_cfg = Waifu_1.wAIfu.state.config.moderation;
        let is_highlighted = metadata["msg-id"] === "highlighted-message";
        if (is_highlighted === true &&
            chat_cfg.always_read_highlighted.value === true)
            prioritized = true;
        let is_first_message = metadata["first-msg"] !== "0";
        if (is_first_message &&
            chat_cfg.prioritize_first_messages.value === true)
            prioritized = true;
        let display_name = metadata["display-name"];
        if (display_name !== undefined)
            user = display_name;
        if (user === "RestreamBot") {
            let restream_matches = /\[\w+?: ([^]+)\] ([^]+)/g.exec(content);
            if (restream_matches === null)
                return null;
            user = restream_matches[1];
            content = restream_matches[2];
        }
        if (content.startsWith("ACTION")) {
            content = content.replaceAll("", "");
            content = content.replace("ACTION", user);
        }
        if (mod_cfg.blacklisted_chatters.value.includes(user.toLowerCase()))
            return null;
        if (prioritized === false && is_highlighted === false) {
            let contains_mention = /@\w+/g.test(content);
            if (contains_mention)
                return null;
            let starts_with_comma = /^\,/g.test(content);
            if (starts_with_comma)
                return null;
        }
        if (mod_cfg.remove_non_ascii_from_chat.value === true)
            content = (0, sanitize_1.removeNonAsciiSymbols)(content);
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
exports.LiveChatTwitch = LiveChatTwitch;
