import { Character } from "../characters/character";
import { getCurrentCharacter } from "../characters/characters";
import { wAIfu } from "../types/Waifu";
import { insertInArray } from "../utils/insert";

export class Memory {
    #memories: string[] = [];

    getCharacterDef(): string {
        const character: Character = getCurrentCharacter();
        const should_add_sfw_hint: boolean =
            wAIfu.state?.config.moderation.sfw_generation_hint.value || false;
        return `----\n${character.char_persona}${
            character.char_persona.endsWith("\n") ? "" : "\n"
        }***\n[ Style: twitch chat${should_add_sfw_hint ? ", SFW" : ""} ]\n`;
    }

    getLongTerm(): string[] {
        const character: Character = getCurrentCharacter();
        if (character.example_dialogue === "") return [];
        return [...character.example_dialogue.split("\n").map((v) => v + "\n")];
    }

    getShortTerm(): string[] {
        return structuredClone(this.#memories);
    }

    getMemories(
        context: string | null = null,
        prompt: string | null = null
    ): string {
        let result_array: string[] = [];

        // Drop memory entries outside of the set bound
        const max_mem =
            wAIfu.state!.config.memory.max_short_term_memory_entries.value;
        while (this.#memories.length > max_mem) this.#memories.shift();

        let long = this.getLongTerm();
        let short = this.getShortTerm();

        result_array = result_array.concat(long, short);

        const context_index = result_array.length - 2;
        if (context !== null) {
            if (context.endsWith("\n"))
                context = context.slice(0, context.length - 2);
            insertInArray<string>(
                `----\n${context}\n***\n`,
                context_index,
                result_array
            );
        }

        const chardef_index = result_array.length - 6;
        insertInArray<string>(
            this.getCharacterDef(),
            chardef_index,
            result_array
        );

        if (prompt !== null) result_array.push(prompt);

        const final_prompt = result_array.join("");
        const final_prompt_lower = final_prompt.toLowerCase();

        const contextual_memory: string[] = [];

        next_memory: for (let mem_entry of wAIfu.state!.config.memory
            .contextual_memories.value) {
            for (let keyword of mem_entry.keywords) {
                if (
                    final_prompt_lower.includes(keyword.toLowerCase()) === false
                )
                    continue;
                contextual_memory.push(`----\n${mem_entry.content}\n`);
                continue next_memory;
            }
        }

        contextual_memory.push(
            `----\nDate: ${new Date().toLocaleDateString("en", {
                day: "numeric",
                month: "long",
                weekday: "long",
                year: "numeric",
            })}\n***\n`
        );

        return contextual_memory.join("") + final_prompt;
    }

    addMemory(new_memory: string): void {
        this.#memories.push(new_memory);
    }

    clear(): void {
        this.#memories = [];
    }
}
