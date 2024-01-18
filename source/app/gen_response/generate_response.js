"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = void 0;
const io_1 = require("../io/io");
const check_for_bad_words_1 = require("../moderation/check_for_bad_words");
const check_for_spam_1 = require("../moderation/check_for_spam");
const Waifu_1 = require("../types/Waifu");
const RETRY_MAX_ATTEMPTS = 5;
async function generateResponse(prompt, generate_as) {
    const llm_cfg = Waifu_1.wAIfu.state.config.large_language_model;
    let tries = 0;
    let is_filtered = false;
    try_loop: while (true) {
        if (tries >= RETRY_MAX_ATTEMPTS) {
            io_1.IO.warn("ERROR: Failed to get valid response from LLM.");
            break try_loop;
        }
        const llm_response = await Waifu_1.wAIfu.dependencies.llm.generate(prompt, {
            character_name: generate_as,
            temperature: llm_cfg.temperature.value,
            repetition_penalty: llm_cfg.repetition_penalty.value,
            max_output_length: llm_cfg.max_output_length.value,
            length_penalty: llm_cfg.length_penalty.value,
            use_base_model: false,
        });
        let should_retry = false;
        if (llm_response.success === false) {
            io_1.IO.warn("ERROR: LLM encountered this error:", llm_response.error, llm_response.value);
            should_retry = true;
        }
        if (Waifu_1.wAIfu.state.config.moderation.filter_bad_words.value === true &&
            (0, check_for_bad_words_1.checkForBadWords)(llm_response.value) !== null) {
            should_retry = true;
        }
        if (Waifu_1.wAIfu.state.config.moderation.filter_repetition.value === true &&
            (0, check_for_spam_1.isSpamMessage)(llm_response.value.trim())) {
            should_retry = true;
        }
        if (Waifu_1.wAIfu.state.config.moderation.filter_repetition.value === true &&
            llm_response.value.length > 10 &&
            prompt.includes(llm_response.value.trim())) {
            should_retry = true;
        }
        if (should_retry &&
            Waifu_1.wAIfu.state?.config.moderation.retry_after_filtered.value === true) {
            is_filtered = true;
            tries++;
            continue try_loop;
        }
        else if (should_retry) {
            return {
                text: Waifu_1.wAIfu.state?.config.moderation.censor_placeholder.value,
                filtered: true,
            };
        }
        return {
            text: llm_response.value,
            filtered: false,
        };
    }
    return {
        text: is_filtered
            ? Waifu_1.wAIfu.state?.config.moderation.censor_placeholder.value + "\n"
            : "Oops something went wrong with my AI.\n",
        filtered: false,
    };
}
exports.generateResponse = generateResponse;
