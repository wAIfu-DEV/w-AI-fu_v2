"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDependencies = void 0;
const input_text_1 = require("../input/input_text");
const io_1 = require("../io/io");
const twitch_chat_1 = require("../live_chat/twitch_chat");
const llm_novelai_1 = require("../llm/llm_novelai");
const llm_openai_1 = require("../llm/llm_openai");
const tts_novelai_1 = require("../tts/tts_novelai");
const dependencies_1 = require("./dependencies");
const input_voice_1 = require("../input/input_voice");
const live_chat_none_1 = require("../live_chat/live_chat_none");
const llm_characterai_1 = require("../llm/llm_characterai");
const Waifu_1 = require("../types/Waifu");
async function loadDependencies(config) {
    let input_sys;
    if (config.behaviour.voice_input.value) {
        input_sys = new input_voice_1.InputSystemVoice();
    }
    else {
        input_sys = new input_text_1.InputSystemText();
    }
    let llm;
    let llm_provider = config.providers.llm_provider.value;
    switch (llm_provider) {
        case "novelai":
            {
                llm = new llm_novelai_1.LargeLanguageModelNovelAI();
            }
            break;
        case "openai":
            {
                llm = new llm_openai_1.LargeLanguageModelOpenAI();
            }
            break;
        case "characterai":
            {
                llm = new llm_characterai_1.LargeLanguageModelCharacterAI();
            }
            break;
        default:
            llm = new llm_novelai_1.LargeLanguageModelNovelAI();
            break;
    }
    let tts;
    let tts_provider = config.providers.tts_provider.value;
    switch (tts_provider) {
        case "novelai":
            {
                tts = new tts_novelai_1.TextToSpeechNovelAI();
            }
            break;
        default:
            tts = new tts_novelai_1.TextToSpeechNovelAI();
            break;
    }
    let live_chat;
    let live_chat_provider = config.providers.livestream_platform.value;
    if (config.behaviour.read_live_chat.value === false) {
        live_chat_provider = "none";
        live_chat = new live_chat_none_1.LiveChatNone();
    }
    else {
        switch (live_chat_provider) {
            case "twitch":
                {
                    live_chat = new twitch_chat_1.LiveChatTwitch();
                }
                break;
            case "youtube":
                {
                    io_1.IO.warn('ERROR: Youtube support has not yet been implemented.');
                    live_chat = new twitch_chat_1.LiveChatTwitch();
                }
                break;
            default:
                live_chat = new live_chat_none_1.LiveChatNone();
                break;
        }
    }
    await Promise.allSettled([
        input_sys.initialize(),
        llm.initialize(),
        tts.initialize(),
        live_chat.initialize(),
    ]);
    io_1.IO.debug(`LLM: ${llm_provider}, TTS: ${tts_provider}, STT: ${Waifu_1.wAIfu.state.config.providers.stt_provider.value}, LIVE: ${live_chat_provider}`);
    return new dependencies_1.Dependencies(input_sys, llm, tts, live_chat);
}
exports.loadDependencies = loadDependencies;
