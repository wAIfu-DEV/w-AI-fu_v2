"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCommand = exports.HANDLE_STATUS = exports.COMMAND_TYPE = void 0;
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
const devices_1 = require("../devices/devices");
const sing_pproc_1 = require("../singing/sing_pproc");
var COMMAND_TYPE;
(function (COMMAND_TYPE) {
    COMMAND_TYPE["SAY"] = "!say";
    COMMAND_TYPE["RESET"] = "!reset";
    COMMAND_TYPE["MEMORY"] = "!memory";
    COMMAND_TYPE["RELOAD"] = "!reload";
    COMMAND_TYPE["SING"] = "!sing";
    COMMAND_TYPE["CLEAR_QUEUE"] = "!clear";
})(COMMAND_TYPE || (exports.COMMAND_TYPE = COMMAND_TYPE = {}));
var HANDLE_STATUS;
(function (HANDLE_STATUS) {
    HANDLE_STATUS[HANDLE_STATUS["HANDLED"] = 0] = "HANDLED";
    HANDLE_STATUS[HANDLE_STATUS["UNHANDLED"] = 1] = "UNHANDLED";
})(HANDLE_STATUS || (exports.HANDLE_STATUS = HANDLE_STATUS = {}));
async function handleCommand(command, trusted = false) {
    if (command === undefined)
        return HANDLE_STATUS.HANDLED;
    if (command.startsWith('!') === false) {
        return HANDLE_STATUS.UNHANDLED;
    }
    const split_command = command.split(' ');
    const prefix = split_command[0];
    const payload = (split_command.length > 1)
        ? split_command.slice(1, undefined).join(' ')
        : '';
    if (trusted === true)
        switch (prefix) {
            case COMMAND_TYPE.SAY: {
                let id_result = await Waifu_1.wAIfu.dependencies?.tts.generateSpeech(payload.trim(), {
                    voice: Waifu_1.wAIfu.state.characters[Waifu_1.wAIfu.state.config._.character_name.value].voice,
                });
                if (id_result?.success === false) {
                    io_1.IO.print('Failed to generate speech.');
                    return HANDLE_STATUS.HANDLED;
                }
                Waifu_1.wAIfu.dependencies.ui?.send('MESSAGE_CHAR', { text: payload.trim() });
                let id = id_result?.value;
                await Waifu_1.wAIfu.dependencies?.tts.playSpeech(id, {
                    device: (0, devices_1.getDeviceIndex)(Waifu_1.wAIfu.state.config.devices.tts_output_device.value),
                    volume_modifier: Waifu_1.wAIfu.state?.config.tts.volume_modifier_db.value
                });
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.MEMORY: {
                io_1.IO.print(Waifu_1.wAIfu.state.memory.getMemories());
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
            case COMMAND_TYPE.CLEAR_QUEUE: {
                Waifu_1.wAIfu.state?.command_queue.clear();
                return HANDLE_STATUS.HANDLED;
            }
            default:
                io_1.IO.warn('ERROR: unrecognized command', prefix);
                return HANDLE_STATUS.HANDLED;
        }
    return HANDLE_STATUS.HANDLED;
}
exports.handleCommand = handleCommand;
