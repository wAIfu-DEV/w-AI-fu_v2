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
        this.#child_process = cproc.spawn('python', ['novel_llm.py'], {
            cwd: process.cwd() + '/source/app/novelai_api/',
            env: {
                NAI_USERNAME: Waifu_1.wAIfu.state.auth["novelai"]["mail"],
                NAI_PASSWORD: Waifu_1.wAIfu.state.auth["novelai"]["password"]
            },
            detached: false, shell: false
        });
        this.#child_process.stderr?.on('data', (data) => {
            io_1.IO.warn(data.toString());
        });
        this.#child_process.stdout?.on('data', (data) => {
            io_1.IO.print(data.toString());
        });
        this.#websocket_server = new ws_1.WebSocketServer({ host: '127.0.0.1', port: 8765 });
    }
    async initialize() {
        return new Promise((resolve) => {
            this.#websocket_server.on('connection', (socket) => {
                this.#websocket = socket;
                this.#websocket.on('error', (err) => io_1.IO.print(err));
                this.#websocket.send('');
                resolve();
            });
        });
    }
    async free() {
        return new Promise(resolve => {
            this.#child_process.on('close', () => {
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
                    ;
                    setTimeout(el, 100);
                };
                setTimeout(el, 100);
            });
            this.#child_process.kill(2);
        });
    }
    async generate(prompt, args) {
        await_connect: while (true) {
            if (this.#websocket.readyState === ws_1.default.OPEN)
                break await_connect;
            await new Promise((resolve) => setTimeout(() => resolve(), 100));
        }
        return new Promise((resolve) => {
            this.#websocket.send("GENERATE " + JSON.stringify({
                "prompt": prompt,
                "config": args
            }));
            const el = (ev) => {
                let resp = ev.data.toString('utf8');
                let split_data = resp.split(' ');
                let prefix = split_data[0];
                let result;
                switch (prefix) {
                    case "TEXT":
                        {
                            let payload = split_data.slice(1, undefined)
                                .join(' ');
                            if (/\n$/g.test(payload) === false) {
                                payload += '\n';
                            }
                            result = new Result_1.Result(true, payload, llm_interface_1.LLM_GEN_ERRORS.NONE);
                        }
                        break;
                    case "ERROR":
                        {
                            let err_type = split_data[1];
                            let err_msg = split_data.slice(2, undefined)
                                .join(' ');
                            result = new Result_1.Result(false, err_msg, err_type);
                        }
                        break;
                    default:
                        result = new Result_1.Result(false, 'Received undefined response from LLM.', llm_interface_1.LLM_GEN_ERRORS.UNDEFINED);
                        break;
                }
                resolve(result);
                this.#websocket.removeEventListener('message', el);
                return;
            };
            this.#websocket.addEventListener('message', el);
        });
    }
}
exports.LargeLanguageModelNovelAI = LargeLanguageModelNovelAI;
