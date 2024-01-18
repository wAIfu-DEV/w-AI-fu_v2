"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTtsOverlapped = exports.generateTTS = void 0;
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
const RETRY_MAX_ATTEMPTS = 5;
async function generateTTS(text, options) {
    let tries = 0;
    try_loop: while (true) {
        if (tries >= RETRY_MAX_ATTEMPTS) {
            io_1.IO.warn("ERROR: Failed to get valid response from TTS.");
            break try_loop;
        }
        const tts_result = await Waifu_1.wAIfu.dependencies.tts.generateSpeech(text, options);
        if (tts_result.success === true) {
            return tts_result.value;
        }
        io_1.IO.warn("ERROR: TTS encountered this error:", tts_result.error, tts_result.value);
        tries++;
    }
    return null;
}
exports.generateTTS = generateTTS;
async function generateTtsOverlapped(sentences, options, callback) {
    if (sentences.length == 0)
        return;
    if (sentences.length == 1) {
        let result = await Waifu_1.wAIfu.dependencies.tts.generateSpeech(sentences[0], options);
        if (result.success)
            await callback(result.value);
        return;
    }
    let current_sentence_index = 0;
    let last_sentence = sentences[0];
    let next_tts_job = Waifu_1.wAIfu.dependencies.tts.generateSpeech(sentences[0], options);
    while (next_tts_job !== null) {
        let job_result = await next_tts_job;
        if (Waifu_1.wAIfu.dependencies.tts.skip === true)
            return;
        let tries = 0;
        while (!job_result.success) {
            if (tries >= RETRY_MAX_ATTEMPTS) {
                io_1.IO.warn("ERROR: Failed to get valid response from TTS.");
                return;
            }
            io_1.IO.warn("ERROR:", job_result.value);
            job_result = await Waifu_1.wAIfu.dependencies.tts.generateSpeech(last_sentence, options);
            tries++;
        }
        if (++current_sentence_index >= sentences.length) {
            next_tts_job = null;
        }
        else {
            last_sentence = sentences[current_sentence_index];
            next_tts_job = Waifu_1.wAIfu.dependencies.tts.generateSpeech(last_sentence, options);
        }
        await callback(job_result.value);
    }
}
exports.generateTtsOverlapped = generateTtsOverlapped;
