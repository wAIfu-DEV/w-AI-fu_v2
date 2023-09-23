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
exports.writeConfig = void 0;
const fs = __importStar(require("fs"));
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
function writeConfig(config, file_name) {
    let file = file_name;
    if (file === null || file === undefined) {
        if (Waifu_1.wAIfu.state === undefined)
            return;
        Waifu_1.wAIfu.state.current_preset = 'config.json';
        file = 'config.json';
        Waifu_1.wAIfu.dependencies?.ui?.send("PRESETS", { presets: Waifu_1.wAIfu.state.presets, current: Waifu_1.wAIfu.state.current_preset });
    }
    try {
        fs.writeFileSync(process.cwd() + "/userdata/config/" + file, JSON.stringify(config));
    }
    catch {
        io_1.IO.warn('ERROR: Failed to write config to file.');
    }
}
exports.writeConfig = writeConfig;
