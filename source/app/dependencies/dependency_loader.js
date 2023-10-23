"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDependencies = void 0;
const input_text_1 = require("../input/input_text");
const twitch_chat_1 = require("../live_chat/twitch_chat");
const llm_novelai_1 = require("../llm/llm_novelai");
const llm_openai_1 = require("../llm/llm_openai");
const tts_novelai_1 = require("../tts/tts_novelai");
const dependencies_1 = require("./dependencies");
const input_voice_1 = require("../input/input_voice");
const live_chat_none_1 = require("../live_chat/live_chat_none");
const llm_characterai_1 = require("../llm/llm_characterai");
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
const vtube_studio_1 = require("../vtube_studio/vtube_studio");
const tts_azure_1 = require("../tts/tts_azure");
async function loadDependencies(config) {
    let input_sys;
    if (config.speech_to_text.voice_input.value) {
        input_sys = new input_voice_1.InputSystemVoice();
    }
    else {
        input_sys = new input_text_1.InputSystemText();
    }
    let llm;
    let llm_provider = config.large_language_model.llm_provider.value;
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
    let tts_provider = config.text_to_speech.tts_provider.value;
    switch (tts_provider) {
        case "novelai":
            {
                tts = new tts_novelai_1.TextToSpeechNovelAI();
            }
            break;
        case "azure":
            {
                tts = new tts_azure_1.TextToSpeechAzure();
            }
            break;
        default:
            tts = new tts_novelai_1.TextToSpeechNovelAI();
            break;
    }
    let live_chat;
    let live_chat_provider = config.live_chat.livestream_platform.value;
    if (config.live_chat.read_live_chat.value === false) {
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
                    io_1.IO.warn("ERROR: Youtube support has not yet been implemented.");
                    live_chat = new twitch_chat_1.LiveChatTwitch();
                }
                break;
            default:
                live_chat = new live_chat_none_1.LiveChatNone();
                break;
        }
    }
    let vts = new vtube_studio_1.VtubeStudioAPI();
    io_1.IO.debug("Constructed dependencies.");
    await Promise.allSettled([
        input_sys.initialize(),
        llm.initialize(),
        tts.initialize(),
        live_chat.initialize(),
    ]);
    io_1.IO.debug(`LLM: ${llm_provider}, TTS: ${tts_provider}, STT: ${Waifu_1.wAIfu.state.config.speech_to_text.stt_provider.value}, LIVE: ${live_chat_provider}`);
    return new dependencies_1.Dependencies(input_sys, llm, tts, live_chat, undefined, vts);
}
exports.loadDependencies = loadDependencies;
