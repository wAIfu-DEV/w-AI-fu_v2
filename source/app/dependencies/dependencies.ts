import { InputSystem } from "../input/input_interface";
import { LiveChat } from "../live_chat/live_chat_interface";
import { LargeLanguageModel } from "../llm/llm_interface";
import { TextToSpeech } from "../tts/tts_interface";
import { TwitchEventSubs } from "../twitch/twitch_eventsub";
import { UserInterface } from "../ui_com/userinterface";
import { VtubeStudioAPI } from "../vtube_studio/vtube_studio";

export class Dependencies {
    input_system: InputSystem;
    llm: LargeLanguageModel;
    tts: TextToSpeech;
    live_chat: LiveChat;
    ui: UserInterface | undefined = undefined;
    twitch_eventsub: TwitchEventSubs | undefined = undefined;
    vts: VtubeStudioAPI;

    needs_reload: boolean = false;

    constructor(
        _in: InputSystem,
        _llm: LargeLanguageModel,
        _tts: TextToSpeech,
        _live_chat: LiveChat,
        _vts: VtubeStudioAPI,
        _ui: UserInterface | undefined = undefined,
        _twitch_eventsub: TwitchEventSubs | undefined = undefined
    ) {
        this.input_system = _in;
        this.llm = _llm;
        this.tts = _tts;
        this.live_chat = _live_chat;
        this.ui = _ui;
        this.vts = _vts;
    }
}
