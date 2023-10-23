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
exports.setClosedCaptions_impl = void 0;
const fs = __importStar(require("fs"));
const get_audio_duration_1 = require("../audio_duration/get_audio_duration");
const stream_captions_1 = require("./stream_captions");
function setClosedCaptions_impl(text, id, persistent = false, is_narrator = false) {
    fs.writeFile(process.cwd() + "/closed_captions.txt", text, (err) => {
        if (err === null)
            return;
        throw err;
    });
    if (text === "")
        return;
    if (id === "") {
        (0, stream_captions_1.streamSubtitles)(text, 0, persistent, is_narrator);
        return;
    }
    (0, get_audio_duration_1.getAudioDuration)(process.cwd() + "/source/app/novelai_api/audio/" + id + ".mp3").then((value) => {
        (0, stream_captions_1.streamSubtitles)(text, value, persistent, is_narrator);
    });
}
exports.setClosedCaptions_impl = setClosedCaptions_impl;
