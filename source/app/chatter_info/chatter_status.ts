import { Character } from "../characters/character";
import { getCurrentCharacter } from "../characters/characters";

export class ChatterInfos {
    static chatters: Map<string, void> = new Map<string, void>();

    static isJustReturningChatter(chatter_name: string): boolean {
        return !this.chatters.has(chatter_name);
    }

    static addChatter(chatter_name: string): void {
        this.chatters.set(chatter_name, undefined);
    }

    static getChatterStatusString(chatter_name: string): string {
        const result: string[] = [];
        const char: Character = getCurrentCharacter();

        if (this.isJustReturningChatter(chatter_name)) {
            result.push(
                `${chatter_name} just appeared in CHAT, ${char.char_name} should greet them.`
            );
        }

        if (result.length === 0) return "";
        return result.join("");
    }
}
