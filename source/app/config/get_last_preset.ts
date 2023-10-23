import * as fs from "fs";

/**
 * Get name (file name) of selected preset or first config file name available
 * if preset could not be found
 * @param available_presets 
 * @returns config file name
 */
export function getPreset_impl(available_presets: string[]): string|null {

    const CONFIG_PATH = process.cwd() + "/userdata/config";
    const PRESET_PATH = CONFIG_PATH + "/preset.txt";

    let preset: string = "";
    try {
        preset = fs.readFileSync(PRESET_PATH, { encoding: "utf8" });
    } catch {
        return getFirstAvailablePreset(available_presets);
    }

    if (available_presets.indexOf(preset) === -1) {
        return getFirstAvailablePreset(available_presets);
    }

    return preset;
}

function getFirstAvailablePreset(available_presets: string[]) {
    let first_available_preset = available_presets[0];
    if (first_available_preset === undefined) return null;
    return first_available_preset;
}
