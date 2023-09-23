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
exports.getPreset_impl = void 0;
const fs = __importStar(require("fs"));
function getPreset_impl(available_presets) {
    const CONFIG_PATH = process.cwd() + "/userdata/config";
    const PRESET_PATH = CONFIG_PATH + "/preset.txt";
    let preset = "";
    try {
        preset = fs.readFileSync(PRESET_PATH, { encoding: "utf8" });
    }
    catch {
        return getFirstAvailablePreset(available_presets);
    }
    if (available_presets.indexOf(preset) === -1) {
        return getFirstAvailablePreset(available_presets);
    }
    return preset;
}
exports.getPreset_impl = getPreset_impl;
function getFirstAvailablePreset(available_presets) {
    let first_available_preset = available_presets[0];
    if (first_available_preset === undefined)
        return null;
    return first_available_preset;
}
