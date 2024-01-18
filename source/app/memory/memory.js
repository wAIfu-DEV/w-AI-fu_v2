"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Memory = void 0;
const characters_1 = require("../characters/characters");
const io_1 = require("../io/io");
const sanitize_1 = require("../sanitize/sanitize");
const Waifu_1 = require("../types/Waifu");
const format_ltm_1 = require("./format_ltm");
class Memory {
    #short_term_mem = [];
    #long_term_mem = [];
    #awaiting_summary = [];
    getCharacterDef() {
        const character = (0, characters_1.getCurrentCharacter)();
        return `${character.char_persona}${character.char_persona.endsWith("\n") ? "" : "\n"}`;
    }
    getExampleDialogue() {
        const character = (0, characters_1.getCurrentCharacter)();
        if (character.example_dialogue === "")
            return [];
        return [...character.example_dialogue.split("\n").map((v) => v + "\n")];
    }
    getBufferedMemories() {
        return structuredClone(this.#awaiting_summary);
    }
    getLongTerm() {
        return this.#long_term_mem.map((v) => (0, format_ltm_1.formatStampedMemory)(v));
    }
    getShortTerm() {
        return structuredClone(this.#short_term_mem);
    }
    getLastShortTermMemory() {
        const arr = structuredClone(this.#short_term_mem);
        return arr[arr.length - 1] || "";
    }
    getLiveChatPreview() {
        if (Waifu_1.wAIfu.state?.config.live_chat.read_live_chat.value === false)
            return [];
        const chat_messages = Waifu_1.wAIfu.dependencies?.live_chat.msg_buffer;
        let result = [];
        for (let msg of chat_messages) {
            result.push(`${msg.sender}: ${msg.content}`);
        }
        return result;
    }
    getMemories(context = null, prompt = null, additional_long_term = []) {
        const cfg = Waifu_1.wAIfu.state.config;
        const max_buffered = cfg.memory.summarize_after_x_old_entries.value;
        if (this.#awaiting_summary.length >= max_buffered)
            this.summarizeBuffered();
        const example_dialogue = this.getExampleDialogue();
        const buffered_mem = this.getBufferedMemories();
        const short_mem = this.getShortTerm();
        const mem_as_string = (buffered_mem.join("\n") +
            "\n" +
            short_mem.join("\n") +
            "\n" +
            prompt).toLowerCase();
        const contextual_memory = [];
        next_memory: for (let mem_entry of Waifu_1.wAIfu.state.config.memory
            .contextual_memories.value) {
            for (let keyword of mem_entry.keywords) {
                if (mem_as_string.includes(keyword.toLowerCase()) === false)
                    continue;
                contextual_memory.push(`(${keyword}): ${mem_entry.content}`);
                continue next_memory;
            }
        }
        let short_mem_as_string = `${example_dialogue.length > 0
            ? this.#memToString(example_dialogue)
            : ""}${buffered_mem.length > 0 ? this.#memToString(buffered_mem) : ""}${short_mem.length > 0 ? this.#memToString(short_mem) : ""}`;
        if (short_mem_as_string.endsWith("\n")) {
            short_mem_as_string = short_mem_as_string.slice(0, short_mem_as_string.length - 1);
        }
        let result_array = [
            "----",
            this.getCharacterDef(),
            `Date: ${new Date().toLocaleDateString("en", {
                day: "numeric",
                month: "long",
                weekday: "long",
                year: "numeric",
            })} (${new Date().toLocaleDateString("en", {
                day: "numeric",
                month: "numeric",
                year: "numeric",
            })})`,
            `\nRelevant informations:\n- ${contextual_memory.join("\n- ") || "none"}`,
            `\nOlder memories:\n- ${additional_long_term.join("\n- ") || "none"}`,
            `\nLive Chat:\n- ${this.getLiveChatPreview().join("\n- ") || "none"}`,
            `\nRecent memories:\n- ${this.getLongTerm().join("\n- ") || "none"}`,
            "***",
            short_mem_as_string,
        ];
        if (context !== null) {
            if (context.endsWith("\n"))
                context = context.slice(0, context.length - 2);
            result_array.push(`----\n${context}\n***`);
        }
        if (prompt !== null)
            result_array.push(prompt);
        return result_array.join("\n");
    }
    addMemory(new_memory) {
        this.#short_term_mem.push(new_memory);
        const max_mem = Waifu_1.wAIfu.state.config.memory.max_short_term_memory_entries.value;
        const should_summarize = Waifu_1.wAIfu.state.config.memory.extend_with_summarized_memory.value;
        while (this.#short_term_mem.length > max_mem) {
            const item = this.#short_term_mem.shift();
            if (!should_summarize)
                continue;
            this.#awaiting_summary.push(item);
        }
    }
    addLongTermMemory(new_memory) {
        this.#long_term_mem.push({
            content: new_memory,
            timestamp: new Date().getTime(),
        });
        const max_entries = Waifu_1.wAIfu.state.config.memory.max_summarized_memory_entries.value;
        while (this.#long_term_mem.length > max_entries) {
            this.#long_term_mem.shift();
        }
    }
    clear() {
        this.#short_term_mem = [];
        this.#long_term_mem = [];
        this.#awaiting_summary = [];
    }
    async summarizeBuffered() {
        const buffered_str = this.getBufferedMemories().join("");
        const gen_result = await Waifu_1.wAIfu.dependencies.llm.generate(buffered_str +
            `[ Give me a 30 words summary of the contents of this interraction, from the POV of ${(0, characters_1.getCurrentCharacter)().char_name}. Use names. ]`, {
            character_name: "Summary",
            temperature: 0.5,
            repetition_penalty: 2.8,
            length_penalty: 0,
            max_output_length: 60,
            use_base_model: true,
        });
        if (gen_result.success === false) {
            io_1.IO.warn("Failed to summarize memory part of memory.");
            return;
        }
        gen_result.value = gen_result.value.replaceAll("\n", "");
        gen_result.value = (0, sanitize_1.removeNovelAIspecialSymbols)(gen_result.value);
        io_1.IO.print("Memory summary:", gen_result.value);
        if (Waifu_1.wAIfu.state?.config.memory.store_summarized_memories_to_vectordb
            .value === true) {
            Waifu_1.wAIfu.dependencies?.ltm.store(gen_result.value.trim());
        }
        this.addLongTermMemory(gen_result.value);
        this.#awaiting_summary = [];
    }
    #memToString(memories) {
        const formated_mems = memories.map((s) => s.endsWith("\n") ? s : s + "\n");
        return formated_mems.join("");
    }
}
exports.Memory = Memory;
