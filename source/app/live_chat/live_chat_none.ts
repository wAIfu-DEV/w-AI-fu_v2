import { Message } from "../types/Message";
import { Result } from "../types/Result";
import { ILiveChat } from "./live_chat_interface";

export class LiveChatNone implements ILiveChat {
    msg_buffer: Message[] = [];
    prioritized_msg_buffer: Message[] = [];

    async initialize(): Promise<void> {}
    async free(): Promise<void> {}
    nextMessage(): Result<Message, null> {
        return new Result(false, new Message(), null);
    }
    send(_: string): void {}
}
