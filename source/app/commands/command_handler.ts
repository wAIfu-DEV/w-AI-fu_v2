import * as fs from "fs";

import { wAIfu } from "../types/Waifu";
import { IO } from "../io/io";
import { getDeviceIndex } from "../devices/devices";
import { playSongPreprocessed } from "../singing/sing_pproc";
import { getCurrentCharacter } from "../characters/characters";
import { pickRandomSong } from "../singing/pick_random_song";
import { startPlaylist } from "../singing/playlist";
import { formatStampedMemory } from "../memory/format_ltm";

export enum COMMAND_TYPE {
    HELP = "!help",
    SAY = "!say",
    RESET = "!reset",
    MEMORY = "!memory",
    MEMORY_PARSED = "!mem_parsed",
    RELOAD = "!reload",
    SING = "!sing",
    SING_RANDOM = "!sing_random",
    CLEAR = "!clear_queue",
    TEST_VOICE = "!test_voice",
    TEST_DEVICE = "!test_device",
    PLAYLIST = "!playlist",
    MEM_ADD = "!mem_add",
    VDB_STORE = "!vdb_store",
    VDB_QUERY = "!vdb_query",
    VDB_DUMP = "!vdb_dump",
    VDB_CLEAR = "!vdb_clear",
    VDB_CLEAR_CONFIRM = "!vdb_clear_confirm",
}

export enum HANDLE_STATUS {
    HANDLED,
    UNHANDLED,
}

let last_song_name = "";

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

    // Remove control characters
    command = command.replaceAll(/\u00A0/g, " ");

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
                        is_narrator: false,
                    }
                );

                if (id_result?.success === false) {
                    IO.warn("Failed to generate speech.");
                    return HANDLE_STATUS.HANDLED;
                }

                wAIfu.dependencies!.ui?.send("MESSAGE_CHAR", {
                    text: payload.trim(),
                });

                let id = id_result?.value!;

                wAIfu.state!.memory.addMemory(
                    `${getCurrentCharacter().char_name}: ${payload.trim()}\n`
                );

                IO.setClosedCaptions(payload.trim(), {
                    id: id,
                    persistent: false,
                    is_narrator: false,
                });

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
                let long_term_memories: string[] = [];

                if (
                    wAIfu.state?.config.memory.retrieve_memories_from_vectordb
                        .value === true
                ) {
                    long_term_memories = (
                        await wAIfu.dependencies!.ltm.query(
                            wAIfu.state?.memory.getLastShortTermMemory(),
                            5
                        )
                    ).map((v) => formatStampedMemory(v));
                }

                IO.print("Memory:");
                let context: string | null =
                    wAIfu.state!.config._.context.value;
                if (context === "") context = null;
                IO.print(
                    wAIfu.state!.memory.getMemories(
                        context,
                        null,
                        long_term_memories
                    )
                );
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.MEMORY_PARSED: {
                let long_term_memories: string[] = [];

                if (
                    wAIfu.state?.config.memory.retrieve_memories_from_vectordb
                        .value === true
                ) {
                    long_term_memories = (
                        await wAIfu.dependencies!.ltm.query(
                            wAIfu.state?.memory.getLastShortTermMemory(),
                            5
                        )
                    ).map((v) => formatStampedMemory(v));
                }

                IO.print("Memory:");
                let context: string | null =
                    wAIfu.state!.config._.context.value;
                if (context === "") context = null;

                const memory = wAIfu.state!.memory.getMemories(
                    context,
                    null,
                    long_term_memories
                );

                // @ts-ignore
                if (wAIfu.dependencies?.llm!["parsePrompt"] !== undefined) {
                    // @ts-ignore
                    IO.print(wAIfu.dependencies?.llm.parsePrompt(memory));
                } else {
                    IO.print(memory);
                }

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
                last_song_name = payload;
                await playSongPreprocessed(payload);
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.SING_RANDOM: {
                const picked_song = pickRandomSong(last_song_name);
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
                        is_narrator: false,
                    }
                );

                if (id_result?.success === false) {
                    IO.warn("Failed to generate speech.");
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
                        is_narrator: false,
                    }
                );

                if (id_result?.success === false) {
                    IO.warn("Failed to generate speech.");
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
            case COMMAND_TYPE.MEM_ADD: {
                wAIfu.state?.memory.addMemory(payload + "\n");
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.VDB_STORE: {
                wAIfu.dependencies?.ltm.store(payload.trim());
                IO.print("Stored to vector database:", payload.trim());
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.VDB_QUERY: {
                const items =
                    wAIfu.state!.config.memory.vectordb_retrieval_amount.value;
                const result = await wAIfu.dependencies?.ltm.query(
                    payload.trim(),
                    items
                );
                IO.print("Vector database query result:");
                IO.print(result);
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.VDB_DUMP: {
                wAIfu.dependencies?.ltm.dump();
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.VDB_CLEAR: {
                IO.warn(
                    "WARNING: Reseting the vector database will get rid of all the memories stored inside with no way to get them back."
                );
                IO.warn(
                    "If you wish to continue, please type:",
                    COMMAND_TYPE.VDB_CLEAR_CONFIRM
                );
                return HANDLE_STATUS.HANDLED;
            }
            case COMMAND_TYPE.VDB_CLEAR_CONFIRM: {
                wAIfu.dependencies?.ltm.clear();
                IO.print("Cleared vector database.");
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
