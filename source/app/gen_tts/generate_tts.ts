import { IO } from "../io/io";
import { TTS_GEN_ERROR, TtsGenerationSettings } from "../tts/tts_interface";
import { Result } from "../types/Result";
import { wAIfu } from "../types/Waifu";

const RETRY_MAX_ATTEMPTS = 5 as const;

export async function generateTTS(
    text: string,
    options: TtsGenerationSettings
): Promise<string | null> {
    let tries: number = 0;

    try_loop: while (true) {
        if (tries >= RETRY_MAX_ATTEMPTS) {
            IO.warn("ERROR: Failed to get valid response from TTS.");
            break try_loop;
        }

        const tts_result = await wAIfu.dependencies!.tts.generateSpeech(
            text,
            options
        );

        if (tts_result.success === true) {
            return tts_result.value;
        }

        IO.warn(
            "ERROR: TTS encountered this error:",
            tts_result.error,
            tts_result.value
        );

        tries++;
    }

    return null;
}

export async function generateTtsOverlapped(
    sentences: string[],
    options: TtsGenerationSettings,
    callback: (id: string) => Promise<any>
): Promise<void> {
    if (sentences.length == 0) return;
    if (sentences.length == 1) {
        let result = await wAIfu.dependencies!.tts.generateSpeech(
            sentences[0]!,
            options
        );
        if (result.success) await callback(result.value);
        return;
    }

    let current_sentence_index = 0;
    let last_sentence = sentences[0]!;

    let next_tts_job: Promise<Result<string, TTS_GEN_ERROR>> | null =
        wAIfu.dependencies!.tts.generateSpeech(sentences[0]!, options);

    while (next_tts_job !== null) {
        let job_result = await next_tts_job;

        if (wAIfu.dependencies!.tts.skip === true) return;

        let tries = 0;
        while (!job_result.success) {
            if (tries >= RETRY_MAX_ATTEMPTS) {
                IO.warn("ERROR: Failed to get valid response from TTS.");
                return;
            }
            IO.warn("ERROR:", job_result.value);
            job_result = await wAIfu.dependencies!.tts.generateSpeech(
                last_sentence,
                options
            );
            tries++;
        }

        if (++current_sentence_index >= sentences.length) {
            next_tts_job = null;
        } else {
            last_sentence = sentences[current_sentence_index]!;
            next_tts_job = wAIfu.dependencies!.tts.generateSpeech(
                last_sentence,
                options
            );
        }

        await callback(job_result.value);
    }
}
