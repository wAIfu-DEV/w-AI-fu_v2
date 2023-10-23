"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamSubtitles = exports.clearStreamedSubtitles = void 0;
const ws_1 = require("ws");
const Waifu_1 = require("../types/Waifu");
let ClosedCaptionsWSS = new ws_1.WebSocketServer({ host: "127.0.0.1", port: 8756 });
let ClosedCaptionsWS = new ws_1.WebSocket(null);
ClosedCaptionsWSS.on("connection", (ws, _) => {
    ClosedCaptionsWS = ws;
});
let is_writing = false;
let skip_next = false;
function clearStreamedSubtitles() {
    skip_next = true;
    if (ClosedCaptionsWS.readyState === ws_1.WebSocket.OPEN)
        ClosedCaptionsWS.send("CLEAR");
}
exports.clearStreamedSubtitles = clearStreamedSubtitles;
function streamSubtitles(text, time_ms, persistant, is_narrator) {
    return new Promise(async (resolve) => {
        let is_resolved = false;
        let words = text.split(/ +/g);
        let total_chars = 0;
        let word_list = [];
        for (let word of words) {
            let char_count = word.length;
            total_chars += char_count;
            word_list.push({ text: word, chars: char_count });
        }
        let ms_per_char = time_ms / total_chars;
        is_writing = true;
        if (ClosedCaptionsWS.readyState === ws_1.WebSocket.OPEN)
            ClosedCaptionsWS.send("CLEAR");
        while (word_list.length !== 0) {
            if (is_resolved)
                return;
            if (skip_next) {
                skip_next = false;
                if (ClosedCaptionsWS.readyState === ws_1.WebSocket.OPEN) {
                    ClosedCaptionsWS.send("CLEAR");
                }
                is_writing = false;
                is_resolved = true;
                resolve();
                return;
            }
            let to_display = word_list.shift();
            if (to_display === undefined)
                continue;
            if (ClosedCaptionsWS.readyState === ws_1.WebSocket.OPEN)
                ClosedCaptionsWS.send(`WORD ${to_display.text}`);
            if (!is_narrator)
                Waifu_1.wAIfu.dependencies?.vts.tryPlayKeywordSequence(to_display.text);
            await new Promise((resolve_sleep) => setTimeout(resolve_sleep, to_display.chars * ms_per_char));
        }
        is_writing = false;
        if (persistant)
            return;
        setTimeout(() => {
            if (is_writing === true)
                return;
            if (ClosedCaptionsWS.readyState === ws_1.WebSocket.OPEN)
                ClosedCaptionsWS.send("CLEAR");
        }, 2_500);
        is_resolved = true;
        resolve();
        return;
    });
}
exports.streamSubtitles = streamSubtitles;
