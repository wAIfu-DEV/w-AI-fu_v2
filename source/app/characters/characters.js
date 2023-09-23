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
exports.writeCharacter = exports.retreiveCharacters = void 0;
const fs = __importStar(require("fs"));
const io_1 = require("../io/io");
function retreiveCharacters() {
    let CHARA_PATH = process.cwd() + '/userdata/characters/';
    let result = {};
    let files = fs.readdirSync(CHARA_PATH, { recursive: false, encoding: 'utf8' });
    for (let f of files) {
        let name_no_extension = f.replaceAll(/\..*/g, '');
        let data;
        try {
            data = fs.readFileSync(CHARA_PATH + f, { encoding: 'utf8' });
        }
        catch (error) {
            io_1.IO.warn('ERROR: Could not read file', CHARA_PATH + f);
            return;
        }
        let parsed_obj;
        try {
            parsed_obj = JSON.parse(data);
        }
        catch (error) {
            io_1.IO.warn('ERROR: Could not parse file', CHARA_PATH + f);
            return;
        }
        result[name_no_extension] = parsed_obj;
    }
    return result;
}
exports.retreiveCharacters = retreiveCharacters;
function writeCharacter(file_name, char) {
    let CHARA_PATH = process.cwd() + '/userdata/characters/';
    fs.writeFileSync(CHARA_PATH + file_name + '.json', JSON.stringify(char));
}
exports.writeCharacter = writeCharacter;
