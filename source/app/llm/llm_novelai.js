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
exports.LargeLanguageModelNovelAI = void 0;
const ws_1 = __importStar(require("ws"));
const crypto = __importStar(require("crypto"));
const cproc = __importStar(require("child_process"));
const Result_1 = require("../types/Result");
const llm_interface_1 = require("./llm_interface");
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
class LargeLanguageModelNovelAI {
    #child_process;
    #websocket = new ws_1.default(null);
    #websocket_server;
    constructor() {
        this.#child_process = cproc.spawn(Waifu_1.ENV.PYTHON_PATH, ["novel_llm.py"], {
            cwd: process.cwd() + "/source/app/novelai_api/",
            env: {
                NAI_USERNAME: Waifu_1.wAIfu.state.auth["novelai"]["mail"],
                NAI_PASSWORD: Waifu_1.wAIfu.state.auth["novelai"]["password"],
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
            port: 8765,
        });
    }
    async initialize() {
        return new Promise((resolve) => {
            this.#websocket_server.on("connection", (socket) => {
                this.#websocket = socket;
                this.#websocket.on("error", (err) => io_1.IO.print(err));
                this.#websocket.send("");
                io_1.IO.debug("Loaded LargeLanguageModelNovelAI.");
                resolve();
            });
        });
    }
    async free() {
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
    async generate(prompt, args) {
        return new Promise((resolve) => {
            let is_resolved = false;
            const expected_id = crypto.randomUUID();
            args["model"] =
                Waifu_1.wAIfu.state.config.large_language_model.novelai_model.value;
            this.#websocket.send("GENERATE " +
                JSON.stringify({
                    prompt: prompt + args.character_name + ":",
                    config: args,
                    id: expected_id,
                }));
            const timeout = () => {
                if (is_resolved === true)
                    return;
                is_resolved = true;
                resolve(new Result_1.Result(false, "Timed out while waiting for LLM response.", llm_interface_1.LLM_GEN_ERRORS.RESPONSE_TIMEOUT));
            };
            setTimeout(timeout, Waifu_1.wAIfu.state.config.large_language_model.timeout_seconds.value *
                1_000);
            const el = (ev) => {
                let resp = ev.data.toString("utf8");
                let split_data = resp.split(" ");
                let id = split_data[0];
                if (id !== expected_id)
                    return;
                let prefix = split_data[1];
                let result;
                switch (prefix) {
                    case "TEXT":
                        {
                            let payload = split_data
                                .slice(2, undefined)
                                .join(" ");
                            if (/\n$/g.test(payload) === false) {
                                payload += "\n";
                            }
                            result = new Result_1.Result(true, payload, llm_interface_1.LLM_GEN_ERRORS.NONE);
                        }
                        break;
                    case "ERROR":
                        {
                            let err_type = split_data[1];
                            let err_msg = split_data
                                .slice(3, undefined)
                                .join(" ");
                            result = new Result_1.Result(false, err_msg, err_type);
                        }
                        break;
                    default:
                        result = new Result_1.Result(false, "Received undefined response from LLM.", llm_interface_1.LLM_GEN_ERRORS.UNDEFINED);
                        break;
                }
                if (is_resolved === true)
                    return;
                is_resolved = true;
                resolve(result);
                this.#websocket.removeEventListener("message", el);
                return;
            };
            this.#websocket.addEventListener("message", el);
        });
    }
}
exports.LargeLanguageModelNovelAI = LargeLanguageModelNovelAI;
