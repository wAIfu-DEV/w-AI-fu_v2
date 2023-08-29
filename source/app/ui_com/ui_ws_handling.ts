import { IO } from "../io/io";
import { Auth } from "../auth/auth";
import { checkNeedsReload } from "../config/check_need_reload";
import { Config } from "../config/config";
import { writeAuth } from "../auth/export_auth";
import { writeConfig } from "../config/export_config";
import { isOfClass, isOfClassDeep } from "../types/Helper";
import { wAIfu } from "../types/Waifu";
import { UserInterface } from "./userinterface";
import { Character } from "../characters/character";
import { retreiveCharacters, writeCharacter } from "../characters/characters";

export function handleUImessage_impl(ui: UserInterface ,message: string) {

    const split_message: string[] = message.split(' ');
    
    if (split_message.length <= 0 ) {
        IO.warn('ERROR: Received message without prefix from UI WebSocket.');
        return;
    }

    const prefix: string = (split_message[0] === undefined)
                            ? ''
                            : split_message[0];

    let json_object: unknown;
    if (split_message.length > 1)
        json_object = JSON.parse(split_message.slice(1, undefined).join(' '));


    if (prefix !== "AUTH")
        IO.debug('RECEIVED FROM UI:', prefix, json_object);
    else
        IO.debug('RECEIVED FROM UI: AUTH');

    switch(prefix) {
        case PREFIX_TYPE.MESSAGE: {
            wAIfu.state.command_queue.pushBack((json_object as any)["text"]);
        } break;
        case PREFIX_TYPE.CHARACTER: {
            let match = isOfClass(json_object, new Character(), { print: true, obj_name: "character" });
            if (match === false) {
                IO.warn('ERROR: Character received from UI did not pass the sanity check. Latest character changes might be lost.');
                return;
            }
            writeCharacter(json_object as Character);
            wAIfu.state.characters = retreiveCharacters();
            ui.send('CHARACTERS', wAIfu.state.characters);
        } break;
        case PREFIX_TYPE.CONFIG: {
            let match = isOfClassDeep(json_object, new Config(), { print: true, obj_name: "config" });
            if (match === false) {
                IO.warn('ERROR: Config received from UI did not pass the sanity check. Latest config changes might be lost.');
                ui.send('CONFIG', wAIfu.state.config);
                return;
            }
            let reload = checkNeedsReload(wAIfu.state.config, json_object as Config);
            writeConfig(json_object as Config);
            wAIfu.state.config = Config.importFromFile(0);
            IO.print('Updated config.');
            if (reload === true) {
                wAIfu.dependencies!.needs_reload = true;
                wAIfu.dependencies!.input_system.interrupt();
            }
        } break;
        case PREFIX_TYPE.AUTH: {
            let match = isOfClassDeep(json_object, new Auth(), { print: true, obj_name: "auth" });
            if (match === false) {
                IO.warn('ERROR: Accounts infos received from UI did not pass the sanity check. Latest changes might be lost.');
                ui.send('AUTH', wAIfu.state.auth);
                return;
            }
            wAIfu.state.auth = json_object as Auth;
            writeAuth(wAIfu.state.auth);
            IO.print('Updated auth.');
        } break;
        case PREFIX_TYPE.INTERRUPT: {
            wAIfu.dependencies?.tts.interrupt();
            IO.print('Interrupted speech.');
        } break;
        case PREFIX_TYPE.RESET: {
            wAIfu.state.memory.clear();
            IO.print('Cleared memories.');
        } break;
        default:
            IO.warn('ERROR: Received unhandled prefix from UI WebSocket.');
            break;
    }
}

enum PREFIX_TYPE {
    MESSAGE = "MESSAGE",
    CONFIG = "CONFIG",
    CHARACTER = "CHARACTER",
    AUTH = "AUTH",
    INTERRUPT = "INTERRUPT",
    RESET = "RESET",
}