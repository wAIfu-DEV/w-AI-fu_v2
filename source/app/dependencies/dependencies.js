"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dependencies = void 0;
class Dependencies {
    input_system;
    llm;
    tts;
    live_chat;
    ui = undefined;
    vts;
    needs_reload = false;
    constructor(_in, _llm, _tts, _live_chat, _ui = undefined, _vts) {
        this.input_system = _in;
        this.llm = _llm;
        this.tts = _tts;
        this.live_chat = _live_chat;
        this.ui = _ui;
        this.vts = _vts;
    }
}
exports.Dependencies = Dependencies;
