import * as fs from 'fs';
import { Config } from './config';
import { IO } from '../io/io';
import { wAIfu } from '../types/Waifu';

/**
 * Writes a Config object to a json file in `userdata/config/`
 * @param config Config object
 * @param file_name name of the config file. (with .json extension)
 */
export function writeConfig(config: Config, file_name: string|null|undefined): void {

    let file = file_name;

    if (file === null || file === undefined) {
        if (wAIfu.state === undefined) return;
        wAIfu.state.current_preset = 'config.json';
        file = 'config.json';
        wAIfu.dependencies?.ui?.send("PRESETS", { presets: wAIfu.state.presets, current: wAIfu.state.current_preset })
    }

    try {
        fs.writeFileSync(process.cwd() + "/userdata/config/" + file, JSON.stringify(config));
    } catch {
        IO.warn('ERROR: Failed to write config to file.');
    }
}