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
exports.TextToSpeechAzure = void 0;
const azure = require("microsoft-cognitiveservices-speech-sdk");
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const cproc = __importStar(require("child_process"));
const ws_1 = __importStar(require("ws"));
const Result_1 = require("../types/Result");
const tts_interface_1 = require("./tts_interface");
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
const stream_captions_1 = require("../closed_captions/stream_captions");
const AUDIO_PATH = process.cwd() + "/source/app/audio/";
class TextToSpeechAzure {
    #azure_config;
    #player;
    #websocket = new ws_1.default(null);
    #websocket_server;
    skip = false;
    constructor() {
        process.env["SPEECH_KEY"] = Waifu_1.wAIfu.state.auth.azure.token;
        process.env["SPEECH_REGION"] = Waifu_1.wAIfu.state.auth.azure.region;
        this.#azure_config = azure.SpeechConfig.fromSubscription(Waifu_1.wAIfu.state.auth.azure.token, Waifu_1.wAIfu.state.auth.azure.region);
        this.#player = cproc.spawn(Waifu_1.ENV.PYTHON_PATH, ["player.py"], {
            cwd: AUDIO_PATH,
            env: {
                CWD: AUDIO_PATH,
            },
            detached: false,
            shell: false,
        });
        this.#player.stderr?.on("data", (data) => {
            io_1.IO.warn(data.toString());
        });
        this.#player.stdout?.on("data", (data) => {
            io_1.IO.print(data.toString());
        });
        this.#websocket_server = new ws_1.WebSocketServer({
            host: "127.0.0.1",
            port: 8769,
        });
    }
    initialize() {
        return new Promise((resolve) => {
            this.#websocket_server.on("connection", (socket) => {
                this.#websocket = socket;
                this.#websocket.on("error", (err) => io_1.IO.print(err));
                this.#websocket.send("");
                io_1.IO.debug("Loaded TextToSpeechAzure.");
                resolve();
            });
        });
    }
    free() {
        return new Promise((resolve) => {
            this.#player.on("close", () => {
                this.#player.removeAllListeners();
                this.#websocket_server.removeAllListeners();
                this.#websocket.removeAllListeners();
                this.#websocket.close();
                this.#websocket_server.close();
                let el = () => {
                    if (this.#websocket.readyState === ws_1.default.CLOSED) {
                        resolve();
                        return;
                    }
                    setTimeout(el, 100);
                };
                setTimeout(el, 100);
            });
            this.#player.kill(2);
        });
    }
    interrupt() {
        this.skip = true;
        this.#websocket.send("INTERRUPT");
        (0, stream_captions_1.clearStreamedSubtitles)();
    }
    generateSpeech(text, params) {
        return new Promise((resolve) => {
            const id = crypto.randomUUID();
            const file_path = AUDIO_PATH + id + ".wav";
            const sanitized_text = text
                .replaceAll("&", "&amp;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&apos;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;");
            let volume_modifier = Waifu_1.wAIfu.state.config.text_to_speech.volume_modifier_db.value.toString();
            if (!volume_modifier.startsWith("-"))
                volume_modifier = "+" + volume_modifier;
            let pitch_modifier = Waifu_1.wAIfu.state.config.text_to_speech.azure_pitch_percentage.value.toString();
            const ssml = '<speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis"  xml:lang="en-US">' +
                `<voice name="${params.voice.trim()}">` +
                `<prosody pitch="${pitch_modifier}%">${sanitized_text.trim()}</prosody>` +
                "</voice></speak>";
            io_1.IO.print(ssml);
            const audio_config = azure.AudioConfig.fromAudioFileOutput(file_path);
            const synthesizer = new azure.SpeechSynthesizer(this.#azure_config, audio_config);
            synthesizer.speakSsmlAsync(ssml, (result) => {
                if (result) {
                    synthesizer.close();
                    resolve(new Result_1.Result(true, id, tts_interface_1.TTS_GEN_ERROR.NONE));
                    return fs.createReadStream(file_path);
                }
                return undefined;
            }, (error) => {
                console.log(error);
                synthesizer.close();
            });
        });
    }
    async playSpeech(id, options) {
        await_connect: while (true) {
            if (this.#websocket.readyState === ws_1.default.OPEN)
                break await_connect;
            await new Promise((resolve) => setTimeout(() => resolve(), 100));
        }
        return new Promise((resolve) => {
            let resolved = false;
            this.#websocket.send("PLAY_WAV " +
                JSON.stringify({
                    id: id,
                    options: {
                        device: options.device,
                        volume_modifier: options.volume_modifier,
                    },
                }));
            const el = () => {
                if (resolved === true)
                    return;
                resolved = true;
                resolve(new Result_1.Result(true, undefined, tts_interface_1.TTS_PLAY_ERROR.NONE));
                this.#websocket.removeEventListener("message", el);
                return;
            };
            this.#websocket.addEventListener("message", el);
        });
    }
}
exports.TextToSpeechAzure = TextToSpeechAzure;
