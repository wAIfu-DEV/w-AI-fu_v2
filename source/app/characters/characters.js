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
exports.writeCharacter = exports.retrieveAllCharacters = exports.getCurrentCharacter = exports.getCharByFileName = void 0;
const fs = __importStar(require("fs"));
const character_1 = require("./character");
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
const file_system_1 = require("../file_system/file_system");
const Helper_1 = require("../types/Helper");
function getCharByFileName(file_name) {
    let character = Waifu_1.wAIfu.state.characters[file_name];
    if (character === undefined) {
        io_1.IO.warn("ERROR: Could not access character data for:", file_name, "Please retry with another character.");
        return new character_1.Character();
    }
    return character;
}
exports.getCharByFileName = getCharByFileName;
function getCurrentCharacter() {
    return getCharByFileName(Waifu_1.wAIfu.state.config._.character_name.value);
}
exports.getCurrentCharacter = getCurrentCharacter;
function retrieveAllCharacters() {
    const CHARA_PATH = process.cwd() + "/userdata/characters/";
    const SENTINEL_VAL = new character_1.Character();
    const files = fs.readdirSync(CHARA_PATH, {
        recursive: false,
        encoding: "utf8",
    });
    let result = {};
    for (let f of files) {
        const name_no_extension = f.replaceAll(/\..*/g, "");
        const FPATH = CHARA_PATH + f;
        const parse_result = (0, file_system_1.readParseJSON)(FPATH);
        if (parse_result.success === false) {
            io_1.IO.warn("Could not import character file", FPATH);
            continue;
        }
        let char = parse_result.value;
        let is_char_type = (0, Helper_1.isOfClassDeep)(char, SENTINEL_VAL, {
            obj_name: "character",
            add_missing_fields: true,
            print: true,
        });
        if (!is_char_type) {
            io_1.IO.warn("ERROR: Character file", FPATH, "failed the sanity check.");
            continue;
        }
        result[name_no_extension] = char;
    }
    return result;
}
exports.retrieveAllCharacters = retrieveAllCharacters;
function writeCharacter(file_name, char) {
    let CHARA_PATH = process.cwd() + "/userdata/characters/";
    fs.writeFileSync(CHARA_PATH + file_name + ".json", JSON.stringify(char));
}
exports.writeCharacter = writeCharacter;
