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
exports.__getAudioDuration = exports.getAudioDuration = void 0;
const cproc = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
function getAudioDuration(absolute_path) {
    return new Promise((resolve) => {
        cproc.exec(`${process.cwd()}\\bin\\ffmpeg\\ffmpeg.exe -i "${absolute_path}"`, (_error, _stdout, stder) => {
            let results = /[0-9]{2}\:[0-9]{2}\:[0-9]{2}\.[0-9]{2}/g.exec(stder);
            if (results === null)
                return 0;
            let split_time = results?.[0].split(/\:|\./g);
            let hours = parseInt(split_time[0]) * 3_600_000;
            let minutes = parseInt(split_time[1]) * 60_000;
            let seconds = parseInt(split_time[2]) * 1_000;
            let mseconds = parseInt(split_time[3]) * 10;
            resolve(hours + minutes + seconds + mseconds);
            return;
        });
    });
}
exports.getAudioDuration = getAudioDuration;
function __getAudioDuration(file_id) {
    return new Promise((resolve) => {
        let wav_buff = fs.readFileSync(`${process.cwd()}\\source\\app\\novelai_api\\audio\\${file_id}.mp3`);
        var audio_context = new window.AudioContext();
        audio_context.decodeAudioData(wav_buff.buffer, (audio_buffer) => {
            resolve(Math.round(audio_buffer.duration * 1_000));
        });
    });
}
exports.__getAudioDuration = __getAudioDuration;
