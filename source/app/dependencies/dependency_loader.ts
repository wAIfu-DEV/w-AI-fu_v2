import { InputSystem } from "../input/input_interface";
import { InputSystemText } from "../input/input_text";
import { IO } from "../io/io";
import { LiveChat } from "../live_chat/live_chat_interface";
import { LiveChatTwitch } from "../live_chat/twitch_chat";
import { LargeLanguageModel } from "../llm/llm_interface";
import { LargeLanguageModelNovelAI } from "../llm/llm_novelai";
import { LargeLanguageModelOpenAI } from "../llm/llm_openai";
import { Config } from "../config/config";
import { TextToSpeech } from "../tts/tts_interface";
import { TextToSpeechNovelAI } from "../tts/tts_novelai";
import { Dependencies } from "./dependencies";
import { InputSystemVoice } from "../input/input_voice";
import { LiveChatNone } from "../live_chat/live_chat_none";
import { LargeLanguageModelCharacterAI } from "../llm/llm_characterai";
import { wAIfu } from "../types/Waifu";

export async function loadDependencies(config: Config): Promise<Dependencies> {

    let input_sys: InputSystem;
    if (config.behaviour.voice_input.value) {
        input_sys = new InputSystemVoice();
    } else {
        input_sys = new InputSystemText();
    }
    
    let llm: LargeLanguageModel;
    let llm_provider = config.providers.llm_provider.value;
    switch (llm_provider) {
        case "novelai": {
            llm = new LargeLanguageModelNovelAI();
        } break;
        case "openai": {
            llm = new LargeLanguageModelOpenAI();
        } break;
        case "characterai": {
            llm = new LargeLanguageModelCharacterAI();
        } break;
        default:
            llm = new LargeLanguageModelNovelAI();
            break;
    }

    let tts: TextToSpeech;
    let tts_provider = config.providers.tts_provider.value;
    switch (tts_provider) {
        case "novelai": {
            tts = new TextToSpeechNovelAI();
        } break;
        default:
            tts = new TextToSpeechNovelAI();
            break;
    }
    
    let live_chat: LiveChat;
    let live_chat_provider = config.providers.livestream_platform.value;
    if (config.behaviour.read_live_chat.value === false) {
        live_chat_provider = "none";
        live_chat = new LiveChatNone();
    }
    else {
        switch (live_chat_provider) {
            case "twitch": {
                live_chat = new LiveChatTwitch();
            } break;
            case "youtube": {
                // TODO: Implement LiveChatYoutube class
                IO.warn('ERROR: Youtube support has not yet been implemented.');
                live_chat = new LiveChatTwitch();
            } break;
            default:
                live_chat = new LiveChatNone();
                break;
        }
    }

    // Now this is something great:
    // Since all our modules are independent, they don't require a specific
    // in order to boot. That means we can initialize everything at once.
    // Speed 📈
    await Promise.allSettled([
        input_sys.initialize(),
        llm.initialize(),
        tts.initialize(),
        live_chat.initialize(),
    ]);

    IO.debug(`LLM: ${llm_provider
            }, TTS: ${tts_provider
            }, STT: ${wAIfu.state.config.providers.stt_provider.value
            }, LIVE: ${live_chat_provider
            }`);

    return new Dependencies(input_sys, llm, tts, live_chat);
}