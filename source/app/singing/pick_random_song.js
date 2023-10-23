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
exports.pickRandomSong = void 0;
const fs = __importStar(require("fs"));
const io_1 = require("../io/io");
function pickRandomSong() {
    let files = fs.readdirSync(process.cwd() + '/userdata/songs/', { recursive: false, withFileTypes: false, encoding: 'utf8' });
    if (files.length === 0) {
        io_1.IO.warn('ERROR: Could not pick random song since there are no songs in the userdata/songs folder');
        return '';
    }
    let tries = 0;
    while (++tries < 10) {
        let rdm_i = Math.round(Math.random() * files.length);
        let picked_file = files[rdm_i] || '';
        let split_name = picked_file.split('_');
        switch (split_name[split_name.length - 1]) {
            case 'vocals.wav': {
                return split_name.slice(0, -1).join('_');
            }
            case 'instrumentals.wav': {
                return split_name.slice(0, -1).join('_');
            }
            case 'info.txt': {
                return split_name.slice(0, -1).join('_');
            }
            default:
                continue;
        }
    }
    io_1.IO.warn('ERROR: Failed to pick song after multiple tries.');
    return '';
}
exports.pickRandomSong = pickRandomSong;
