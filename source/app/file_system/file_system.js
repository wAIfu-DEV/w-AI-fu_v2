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
exports.readParseAs = void 0;
const fs = __importStar(require("fs"));
const Helper_1 = require("../types/Helper");
const io_1 = require("../io/io");
function readParseAs(path, sentinel_value) {
    let data;
    try {
        data = fs.readFileSync(path);
    }
    catch (error) {
        io_1.IO.warn('ERROR: Could not read file', path);
        fs.writeFileSync(path, JSON.stringify(sentinel_value));
        return sentinel_value;
    }
    let parsed_obj;
    try {
        parsed_obj = JSON.parse(data.toString('utf-8'));
    }
    catch (error) {
        io_1.IO.warn('ERROR: Could not parse file', path);
        fs.writeFileSync(path, JSON.stringify(sentinel_value));
        return sentinel_value;
    }
    if ((0, Helper_1.isOfClass)(parsed_obj, sentinel_value) === false) {
        let fixed_config_result = (0, Helper_1.addMissingFields)(parsed_obj, sentinel_value);
        if (fixed_config_result.success === false) {
            io_1.IO.warn('ERROR: Failed to reconstruct incomplete config file with error message:', fixed_config_result.error);
            fs.writeFileSync(path, JSON.stringify(sentinel_value));
            return sentinel_value;
        }
        return fixed_config_result.value;
    }
    return parsed_obj;
}
exports.readParseAs = readParseAs;
