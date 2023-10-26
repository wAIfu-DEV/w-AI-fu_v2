"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Memory = void 0;
const characters_1 = require("../characters/characters");
const Waifu_1 = require("../types/Waifu");
const insert_1 = require("../utils/insert");
class Memory {
    #memories = [];
    getCharacterDef() {
        const character = (0, characters_1.getCurrentCharacter)();
        const should_add_sfw_hint = Waifu_1.wAIfu.state?.config.moderation.sfw_generation_hint.value || false;
        return `----\n${character.char_persona}${character.char_persona.endsWith("\n") ? "" : "\n"}***\n[ Style: twitch chat${should_add_sfw_hint ? ", SFW" : ""} ]\n`;
    }
    getLongTerm() {
        const character = (0, characters_1.getCurrentCharacter)();
        if (character.example_dialogue === "")
            return [];
        return [...character.example_dialogue.split("\n").map((v) => v + "\n")];
    }
    getShortTerm() {
        return structuredClone(this.#memories);
    }
    getMemories(context = null, prompt = null) {
        let result_array = [];
        const max_mem = Waifu_1.wAIfu.state.config.memory.max_short_term_memory_entries.value;
        while (this.#memories.length > max_mem)
            this.#memories.shift();
        let long = this.getLongTerm();
        let short = this.getShortTerm();
        result_array = result_array.concat(long, short);
        const context_index = result_array.length - 2;
        if (context !== null) {
            if (context.endsWith("\n"))
                context = context.slice(0, context.length - 2);
            (0, insert_1.insertInArray)(`----\n${context}\n***\n`, context_index, result_array);
        }
        const chardef_index = result_array.length - 6;
        (0, insert_1.insertInArray)(this.getCharacterDef(), chardef_index, result_array);
        if (prompt !== null)
            result_array.push(prompt);
        const final_prompt = result_array.join("");
        const final_prompt_lower = final_prompt.toLowerCase();
        const contextual_memory = [];
        next_memory: for (let mem_entry of Waifu_1.wAIfu.state.config.memory
            .contextual_memories.value) {
            for (let keyword of mem_entry.keywords) {
                if (final_prompt_lower.includes(keyword.toLowerCase()) === false)
                    continue;
                contextual_memory.push(`----\n${mem_entry.content}\n`);
                continue next_memory;
            }
        }
        contextual_memory.push(`----\nDate: ${new Date().toLocaleDateString("en", {
            day: "numeric",
            month: "long",
            weekday: "long",
            year: "numeric",
        })}\n***\n`);
        return contextual_memory.join("") + final_prompt;
    }
    addMemory(new_memory) {
        this.#memories.push(new_memory);
    }
    clear() {
        this.#memories = [];
    }
}
exports.Memory = Memory;
