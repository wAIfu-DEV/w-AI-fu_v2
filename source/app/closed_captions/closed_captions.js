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
const Waifu_1 = require("../types/Waifu");
function setClosedCaptions_impl(text, options = undefined) {
    if (options === undefined) {
        options = {
            id: undefined,
            is_narrator: false,
            persistent: false,
        };
    }
    fs.writeFile(process.cwd() + "/closed_captions.txt", text, (err) => {
        if (err === null)
            return;
        throw err;
    });
    if (text === "")
        return;
    if (options.id === undefined || options.id === "") {
        (0, stream_captions_1.streamSubtitles)(text, {
            is_narrator: options.is_narrator || false,
            persistant: options.persistent || false,
        });
        return;
    }
    (0, get_audio_duration_1.getAudioDuration)(Waifu_1.wAIfu.state?.config.text_to_speech.tts_provider.value === "novelai" ||
        Waifu_1.wAIfu.state?.config.text_to_speech.tts_provider.value ===
            "novelai+rvc"
        ? process.cwd() +
            "/source/app/novelai_api/audio/" +
            options.id +
            ".mp3"
        : process.cwd() + "/source/app/audio/" + options.id + ".wav").then((value) => {
        if (options === undefined)
            return;
        (0, stream_captions_1.streamSubtitles)(text, {
            time_ms: value,
            is_narrator: options.is_narrator,
            persistant: options.persistent,
        });
    });
}
exports.setClosedCaptions_impl = setClosedCaptions_impl;
