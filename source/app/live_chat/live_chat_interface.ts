import { Message } from "../types/Message";
import { Result } from "../types/Result";

export interface LiveChat {
    initialize(): Promise<void>;
    free(): Promise<void>;
    nextMessage(): Result<Message, null>;
    send(message: string): void;
}
