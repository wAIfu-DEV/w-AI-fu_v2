import { Result } from "../types/Result";

export interface ITextToSpeech {
    skip: boolean;
    initialize(): Promise<void>;
    free(): Promise<void>;
    generateSpeech(
        text: string,
        options: TtsGenerationSettings
    ): Promise<Result<string, TTS_GEN_ERROR>>;
    playSpeech(
        id: string,
        options: TtsPlaySettings
    ): Promise<Result<void, TTS_PLAY_ERROR>>;
    interrupt(): void;
}

export enum TTS_GEN_ERROR {
    NONE = "NONE",
    WRONG_AUTH = "WRONG_AUTH",
    RESPONSE_FAILURE = "RESPONSE_FAILURE",
    RESPONSE_TIMEOUT = "RESPONSE_TIMEOUT",
}

export enum TTS_PLAY_ERROR {
    NONE = "NONE",
}

export class TtsGenerationSettings {
    voice: string = "galette";
    is_narrator: boolean = false;
}

export class TtsPlaySettings {
    device: number = 6;
    volume_modifier: number = 10;
}
