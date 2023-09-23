"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = void 0;
const io_1 = require("../io/io");
const check_for_bad_words_1 = require("../moderation/check_for_bad_words");
const Waifu_1 = require("../types/Waifu");
async function generateResponse(prompt) {
    const RETRY_MAX_ATTEMPTS = 5;
    const llm_cfg = Waifu_1.wAIfu.state.config.llm;
    let tries = 0;
    try_loop: while (true) {
        if (tries >= RETRY_MAX_ATTEMPTS) {
            io_1.IO.warn('ERROR: Failed to get valid response from LLM.');
            break try_loop;
        }
        ;
        const llm_response = await Waifu_1.wAIfu.dependencies.llm.generate(prompt, {
            temperature: llm_cfg.temperature.value,
            repetition_penalty: llm_cfg.repetition_penalty.value,
            max_output_length: llm_cfg.max_output_length.value,
            length_penalty: llm_cfg.length_penalty.value
        });
        if (llm_response.success === false) {
            io_1.IO.warn('ERROR: LLM encountered this error:', llm_response.error, llm_response.value);
            break try_loop;
        }
        let filtered_content = (0, check_for_bad_words_1.checkForBadWords)(llm_response.value);
        if (filtered_content !== null
            && Waifu_1.wAIfu.state?.config.moderation.retry_after_filtered.value === true) {
            tries++;
            continue try_loop;
        }
        else if (filtered_content !== null) {
            return {
                text: Waifu_1.wAIfu.state?.config.moderation.censor_placeholder.value,
                filtered: true
            };
        }
        else {
            return {
                text: llm_response.value,
                filtered: false
            };
        }
    }
    return { text: "Oops, looks like there was an issue with my AI.", filtered: false };
}
exports.generateResponse = generateResponse;
