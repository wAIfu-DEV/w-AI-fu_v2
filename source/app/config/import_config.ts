import * as fs from "fs";

import { Config } from "./config";
import { IO } from "../io/io";
import { isOfClassDeep } from "../types/Helper";
import { generateUpdatedConfig } from "./generate_updated_config";

export function importFromFile_impl(preset: string | null | undefined) {
    if (preset === null || preset === undefined) return new Config();

    const CONFIG_PATH = process.cwd() + "/userdata/config/";

    let raw_data;
    try {
        raw_data = fs.readFileSync(CONFIG_PATH + preset, { encoding: "utf8" });
    } catch {
        IO.warn("ERROR: Could not load preset:", preset);
        return new Config();
    }

    let json_obj: unknown;
    try {
        json_obj = JSON.parse(raw_data);
    } catch {
        IO.warn("ERROR: Could not parse preset:", preset);
        return new Config();
    }

    if (
        isOfClassDeep<Config>(json_obj, new Config(), {
            add_missing_fields: true,
            obj_name: "config",
            print: false,
        }) === false
    ) {
        IO.warn("ERROR: Preset file", preset, " did not pass sanity test.");
        return new Config();
    }

    // Handles the removing of old fields
    return generateUpdatedConfig(json_obj as Config);
}
