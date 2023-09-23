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
exports.playSongPreprocessed = void 0;
const cproc = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
const devices_1 = require("../devices/devices");
async function playSongPreprocessed(song_name) {
    const SONGS_PATH = process.cwd() + '/userdata/songs/';
    const vocals = SONGS_PATH + `${song_name}_vocals.wav`;
    const instrumentals = SONGS_PATH + `${song_name}_instrumentals.wav`;
    if (fs.existsSync(SONGS_PATH) === false) {
        io_1.IO.warn('Warning: Could not find the folder userdata/songs. w-AI-fu will create a new one.');
        try {
            fs.mkdirSync(SONGS_PATH, { recursive: true });
        }
        catch {
            io_1.IO.error('Could not create the folder userdata/songs. Something went very wrong.');
        }
    }
    if (fs.existsSync(vocals) === false) {
        io_1.IO.warn('Error: Could not find file: ' + vocals);
        io_1.IO.print('Reminder: Song must be split in two files,\n<SONG NAME>_vocals.wav and <SONG NAME>_instrumentals.wav\nFiles must be placed in the folder userdata/songs.');
        return;
    }
    if (fs.existsSync(instrumentals) === false) {
        io_1.IO.warn('Error: Could not find file: ' + instrumentals);
        io_1.IO.print('Reminder: Song must be split in two files,\n<SONG NAME>_vocals.wav and <SONG NAME>_instrumentals.wav\nFiles must be placed in the folder userdata/songs.');
        return;
    }
    if (fs.existsSync(__dirname + '/sync0.lock')) {
        fs.unlinkSync(__dirname + '/sync0.lock');
    }
    if (fs.existsSync(__dirname + '/sync1.lock')) {
        fs.unlinkSync(__dirname + '/sync1.lock');
    }
    let player1 = cproc.spawn('python', [__dirname + '/sing.py', vocals, String((0, devices_1.getDeviceIndex)(Waifu_1.wAIfu.state?.config.devices.tts_output_device.value)), String(0)], { cwd: __dirname, detached: false, shell: false });
    let player2 = cproc.spawn('python', [__dirname + '/sing.py', instrumentals, String((0, devices_1.getDeviceIndex)(Waifu_1.wAIfu.state?.config.devices.alt_output_device.value)), String(1)], { cwd: __dirname, detached: false, shell: false });
    player1.stdout.on('data', (data) => io_1.IO.print(data.toString('utf8')));
    player1.stderr.on('data', (data) => io_1.IO.warn(data.toString('utf8')));
    player2.stdout.on('data', (data) => io_1.IO.print(data.toString('utf8')));
    player2.stderr.on('data', (data) => io_1.IO.warn(data.toString('utf8')));
    await new Promise(async (resolve) => {
        let resolved = false;
        let player1_closed = false;
        let player2_closed = false;
        player1.on('close', () => {
            player1_closed = true;
            if (player2_closed === true) {
                if (resolved === true)
                    return;
                resolved = true;
                resolve();
            }
            return;
        });
        player2.on('close', () => {
            player2_closed = true;
            if (player1_closed === true) {
                if (resolved === true)
                    return;
                resolved = true;
                resolve();
            }
            return;
        });
        while (resolved === false) {
            if (Waifu_1.wAIfu.dependencies?.tts.skip === true) {
                Waifu_1.wAIfu.dependencies.tts.skip = false;
                player1.kill(2);
                player2.kill(2);
                resolved = true;
                resolve();
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 250));
        }
    });
    return;
}
exports.playSongPreprocessed = playSongPreprocessed;
