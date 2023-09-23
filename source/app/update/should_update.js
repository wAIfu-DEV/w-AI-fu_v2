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
exports.checkUpdates = void 0;
const fs = __importStar(require("fs"));
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
async function checkUpdates() {
    if (fs.existsSync(process.cwd() + '/.noupdate') === true)
        return;
    let query;
    try {
        query = await fetch('https://api.github.com/repos/wAIfu-DEV/w-AI-fu_v2/tags');
    }
    catch (e) {
        io_1.IO.warn('Error: Could not contact github while trying to get latest version.');
        return;
    }
    let data;
    try {
        data = await query.json();
    }
    catch {
        io_1.IO.warn('Error: Could not retreive latest version from github.');
        return;
    }
    if (typeof data !== 'object' || data === null || data === undefined) {
        io_1.IO.warn('Error: Fetched invalid data from github while trying to retreive latest version.');
        return;
    }
    let latest_version = data[0];
    if (latest_version === undefined
        || latest_version === null
        || typeof latest_version !== "object") {
        io_1.IO.warn('Error: Fetched invalid data from github while trying to retreive latest version.');
        return;
    }
    if ("name" in latest_version && Waifu_1.wAIfu.getVersion() !== latest_version["name"]) {
        const new_version = String(latest_version["name"]);
        Waifu_1.wAIfu.dependencies?.ui?.send('UPDATE', { version: new_version });
    }
}
exports.checkUpdates = checkUpdates;
