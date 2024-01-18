"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamSubtitles = exports.clearStreamedSubtitles = exports.ClosedCaptionsWS = void 0;
const ws_1 = __importStar(require("ws"));
const Waifu_1 = require("../types/Waifu");
let ClosedCaptionsWSS = new ws_1.WebSocketServer({ host: "127.0.0.1", port: 8756 });
exports.ClosedCaptionsWS = new ws_1.default(null);
ClosedCaptionsWSS.on("connection", (ws, _) => {
    exports.ClosedCaptionsWS = ws;
});
let is_writing = false;
let skip_next = false;
function clearStreamedSubtitles() {
    if (is_writing)
        skip_next = true;
    if (exports.ClosedCaptionsWS.readyState === ws_1.default.OPEN)
        exports.ClosedCaptionsWS.send("CLEAR");
}
exports.clearStreamedSubtitles = clearStreamedSubtitles;
function streamSubtitles(text, options) {
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
        let ms_per_char = (options.time_ms || 1) / total_chars;
        is_writing = true;
        while (word_list.length !== 0) {
            if (is_resolved)
                return;
            if (skip_next) {
                skip_next = false;
                if (exports.ClosedCaptionsWS.readyState === ws_1.default.OPEN) {
                    exports.ClosedCaptionsWS.send("CLEAR");
                }
                is_writing = false;
                is_resolved = true;
                resolve();
                return;
            }
            let to_display = word_list.shift();
            if (to_display === undefined)
                continue;
            if (exports.ClosedCaptionsWS.readyState === ws_1.default.OPEN)
                exports.ClosedCaptionsWS.send(`WORD ${to_display.text}`);
            if (options.is_narrator !== true)
                Waifu_1.wAIfu.dependencies?.vts.tryPlayKeywordSequence(to_display.text);
            await new Promise((resolve_sleep) => setTimeout(resolve_sleep, to_display.chars * ms_per_char));
        }
        is_writing = false;
        if (options.persistant)
            return;
        setTimeout(() => {
            if (is_writing === true)
                return;
            if (exports.ClosedCaptionsWS.readyState === ws_1.default.OPEN)
                exports.ClosedCaptionsWS.send("CLEAR");
        }, 2_500);
        is_resolved = true;
        resolve();
        return;
    });
}
exports.streamSubtitles = streamSubtitles;
