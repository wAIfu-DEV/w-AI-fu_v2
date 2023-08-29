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
function regenConfigFromBackup() {
    fs.writeFileSync(config_1.Config.CONFIG_PATH, fs.readFileSync(config_1.Config.CONFIG_BACKUP_PATH, { encoding: 'utf8' }));
}
function importFromFile_impl(tries = 0) {
    if (tries > 5) {
        io_1.IO.error('CRITICAL ERROR:', 'Ran out of tries when attempting to read config.', 'Please reinstall the application and move the contents of the "userdata" folder', 'to the new install, without including the "config" folder inside.');
        process.exit(1);
        return new config_1.Config();
    }
    let mut_raw_data;
    try {
        mut_raw_data = fs.readFileSync(config_1.Config.CONFIG_PATH, { encoding: 'utf8' });
    }
    catch (error) {
        io_1.IO.warn('ERROR: Could not read config file. w-AI-fu will try to generate a new one.');
        regenConfigFromBackup();
        return importFromFile_impl(tries + 1);
    }
    const raw_data = mut_raw_data;
    let json_obj;
    try {
        json_obj = JSON.parse(raw_data);
    }
    catch (error) {
        io_1.IO.warn('ERROR: Could not parse config file. w-AI-fu will try to generate a new one.');
        regenConfigFromBackup();
        return importFromFile_impl(tries + 1);
    }
    if (typeof json_obj !== "object") {
        io_1.IO.warn('ERROR: Parsed config is not an object.');
        regenConfigFromBackup();
        return importFromFile_impl(tries + 1);
    }
    if (json_obj === undefined || json_obj === null) {
        io_1.IO.warn('ERROR: Parsed config object is undefined.');
        regenConfigFromBackup();
        return importFromFile_impl(tries + 1);
    }
    let FIELDS_TYPES_DICT = {
        "string": new config_1.ConfigFieldString(),
        "number": new config_1.ConfigFieldNumber(),
        "boolean": new config_1.ConfigFieldBoolean(),
        "select": new config_1.ConfigFieldSelect(),
        "list": new config_1.ConfigFieldList(),
        "vts_emotions_list": new config_1.ConfigFieldVtsEmotionList(),
        "contextual_memory_list": new config_1.ConfigFieldContextualMemoryList()
    };
    for (let [main_field, main_value] of Object.entries(new config_1.Config())) {
        if (main_field in json_obj === false) {
            io_1.IO.warn(`ERROR: Field "${main_field}" is missing from the parsed config file. w-AI-fu will try to generate a new one.`);
            regenConfigFromBackup();
            return importFromFile_impl(tries + 1);
        }
        for (let [field, field_obj] of Object.entries(main_value)) {
            if (typeof field_obj !== "object" || field_obj === null || field_obj === undefined) {
                io_1.IO.warn(`ERROR: Field "${main_field}.${field}" in config is not an object. w-AI-fu will try to generate a new one.`);
                regenConfigFromBackup();
                return importFromFile_impl(tries + 1);
            }
            if ("type" in field_obj === false) {
                io_1.IO.warn(`ERROR: Field "type" is missing from "${main_field}.${field}" in config. w-AI-fu will try to generate a new one.`);
                regenConfigFromBackup();
                return importFromFile_impl(tries + 1);
            }
            if ("type" in field_obj && typeof field_obj["type"] !== "string") {
                io_1.IO.warn(`ERROR: Field "type" in "${main_field}.${field}" in config should be a string. w-AI-fu will try to generate a new one.`);
                regenConfigFromBackup();
                return importFromFile_impl(tries + 1);
            }
            let config_type = FIELDS_TYPES_DICT[field_obj["type"]];
            for (let [expected_field, _] of Object.entries(config_type)) {
                if (expected_field in field_obj === false) {
                    io_1.IO.warn(`ERROR: Missing field "${expected_field}" in "${main_field}.${field}" in config. w-AI-fu will try to generate a new one.`);
                    regenConfigFromBackup();
                    return importFromFile_impl(tries + 1);
                }
                if (typeof field_obj[expected_field] !== typeof config_type[expected_field]) {
                    io_1.IO.warn(`ERROR: Invalid value of field "${expected_field}" in "${main_field}.${field}" in config. w-AI-fu will try to generate a new one.`);
                    regenConfigFromBackup();
                    return importFromFile_impl(tries + 1);
                }
            }
        }
    }
    return json_obj;
}
exports.importFromFile_impl = importFromFile_impl;
