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
exports.LargeLanguageModelCharacterAI = void 0;
const cproc = __importStar(require("child_process"));
const Result_1 = require("../types/Result");
const llm_interface_1 = require("./llm_interface");
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
class LargeLanguageModelCharacterAI {
    #child_process;
    constructor() {
        this.#child_process = cproc.spawn('python', ['characterai_llm.py'], {
            cwd: process.cwd() + '/source/app/characterai_api/',
            env: {
                CAI_TOKEN: Waifu_1.wAIfu.state.auth["characterai"]["token"],
                CHARACTER: JSON.stringify(Waifu_1.wAIfu.state.characters[Waifu_1.wAIfu.state.config._.character_name.value])
            },
            detached: false, shell: false
        });
        this.#child_process.stderr?.on('data', (data) => {
            io_1.IO.warn(data.toString());
        });
        this.#child_process.stdout?.on('data', (data) => {
            io_1.IO.print(data.toString());
        });
    }
    async initialize() {
    }
    async free() {
    }
    async generate(prompt, settings) {
        return new Result_1.Result(false, '', llm_interface_1.LLM_GEN_ERRORS.UNDEFINED);
    }
}
exports.LargeLanguageModelCharacterAI = LargeLanguageModelCharacterAI;
