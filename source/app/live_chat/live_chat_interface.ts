import { Message } from "../types/Message";
import { Result } from "../types/Result";

export interface ILiveChat {
    msg_buffer: Message[];
    prioritized_msg_buffer: Message[];

    initialize(): Promise<void>;
    free(): Promise<void>;
    nextMessage(): Result<Message, null>;
    send(message: string): void;
}
