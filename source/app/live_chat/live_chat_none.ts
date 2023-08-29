import { Message } from "../types/Message";
import { Result } from "../types/Result";
import { LiveChat } from "./live_chat_interface";

export class LiveChatNone implements LiveChat {
    async initialize(): Promise<void> {}
    async free(): Promise<void> {}
    nextMessage(): Result<Message, null> {
        return new Result(false,new Message(),null);
    }
}