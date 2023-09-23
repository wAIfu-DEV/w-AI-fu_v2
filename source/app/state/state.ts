import { retreiveCharacters } from "../characters/characters";
import { CommandQueue } from "../commands/queue";
import { Memory } from "../memory/memory";
import { Auth } from "../auth/auth";
import { Config } from "../config/config";
import { getBadWords } from "../moderation/decode_bad_words";

export class AppState {
    command_queue: CommandQueue;
    presets: string[];
    current_preset: string|null;
    config: Config;
    auth: Auth;
    characters: any;
    devices: any;
    memory: Memory;
    bad_words: string[];

    constructor() {
        this.command_queue = new CommandQueue();
        this.presets = Config.getAllPresets();
        this.current_preset = Config.getPreset(this.presets);
        this.config = Config.importFromFile(this.current_preset);
        this.auth = Auth.importFromFile();
        this.characters = retreiveCharacters();
        this.memory = new Memory();
        this.bad_words = getBadWords();
    }
}