import { IO } from "../io/io";
import { Message } from "../types/Message";
import { Result } from "../types/Result";
import { wAIfu } from "../types/Waifu";
import { ILiveChat } from "./live_chat_interface";

export class LiveChatYoutube implements ILiveChat {
    prioritized_msg_buffer: Message[] = [];
    msg_buffer: Message[] = [];

    #chat_id: string = "";
    #page: string = "";

    async initialize(): Promise<void> {
        this.#chat_id = await this.#getChatID("");
        this.#chatPageToBuffer();
    }

    async free(): Promise<void> {}

    async #getChatID(url: string): Promise<string> {
        const id = url.replace("https://www.youtube.com/watch?v=", "");

        const resp = await fetch(
            "https://www.googleapis.com/youtube/v3/videos",
            {
                body: JSON.stringify({
                    key: wAIfu.state!.auth.youtube.api_key,
                    id: id,
                    part: "liveStreamingDetails",
                }),
            }
        );

        const json = await resp.json();
        const chat_id = json["items"][0]["liveStreamingDetails"];
        if (chat_id === undefined) {
            IO.warn("ERROR: Could not get Youtube ChatID from live URL.");
            return "";
        }
        return chat_id;
    }

    async #chatPageToBuffer(): Promise<void> {
        let params: any = {
            key: wAIfu.state!.auth.youtube.api_key,
            liveChatId: this.#chat_id,
            part: "id,snippet,authorDetails",
        };

        if (this.#page !== "") params["pageToken"] = this.#page;

        const resp = await fetch(
            "https://www.googleapis.com/youtube/v3/liveChat/messages",
            {
                body: JSON.stringify(params),
            }
        );

        const json = await resp.json();

        if (json["items"] === undefined) {
            IO.warn("Failed to get Youtube Chat Page.");
        }

        for (let item of json["items"]) {
            const msg = new Message();
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
            return new Result(false, new Message(), null);
        this.msg_buffer = [];
        return new Result(true, content, null);
    }

    #policyAll() {
        let content = this.msg_buffer.shift();
        if (content === undefined)
            return new Result(false, new Message(), null);
        return new Result(true, content, null);
    }

    #policyLatestBuffered() {
        let content = this.msg_buffer.pop();
        if (content === undefined)
            return new Result(false, new Message(), null);
        while (this.msg_buffer.length > 4) this.msg_buffer.shift();
        return new Result(true, content, null);
    }

    nextMessage(): Result<Message, null> {
        switch (wAIfu.state!.config.live_chat.chat_reading_mode.value) {
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

    send(_: string): void {}
}
