import * as fs from 'fs';
import { Config } from './config';
import { IO } from '../io/io';

export function writeConfig(config: Config) {
    try {
        fs.writeFileSync(Config.CONFIG_PATH, JSON.stringify(config));
    } catch {
        IO.warn('ERROR: Failed to write config to file.');
    }
}