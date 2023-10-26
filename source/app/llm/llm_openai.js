"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LargeLanguageModelOpenAI = void 0;
const Result_1 = require("../types/Result");
const Waifu_1 = require("../types/Waifu");
const llm_interface_1 = require("./llm_interface");
const openai_1 = require("openai");
const io_1 = require("../io/io");
const characters_1 = require("../characters/characters");
const GENERATION_TIMEOUT_MS = 10_000;
class LargeLanguageModelOpenAI {
    #openai_api;
    constructor() {
        this.#openai_api = new openai_1.OpenAI({
            apiKey: Waifu_1.wAIfu.state.auth.openai.token,
        });
    }
    async initialize() {
        io_1.IO.debug("Loaded LargeLanguageModelOpenAI.");
        return;
    }
    async free() {
        return;
    }
    async generate(prompt, settings) {
        return new Promise(async (resolve) => {
            let is_resolved = false;
            const parsed_prompt = this.#parsePrompt(prompt);
            if (parsed_prompt === null) {
                is_resolved = true;
                resolve(new Result_1.Result(false, "Could not continue generation due to being enable to parse prompt.", llm_interface_1.LLM_GEN_ERRORS.INCORRECT_PROMPT));
                return;
            }
            const timeout = () => {
                if (is_resolved)
                    return;
                is_resolved = true;
                resolve(new Result_1.Result(false, "Timed out while waiting for LLM response.", llm_interface_1.LLM_GEN_ERRORS.RESPONSE_TIMEOUT));
                return;
            };
            setTimeout(timeout, GENERATION_TIMEOUT_MS);
            let custom_model = Waifu_1.wAIfu.state.config.large_language_model["fine-tuned_gpt3.5_model_name"].value;
            let model = custom_model === "" || settings.use_base_model === true
                ? Waifu_1.wAIfu.state.config.large_language_model.openai_model
                    .value
                : custom_model;
            let result;
            try {
                result = await this.#openai_api.chat.completions.create({
                    messages: parsed_prompt,
                    model: model,
                    temperature: settings.temperature,
                    max_tokens: settings.max_output_length,
                    stop: ["\n", "\r"],
                });
            }
            catch (e) {
                if (is_resolved)
                    return;
                is_resolved = true;
                if (e["status"] === 401) {
                    resolve(new Result_1.Result(false, "OpenAI API Token is either missing or is incorrect.", llm_interface_1.LLM_GEN_ERRORS.WRONG_AUTH));
                    return;
                }
                resolve(new Result_1.Result(false, e["error"]["message"], llm_interface_1.LLM_GEN_ERRORS.UNDEFINED));
                return;
            }
            if (is_resolved)
                return;
            let result_text = result.choices[0].message.content;
            let regex_result = /^(?:.*?:)(.*)$/g.exec(result_text);
            let final_result = "";
            if (regex_result === null) {
                final_result = result_text;
            }
            else {
                if (regex_result[1] === undefined) {
                    is_resolved = true;
                    resolve(new Result_1.Result(false, "Response format did not pass sanity test.", llm_interface_1.LLM_GEN_ERRORS.RESPONSE_FAILURE));
                    return;
                }
                final_result = regex_result[1].toString();
            }
            if (!final_result.endsWith("\n"))
                final_result += "\n";
            is_resolved = true;
            resolve(new Result_1.Result(true, final_result, llm_interface_1.LLM_GEN_ERRORS.NONE));
            return;
        });
    }
    #parsePrompt(unparsed_prompt) {
        const character = (0, characters_1.getCurrentCharacter)();
        let msg_array = [];
        let matches = unparsed_prompt.matchAll(/(----[^]*?\*\*\*)|(\[ [^]*? \])|({ [^]*? })|(.*?)(?:\n|$)/g);
        for (let match of matches) {
            let content = match[0].trim();
            if (content === null)
                continue;
            if (content === "")
                continue;
            if (content.startsWith("----") === true) {
                msg_array.push({
                    role: "system",
                    content: content.replaceAll(/----\n|----|\*\*\*\n|\*\*\*/g, ""),
                });
                continue;
            }
            if (content.startsWith("{ ") === true) {
                msg_array.push({
                    role: "system",
                    content: content.replaceAll(/{ | }/g, ""),
                });
                continue;
            }
            if (content.startsWith("[ ") === true) {
                msg_array.push({
                    role: "system",
                    content: content.replaceAll(/\[ | \]/g, ""),
                });
                continue;
            }
            if (content.includes(":") === true) {
                let split_line = content.split(":");
                msg_array.push({
                    role: split_line[0] === character.char_name
                        ? "assistant"
                        : "user",
                    content: content,
                });
                continue;
            }
            io_1.IO.warn('Could not parse line "' + content + '"');
            return null;
        }
        msg_array.pop();
        return msg_array;
    }
}
exports.LargeLanguageModelOpenAI = LargeLanguageModelOpenAI;
