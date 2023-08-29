"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUImessage_impl = void 0;
const io_1 = require("../io/io");
const auth_1 = require("../auth/auth");
const check_need_reload_1 = require("../config/check_need_reload");
const config_1 = require("../config/config");
const export_auth_1 = require("../auth/export_auth");
const export_config_1 = require("../config/export_config");
const Helper_1 = require("../types/Helper");
const Waifu_1 = require("../types/Waifu");
const character_1 = require("../characters/character");
const characters_1 = require("../characters/characters");
function handleUImessage_impl(ui, message) {
    const split_message = message.split(' ');
    if (split_message.length <= 0) {
        io_1.IO.warn('ERROR: Received message without prefix from UI WebSocket.');
        return;
    }
    const prefix = (split_message[0] === undefined)
        ? ''
        : split_message[0];
    let json_object;
    if (split_message.length > 1)
        json_object = JSON.parse(split_message.slice(1, undefined).join(' '));
    if (prefix !== "AUTH")
        io_1.IO.debug('RECEIVED FROM UI:', prefix, json_object);
    else
        io_1.IO.debug('RECEIVED FROM UI: AUTH');
    switch (prefix) {
        case PREFIX_TYPE.MESSAGE:
            {
                Waifu_1.wAIfu.state.command_queue.pushBack(json_object["text"]);
            }
            break;
        case PREFIX_TYPE.CHARACTER:
            {
                let match = (0, Helper_1.isOfClass)(json_object, new character_1.Character(), { print: true, obj_name: "character" });
                if (match === false) {
                    io_1.IO.warn('ERROR: Character received from UI did not pass the sanity check. Latest character changes might be lost.');
                    return;
                }
                (0, characters_1.writeCharacter)(json_object);
                Waifu_1.wAIfu.state.characters = (0, characters_1.retreiveCharacters)();
                ui.send('CHARACTERS', Waifu_1.wAIfu.state.characters);
            }
            break;
        case PREFIX_TYPE.CONFIG:
            {
                let match = (0, Helper_1.isOfClassDeep)(json_object, new config_1.Config(), { print: true, obj_name: "config" });
                if (match === false) {
                    io_1.IO.warn('ERROR: Config received from UI did not pass the sanity check. Latest config changes might be lost.');
                    ui.send('CONFIG', Waifu_1.wAIfu.state.config);
                    return;
                }
                let reload = (0, check_need_reload_1.checkNeedsReload)(Waifu_1.wAIfu.state.config, json_object);
                (0, export_config_1.writeConfig)(json_object);
                Waifu_1.wAIfu.state.config = config_1.Config.importFromFile(0);
                io_1.IO.print('Updated config.');
                if (reload === true) {
                    Waifu_1.wAIfu.dependencies.needs_reload = true;
                    Waifu_1.wAIfu.dependencies.input_system.interrupt();
                }
            }
            break;
        case PREFIX_TYPE.AUTH:
            {
                let match = (0, Helper_1.isOfClassDeep)(json_object, new auth_1.Auth(), { print: true, obj_name: "auth" });
                if (match === false) {
                    io_1.IO.warn('ERROR: Accounts infos received from UI did not pass the sanity check. Latest changes might be lost.');
                    ui.send('AUTH', Waifu_1.wAIfu.state.auth);
                    return;
                }
                Waifu_1.wAIfu.state.auth = json_object;
                (0, export_auth_1.writeAuth)(Waifu_1.wAIfu.state.auth);
                io_1.IO.print('Updated auth.');
            }
            break;
        case PREFIX_TYPE.INTERRUPT:
            {
                Waifu_1.wAIfu.dependencies?.tts.interrupt();
                io_1.IO.print('Interrupted speech.');
            }
            break;
        case PREFIX_TYPE.RESET:
            {
                Waifu_1.wAIfu.state.memory.clear();
                io_1.IO.print('Cleared memories.');
            }
            break;
        default:
            io_1.IO.warn('ERROR: Received unhandled prefix from UI WebSocket.');
            break;
    }
}
exports.handleUImessage_impl = handleUImessage_impl;
var PREFIX_TYPE;
(function (PREFIX_TYPE) {
    PREFIX_TYPE["MESSAGE"] = "MESSAGE";
    PREFIX_TYPE["CONFIG"] = "CONFIG";
    PREFIX_TYPE["CHARACTER"] = "CHARACTER";
    PREFIX_TYPE["AUTH"] = "AUTH";
    PREFIX_TYPE["INTERRUPT"] = "INTERRUPT";
    PREFIX_TYPE["RESET"] = "RESET";
})(PREFIX_TYPE || (PREFIX_TYPE = {}));
