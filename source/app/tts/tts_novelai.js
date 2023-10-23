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
exports.TextToSpeechNovelAI = void 0;
const cproc = __importStar(require("child_process"));
const ws_1 = __importStar(require("ws"));
const Waifu_1 = require("../types/Waifu");
const Result_1 = require("../types/Result");
const io_1 = require("../io/io");
const tts_interface_1 = require("./tts_interface");
const stream_captions_1 = require("../closed_captions/stream_captions");
const GENERATION_TIMEOUT_MS = 10_000;
class TextToSpeechNovelAI {
    #child_process;
    #websocket = new ws_1.default(null);
    #websocket_server;
    #current_generations = 0;
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
                io_1.IO.debug("Loaded TextToSpeechAzure.");
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
    async generateSpeech(text, options) {
        await_connect: while (true) {
            if (this.#websocket.readyState === ws_1.default.OPEN)
                break await_connect;
            await new Promise((resolve) => setTimeout(() => resolve(), 100));
        }
        this.#current_generations += 1;
        let expected_id = this.#current_generations;
        return new Promise((resolve) => {
            let is_resolved = false;
            this.#websocket.send("GENERATE " +
                JSON.stringify({
                    prompt: text,
                    options: {
                        voice_seed: options.voice,
                    },
                    concurrent_id: expected_id,
                }));
            const timeout = () => {
                if (is_resolved === true)
                    return;
                is_resolved = true;
                resolve(new Result_1.Result(false, "Timed out while waiting for TTS response.", tts_interface_1.TTS_GEN_ERROR.RESPONSE_TIMEOUT));
                return;
            };
            setTimeout(timeout, GENERATION_TIMEOUT_MS);
            const el = (ev) => {
                if (is_resolved === true)
                    return;
                let split_data = ev.data.toString("utf8").split(" ");
                if (split_data[0] !== String(expected_id))
                    return;
                this.#current_generations -= 1;
                switch (split_data[1]) {
                    case "ERROR":
                        {
                            let err_type = split_data[2];
                            let err_msg = split_data
                                .slice(3, undefined)
                                .join(" ");
                            is_resolved = true;
                            resolve(new Result_1.Result(false, err_msg, err_type));
                        }
                        break;
                    default: {
                        let return_id = split_data.slice(1, undefined).join("");
                        is_resolved = true;
                        resolve(new Result_1.Result(true, return_id, tts_interface_1.TTS_GEN_ERROR.NONE));
                    }
                }
                this.#websocket.removeEventListener("message", el);
            };
            this.#websocket.addEventListener("message", el);
        });
    }
    async playSpeech(id, options) {
        await_connect: while (true) {
            if (this.#websocket.readyState === ws_1.default.OPEN)
                break await_connect;
            await new Promise((resolve) => setTimeout(() => resolve(), 100));
        }
        this.#websocket.send("PLAY " +
            JSON.stringify({
                id: id,
                options: {
                    device: options.device,
                    volume_modifier: options.volume_modifier,
                },
            }));
        return new Promise((resolve) => {
            let resolved = false;
            const el = () => {
                if (resolved === true)
                    return;
                resolved = true;
                this.#current_generations -= 1;
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
exports.TextToSpeechNovelAI = TextToSpeechNovelAI;
