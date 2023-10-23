import { Result } from "../types/Result";

export interface LargeLanguageModel {
    initialize(): Promise<void>;
    free(): Promise<void>;
    generate(
        prompt: string,
        settings: LlmGenerationSettings
    ): Promise<Result<string, LLM_GEN_ERRORS>>;
}

export enum LLM_GEN_ERRORS {
    NONE = "NONE",
    WRONG_AUTH = "WRONG_AUTH",
    UNDEFINED = "UNDEFINED",
    INCORRECT_PROMPT = "INCORRECT_PROMPT",
    RESPONSE_FAILURE = "RESPONSE_FAILURE",
    RESPONSE_TIMEOUT = "RESPONSE_TIMEOUT",
}

export class LlmGenerationSettings {
    temperature: number = 1;
    repetition_penalty: number = 2;
    max_output_length: number = 80;
    length_penalty: number = -0.25;
}
