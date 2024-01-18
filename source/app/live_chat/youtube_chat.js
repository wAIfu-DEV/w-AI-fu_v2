"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveChatYoutube = void 0;
const io_1 = require("../io/io");
const Message_1 = require("../types/Message");
const Result_1 = require("../types/Result");
const Waifu_1 = require("../types/Waifu");
class LiveChatYoutube {
    prioritized_msg_buffer = [];
    msg_buffer = [];
    #chat_id = "";
    #page = "";
    async initialize() {
        this.#chat_id = await this.#getChatID("");
        this.#chatPageToBuffer();
    }
    async free() { }
    async #getChatID(url) {
        const id = url.replace("https://www.youtube.com/watch?v=", "");
        const resp = await fetch("https://www.googleapis.com/youtube/v3/videos", {
            body: JSON.stringify({
                key: Waifu_1.wAIfu.state.auth.youtube.api_key,
                id: id,
                part: "liveStreamingDetails",
            }),
        });
        const json = await resp.json();
        const chat_id = json["items"][0]["liveStreamingDetails"];
        if (chat_id === undefined) {
            io_1.IO.warn("ERROR: Could not get Youtube ChatID from live URL.");
            return "";
        }
        return chat_id;
    }
    async #chatPageToBuffer() {
        let params = {
            key: Waifu_1.wAIfu.state.auth.youtube.api_key,
            liveChatId: this.#chat_id,
            part: "id,snippet,authorDetails",
        };
        if (this.#page !== "")
            params["pageToken"] = this.#page;
        const resp = await fetch("https://www.googleapis.com/youtube/v3/liveChat/messages", {
            body: JSON.stringify(params),
        });
        const json = await resp.json();
        if (json["items"] === undefined) {
            io_1.IO.warn("Failed to get Youtube Chat Page.");
        }
        for (let item of json["items"]) {
            const msg = new Message_1.Message();
            msg.sender = item["authorDetails"]["displayName"];
            msg.content = item["snippet"]["displayMessage"];
            msg.trusted = false;
            this.msg_buffer.push(msg);
        }
        this.#page = json["nextPageToken"];
    }
    #policyLatest() {
        let content = this.msg_buffer.pop();
        if (content === undefined)
            return new Result_1.Result(false, new Message_1.Message(), null);
        this.msg_buffer = [];
        return new Result_1.Result(true, content, null);
    }
    #policyAll() {
        let content = this.msg_buffer.shift();
        if (content === undefined)
            return new Result_1.Result(false, new Message_1.Message(), null);
        return new Result_1.Result(true, content, null);
    }
    #policyLatestBuffered() {
        let content = this.msg_buffer.pop();
        if (content === undefined)
            return new Result_1.Result(false, new Message_1.Message(), null);
        while (this.msg_buffer.length > 4)
            this.msg_buffer.shift();
        return new Result_1.Result(true, content, null);
    }
    nextMessage() {
        switch (Waifu_1.wAIfu.state.config.live_chat.chat_reading_mode.value) {
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
    send(_) { }
}
exports.LiveChatYoutube = LiveChatYoutube;
