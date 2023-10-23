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
exports.readParseAs = exports.readParseJSON = void 0;
const fs = __importStar(require("fs"));
const Helper_1 = require("../types/Helper");
const io_1 = require("../io/io");
var READPARSE_ERROR;
(function (READPARSE_ERROR) {
    READPARSE_ERROR["NONE"] = "NONE";
    READPARSE_ERROR["READ_ERROR"] = "READ_ERROR";
    READPARSE_ERROR["PARSE_ERROR"] = "PARSE_ERROR";
})(READPARSE_ERROR || (READPARSE_ERROR = {}));
function readParseJSON(path) {
    let raw_data;
    try {
        raw_data = fs.readFileSync(path, { encoding: 'utf8' });
    }
    catch (error) {
        io_1.IO.warn('ERROR: Could not read file', path);
        return {
            success: true,
            value: {},
            error: READPARSE_ERROR.READ_ERROR
        };
    }
    let json_obj;
    try {
        json_obj = JSON.parse(raw_data);
    }
    catch (error) {
        io_1.IO.warn('ERROR: Could not parse file', path);
        return {
            success: true,
            value: {},
            error: READPARSE_ERROR.PARSE_ERROR
        };
    }
    return {
        success: true,
        value: json_obj,
        error: READPARSE_ERROR.NONE
    };
}
exports.readParseJSON = readParseJSON;
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
