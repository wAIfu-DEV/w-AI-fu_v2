import * as fs from "fs";
import { IO } from "../io/io";

export function writePreset(preset: string) {

    const PRESET_PATH = process.cwd() + "/userdata/config/preset.txt";
    try {
        fs.writeFileSync(PRESET_PATH, preset);
    } catch {
        IO.warn('ERROR: Could not write selected preset to file.');
    }
}