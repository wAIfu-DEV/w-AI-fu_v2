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
exports.TextToSpeechAzureVoiceClone = void 0;
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
class TextToSpeechAzureVoiceClone {
    #azure_config;
    #player;
    #player_websocket = new ws_1.default(null);
    #player_websocket_server;
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
        this.#player_websocket_server = new ws_1.WebSocketServer({
            host: "127.0.0.1",
            port: 8769,
        });
    }
    initialize() {
        return new Promise((resolve) => {
            let resolved = false;
            this.#player_websocket_server.on("connection", (socket) => {
                this.#player_websocket = socket;
                this.#player_websocket.on("error", (err) => io_1.IO.print(err));
                this.#player_websocket.send("");
                if (resolved)
                    return;
                resolved = true;
                io_1.IO.debug("Loaded TextToSpeechAzure.");
                io_1.IO.warn("WARNING: In order to use RVC TTS models, you need to have RVC opened with a loaded voice model.");
                resolve();
            });
        });
    }
    free() {
        return new Promise((resolve) => {
            this.#player.on("close", () => {
                this.#player.removeAllListeners();
                this.#player_websocket_server.removeAllListeners();
                this.#player_websocket.removeAllListeners();
                this.#player_websocket.close();
                this.#player_websocket_server.close();
                let el = () => {
                    if (this.#player_websocket.readyState === ws_1.default.CLOSED) {
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
        this.#player_websocket.send("INTERRUPT");
        (0, stream_captions_1.clearStreamedSubtitles)();
    }
    #sendToAzure(ssml, file_path) {
        return new Promise((resolve) => {
            const audio_config = azure.AudioConfig.fromAudioFileOutput(file_path);
            const synthesizer = new azure.SpeechSynthesizer(this.#azure_config, audio_config);
            synthesizer.speakSsmlAsync(ssml, (result) => {
                if (result) {
                    synthesizer.close();
                    resolve(true);
                    return fs.createReadStream(file_path);
                }
                return undefined;
            }, (error) => {
                console.log(error);
                synthesizer.close();
                resolve(false);
            });
        });
    }
    #toClonedVoice(file_path, result_path) {
        return new Promise((resolve) => {
            let is_resolved = false;
            fetch("http://127.0.0.1:7897/run/infer_convert", {
                method: "POST",
                headers: {
                    accept: "*/*",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    data: [
                        0,
                        file_path,
                        0,
                        null,
                        "pm",
                        "",
                        "",
                        0.75,
                        3,
                        0,
                        0.25,
                        0.4,
                    ],
                }),
            })
                .then((response) => {
                response.json().then((val) => {
                    if (is_resolved === true)
                        return;
                    let file = val["data"][1]["name"];
                    let data = fs.readFileSync(file);
                    fs.writeFileSync(result_path, data);
                    is_resolved = true;
                    resolve(true);
                }, (reason) => io_1.IO.error(reason));
            })
                .catch((reason) => io_1.IO.error(reason));
            const timeout = () => {
                if (is_resolved === true)
                    return;
                is_resolved = true;
                resolve(false);
                return;
            };
            setTimeout(timeout, Waifu_1.wAIfu.state.config.text_to_speech.timeout_seconds.value * 1_000);
        });
    }
    generateSpeech(text, params) {
        return new Promise((resolve) => {
            const id = crypto.randomUUID();
            let tmp_file_path = AUDIO_PATH + "tmp_" + id + ".wav";
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
            let pitch_modifier = params.is_narrator
                ? Waifu_1.wAIfu.state.config.text_to_speech.azure_narrator_pitch_percentage.value.toString()
                : Waifu_1.wAIfu.state.config.text_to_speech.azure_pitch_percentage.value.toString();
            const ssml = '<speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis"  xml:lang="en-US">' +
                `<voice name="${params.voice.trim()}">` +
                `<prosody pitch="${pitch_modifier}%">${sanitized_text.trim()}</prosody>` +
                "</voice></speak>";
            if (Waifu_1.wAIfu.state?.config.text_to_speech.rvc_voice_cloning.value ===
                false ||
                params.is_narrator === true) {
                tmp_file_path = file_path;
            }
            this.#sendToAzure(ssml, tmp_file_path).then((success) => {
                if (!success) {
                    resolve(new Result_1.Result(false, id, tts_interface_1.TTS_GEN_ERROR.RESPONSE_FAILURE));
                    return;
                }
                if (Waifu_1.wAIfu.state?.config.text_to_speech.rvc_voice_cloning
                    .value === false ||
                    params.is_narrator === true) {
                    resolve(new Result_1.Result(true, id, tts_interface_1.TTS_GEN_ERROR.NONE));
                    return;
                }
                this.#toClonedVoice(tmp_file_path, file_path).then((success) => {
                    fs.unlinkSync(tmp_file_path);
                    if (!success) {
                        resolve(new Result_1.Result(false, id, tts_interface_1.TTS_GEN_ERROR.RESPONSE_FAILURE));
                        return;
                    }
                    resolve(new Result_1.Result(true, id, tts_interface_1.TTS_GEN_ERROR.NONE));
                });
            });
        });
    }
    async playSpeech(id, options) {
        await_connect: while (true) {
            if (this.#player_websocket.readyState === ws_1.default.OPEN)
                break await_connect;
            await new Promise((resolve) => setTimeout(() => resolve(), 100));
        }
        return new Promise((resolve) => {
            let resolved = false;
            this.#player_websocket.send("PLAY_WAV " +
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
                this.#player_websocket.removeEventListener("message", el);
                return;
            };
            this.#player_websocket.addEventListener("message", el);
        });
    }
}
exports.TextToSpeechAzureVoiceClone = TextToSpeechAzureVoiceClone;
