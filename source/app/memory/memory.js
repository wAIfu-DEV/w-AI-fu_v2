"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Memory = void 0;
const Waifu_1 = require("../types/Waifu");
class Memory {
    #memories = [];
    getLongTerm() {
        let char = Waifu_1.wAIfu.state.characters[Waifu_1.wAIfu.state.config._.character_name.value];
        return `{${char["char_persona"]}}\n${char["example_dialogue"]}`;
    }
    getShortTerm() {
        return this.#memories.join('');
    }
    getMemories(context = null, prompt = null) {
        let result = '';
        let max_mem = Waifu_1.wAIfu.state.config.memory.max_short_term_memory_entries.value;
        while (this.#memories.length > max_mem)
            this.#memories.shift();
        let long = this.getLongTerm();
        let short = this.getShortTerm();
        let temp_full_prompt = `${long}\n${short}\n${context || ''}\n${prompt || ''}`.toLowerCase();
        let contextual_memory = null;
        next_memory: for (let mem_entry of Waifu_1.wAIfu.state.config.memory.contextual_memories.value) {
            for (let keyword of mem_entry.keywords) {
                if (temp_full_prompt.includes(keyword.toLowerCase()) === false)
                    continue;
                if (contextual_memory === null)
                    contextual_memory = '';
                contextual_memory += `{${mem_entry.content}}\n`;
                continue next_memory;
            }
        }
        if (long.endsWith('\n') === false) {
            long = `${long}\n`;
        }
        if (short.endsWith('\n') === false) {
            short = `${short}\n`;
        }
        if (contextual_memory !== null)
            result += contextual_memory;
        result += long;
        if (short !== '\n')
            result += short;
        if (context !== null)
            result += `{${context}}\n`;
        if (prompt !== null)
            result += prompt;
        return result;
    }
    addMemory(new_memory) {
        this.#memories.push(new_memory);
    }
    clear() {
        this.#memories = [];
    }
}
exports.Memory = Memory;
