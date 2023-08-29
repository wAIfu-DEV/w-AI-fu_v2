"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveChatTwitch = void 0;
const ws_1 = __importDefault(require("ws"));
const Message_1 = require("../types/Message");
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
const Result_1 = require("../types/Result");
class LiveChatTwitch {
    #websocket;
    #buffer = [];
    #prioritized_buffer = [];
    constructor() {
        this.#websocket = new ws_1.default('wss://irc-ws.chat.twitch.tv:443');
    }
    initialize() {
        let promise = new Promise((resolve) => {
            let resolved = false;
            this.#websocket.on('open', () => {
                this.#websocket.send('CAP REQ :twitch.tv/commands twitch.tv/membership twitch.tv/tags');
                this.#websocket.send(`PASS oauth:${Waifu_1.wAIfu.state.auth.twitch.oauth_token}`);
                this.#websocket.send(`NICK ${Waifu_1.wAIfu.state.auth.twitch.channel_name.toLowerCase()}`);
                this.#websocket.send(`JOIN #${Waifu_1.wAIfu.state.auth.twitch.channel_name.toLowerCase()}`);
            });
            this.#websocket.on('error', (data) => {
                let data_str = data.toString('utf8');
                io_1.IO.warn('Twitch API:', data_str);
            });
            this.#websocket.on('message', (data) => {
                if (resolved === false) {
                    resolved = true;
                    resolve();
                }
                let data_str = data.toString('utf8');
                io_1.IO.debug(data_str);
                if (data_str.includes('PING')) {
                    this.#websocket.send('PONG');
                }
                let parsed_data = this.#parseMessage(data_str.trim());
                if (parsed_data === null)
                    return;
                if (parsed_data.prioritized === true) {
                    this.#prioritized_buffer.push(parsed_data.msg);
                }
                else {
                    this.#buffer.push(parsed_data.msg);
                }
            });
        });
        return promise;
    }
    free() {
        return new Promise((resolve) => {
            if (this.#websocket.readyState !== ws_1.default.CLOSED
                && this.#websocket.readyState !== ws_1.default.CLOSING) {
                this.#websocket.close();
            }
            this.#websocket.removeAllListeners();
            resolve();
        });
    }
    nextMessage() {
        switch (Waifu_1.wAIfu.state.config.behaviour.chat_reading_mode.value) {
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
    #policyLatestBuffered() {
        while (true) {
            let content = undefined;
            if (this.#prioritized_buffer.length !== 0) {
                content = this.#prioritized_buffer.shift();
            }
            else {
                if (this.#buffer.length === 0)
                    return new Result_1.Result(false, new Message_1.Message(), null);
                content = this.#buffer.pop();
                while (this.#buffer.length > 4)
                    this.#buffer.shift();
            }
            if (content === undefined)
                continue;
            return new Result_1.Result(true, content.message, null);
        }
    }
    #policyLatest() {
        while (true) {
            let content = undefined;
            if (this.#prioritized_buffer.length !== 0) {
                content = this.#prioritized_buffer.shift();
            }
            else {
                if (this.#buffer.length === 0)
                    return new Result_1.Result(false, new Message_1.Message(), null);
                content = this.#buffer.pop();
                this.#buffer = [];
            }
            if (content === undefined)
                continue;
            return new Result_1.Result(true, content.message, null);
        }
    }
    #policyAll() {
        while (true) {
            let content = undefined;
            if (this.#prioritized_buffer.length !== 0) {
                content = this.#prioritized_buffer.shift();
            }
            else {
                if (this.#buffer.length === 0)
                    return new Result_1.Result(false, new Message_1.Message(), null);
                content = this.#buffer.shift();
            }
            if (content === undefined)
                continue;
            return new Result_1.Result(true, content.message, null);
        }
    }
    #parseMessage(str) {
        let matches = /^(@.*?)(?: :)(.*?)(?:!.*? )(.*?)(?: )(?:#.*? :)(.*)$/g.exec(str);
        if (matches === null)
            return null;
        let type = matches[3];
        if (type !== "PRIVMSG")
            return null;
        let metadata = matches[1];
        let user = matches[2];
        let content = matches[4];
        let prioritized = false;
        let is_highlighted = /msg-id=highlighted-message;/g.test(metadata);
        if (is_highlighted === true
            && Waifu_1.wAIfu.state.config.behaviour.always_read_highlighted.value === true)
            prioritized = true;
        let reg_name_result = /(?:display-name=)(.*?)(?:;)/g.exec(metadata);
        if (reg_name_result !== null)
            user = reg_name_result[1];
        if (Waifu_1.wAIfu.state.config.moderation.blacklisted_chatters.value.indexOf(user.toLowerCase()) !== -1)
            return null;
        if (prioritized === false && is_highlighted === false) {
            let contains_mention = /@\w+/g.test(content);
            if (contains_mention)
                return null;
            let starts_with_comma = /^\,/g.test(content);
            if (starts_with_comma)
                return null;
        }
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
        };
    }
}
exports.LiveChatTwitch = LiveChatTwitch;
