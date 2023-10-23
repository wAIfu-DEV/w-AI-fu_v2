import * as fs from "fs";

import { wAIfu } from "../types/Waifu";
import { IO } from "../io/io";
import { getDeviceIndex } from "../devices/devices";
import { playSongPreprocessed } from "../singing/sing_pproc";
import { getCurrentCharacter } from "../characters/characters";
import { pickRandomSong } from "../singing/pick_random_song";
import { startPlaylist } from "../singing/playlist";

export enum COMMAND_TYPE {
    HELP = "!help",
    SAY = "!say",
    RESET = "!reset",
    MEMORY = "!memory",
    RELOAD = "!reload",
    SING = "!sing",
    SING_RANDOM = "!sing_random",
    CLEAR = "!clear_queue",
    TEST_VOICE = "!test_voice",
    TEST_DEVICE = "!test_device",
    PLAYLIST = "!playlist",
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
export async function handleCommand(
    command: string,
    trusted: boolean = false
): Promise<HANDLE_STATUS> {
    if (command === undefined) return HANDLE_STATUS.HANDLED;

    if (command.startsWith("!") === false) {
        return HANDLE_STATUS.UNHANDLED;
    }

    if (trusted === true)
        IO.print(wAIfu.state?.config._.user_name.value + ">", command);

    const split_command = command.split(" ");
    const prefix = split_command[0];
    const payload =
        split_command.length > 1
            ? split_command.slice(1, undefined).join(" ")
            : "";

    if (trusted === false) {
    } else {
        switch (prefix) {
            case COMMAND_TYPE.HELP: {
                let buff = fs.readFileSync(
                    process.cwd() + "/docs/Commands.txt",
                    { encoding: "utf8" }
                );
                let lines = buff.split(/\r\n|\n/g).slice(2, undefined);
                IO.print(lines.join("\n"));
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.SAY: {
                let id_result = await wAIfu.dependencies?.tts.generateSpeech(
                    payload.trim(),
                    {
                        voice: getCurrentCharacter().voice,
                    }
                );

                if (id_result?.success === false) {
                    IO.print("Failed to generate speech.");
                    return HANDLE_STATUS.HANDLED;
                }

                wAIfu.dependencies!.ui?.send("MESSAGE_CHAR", {
                    text: payload.trim(),
                });

                let id = id_result?.value!;

                wAIfu.state!.memory.addMemory(
                    `${getCurrentCharacter().char_name}: ${payload.trim()}\n`
                );

                await wAIfu.dependencies?.tts.playSpeech(id, {
                    device: getDeviceIndex(
                        wAIfu.state!.config.devices.tts_output_device.value
                    ),
                    volume_modifier:
                        wAIfu.state?.config.text_to_speech.volume_modifier_db
                            .value!,
                });
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.MEMORY: {
                IO.print("Memory:");
                let context: string | null =
                    wAIfu.state!.config._.context.value;
                if (context === "") context = null;
                IO.print(wAIfu.state!.memory.getMemories(context));
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
            case COMMAND_TYPE.SING_RANDOM: {
                const picked_song = pickRandomSong();
                if (picked_song === "") return HANDLE_STATUS.HANDLED;
                await playSongPreprocessed(picked_song);
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.CLEAR: {
                wAIfu.state?.command_queue.clear();
                IO.print("Cleared input queue.");
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.TEST_VOICE: {
                let id_result = await wAIfu.dependencies?.tts.generateSpeech(
                    getRandomSentence(),
                    {
                        voice: payload.trim(),
                    }
                );

                if (id_result?.success === false) {
                    IO.print("Failed to generate speech.");
                    return HANDLE_STATUS.HANDLED;
                }

                let id = id_result?.value!;

                await wAIfu.dependencies?.tts.playSpeech(id, {
                    device: getDeviceIndex(
                        wAIfu.state!.config.devices.tts_output_device.value
                    ),
                    volume_modifier:
                        wAIfu.state?.config.text_to_speech.volume_modifier_db
                            .value!,
                });
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.TEST_DEVICE: {
                let id_result = await wAIfu.dependencies?.tts.generateSpeech(
                    getRandomSentence(),
                    {
                        voice: getCurrentCharacter().voice,
                    }
                );

                if (id_result?.success === false) {
                    IO.print("Failed to generate speech.");
                    return HANDLE_STATUS.HANDLED;
                }

                let id = id_result?.value!;

                await wAIfu.dependencies?.tts.playSpeech(id, {
                    device: getDeviceIndex(payload),
                    volume_modifier:
                        wAIfu.state?.config.text_to_speech.volume_modifier_db
                            .value!,
                });
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.PLAYLIST: {
                startPlaylist();
                return HANDLE_STATUS.HANDLED;
            }
            default:
                IO.warn("ERROR: unrecognized command", prefix);
                return HANDLE_STATUS.HANDLED;
        }
    }
    return HANDLE_STATUS.HANDLED;
}

function getRandomSentence(): string {
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
    ] as const;

    const rdm_i = Math.round(Math.random() * (test_messages.length - 1));

    return test_messages[rdm_i]!;
}
