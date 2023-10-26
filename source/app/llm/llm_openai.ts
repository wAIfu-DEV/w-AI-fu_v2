import { Character } from "../characters/character";
import { Result } from "../types/Result";
import { wAIfu } from "../types/Waifu";
import {
    LLM_GEN_ERRORS,
    LargeLanguageModel,
    LlmGenerationSettings,
} from "./llm_interface";
import { OpenAI } from "openai";
import { IO } from "../io/io";
import { getCurrentCharacter } from "../characters/characters";

type GPTChatEntry = {
    role: "function" | "system" | "user" | "assistant";
    content: string;
};

const GENERATION_TIMEOUT_MS = 10_000 as const;

export class LargeLanguageModelOpenAI implements LargeLanguageModel {
    #openai_api: OpenAI;

    constructor() {
        this.#openai_api = new OpenAI({
            apiKey: wAIfu.state!.auth.openai.token,
        });
    }

    async initialize(): Promise<void> {
        IO.debug("Loaded LargeLanguageModelOpenAI.");
        return;
    }

    async free(): Promise<void> {
        return;
    }

    async generate(
        prompt: string,
        settings: LlmGenerationSettings
    ): Promise<Result<string, LLM_GEN_ERRORS>> {
        return new Promise(async (resolve) => {
            let is_resolved = false;

            const parsed_prompt = this.#parsePrompt(prompt);

            if (parsed_prompt === null) {
                is_resolved = true;
                resolve(
                    new Result(
                        false,
                        "Could not continue generation due to being enable to parse prompt.",
                        LLM_GEN_ERRORS.INCORRECT_PROMPT
                    )
                );
                return;
            }

            const timeout = () => {
                if (is_resolved) return;
                is_resolved = true;
                resolve(
                    new Result(
                        false,
                        "Timed out while waiting for LLM response.",
                        LLM_GEN_ERRORS.RESPONSE_TIMEOUT
                    )
                );
                return;
            };
            setTimeout(timeout, GENERATION_TIMEOUT_MS);

            let custom_model =
                wAIfu.state!.config.large_language_model[
                    "fine-tuned_gpt3.5_model_name"
                ].value;

            let model =
                custom_model === "" || settings.use_base_model === true
                    ? wAIfu.state!.config.large_language_model.openai_model
                          .value
                    : custom_model;

            let result: OpenAI.Chat.Completions.ChatCompletion;
            try {
                result = await this.#openai_api.chat.completions.create({
                    messages: parsed_prompt,
                    model: model,
                    temperature: settings.temperature,
                    max_tokens: settings.max_output_length,
                    stop: ["\n", "\r"],
                });
            } catch (e: any) {
                if (is_resolved) return;
                is_resolved = true;
                if (e["status"] === 401) {
                    resolve(
                        new Result(
                            false,
                            "OpenAI API Token is either missing or is incorrect.",
                            LLM_GEN_ERRORS.WRONG_AUTH
                        )
                    );
                    return;
                }
                resolve(
                    new Result(
                        false,
                        e["error"]["message"],
                        LLM_GEN_ERRORS.UNDEFINED
                    )
                );
                return;
            }

            if (is_resolved) return;

            let result_text = result.choices[0]!.message.content!;
            let regex_result = /^(?:.*?:)(.*)$/g.exec(result_text);
            let final_result = "";

            if (regex_result === null) {
                final_result = result_text;
            } else {
                if (regex_result[1] === undefined) {
                    is_resolved = true;
                    resolve(
                        new Result(
                            false,
                            "Response format did not pass sanity test.",
                            LLM_GEN_ERRORS.RESPONSE_FAILURE
                        )
                    );
                    return;
                }

                final_result = regex_result[1]!.toString();
            }

            if (!final_result.endsWith("\n")) final_result += "\n";

            is_resolved = true;
            resolve(new Result(true, final_result, LLM_GEN_ERRORS.NONE));
            return;
        });
    }

    #parsePrompt(unparsed_prompt: string): GPTChatEntry[] | null {
        const character: Character = getCurrentCharacter();
        //const lines = String(unparsed_prompt).split(/\r\n|\n/g, undefined);

        let msg_array: GPTChatEntry[] = [];

        // This may seem like it could lead to prompt injection as system,
        // But these characters SHOULD have been removed from memory using
        // `removeNovelAIspecialSymbols()` in the main loop.
        let matches = unparsed_prompt.matchAll(
            /(----[^]*?\*\*\*)|(\[ [^]*? \])|({ [^]*? })|(.*?)(?:\n|$)/g
        );

        for (let match of matches) {
            let content = match[0].trim();
            if (content === null) continue;
            if (content === "") continue;
            if (content.startsWith("----") === true) {
                msg_array.push({
                    role: "system" as const,
                    content: content.replaceAll(
                        /----\n|----|\*\*\*\n|\*\*\*/g,
                        ""
                    ),
                });
                continue;
            }
            if (content.startsWith("{ ") === true) {
                msg_array.push({
                    role: "system" as const,
                    content: content.replaceAll(/{ | }/g, ""),
                });
                continue;
            }
            if (content.startsWith("[ ") === true) {
                msg_array.push({
                    role: "system" as const,
                    content: content.replaceAll(/\[ | \]/g, ""),
                });
                continue;
            }
            if (content.includes(":") === true) {
                let split_line = content.split(":");
                msg_array.push({
                    role:
                        split_line[0] === character.char_name
                            ? ("assistant" as const)
                            : ("user" as const),
                    content: content,
                });
                continue;
            }
            IO.warn('Could not parse line "' + content + '"');
            return null;
        }
        msg_array.pop(); // removes added `NAME:` at end of file for support with all llms, not needed here
        return msg_array;
    }
}
