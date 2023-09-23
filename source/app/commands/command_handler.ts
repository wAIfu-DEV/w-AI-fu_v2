import { wAIfu } from "../types/Waifu";
import { IO } from "../io/io";
import { getDeviceIndex } from "../devices/devices";
import { playSongPreprocessed } from "../singing/sing_pproc";
import { Character } from "../characters/character";

export enum COMMAND_TYPE {
    SAY = "!say",
    RESET = "!reset",
    MEMORY = "!memory",
    RELOAD = "!reload",
    SING = "!sing",
    CLEAR_QUEUE = "!clear"
}

export enum HANDLE_STATUS {
    HANDLED,
    UNHANDLED,
}

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
    
    if (trusted === true)
    switch (prefix) {
        case COMMAND_TYPE.SAY: {
            let id_result = await wAIfu.dependencies?.tts.generateSpeech(payload.trim(), {
                voice: (wAIfu.state!.characters[wAIfu.state!.config._.character_name.value] as Character).voice,
            });

            if (id_result?.success === false) {
                IO.print('Failed to generate speech.');
                return HANDLE_STATUS.HANDLED;
            }

            wAIfu.dependencies!.ui?.send('MESSAGE_CHAR', {text: payload.trim() });

            let id = id_result?.value!;

            await wAIfu.dependencies?.tts.playSpeech(id, {
                device: getDeviceIndex(wAIfu.state!.config.devices.tts_output_device.value),
                volume_modifier: wAIfu.state?.config.tts.volume_modifier_db.value!
            });
            return HANDLE_STATUS.HANDLED;
        }
        case COMMAND_TYPE.MEMORY: {
            IO.print(wAIfu.state!.memory.getMemories());
            return HANDLE_STATUS.HANDLED;
        }
        case COMMAND_TYPE.RESET: {
            wAIfu.state!.memory.clear();
            return HANDLE_STATUS.HANDLED;
        }
        case COMMAND_TYPE.RELOAD: {
            wAIfu.dependencies!.needs_reload = true;
            return HANDLE_STATUS.HANDLED;
        }
        case COMMAND_TYPE.SING: {
            await playSongPreprocessed(payload);
            return HANDLE_STATUS.HANDLED;
        }
        case COMMAND_TYPE.CLEAR_QUEUE: {
            wAIfu.state?.command_queue.clear();
            return HANDLE_STATUS.HANDLED;
        }
        default:
            IO.warn('ERROR: unrecognized command', prefix);
            return HANDLE_STATUS.HANDLED
    }
    return HANDLE_STATUS.HANDLED;
}