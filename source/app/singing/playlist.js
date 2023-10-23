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
exports.startPlaylist = void 0;
const fs = __importStar(require("fs"));
const get_audio_duration_1 = require("../audio_duration/get_audio_duration");
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
function startPlaylist() {
    const playlist = structuredClone(Waifu_1.wAIfu.state.config.singing.song_playlist.value);
    const PL_TIMEOUT_MIN = Waifu_1.wAIfu.state.config.singing.timeout_minutes_between_playlist_songs
        .value;
    const PL_TIMEOUT_MS = PL_TIMEOUT_MIN * 60 * 1_000;
    const PL_SIZE = playlist.length;
    if (playlist.length === 0)
        return;
    const listener = (index) => {
        test_label: if (index >= PL_SIZE) {
            io_1.IO.print("Finished playing playlist.");
            return;
        }
        const song_name = playlist[index];
        if (song_name === "") {
            setTimeout(() => listener(++index), PL_TIMEOUT_MS);
            return;
        }
        const PATH = process.cwd() + "/userdata/songs/" + song_name + "_vocals.wav";
        if (!fs.existsSync(PATH)) {
            io_1.IO.warn(`ERROR: Could not find song: ${song_name} even though it is in the playlist.\nMake sure both ${song_name}_vocals.wav and ${song_name}_instrumentals.wav are present in the folder userdata/songs/ folder.`);
            setTimeout(() => listener(++index), 0);
            return;
        }
        (0, get_audio_duration_1.getAudioDuration)(PATH).then((duration) => {
            setTimeout(() => listener(++index), PL_TIMEOUT_MS + duration + 100);
        });
        Waifu_1.wAIfu.state.command_queue.pushFront(`!sing ${song_name}`);
        return;
    };
    listener(0);
}
exports.startPlaylist = startPlaylist;
