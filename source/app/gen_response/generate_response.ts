import { IO } from "../io/io";
import { checkForBadWords } from "../moderation/check_for_bad_words";
import { wAIfu } from "../types/Waifu";

export async function generateResponse(prompt: string): Promise<{text: string, filtered: boolean}> {
    const RETRY_MAX_ATTEMPTS: 5 = 5;
    const llm_cfg = wAIfu.state!.config.llm;
    let tries: number = 0;
    // Yes I know some people don't like infinite loops,
    // I don't give a shit about dumbass dogmatic opinions, fuck off.
    try_loop: while (true) {

        if (tries >= RETRY_MAX_ATTEMPTS) {
            IO.warn('ERROR: Failed to get valid response from LLM.');
            break try_loop;
        };

        const llm_response = await wAIfu.dependencies!.llm.generate(prompt, {
            temperature: llm_cfg.temperature.value,
            repetition_penalty: llm_cfg.repetition_penalty.value,
            max_output_length: llm_cfg.max_output_length.value,
            length_penalty: llm_cfg.length_penalty.value
        });

        // TODO: better error handling for god's sake
        if (llm_response.success === false) {
            IO.warn('ERROR: LLM encountered this error:', llm_response.error, llm_response.value);
            break try_loop;
        }

        let filtered_content = checkForBadWords(llm_response.value);

        if (filtered_content !== null
        && wAIfu.state?.config.moderation.retry_after_filtered.value === true) {
            tries++;
            continue try_loop;
        } else if (filtered_content !== null) {
            return {
                text: wAIfu.state?.config.moderation.censor_placeholder.value!,
                filtered: true
            };
        } else {
            return {
                text: llm_response.value,
                filtered: false
            }
        }
    }
    return { text: "Oops, looks like there was an issue with my AI.", filtered: false };
}