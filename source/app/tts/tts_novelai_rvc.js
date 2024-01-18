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
exports.TextToSpeechNovelAiVoiceClone = void 0;
const cproc = __importStar(require("child_process"));
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const ws_1 = __importStar(require("ws"));
const Waifu_1 = require("../types/Waifu");
const Result_1 = require("../types/Result");
const io_1 = require("../io/io");
const tts_interface_1 = require("./tts_interface");
const stream_captions_1 = require("../closed_captions/stream_captions");
class TextToSpeechNovelAiVoiceClone {
    #child_process;
    #websocket = new ws_1.default(null);
    #websocket_server;
    skip = false;
    constructor() {
        this.#child_process = cproc.spawn(Waifu_1.ENV.PYTHON_PATH, ["novel_tts.py"], {
            cwd: process.cwd() + "/source/app/novelai_api/",
            env: {
                NAI_USERNAME: Waifu_1.wAIfu.state.auth["novelai"]["mail"],
                NAI_PASSWORD: Waifu_1.wAIfu.state.auth["novelai"]["password"],
                CWD: process.cwd(),
            },
            detached: false,
            shell: false,
        });
        this.#child_process.stderr?.on("data", (data) => {
            io_1.IO.warn(data.toString());
        });
        this.#child_process.stdout?.on("data", (data) => {
            io_1.IO.print(data.toString());
        });
        this.#websocket_server = new ws_1.WebSocketServer({
            host: "127.0.0.1",
            port: 8766,
        });
    }
    initialize() {
        return new Promise((resolve) => {
            this.#websocket_server.on("connection", (socket) => {
                this.#websocket = socket;
                this.#websocket.on("error", (err) => io_1.IO.print(err));
                this.#websocket.send("");
                io_1.IO.debug("Loaded TextToSpeechNovelAI.");
                io_1.IO.warn("WARNING: In order to use RVC TTS models, you need to have RVC opened with a loaded voice model.");
                resolve();
            });
        });
    }
    free() {
        return new Promise((resolve) => {
            this.#child_process.on("close", () => {
                this.#child_process.removeAllListeners();
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
            this.#child_process.kill(2);
        });
    }
    #parseData(data, expected_id) {
        let split_data = data.split(" ");
        if (split_data[0] !== expected_id)
            return null;
        switch (split_data[1]) {
            case "ERROR": {
                let err_type = split_data[2];
                let err_msg = split_data.slice(3, undefined).join(" ");
                return new Result_1.Result(false, err_msg, err_type);
            }
            default: {
                return new Result_1.Result(true, split_data[0], tts_interface_1.TTS_GEN_ERROR.NONE);
            }
        }
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
                        "rmvpe",
                        "",
                        "",
                        0.8,
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
    generateSpeech(text, options) {
        return new Promise((resolve) => {
            let expected_id = crypto.randomUUID();
            let is_resolved = false;
            this.#websocket.send("GENERATE " +
                JSON.stringify({
                    prompt: text,
                    options: {
                        voice_seed: options.voice,
                    },
                    concurrent_id: expected_id,
                }));
            const el = (ev) => {
                if (is_resolved === true)
                    return;
                const result = this.#parseData(ev.data.toString("utf8"), expected_id);
                if (result === null)
                    return;
                is_resolved = true;
                if (Waifu_1.wAIfu.state?.config.text_to_speech.rvc_voice_cloning
                    .value === false ||
                    options.is_narrator === true) {
                    resolve(new Result_1.Result(true, expected_id, tts_interface_1.TTS_GEN_ERROR.NONE));
                    return;
                }
                const path = process.cwd() +
                    "/source/app/novelai_api/audio/" +
                    expected_id +
                    ".mp3";
                this.#toClonedVoice(path, path).then((_) => {
                    resolve(result);
                    this.#websocket.removeEventListener("message", el);
                });
            };
            const timeout = () => {
                if (is_resolved === true)
                    return;
                is_resolved = true;
                resolve(new Result_1.Result(false, "Timed out while waiting for TTS response.", tts_interface_1.TTS_GEN_ERROR.RESPONSE_TIMEOUT));
                this.#websocket.removeEventListener("message", el);
                return;
            };
            setTimeout(timeout, Waifu_1.wAIfu.state.config.text_to_speech.timeout_seconds.value * 1_000);
            this.#websocket.addEventListener("message", el);
        });
    }
    playSpeech(id, options) {
        return new Promise((resolve) => {
            let is_resolved = false;
            this.#websocket.send("PLAY " +
                JSON.stringify({
                    id: id,
                    options: {
                        device: options.device,
                        volume_modifier: options.volume_modifier,
                    },
                }));
            const el = (ev) => {
                if (is_resolved === true)
                    return;
                if (ev.data.toString("utf8") !== "PLAY DONE")
                    return;
                is_resolved = true;
                resolve(new Result_1.Result(true, undefined, tts_interface_1.TTS_PLAY_ERROR.NONE));
                this.#websocket.removeEventListener("message", el);
                return;
            };
            this.#websocket.addEventListener("message", el);
        });
    }
    interrupt() {
        this.skip = true;
        this.#websocket.send("INTERRUPT");
        (0, stream_captions_1.clearStreamedSubtitles)();
    }
}
exports.TextToSpeechNovelAiVoiceClone = TextToSpeechNovelAiVoiceClone;
