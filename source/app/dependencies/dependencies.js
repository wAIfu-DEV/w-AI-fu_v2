"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dependencies = void 0;
class Dependencies {
    input_system;
    llm;
    tts;
    live_chat;
    ui = undefined;
    twitch_eventsub = undefined;
    vts;
    ltm;
    needs_reload = false;
    constructor(_in, _llm, _tts, _live_chat, _vts, _ltm, _ui = undefined, _twitch_eventsub = undefined) {
        this.input_system = _in;
        this.llm = _llm;
        this.tts = _tts;
        this.live_chat = _live_chat;
        this.ui = _ui;
        this.vts = _vts;
        this.ltm = _ltm;
    }
}
exports.Dependencies = Dependencies;
