"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCommand = void 0;
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
const commands_1 = require("./commands");
async function handleCommand(command, trusted = false) {
    if (command === undefined)
        return commands_1.HANDLE_STATUS.HANDLED;
    if (command.startsWith('!') === false) {
        return commands_1.HANDLE_STATUS.UNHANDLED;
    }
    const split_command = command.split(' ');
    const prefix = split_command[0];
    const payload = (split_command.length > 1)
        ? split_command.slice(1, undefined).join(' ')
        : '';
    if (trusted)
        switch (prefix) {
            case commands_1.COMMAND_TYPE.SAY:
                {
                    io_1.IO.print(payload);
                    return commands_1.HANDLE_STATUS.HANDLED;
                }
                break;
            case commands_1.COMMAND_TYPE.MEMORY:
                {
                    io_1.IO.print(Waifu_1.wAIfu.state.memory.getMemories());
                    return commands_1.HANDLE_STATUS.HANDLED;
                }
                break;
            case commands_1.COMMAND_TYPE.RESET:
                {
                    Waifu_1.wAIfu.state.memory.clear();
                    return commands_1.HANDLE_STATUS.HANDLED;
                }
                break;
            default:
                io_1.IO.warn('ERROR: unrecognized command', prefix);
                return commands_1.HANDLE_STATUS.HANDLED;
        }
    return commands_1.HANDLE_STATUS.UNHANDLED;
}
exports.handleCommand = handleCommand;
