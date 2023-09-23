import { wAIfu } from "../types/Waifu";
import { decontaminateMemory } from "./anti_contamination";

export class Memory {

    #memories: string[] = [];

    getLongTerm() {
        let char: any = wAIfu.state!.characters[wAIfu.state!.config._.character_name.value];
        return `----\n${char["char_persona"]}\n***\n[ Style: chat${(wAIfu.state?.config.moderation.sfw_generation_hint.value === true) ? ', SFW' : ''} ]\n${char["example_dialogue"]}`;
    }

    getShortTerm() {

        return (wAIfu.state?.config.memory.memory_decontamination.value === true)
               ? decontaminateMemory(this.#memories).join('')
               : this.#memories.join('');
    }

    getMemories(context: string|null = null, prompt: string|null = null) {
        let result:string = '';

        let max_mem = wAIfu.state!.config.memory.max_short_term_memory_entries.value;
        while (this.#memories.length > max_mem)
            this.#memories.shift();
        
        let long = this.getLongTerm();
        let short = this.getShortTerm();

        let temp_full_prompt = `${long}\n${short}\n${context || ''}\n${prompt || ''}`.toLowerCase();
        let contextual_memory: string|null = null;
        next_memory: for (let mem_entry of wAIfu.state!.config.memory.contextual_memories.value) {
            for (let keyword of mem_entry.keywords) {
                if (temp_full_prompt.includes(keyword.toLowerCase()) === false) continue;
                if (contextual_memory === null) contextual_memory = '';
                contextual_memory += `----\n${mem_entry.content}\n`;
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
            result += `{ ${context} }\n`;
    
        if (prompt !== null)
            result += prompt;

        return result;
    }

    addMemory(new_memory: string) {
        this.#memories.push(new_memory);
    }

    clear() {
        this.#memories = [];
    }

}