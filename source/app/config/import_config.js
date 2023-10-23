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
exports.importFromFile_impl = void 0;
const fs = __importStar(require("fs"));
const config_1 = require("./config");
const io_1 = require("../io/io");
const Helper_1 = require("../types/Helper");
const generate_updated_config_1 = require("./generate_updated_config");
function importFromFile_impl(preset) {
    if (preset === null || preset === undefined)
        return new config_1.Config();
    const CONFIG_PATH = process.cwd() + "/userdata/config/";
    let raw_data;
    try {
        raw_data = fs.readFileSync(CONFIG_PATH + preset, { encoding: "utf8" });
    }
    catch {
        io_1.IO.warn("ERROR: Could not load preset:", preset);
        return new config_1.Config();
    }
    let json_obj;
    try {
        json_obj = JSON.parse(raw_data);
    }
    catch {
        io_1.IO.warn("ERROR: Could not parse preset:", preset);
        return new config_1.Config();
    }
    if ((0, Helper_1.isOfClassDeep)(json_obj, new config_1.Config(), {
        add_missing_fields: true,
        obj_name: "config",
        print: false,
    }) === false) {
        io_1.IO.warn("ERROR: Preset file", preset, " did not pass sanity test.");
        return new config_1.Config();
    }
    return (0, generate_updated_config_1.generateUpdatedConfig)(json_obj);
}
exports.importFromFile_impl = importFromFile_impl;
