import * as fs from "fs";

/**
 * Reads every json files in the `userdata/config/` folder and return their 
 * name (with extension)
 * @returns array of the config file names. ex: ["config.json"]
 */
export function getAllPresets_impl(): string[] {
    const PRESETS_PATH = process.cwd() + "/userdata/config";

    let files = fs.readdirSync(PRESETS_PATH, {
                                            encoding: "utf8",
                                            recursive: false,
                                            withFileTypes: false
                                        });
    let ret_val: string[] = [];                                   
    for (let file of files) {
        if (file.endsWith(".json") === false) continue;
        ret_val.push(file);
    }
    return ret_val;
}