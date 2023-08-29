"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextualMemoryEntry = exports.ConfigFieldContextualMemoryList = exports.VtsEmotion = exports.ConfigFieldVtsEmotionList = exports.ConfigFieldList = exports.ConfigFieldSelect = exports.ConfigFieldNumber = exports.ConfigFieldBoolean = exports.ConfigFieldString = exports.Config = void 0;
const fs = __importStar(require("fs"));
const import_config_1 = require("./import_config");
class Config {
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
    };
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
    serializeToFile() {
        const serialized = JSON.stringify(this);
        fs.writeFileSync(process.cwd() + '/userdata/config/config.json', serialized);
    }
    static importFromFile = import_config_1.importFromFile_impl;
    static CONFIG_PATH = process.cwd() + "/userdata/config/config.json";
    static CONFIG_BACKUP_PATH = process.cwd() + "/userdata/config/config.backup.json";
}
exports.Config = Config;
class ConfigFieldString {
    "hint" = "";
    "reload" = false;
    "type" = "string";
    "default" = "";
    "value" = "";
}
exports.ConfigFieldString = ConfigFieldString;
class ConfigFieldBoolean {
    "hint" = "";
    "reload" = false;
    "type" = "boolean";
    "default" = false;
    "value" = false;
}
exports.ConfigFieldBoolean = ConfigFieldBoolean;
class ConfigFieldNumber {
    "hint" = "";
    "reload" = false;
    "type" = "number";
    "default" = 0;
    "value" = 0;
    "max" = 0;
    "min" = 0;
}
exports.ConfigFieldNumber = ConfigFieldNumber;
class ConfigFieldSelect {
    "hint" = "";
    "reload" = false;
    "type" = "select";
    "default" = "";
    "value" = "";
    "options" = [];
}
exports.ConfigFieldSelect = ConfigFieldSelect;
class ConfigFieldList {
    "hint" = "";
    "reload" = false;
    "type" = "list";
    "default" = [];
    "value" = [];
}
exports.ConfigFieldList = ConfigFieldList;
class ConfigFieldVtsEmotionList {
    "hint" = "";
    "reload" = false;
    "type" = "vts_emotions_list";
    "default" = [];
    "value" = [];
}
exports.ConfigFieldVtsEmotionList = ConfigFieldVtsEmotionList;
class VtsEmotion {
    "emotion_name" = "";
    "talking_hotkey_sequence" = [];
    "idle_hotkey_sequence" = [];
    "reset_hotkey_sequence" = [];
}
exports.VtsEmotion = VtsEmotion;
class ConfigFieldContextualMemoryList {
    "hint" = "";
    "reload" = false;
    "type" = "contextual_memory_list";
    "default" = [];
    "value" = [];
}
exports.ConfigFieldContextualMemoryList = ConfigFieldContextualMemoryList;
class ContextualMemoryEntry {
    "keywords" = [];
    "content" = "";
}
exports.ContextualMemoryEntry = ContextualMemoryEntry;
