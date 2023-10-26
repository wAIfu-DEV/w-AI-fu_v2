import { IO } from "../io/io";
import { checkForBadWords } from "../moderation/check_for_bad_words";
import { wAIfu } from "../types/Waifu";

type GeneratedContent = { text: string; filtered: boolean };

const RETRY_MAX_ATTEMPTS = 5 as const;

export async function generateResponse(
    prompt: string
): Promise<GeneratedContent> {
    const llm_cfg = wAIfu.state!.config.large_language_model;
    let tries: number = 0;

    let is_filtered = false;

    // Yes I know some people don't like infinite loops,
    // I don't give a shit about dumbass dogmatic opinions, fuck off.
    try_loop: while (true) {
        if (tries >= RETRY_MAX_ATTEMPTS) {
            IO.warn("ERROR: Failed to get valid response from LLM.");
            break try_loop;
        }

        const llm_response = await wAIfu.dependencies!.llm.generate(prompt, {
            temperature: llm_cfg.temperature.value,
            repetition_penalty: llm_cfg.repetition_penalty.value,
            max_output_length: llm_cfg.max_output_length.value,
            length_penalty: llm_cfg.length_penalty.value,
            use_base_model: false,
        });

        if (llm_response.success === false) {
            IO.warn(
                "ERROR: LLM encountered this error:",
                llm_response.error,
                llm_response.value
            );
            break try_loop;
        }

        const filtered_content = checkForBadWords(llm_response.value);

        if (filtered_content === null) {
            return {
                text: llm_response.value,
                filtered: false,
            };
        }

        if (
            wAIfu.state?.config.moderation.retry_after_filtered.value === true
        ) {
            is_filtered = true;
            tries++;
            continue try_loop;
        }

        return {
            text: wAIfu.state?.config.moderation.censor_placeholder.value!,
            filtered: true,
        };
    }

    return {
        text: is_filtered
            ? wAIfu.state?.config.moderation.censor_placeholder.value! + "\n"
            : "Oops something went wrong with my AI.\n",
        filtered: false,
    };
}
