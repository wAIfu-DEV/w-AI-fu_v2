import { Character } from "../characters/character";
import { IO } from "../io/io";
import { Result } from "../types/Result";
import { wAIfu } from "../types/Waifu";
import { LLM_GEN_ERRORS, LargeLanguageModel, LlmGenerationSettings } from "./llm_interface";
import { OpenAI } from "openai";

export class LargeLanguageModelOpenAI implements LargeLanguageModel {

    #openai_api: OpenAI;

    constructor() {
        this.#openai_api = new OpenAI({
            apiKey: wAIfu.state.auth.openai.token,
        });
    }

    async initialize(): Promise<void> {
        return;
    }

    async free(): Promise<void> {
        return;  
    }

    async generate(prompt: string, settings: LlmGenerationSettings): Promise<Result<string, LLM_GEN_ERRORS>> {
        const parsed_prompt = this.#parsePrompt(prompt);

        if (parsed_prompt === null) {
            IO.warn('Could not continue generation due to being enable to parse prompt.');
            return new Result(false, '', LLM_GEN_ERRORS.INCORRECT_PROMPT);
        }

        let result: OpenAI.Chat.Completions.ChatCompletion;
        try {
            result = await this.#openai_api.chat.completions.create({
                messages: parsed_prompt,
                model: "gpt-3.5-turbo",
                temperature: settings.temperature,
                max_tokens: settings.max_output_length,
                stop: ["\n"]
            });
        } catch(e: any) {
            if (e["status"] === 401) {
                return new Result(false, "OpenAI API Token is either missing or is incorrect.", LLM_GEN_ERRORS.WRONG_AUTH);
            }
            return new Result(false, e["error"]["message"], LLM_GEN_ERRORS.UNDEFINED);
        }

        let result_text = result.choices[0]!.message.content!;

        let regex_result = /^(?:.*?:)(.*)$/g.exec(result_text);

        let final_result = '';

        if (regex_result === null) {
            final_result = result_text;
        } else {
            final_result = regex_result[1]!.toString();
        }

        return new Result(true, final_result, LLM_GEN_ERRORS.NONE);
    }

    #parsePrompt(unparsed_prompt: string): {role:"function"|"system"|"user"|"assistant",content:string}[]|null {
        const character: Character = wAIfu.state.characters[wAIfu.state.config._.character_name.value] as Character;
        const lines = String(unparsed_prompt).split(/\r\n|\n/g, undefined);
    
        let msg_array = [];
        const lines_nb = lines.length;
    
        for (let i = 0; i < lines_nb; ++i) {
            const line = lines[i]!.trim();
    
            if (line.startsWith('{', 0)) {
                msg_array.push({
                    "role": 'system' as const,
                    "content": line.slice(1, line.length - 1),
                });
                continue;
            }
            if (line.includes(':')) {
                let split_line = line.split(':');
                msg_array.push({
                    "role": (split_line[0] === character.char_name) ? 'assistant' as const : 'user' as const,
                    "content": line,
                });
                continue;
            } else {
                IO.warn(
                    'Could not parse line ' + String(i) + ' of prompt because of missing \':\'.\nThe format of the prompt should follow this schema for each line:\nNAME: MESSAGE');
                return null;
            }
        }
        msg_array.pop() // removes added `NAME:` at end of file for support with all llms, not needed here
        return msg_array;
    }
}