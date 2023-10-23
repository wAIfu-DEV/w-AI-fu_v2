"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextualMemoryEntry = exports.ConfigFieldContextualMemoryList = exports.VtsKeywordTriggers = exports.VtsEmotion = exports.ConfigFieldVtsKeywordTriggersList = exports.ConfigFieldVtsEmotionList = exports.ConfigFieldList = exports.ConfigFieldSelect = exports.ConfigFieldNumber = exports.ConfigFieldBoolean = exports.ConfigFieldString = exports.Config = void 0;
const import_config_1 = require("./import_config");
const available_presets_1 = require("./available_presets");
const get_last_preset_1 = require("./get_last_preset");
class Config {
    "_" = {
        user_name: new ConfigFieldString({
            hint: "Name the character should refer you as.",
            reload: false,
            type: "string",
            default: "USER",
            value: "USER",
        }),
        character_name: new ConfigFieldString({
            hint: "Name of the character to load.",
            reload: false,
            type: "string",
            default: "Hilda",
            value: "Hilda",
        }),
        context: new ConfigFieldString({
            hint: "Additional persistant context to send to the text generation model. This will have a great impact on the output.",
            reload: false,
            type: "string",
            default: "",
            value: "",
        }),
        paused: new ConfigFieldBoolean({
            hint: "Keeps track of if the program should be paused or not.",
            reload: false,
            type: "boolean",
            default: false,
            value: false,
        }),
        vts_session_token: new ConfigFieldString({
            hint: "VTS auth session token.",
            reload: false,
            type: "string",
            default: "",
            value: "",
        }),
    };
    "behaviour" = {
        monologue: new ConfigFieldBoolean({
            hint: "Make the character talk about subjects of interest if no new chat messages have been found.",
            reload: false,
            type: "boolean",
            default: false,
            value: false,
        }),
        monologue_chance_percent: new ConfigFieldNumber({
            hint: "Modify the probability of triggering a monologue when no other input sources are available.",
            reload: false,
            type: "number",
            default: 1,
            min: 0,
            max: 100,
            value: 1,
        }),
        try_prevent_freakouts: new ConfigFieldBoolean({
            hint: "Tries to prevent freakouts by altering response in order to keep the AI on track and sane.",
            reload: false,
            type: "boolean",
            default: true,
            value: true,
        }),
        additional_logs: new ConfigFieldBoolean({
            hint: "Displays debug-related logs in the console.",
            reload: false,
            type: "boolean",
            default: false,
            value: false,
        }),
        log_to_file: new ConfigFieldBoolean({
            hint: "Write console contents to a file in the logs folder.",
            reload: false,
            type: "boolean",
            default: true,
            value: true,
        }),
    };
    "memory" = {
        max_short_term_memory_entries: new ConfigFieldNumber({
            hint: "Number of interactions to keep in memory. A greater number might disolve the character's personality and lead to repetition and incoherent speech.",
            reload: false,
            type: "number",
            default: 7,
            min: 1,
            max: 20,
            value: 7,
        }),
        contextual_memories: new ConfigFieldContextualMemoryList({
            hint: "Memories to be remembered based on context (i.e if encounters keyword)",
            reload: false,
            type: "contextual_memory_list",
            default: [],
            value: [],
        }),
    };
    "live_chat" = {
        livestream_platform: new ConfigFieldSelect({
            hint: "What platform from which to receive messages and events.",
            reload: true,
            type: "select",
            options: ["twitch", "youtube"],
            default: "twitch",
            value: "twitch",
        }),
        read_live_chat: new ConfigFieldBoolean({
            hint: "Makes the character respond to live chat messages.",
            reload: true,
            type: "boolean",
            default: false,
            value: false,
        }),
        read_chat_after_x_seconds: new ConfigFieldNumber({
            hint: "Time in seconds to wait for before reading the next chat message.",
            reload: false,
            type: "number",
            default: 0.025,
            min: 0,
            max: 999,
            value: 0.025,
        }),
        chat_reading_mode: new ConfigFieldSelect({
            hint: "[Latest-Buffered]: Reads the latest chat message, if none is found reads next (older) message in a buffer of 4 messages. If buffer is empty, tries to monologue.\r\n[Latest]: Reads the latest chat message, if none is found tries to monolgue.\r\n[All]: Reads every chat message without exception.",
            reload: false,
            type: "select",
            options: ["latest-buffered", "latest", "all"],
            default: "latest-buffered",
            value: "latest-buffered",
        }),
        always_read_highlighted: new ConfigFieldBoolean({
            hint: "Highlighted messages will not be skipped and will be prioritized over other chat messages. (Might only work on Twitch)",
            reload: false,
            type: "boolean",
            default: true,
            value: true,
        }),
    };
    "moderation" = {
        filter_bad_words: new ConfigFieldBoolean({
            hint: "Checks the content of the character's speech and incoming chat messages for bad words.",
            reload: true,
            type: "boolean",
            default: true,
            value: true,
        }),
        censor_placeholder: new ConfigFieldString({
            hint: "Text spoken in place of the filtered response.",
            reload: false,
            type: "string",
            default: "Filtered.",
            value: "Filtered.",
        }),
        retry_after_filtered: new ConfigFieldBoolean({
            hint: "Generates a new response if the previous one got filtered. If disabled, speaks the censor phrase.",
            reload: false,
            type: "boolean",
            default: true,
            value: true,
        }),
        sfw_generation_hint: new ConfigFieldBoolean({
            hint: "Makes NovelAI more likely to keep the story SFW. While it should reduce the likelyhood of generation NSFW content, it is not a garantee.",
            reload: false,
            type: "boolean",
            default: true,
            value: true,
        }),
        filter_spam_messages: new ConfigFieldBoolean({
            hint: "Ignore spam chat messages.",
            reload: true,
            type: "boolean",
            default: true,
            value: true,
        }),
        remove_non_ascii_from_chat: new ConfigFieldBoolean({
            hint: "Removes any non-ascii characters from chat messages. Prevents chat users from using special characters to bypass the bad words filter.",
            reload: true,
            type: "boolean",
            default: true,
            value: true,
        }),
        blacklisted_chatters: new ConfigFieldList({
            hint: "Lowercase usernames of chatters the character should not respond to. Usually used for bots. Or for people you don't really like.",
            reload: false,
            type: "list",
            default: ["streamlabs", "streamelements", "nightbot"],
            value: ["streamlabs", "streamelements", "nightbot"],
        }),
    };
    "devices" = {
        voice_input_device: new ConfigFieldSelect({
            hint: "Audio device from which to receive input, usually a microphone.",
            reload: false,
            type: "select",
            options: [],
            default: "",
            value: "",
        }),
        tts_output_device: new ConfigFieldSelect({
            hint: "Audio device on which to play the TTS for the character.",
            reload: false,
            type: "select",
            options: [],
            default: "",
            value: "",
        }),
        narrator_tts_output_device: new ConfigFieldSelect({
            hint: "Audio device on which to play the TTS for the narrator.",
            reload: false,
            type: "select",
            options: [],
            default: "",
            value: "",
        }),
        alt_output_device: new ConfigFieldSelect({
            hint: "Audio device on which to play audio unrelated to TTS. Used for the instrumental track of songs.",
            reload: false,
            type: "select",
            options: [],
            default: "",
            value: "",
        }),
    };
    "large_language_model" = {
        llm_provider: new ConfigFieldSelect({
            hint: "Text generation AI provider.",
            reload: true,
            type: "select",
            options: ["novelai", "openai"],
            default: "novelai",
            value: "novelai",
        }),
        temperature: new ConfigFieldNumber({
            hint: "How creative the responses of the LLM should be.",
            reload: false,
            type: "number",
            default: 1.35,
            min: 0,
            max: 5,
            value: 1.35,
        }),
        repetition_penalty: new ConfigFieldNumber({
            hint: "Penalty applied to new tokens if the already appear in the context.",
            reload: false,
            type: "number",
            default: 2.8,
            min: 0,
            max: 10,
            value: 2.8,
        }),
        length_penalty: new ConfigFieldNumber({
            hint: "(NovelAI only) Penalty applied to new tokens based on the length of the response. Negative values should increase response length while positive ones should decrease response length.",
            reload: false,
            type: "number",
            default: 0,
            min: -10,
            max: 10,
            value: 10,
        }),
        max_output_length: new ConfigFieldNumber({
            hint: "Maximum length in tokens of the outputed response.",
            reload: false,
            type: "number",
            default: 80,
            min: 0,
            max: 600,
            value: 80,
        }),
        novelai_model: new ConfigFieldSelect({
            hint: "Model used when selecting novelai as LLM provider.",
            reload: false,
            type: "select",
            options: ["Kayra", "Clio", "Euterpe"],
            default: "Kayra",
            value: "Kayra",
        }),
        openai_model: new ConfigFieldSelect({
            hint: "Model used when selecting openai as LLM provider.",
            reload: false,
            type: "select",
            options: ["gpt-3.5-turbo", "gpt-4"],
            default: "gpt-3.5-turbo",
            value: "gpt-3.5-turbo",
        }),
        "fine-tuned_gpt3.5_model_name": new ConfigFieldString({
            hint: 'Name of the fine-tuned GPT3.5 model to use. Overwrites "Openai Model"',
            reload: false,
            type: "string",
            default: "",
            value: "",
        }),
    };
    "text_to_speech" = {
        tts_provider: new ConfigFieldSelect({
            hint: "Text-To-Speech AI provider.",
            reload: true,
            type: "select",
            options: ["novelai", "azure"],
            default: "novelai",
            value: "novelai",
        }),
        volume_modifier_db: new ConfigFieldNumber({
            hint: "Modifies the volume of the TTS. Unit is dB.",
            reload: false,
            type: "number",
            default: 10,
            min: -20,
            max: 20,
            value: 10,
        }),
        read_chat_out_loud: new ConfigFieldBoolean({
            hint: "Reads the incoming chat message out loud. Will only output character's response if disabled.",
            reload: false,
            type: "boolean",
            default: true,
            value: true,
        }),
        read_every_messages_out_loud: new ConfigFieldBoolean({
            hint: "Reads the incoming chat messages as well as user input. Overwrites 'Read Chat Out Loud'.",
            reload: false,
            type: "boolean",
            default: false,
            value: false,
        }),
        use_narrator_to_read_chat: new ConfigFieldBoolean({
            hint: "Use another voice when reading a message coming from live chat.",
            reload: false,
            type: "boolean",
            default: true,
            value: true,
        }),
        narrator_voice: new ConfigFieldString({
            hint: "Voice seed of the TTS for the narrator.",
            reload: false,
            type: "string",
            default: "dev",
            value: "dev",
        }),
        azure_pitch_percentage: new ConfigFieldNumber({
            hint: "Modifier added to the pitch of the Azure TTS voice.",
            reload: false,
            type: "number",
            default: 0,
            max: 100,
            min: 0,
            value: 0,
        }),
    };
    "speech_to_text" = {
        stt_provider: new ConfigFieldSelect({
            hint: "Speech-To-Text AI provider.",
            reload: true,
            type: "select",
            options: ["openai", "google"],
            default: "google",
            value: "google",
        }),
        voice_input: new ConfigFieldBoolean({
            hint: "Allows input via the microphone using the chosen Speech-To-Text provider.",
            reload: true,
            type: "boolean",
            default: false,
            value: false,
        }),
        push_to_talk: new ConfigFieldBoolean({
            hint: "Press Right Ctrl to record audio from the microphone, release to end recording. Requires 'Voice Input' to be on.",
            reload: true,
            type: "boolean",
            default: false,
            value: false,
        }),
        stt_language: new ConfigFieldSelect({
            hint: "Language the STT model should use to infer the spoken text.",
            reload: false,
            type: "select",
            options: [
                "af",
                "eu",
                "bg",
                "ca",
                "ar-EG",
                "ar-JO",
                "ar-KW",
                "ar-LB",
                "ar-QA",
                "ar-AE",
                "ar-MA",
                "ar-IQ",
                "ar-DZ",
                "ar-BH",
                "ar-LYZA",
                "ar-OM",
                "ar-SA",
                "ar-TN",
                "ar-YE",
                "cs",
                "nl-NL",
                "en-AU",
                "en-CA",
                "en-IN",
                "en-NZ",
                "en-ZA",
                "en-GB",
                "en-US",
                "fi",
                "fr-FR",
                "gl",
                "de-DE",
                "he",
                "hu",
                "is",
                "it-IT",
                "id",
                "ja",
                "ko",
                "la",
                "zh-CN",
                "zh-TW",
                "?",
                "zh-HK",
                "zh-yue",
                "ms-MY",
                "no-NO",
                "pl",
                "xx-piglatin",
                "pt-PT",
                "pt-BR",
                "ro-RO",
                "ru",
                "sr-SP",
                "sk",
                "es-AR",
                "es-BO",
                "es-CL",
                "es-CO",
                "es-CR",
                "es-DO",
                "es-EC",
                "es-SV",
                "es-GT",
                "es-HN",
                "es-MX",
                "es-NI",
                "es-PA",
                "es-PY",
                "es-PE",
                "es-PR",
                "es-ES",
                "es-US",
                "es-UY",
                "es-VE",
                "sv-SE",
                "tr",
                "zu",
            ],
            default: "en-US",
            value: "en-US",
        }),
    };
    "vts" = {
        api_port: new ConfigFieldNumber({
            hint: "Port of the VTS instance's plugin API.",
            reload: true,
            type: "number",
            default: 8001,
            min: 0,
            max: 65535,
            value: 8001,
        }),
        full_reset_hotkey_sequence: new ConfigFieldList({
            hint: "Hotkey sequence to call once connecting to VTS. Usually used to reset the animations and toggles.",
            reload: false,
            type: "list",
            default: [],
            value: [],
        }),
        singing_hotkey_sequence: new ConfigFieldList({
            hint: "Hotkey sequence to call once connecting to VTS. Usually used to reset the animations and toggles.",
            reload: false,
            type: "list",
            default: [],
            value: [],
        }),
        emotions: new ConfigFieldVtsEmotionList({
            hint: "Hotkey sequences to play for each emotions. Emotions are infered using the LLM for each answers. Make sure the name of the emotion is related to a feeling the character will express in its response.",
            reload: false,
            type: "vts_emotions_list",
            default: [],
            value: [],
        }),
        keyword_based_animations: new ConfigFieldVtsKeywordTriggersList({
            hint: "",
            reload: false,
            type: "vts_keywords_list",
            default: [],
            value: [],
        }),
    };
    "singing" = {
        timeout_minutes_between_playlist_songs: new ConfigFieldNumber({
            hint: "Timeout in minutes in between songs when playing a playlist with !playlist",
            reload: false,
            type: "number",
            default: 0,
            max: 999,
            min: 0,
            value: 5,
        }),
        song_playlist: new ConfigFieldList({
            hint: "Name of the songs to play in order whith the command !playlist",
            reload: false,
            type: "list",
            default: [],
            value: [],
        }),
    };
    static importFromFile = import_config_1.importFromFile_impl;
    static getAllPresets = available_presets_1.getAllPresets_impl;
    static getPreset = get_last_preset_1.getPreset_impl;
}
exports.Config = Config;
class ConfigFieldString {
    constructor(args) {
        this.hint = args.hint;
        this.reload = args.reload;
        this.type = args.type;
        this.default = args.default;
        this.value = args.value;
    }
    "hint" = "";
    "reload" = false;
    "type" = "string";
    "default" = "";
    "value" = "";
}
exports.ConfigFieldString = ConfigFieldString;
class ConfigFieldBoolean {
    constructor(args) {
        this.hint = args.hint;
        this.reload = args.reload;
        this.type = args.type;
        this.default = args.default;
        this.value = args.value;
    }
    "hint" = "";
    "reload" = false;
    "type" = "boolean";
    "default" = false;
    "value" = false;
}
exports.ConfigFieldBoolean = ConfigFieldBoolean;
class ConfigFieldNumber {
    constructor(args) {
        this.hint = args.hint;
        this.reload = args.reload;
        this.type = args.type;
        this.default = args.default;
        this.value = args.value;
        this.max = args.max;
        this.min = args.min;
    }
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
    constructor(args) {
        this.hint = args.hint;
        this.reload = args.reload;
        this.type = args.type;
        this.default = args.default;
        this.value = args.value;
        this.options = args.options;
    }
    "hint" = "";
    "reload" = false;
    "type" = "select";
    "default" = "";
    "value" = "";
    "options" = [];
}
exports.ConfigFieldSelect = ConfigFieldSelect;
class ConfigFieldList {
    constructor(args) {
        this.hint = args.hint;
        this.reload = args.reload;
        this.type = args.type;
        this.default = args.default;
        this.value = args.value;
    }
    "hint" = "";
    "reload" = false;
    "type" = "list";
    "default" = [];
    "value" = [];
}
exports.ConfigFieldList = ConfigFieldList;
class ConfigFieldVtsEmotionList {
    constructor(args) {
        this.hint = args.hint;
        this.reload = args.reload;
        this.type = args.type;
        this.default = args.default;
        this.value = args.value;
    }
    "hint" = "";
    "reload" = false;
    "type" = "vts_emotions_list";
    "default" = [];
    "value" = [];
}
exports.ConfigFieldVtsEmotionList = ConfigFieldVtsEmotionList;
class ConfigFieldVtsKeywordTriggersList {
    constructor(args) {
        this.hint = args.hint;
        this.reload = args.reload;
        this.type = args.type;
        this.default = args.default;
        this.value = args.value;
    }
    "hint" = "";
    "reload" = false;
    "type" = "vts_keywords_list";
    "default" = [];
    "value" = [];
}
exports.ConfigFieldVtsKeywordTriggersList = ConfigFieldVtsKeywordTriggersList;
class VtsEmotion {
    "emotion_name" = "";
    "talking_hotkey_sequence" = [];
    "idle_hotkey_sequence" = [];
    "reset_hotkey_sequence" = [];
}
exports.VtsEmotion = VtsEmotion;
class VtsKeywordTriggers {
    "keywords" = [];
    "hotkey_sequence" = [];
}
exports.VtsKeywordTriggers = VtsKeywordTriggers;
class ConfigFieldContextualMemoryList {
    constructor(args) {
        this.hint = args.hint;
        this.reload = args.reload;
        this.type = args.type;
        this.default = args.default;
        this.value = args.value;
    }
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
