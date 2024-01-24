import { Auth } from "../auth/auth";
import { checkNeedsReload } from "../config/check_need_reload";
import { Config } from "../config/config";
import { writeAuth } from "../auth/export_auth";
import { writeConfig } from "../config/export_config";
import { isOfClassDeep } from "../types/Helper";
import { wAIfu } from "../types/Waifu";
import { UserInterface } from "./userinterface";
import { Character } from "../characters/character";
import {
    retrieveAllCharacters,
    writeCharacter,
} from "../characters/characters";
import { IO } from "../io/io";
import { startUpdate } from "../update/start_update";
import { writePreset } from "../config/write_preset";

type Message = { text: string };

enum PREFIX_TYPE {
    COMMAND = "COMMAND",
    MESSAGE = "MESSAGE",
    CONFIG = "CONFIG",
    CHARACTER = "CHARACTER",
    AUTH = "AUTH",
    INTERRUPT = "INTERRUPT",
    RESET = "RESET",
    UPDATE = "UPDATE",
    PRESET = "PRESET",
    NEW_PRESET = "NEW_PRESET",
}

export function handleUImessage_impl(ui: UserInterface, message: string) {
    const split_message: string[] = message.split(" ");

    if (split_message.length <= 0) {
        IO.warn("ERROR: Received message without prefix from UI WebSocket.");
        return;
    }

    const prefix: string =
        split_message[0] === undefined ? "" : split_message[0];

    let json_object: unknown;
    if (split_message.length > 1)
        json_object = JSON.parse(split_message.slice(1, undefined).join(" "));

    if (prefix !== "AUTH") IO.debug("RECEIVED FROM UI:", prefix, json_object);
    else IO.debug("RECEIVED FROM UI: AUTH");

    switch (prefix) {
        case PREFIX_TYPE.MESSAGE:
            {
                let type_match = isOfClassDeep<Message>(
                    json_object,
                    { text: "" },
                    {
                        obj_name: "message",
                        add_missing_fields: false,
                        print: true,
                    }
                );
                if (type_match === false) {
                    IO.warn(
                        "ERROR: Incoming input message from UI did not pass sanity test."
                    );
                    return;
                }
                wAIfu.state!.command_queue.pushBack(
                    (json_object as Message).text
                );
            }
            break;
        case PREFIX_TYPE.COMMAND:
            {
                let type_match = isOfClassDeep<Message>(
                    json_object,
                    { text: "" },
                    {
                        obj_name: "message",
                        add_missing_fields: false,
                        print: true,
                    }
                );
                if (type_match === false) {
                    IO.warn(
                        "ERROR: Incoming input message from UI did not pass sanity test."
                    );
                    return;
                }
                wAIfu.state!.command_queue.pushFront(
                    (json_object as Message).text
                );
            }
            break;
        case PREFIX_TYPE.CHARACTER:
            {
                class CharWrapper {
                    file: string = "";
                    character: Character = new Character();
                }
                let match = isOfClassDeep(json_object, new CharWrapper(), {
                    print: true,
                    obj_name: "char_wrapper",
                    add_missing_fields: true,
                });
                if (match === false) {
                    IO.warn(
                        "ERROR: Character received from UI did not pass the sanity check. Latest character changes might be lost."
                    );
                    return;
                }
                let char_wrapper = json_object as CharWrapper;
                writeCharacter(char_wrapper.file, char_wrapper.character);
                wAIfu.state!.characters = retrieveAllCharacters();
                ui.send("CHARACTERS", wAIfu.state!.characters);
            }
            break;
        case PREFIX_TYPE.CONFIG:
            {
                let match = isOfClassDeep(json_object, new Config(), {
                    print: true,
                    obj_name: "config",
                    add_missing_fields: true,
                });
                if (match === false) {
                    IO.warn(
                        "ERROR: Config received from UI did not pass the sanity check. Latest config changes might be lost."
                    );
                    ui.send("CONFIG", wAIfu.state!.config);
                    ui.send("DEVICES", wAIfu.state!.devices);
                    return;
                }
                let reload = checkNeedsReload(
                    wAIfu.state!.config,
                    json_object as Config
                );
                writeConfig(json_object as Config, wAIfu.state?.current_preset);
                wAIfu.state!.config = Config.importFromFile(
                    wAIfu.state?.current_preset
                );
                IO.print("Updated config.");
                if (reload === true) {
                    wAIfu.dependencies!.needs_reload = true;
                    wAIfu.dependencies!.input_system.interrupt();
                }
            }
            break;
        case PREFIX_TYPE.AUTH:
            {
                let match = isOfClassDeep(json_object, new Auth(), {
                    print: true,
                    obj_name: "auth",
                    add_missing_fields: true,
                });
                if (match === false) {
                    IO.warn(
                        "ERROR: Accounts infos received from UI did not pass the sanity check. Latest changes might be lost."
                    );
                    ui.send("AUTH", wAIfu.state!.auth);
                    return;
                }
                wAIfu.state!.auth = json_object as Auth;
                writeAuth(wAIfu.state!.auth);
                IO.print("Updated auth.");
                wAIfu.dependencies!.needs_reload = true;
            }
            break;
        case PREFIX_TYPE.INTERRUPT:
            {
                wAIfu.dependencies?.tts.interrupt();

                for (let plugin of wAIfu.plugins) plugin.onInterrupt();

                IO.print("Interrupted speech.");
            }
            break;
        case PREFIX_TYPE.RESET:
            {
                wAIfu.state!.memory.clear();
                IO.print("Cleared memories.");
            }
            break;
        case PREFIX_TYPE.UPDATE:
            {
                startUpdate();
            }
            break;
        case PREFIX_TYPE.PRESET:
            {
                if (wAIfu.state === undefined) return;
                wAIfu.state.current_preset = (
                    json_object as { preset: string }
                ).preset;
                writePreset(wAIfu.state.current_preset);
                wAIfu.state.config = Config.importFromFile(
                    wAIfu.state.current_preset
                );
                ui.send("CONFIG", wAIfu.state!.config);
                ui.send("DEVICES", wAIfu.state!.devices);
            }
            break;
        case PREFIX_TYPE.NEW_PRESET:
            {
                if (wAIfu.state === undefined) return;
                let new_preset_name =
                    (json_object as { name: string }).name + ".json";
                writeConfig(new Config(), new_preset_name);
                wAIfu.state.current_preset = new_preset_name;
                writePreset(wAIfu.state.current_preset);
                wAIfu.state.presets.push(wAIfu.state.current_preset);
                ui.send("PRESETS", {
                    presets: wAIfu.state.presets,
                    current: wAIfu.state.current_preset,
                });
            }
            break;
        default:
            IO.warn("ERROR: Received unhandled prefix from UI WebSocket.");
            break;
    }
}
