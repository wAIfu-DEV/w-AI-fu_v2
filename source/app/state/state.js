"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppState = void 0;
const characters_1 = require("../characters/characters");
const queue_1 = require("../commands/queue");
const memory_1 = require("../memory/memory");
const auth_1 = require("../auth/auth");
const config_1 = require("../config/config");
const decode_bad_words_1 = require("../moderation/decode_bad_words");
class AppState {
    command_queue;
    presets;
    current_preset;
    config;
    auth;
    characters;
    devices;
    memory;
    bad_words;
    constructor() {
        this.command_queue = new queue_1.CommandQueue();
        this.presets = config_1.Config.getAllPresets();
        this.current_preset = config_1.Config.getPreset(this.presets);
        this.config = config_1.Config.importFromFile(this.current_preset);
        this.auth = auth_1.Auth.importFromFile();
        this.characters = (0, characters_1.retreiveCharacters)();
        this.memory = new memory_1.Memory();
        this.bad_words = (0, decode_bad_words_1.getBadWords)();
    }
}
exports.AppState = AppState;
