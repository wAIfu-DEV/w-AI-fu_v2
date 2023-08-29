"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LargeLanguageModelOpenAI = void 0;
const io_1 = require("../io/io");
const Result_1 = require("../types/Result");
const Waifu_1 = require("../types/Waifu");
const llm_interface_1 = require("./llm_interface");
const openai_1 = require("openai");
class LargeLanguageModelOpenAI {
    #openai_api;
    constructor() {
        this.#openai_api = new openai_1.OpenAI({
            apiKey: Waifu_1.wAIfu.state.auth.openai.token,
        });
    }
    async initialize() {
        return;
    }
    async free() {
        return;
    }
    async generate(prompt, settings) {
        const parsed_prompt = this.#parsePrompt(prompt);
        if (parsed_prompt === null) {
            io_1.IO.warn('Could not continue generation due to being enable to parse prompt.');
            return new Result_1.Result(false, '', llm_interface_1.LLM_GEN_ERRORS.INCORRECT_PROMPT);
        }
        let result;
        try {
            result = await this.#openai_api.chat.completions.create({
                messages: parsed_prompt,
                model: "gpt-3.5-turbo",
                temperature: settings.temperature,
                max_tokens: settings.max_output_length,
                stop: ["\n"]
            });
        }
        catch (e) {
            if (e["status"] === 401) {
                return new Result_1.Result(false, "OpenAI API Token is either missing or is incorrect.", llm_interface_1.LLM_GEN_ERRORS.WRONG_AUTH);
            }
            return new Result_1.Result(false, e["error"]["message"], llm_interface_1.LLM_GEN_ERRORS.UNDEFINED);
        }
        let result_text = result.choices[0].message.content;
        let regex_result = /^(?:.*?:)(.*)$/g.exec(result_text);
        let final_result = '';
        if (regex_result === null) {
            final_result = result_text;
        }
        else {
            final_result = regex_result[1].toString();
        }
        return new Result_1.Result(true, final_result, llm_interface_1.LLM_GEN_ERRORS.NONE);
    }
    #parsePrompt(unparsed_prompt) {
        const character = Waifu_1.wAIfu.state.characters[Waifu_1.wAIfu.state.config._.character_name.value];
        const lines = String(unparsed_prompt).split(/\r\n|\n/g, undefined);
        let msg_array = [];
        const lines_nb = lines.length;
        for (let i = 0; i < lines_nb; ++i) {
            const line = lines[i].trim();
            if (line.startsWith('{', 0)) {
                msg_array.push({
                    "role": 'system',
                    "content": line.slice(1, line.length - 1),
                });
                continue;
            }
            if (line.includes(':')) {
                let split_line = line.split(':');
                msg_array.push({
                    "role": (split_line[0] === character.char_name) ? 'assistant' : 'user',
                    "content": line,
                });
                continue;
            }
            else {
                io_1.IO.warn('Could not parse line ' + String(i) + ' of prompt because of missing \':\'.\nThe format of the prompt should follow this schema for each line:\nNAME: MESSAGE');
                return null;
            }
        }
        msg_array.pop();
        return msg_array;
    }
}
exports.LargeLanguageModelOpenAI = LargeLanguageModelOpenAI;
