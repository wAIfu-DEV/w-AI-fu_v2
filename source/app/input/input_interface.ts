import { Message } from "../types/Message";
import { Result } from "../types/Result";

export interface InputSystem {
    awaitInput(): Promise<Result<Message,REJECT_REASON>>;
    initialize(): Promise<void>;
    interrupt(): void;
    free(): Promise<void>;
}

export enum REJECT_REASON {
    NONE,
    TIMEOUT,
    INTERRUPT,
}