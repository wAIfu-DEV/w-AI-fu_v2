import * as fs from 'fs';
import { importFromFile_impl } from './import_config';
//import { readParseAs } from '../file_system/file_system';

export class Config {
    "_" = {
        "user_name": new ConfigFieldString(),
        "character_name": new ConfigFieldString(),
        "context": new ConfigFieldString(),
        "paused": new ConfigFieldBoolean(),
        "vts_session_token": new ConfigFieldString()
    };
    "behaviour" = {
        "voice_input": new ConfigFieldBoolean(),
        "push_to_talk": new ConfigFieldBoolean(),
        "read_live_chat": new ConfigFieldBoolean(),
        "read_chat_after_x_seconds": new ConfigFieldNumber(),
        "chat_reading_mode": new ConfigFieldSelect(),
        "always_read_highlighted": new ConfigFieldBoolean(),
        "monologue": new ConfigFieldBoolean(),
        "monologue_chance_percent": new ConfigFieldNumber(),
        "additional_logs": new ConfigFieldBoolean(),
        "log_to_file": new ConfigFieldBoolean()
    };
    "memory" = {
        "max_short_term_memory_entries": new ConfigFieldNumber(),
        "contextual_memories": new ConfigFieldContextualMemoryList()
    }
    "moderation" = {
        "filter_bad_words": new ConfigFieldBoolean(),
        "blacklisted_chatters": new ConfigFieldList()
    };
    "providers" = {
        "livestream_platform": new ConfigFieldSelect(),
        "llm_provider": new ConfigFieldSelect(),
        "tts_provider": new ConfigFieldSelect(),
        "stt_provider": new ConfigFieldSelect()
    };
    "devices" = {
        "voice_input_device": new ConfigFieldSelect(),
        "tts_output_device": new ConfigFieldSelect(),
        "narrator_tts_output_device": new ConfigFieldSelect(),
        "alt_output_device": new ConfigFieldSelect()
    };
    "llm" = {
        "temperature": new ConfigFieldNumber(),
        "repetition_penalty": new ConfigFieldNumber(),
        "length_penalty": new ConfigFieldNumber(),
        "max_output_length": new ConfigFieldNumber()
    };
    "tts" = {
        "volume_modifier_db": new ConfigFieldNumber(),
        "use_narrator_to_read_chat": new ConfigFieldBoolean(),
        "narrator_voice": new ConfigFieldString()
    };
    "vts" = {
        "api_port": new ConfigFieldNumber(),
        "full_reset_hotkey_sequence": new ConfigFieldList(),
        "emotions": new ConfigFieldVtsEmotionList()
    };

    /** Serializes the config then writes it to file. */
    serializeToFile(): void {
        const serialized: string = JSON.stringify(this);
        fs.writeFileSync(process.cwd() + '/userdata/config/config.json', serialized);
    }

    static importFromFile = importFromFile_impl

    static CONFIG_PATH = process.cwd() + "/userdata/config/config.json";
    static CONFIG_BACKUP_PATH = process.cwd() + "/userdata/config/config.backup.json";
}

export interface ConfigField {
    "hint": string;
    "reload": boolean;
    "type": string;
    "default": any;
    "value": any
}

export class ConfigFieldString implements ConfigField {
    "hint": string = "";
    "reload": boolean = false;
    "type": string = "string";
    "default": string = "";
    "value": string = "";
}

export class ConfigFieldBoolean implements ConfigField {
    "hint": string = "";
    "reload": boolean = false;
    "type": string = "boolean";
    "default": boolean = false;
    "value": boolean = false;
}

export class ConfigFieldNumber implements ConfigField {
    "hint": string = "";
    "reload": boolean = false;
    "type": string = "number";
    "default": number = 0;
    "value": number = 0;
    "max": number = 0;
    "min": number = 0;
}

export class ConfigFieldSelect implements ConfigField {
    "hint": string = "";
    "reload": boolean = false;
    "type": string = "select";
    "default": string = "";
    "value": string = "";
    "options": string[] = [];
}

export class ConfigFieldList implements ConfigField {
    "hint": string = "";
    "reload": boolean = false;
    "type": string = "list";
    "default": string[] = [];
    "value": string[] = [];
}

export class ConfigFieldVtsEmotionList implements ConfigField {
    "hint": string = "";
    "reload": boolean = false;
    "type": string = "vts_emotions_list";
    "default": VtsEmotion[] = [];
    "value": VtsEmotion[] = [];
}

export class VtsEmotion {
    "emotion_name": string = "";
    "talking_hotkey_sequence": string[] = [];
    "idle_hotkey_sequence": string[] = [];
    "reset_hotkey_sequence": string[] = [];
}

export class ConfigFieldContextualMemoryList implements ConfigField {
    "hint": string = "";
    "reload": boolean = false;
    "type": string = "contextual_memory_list";
    "default": ContextualMemoryEntry[] = [];
    "value": ContextualMemoryEntry[] = [];
}

export class ContextualMemoryEntry {
    "keywords": string[] = [];
    "content": string = "";
}