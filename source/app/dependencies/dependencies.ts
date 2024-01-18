import { IInputSystem } from "../input/input_interface";
import { ILiveChat } from "../live_chat/live_chat_interface";
import { ILargeLanguageModel } from "../llm/llm_interface";
import { ILongTermMemory } from "../memory/ltm_interface";
import { ITextToSpeech } from "../tts/tts_interface";
import { TwitchEventSubs } from "../twitch/twitch_eventsub";
import { UserInterface } from "../ui_com/userinterface";
import { VtubeStudioAPI } from "../vtube_studio/vtube_studio";

export class Dependencies {
    input_system: IInputSystem;
    llm: ILargeLanguageModel;
    tts: ITextToSpeech;
    live_chat: ILiveChat;
    ui: UserInterface | undefined = undefined;
    twitch_eventsub: TwitchEventSubs | undefined = undefined;
    vts: VtubeStudioAPI;
    ltm: ILongTermMemory;

    needs_reload: boolean = false;

    constructor(
        _in: IInputSystem,
        _llm: ILargeLanguageModel,
        _tts: ITextToSpeech,
        _live_chat: ILiveChat,
        _vts: VtubeStudioAPI,
        _ltm: ILongTermMemory,
        _ui: UserInterface | undefined = undefined,
        _twitch_eventsub: TwitchEventSubs | undefined = undefined
    ) {
        this.input_system = _in;
        this.llm = _llm;
        this.tts = _tts;
        this.live_chat = _live_chat;
        this.ui = _ui;
        this.vts = _vts;
        this.ltm = _ltm;
    }
}
