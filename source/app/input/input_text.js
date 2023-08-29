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
exports.InputSystemText = void 0;
const readline = __importStar(require("readline"));
const input_interface_1 = require("./input_interface");
const Waifu_1 = require("../types/Waifu");
const Result_1 = require("../types/Result");
const Message_1 = require("../types/Message");
class InputSystemText {
    #cli_input_interface;
    #interrupt_next;
    constructor() {
        this.#cli_input_interface = readline.createInterface(process.stdin, process.stdout);
        this.#interrupt_next = false;
    }
    async initialize() {
        this.#cli_input_interface.removeAllListeners();
        this.#cli_input_interface.on('line', (input) => {
            Waifu_1.wAIfu.state.command_queue.pushBack(input);
        });
        return;
    }
    async free() {
        this.#cli_input_interface.removeAllListeners();
        this.#cli_input_interface.close();
    }
    interrupt() {
        this.#interrupt_next = true;
    }
    async awaitInput() {
        return new Promise((resolve) => {
            let resolved = false;
            setTimeout(() => {
                if (resolved === true)
                    return;
                resolved = true;
                resolve(new Result_1.Result(false, new Message_1.Message(), input_interface_1.REJECT_REASON.TIMEOUT));
                return;
            }, Waifu_1.wAIfu.state.config.behaviour.read_chat_after_x_seconds.value * 1000);
            const check_queue = () => {
                if (this.#interrupt_next === true) {
                    this.#interrupt_next = false;
                    resolve(new Result_1.Result(false, new Message_1.Message(), input_interface_1.REJECT_REASON.INTERRUPT));
                    return;
                }
                ;
                if (resolved === true)
                    return;
                if (Waifu_1.wAIfu.state.command_queue.notEmpty()) {
                    let message = {
                        "sender": Waifu_1.wAIfu.state.config._.user_name.value,
                        "content": Waifu_1.wAIfu.state.command_queue.consume(),
                        "trusted": true
                    };
                    resolve(new Result_1.Result(true, message, input_interface_1.REJECT_REASON.NONE));
                    return;
                }
                setTimeout(check_queue, 100);
            };
            check_queue();
        });
    }
}
exports.InputSystemText = InputSystemText;
