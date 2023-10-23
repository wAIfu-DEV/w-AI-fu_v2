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
exports.handleCommand = exports.HANDLE_STATUS = exports.COMMAND_TYPE = void 0;
const fs = __importStar(require("fs"));
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
const devices_1 = require("../devices/devices");
const sing_pproc_1 = require("../singing/sing_pproc");
const characters_1 = require("../characters/characters");
const pick_random_song_1 = require("../singing/pick_random_song");
const playlist_1 = require("../singing/playlist");
var COMMAND_TYPE;
(function (COMMAND_TYPE) {
    COMMAND_TYPE["HELP"] = "!help";
    COMMAND_TYPE["SAY"] = "!say";
    COMMAND_TYPE["RESET"] = "!reset";
    COMMAND_TYPE["MEMORY"] = "!memory";
    COMMAND_TYPE["RELOAD"] = "!reload";
    COMMAND_TYPE["SING"] = "!sing";
    COMMAND_TYPE["SING_RANDOM"] = "!sing_random";
    COMMAND_TYPE["CLEAR"] = "!clear_queue";
    COMMAND_TYPE["TEST_VOICE"] = "!test_voice";
    COMMAND_TYPE["TEST_DEVICE"] = "!test_device";
    COMMAND_TYPE["PLAYLIST"] = "!playlist";
})(COMMAND_TYPE || (exports.COMMAND_TYPE = COMMAND_TYPE = {}));
var HANDLE_STATUS;
(function (HANDLE_STATUS) {
    HANDLE_STATUS[HANDLE_STATUS["HANDLED"] = 0] = "HANDLED";
    HANDLE_STATUS[HANDLE_STATUS["UNHANDLED"] = 1] = "UNHANDLED";
})(HANDLE_STATUS || (exports.HANDLE_STATUS = HANDLE_STATUS = {}));
async function handleCommand(command, trusted = false) {
    if (command === undefined)
        return HANDLE_STATUS.HANDLED;
    if (command.startsWith("!") === false) {
        return HANDLE_STATUS.UNHANDLED;
    }
    if (trusted === true)
        io_1.IO.print(Waifu_1.wAIfu.state?.config._.user_name.value + ">", command);
    const split_command = command.split(" ");
    const prefix = split_command[0];
    const payload = split_command.length > 1
        ? split_command.slice(1, undefined).join(" ")
        : "";
    if (trusted === false) {
    }
    else {
        switch (prefix) {
            case COMMAND_TYPE.HELP: {
                let buff = fs.readFileSync(process.cwd() + "/docs/Commands.txt", { encoding: "utf8" });
                let lines = buff.split(/\r\n|\n/g).slice(2, undefined);
                io_1.IO.print(lines.join("\n"));
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.SAY: {
                let id_result = await Waifu_1.wAIfu.dependencies?.tts.generateSpeech(payload.trim(), {
                    voice: (0, characters_1.getCurrentCharacter)().voice,
                });
                if (id_result?.success === false) {
                    io_1.IO.print("Failed to generate speech.");
                    return HANDLE_STATUS.HANDLED;
                }
                Waifu_1.wAIfu.dependencies.ui?.send("MESSAGE_CHAR", {
                    text: payload.trim(),
                });
                let id = id_result?.value;
                Waifu_1.wAIfu.state.memory.addMemory(`${(0, characters_1.getCurrentCharacter)().char_name}: ${payload.trim()}\n`);
                await Waifu_1.wAIfu.dependencies?.tts.playSpeech(id, {
                    device: (0, devices_1.getDeviceIndex)(Waifu_1.wAIfu.state.config.devices.tts_output_device.value),
                    volume_modifier: Waifu_1.wAIfu.state?.config.text_to_speech.volume_modifier_db
                        .value,
                });
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.MEMORY: {
                io_1.IO.print("Memory:");
                let context = Waifu_1.wAIfu.state.config._.context.value;
                if (context === "")
                    context = null;
                io_1.IO.print(Waifu_1.wAIfu.state.memory.getMemories(context));
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.RESET: {
                Waifu_1.wAIfu.state.memory.clear();
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.RELOAD: {
                Waifu_1.wAIfu.dependencies.needs_reload = true;
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.SING: {
                await (0, sing_pproc_1.playSongPreprocessed)(payload);
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.SING_RANDOM: {
                const picked_song = (0, pick_random_song_1.pickRandomSong)();
                if (picked_song === "")
                    return HANDLE_STATUS.HANDLED;
                await (0, sing_pproc_1.playSongPreprocessed)(picked_song);
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.CLEAR: {
                Waifu_1.wAIfu.state?.command_queue.clear();
                io_1.IO.print("Cleared input queue.");
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.TEST_VOICE: {
                let id_result = await Waifu_1.wAIfu.dependencies?.tts.generateSpeech(getRandomSentence(), {
                    voice: payload.trim(),
                });
                if (id_result?.success === false) {
                    io_1.IO.print("Failed to generate speech.");
                    return HANDLE_STATUS.HANDLED;
                }
                let id = id_result?.value;
                await Waifu_1.wAIfu.dependencies?.tts.playSpeech(id, {
                    device: (0, devices_1.getDeviceIndex)(Waifu_1.wAIfu.state.config.devices.tts_output_device.value),
                    volume_modifier: Waifu_1.wAIfu.state?.config.text_to_speech.volume_modifier_db
                        .value,
                });
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.TEST_DEVICE: {
                let id_result = await Waifu_1.wAIfu.dependencies?.tts.generateSpeech(getRandomSentence(), {
                    voice: (0, characters_1.getCurrentCharacter)().voice,
                });
                if (id_result?.success === false) {
                    io_1.IO.print("Failed to generate speech.");
                    return HANDLE_STATUS.HANDLED;
                }
                let id = id_result?.value;
                await Waifu_1.wAIfu.dependencies?.tts.playSpeech(id, {
                    device: (0, devices_1.getDeviceIndex)(payload),
                    volume_modifier: Waifu_1.wAIfu.state?.config.text_to_speech.volume_modifier_db
                        .value,
                });
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.PLAYLIST: {
                (0, playlist_1.startPlaylist)();
                return HANDLE_STATUS.HANDLED;
            }
            default:
                io_1.IO.warn("ERROR: unrecognized command", prefix);
                return HANDLE_STATUS.HANDLED;
        }
    }
    return HANDLE_STATUS.HANDLED;
}
exports.handleCommand = handleCommand;
function getRandomSentence() {
    const test_messages = [
        "The small pup gnawed a hole in the sock.",
        "The fish twisted and turned on the bent hook.",
        "Press the pants and sew a button on the vest.",
        "The swan dive was far short of perfect.",
        "Two blue fish swam in the tank.",
        "Her purse was full of useless trash.",
        "The colt reared and threw the tall rider.",
        "It snowed, rained, and hailed the same morning.",
        "Read verse out loud for pleasure.",
        "gymbag",
    ];
    const rdm_i = Math.round(Math.random() * (test_messages.length - 1));
    return test_messages[rdm_i];
}
