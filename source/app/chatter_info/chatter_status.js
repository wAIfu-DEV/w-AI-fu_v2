"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatterInfos = void 0;
const characters_1 = require("../characters/characters");
class ChatterInfos {
    static chatters = new Map();
    static isJustReturningChatter(chatter_name) {
        return !this.chatters.has(chatter_name);
    }
    static addChatter(chatter_name) {
        this.chatters.set(chatter_name, undefined);
    }
    static getChatterStatusString(chatter_name) {
        const result = [];
        const char = (0, characters_1.getCurrentCharacter)();
        if (this.isJustReturningChatter(chatter_name)) {
            result.push(`${chatter_name} just appeared in CHAT, ${char.char_name} should greet them.\n`);
        }
        if (result.length === 0)
            return "";
        return result.join("----\n");
    }
}
exports.ChatterInfos = ChatterInfos;
