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
exports.getDeviceIndex = exports.getDevices = void 0;
const cproc = __importStar(require("child_process"));
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
function getDevices() {
    let output = cproc.spawnSync('python', ['audio_devices.py'], {
        cwd: process.cwd() + '/source/app/devices/',
        shell: false
    })
        .stdout;
    io_1.IO.debug('DEVICES:', output.toString('utf8'));
    return JSON.parse(output.toString('utf8'));
}
exports.getDevices = getDevices;
function getDeviceIndex(device_name) {
    return Waifu_1.wAIfu.state.devices[device_name] || 0;
}
exports.getDeviceIndex = getDeviceIndex;
