import { IO } from "../io/io";
import { wAIfu } from "../types/Waifu";
import { COMMAND_TYPE, HANDLE_STATUS } from "./commands";

/**
 * Checks input for commands and handle it, else return.
 * @param command string to check for command
 * @param trusted if sender is a trusted source, aka user. IF COMING FROM CHAT MUST BE FALSE.
 * @returns `HANDLE_STATUS.HANDLED` if found command and resuires main loop restart, `HANDLE_STATUS.UNHANDLED` if no command or unneeded restart
 */
export async function handleCommand(command: string, trusted: boolean = false): Promise<HANDLE_STATUS> {
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
    if (trusted)
    switch (prefix) {
        case COMMAND_TYPE.SAY: {
            IO.print(payload);
            return HANDLE_STATUS.HANDLED;
        }
        break;
        case COMMAND_TYPE.MEMORY: {
            IO.print(wAIfu.state.memory.getMemories());
            return HANDLE_STATUS.HANDLED;
        } break;
        case COMMAND_TYPE.RESET: {
            wAIfu.state.memory.clear();
            return HANDLE_STATUS.HANDLED;
        }
        break;
        default:
            IO.warn('ERROR: unrecognized command', prefix);
            return HANDLE_STATUS.HANDLED
    }
    return HANDLE_STATUS.UNHANDLED;
}