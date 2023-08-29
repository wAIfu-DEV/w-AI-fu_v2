import WebSocket from "ws";
import { Message } from "../types/Message";
import { LiveChat } from "./live_chat_interface";
import { wAIfu } from "../types/Waifu";
import { IO } from "../io/io";
import { Result } from "../types/Result";

export class LiveChatTwitch implements LiveChat {

    #websocket: WebSocket;
    #buffer: {message: Message, metadata: string}[] = [];
    #prioritized_buffer: {message: Message, metadata: string}[] = [];

    constructor() {
        this.#websocket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    }

    initialize(): Promise<void> {
        let promise = new Promise<void>((resolve) => {
            let resolved = false;
            this.#websocket.on('open', () => {
                this.#websocket.send('CAP REQ :twitch.tv/commands twitch.tv/membership twitch.tv/tags');
                this.#websocket.send(`PASS oauth:${wAIfu.state.auth.twitch.oauth_token}`);
                this.#websocket.send(`NICK ${wAIfu.state.auth.twitch.channel_name.toLowerCase()}`);
                this.#websocket.send(`JOIN #${wAIfu.state.auth.twitch.channel_name.toLowerCase()}`);
            });
            this.#websocket.on('error', (data: WebSocket.RawData) => {
                let data_str = data.toString('utf8');
                IO.warn('Twitch API:', data_str);
            });
            this.#websocket.on('message', (data: WebSocket.RawData) => {
                if (resolved === false) {
                    resolved = true;
                    resolve();
                }
                let data_str = data.toString('utf8');
                IO.debug(data_str);
                if (data_str.includes('PING')) {
                    this.#websocket.send('PONG');
                }
                let parsed_data = this.#parseMessage(data_str.trim());
                if (parsed_data === null) return;
                if (parsed_data.prioritized === true) {
                    this.#prioritized_buffer.push(parsed_data.msg);
                } else {
                    this.#buffer.push(parsed_data.msg);
                }
            });
        });
        return promise;
    }
    
    free(): Promise<void> {
        return new Promise((resolve) => {
            if (this.#websocket.readyState !== WebSocket.CLOSED
            &&  this.#websocket.readyState !== WebSocket.CLOSING)
            {
                this.#websocket.close();
            }
            this.#websocket.removeAllListeners();
            resolve();
        });
    }

    nextMessage(): Result<Message,null> {
        switch (wAIfu.state.config.behaviour.chat_reading_mode.value) {
            case "latest":
                return this.#policyLatest();
            case "all":
                return this.#policyAll();
            case "latest-buffered":
                return this.#policyLatestBuffered();
            default:
                return this.#policyLatestBuffered();
        }
    }

    #policyLatestBuffered(): Result<Message,null> {
        while (true) {
            let content: {message: Message, metadata: string}|undefined = undefined;
            if (this.#prioritized_buffer.length !== 0) {
                content = this.#prioritized_buffer.shift();
            } else {
                if (this.#buffer.length === 0)
                    return new Result(false, new Message(), null);
                content = this.#buffer.pop();
                // Limit buffer size to ~5 so that old messages get cleaned
                while (this.#buffer.length > 4)
                    this.#buffer.shift();
            }
            if (content === undefined) continue;
            return new Result(true, content.message, null);
        }
    }

    #policyLatest(): Result<Message,null> {
        while (true) {
            let content: {message: Message, metadata: string}|undefined = undefined;
            if (this.#prioritized_buffer.length !== 0) {
                content = this.#prioritized_buffer.shift();
            } else {
                if (this.#buffer.length === 0)
                    return new Result(false, new Message(), null);
                content = this.#buffer.pop();
                this.#buffer = [];
            }
            if (content === undefined) continue;
            return new Result(true, content.message, null);
        }
    }

    #policyAll(): Result<Message,null> {
        while (true) {
            let content: {message: Message, metadata: string}|undefined = undefined;
            if (this.#prioritized_buffer.length !== 0) {
                content = this.#prioritized_buffer.shift();
            } else {
                if (this.#buffer.length === 0)
                    return new Result(false, new Message(), null);
                content = this.#buffer.shift();
            }
            if (content === undefined) continue;
            return new Result(true, content.message, null);
        }
    }

    #parseMessage(str: string): { msg: { message: Message, metadata: string }, prioritized: boolean }|null {
        let matches = /^(@.*?)(?: :)(.*?)(?:!.*? )(.*?)(?: )(?:#.*? :)(.*)$/g.exec(str);
        if (matches === null) return null;
        let type = matches[3];
        if (type !== "PRIVMSG") return null;
        let metadata = matches[1]!;
        let user = matches[2]!;
        let content = matches[4]!;
        let prioritized = false;

        let is_highlighted = /msg-id=highlighted-message;/g.test(metadata);
        if (is_highlighted === true
        && wAIfu.state.config.behaviour.always_read_highlighted.value === true)
            prioritized = true;

        // Fetch displayed user name from metadata
        let reg_name_result = /(?:display-name=)(.*?)(?:;)/g.exec(metadata);
        if (reg_name_result !== null)
            user = reg_name_result[1]!;

        // If is in blacklist, skip
        if (wAIfu.state.config.moderation.blacklisted_chatters.value.indexOf(user.toLowerCase()) !== -1)
            return null
        
        if (prioritized === false && is_highlighted === false) {
            // If message contains a mention, skip
            let contains_mention = /@\w+/g.test(content);
            if (contains_mention) return null;

            // If starts with ',' skip
            let starts_with_comma = /^\,/g.test(content);
            if (starts_with_comma) return null;
        }

        // Basic sanitization
        // Not really required since the UI makes use of .textContent and
        // never directly includes HTML, but I am not a security expert so
        // better be safe than sorry.
        content = content.replaceAll(/[^a-zA-Z0-9 \.\,\?\!\+\-\%\*\=\/\_\:\;\$\€\@\<\>\(\)]/g, '');

        return {
            msg: {
                message: {
                    sender: user,
                    content: content,
                    trusted: false
                },
                metadata: metadata
            },
            prioritized: prioritized
        }
    }
}