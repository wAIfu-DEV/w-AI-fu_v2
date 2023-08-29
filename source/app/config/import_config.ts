import * as fs from 'fs'

import {
    Config,
    ConfigField, 
    ConfigFieldString,
    ConfigFieldBoolean,
    ConfigFieldList,
    ConfigFieldNumber,
    ConfigFieldSelect,
    ConfigFieldVtsEmotionList,
    ConfigFieldContextualMemoryList
}
from "./config";
import { IO } from '../io/io';

function regenConfigFromBackup() {
    fs.writeFileSync(Config.CONFIG_PATH,
        fs.readFileSync(Config.CONFIG_BACKUP_PATH, {encoding: 'utf8'}));
}

export function importFromFile_impl(tries: number = 0): Config {

    if (tries > 5) {
        IO.error('CRITICAL ERROR:',
            'Ran out of tries when attempting to read config.',
            'Please reinstall the application and move the contents of the "userdata" folder',
            'to the new install, without including the "config" folder inside.');
        process.exit(1);
        return new Config();
    }

    let mut_raw_data: string;
    try {
        mut_raw_data = fs.readFileSync(Config.CONFIG_PATH, { encoding: 'utf8' });
    } catch (error) {
        IO.warn('ERROR: Could not read config file. w-AI-fu will try to generate a new one.');
        regenConfigFromBackup();
        return importFromFile_impl(tries + 1);
    }
    const raw_data = mut_raw_data;

    let json_obj: unknown;
    try {
        json_obj = JSON.parse(raw_data);
    } catch (error) {
        IO.warn('ERROR: Could not parse config file. w-AI-fu will try to generate a new one.');
        regenConfigFromBackup();
        return importFromFile_impl(tries + 1);
    }

    if (typeof json_obj !== "object") {
        IO.warn('ERROR: Parsed config is not an object.');
        regenConfigFromBackup();
        return importFromFile_impl(tries + 1);
    }

    if (json_obj === undefined || json_obj === null) {
        IO.warn('ERROR: Parsed config object is undefined.');
        regenConfigFromBackup();
        return importFromFile_impl(tries + 1);
    }

    let FIELDS_TYPES_DICT = {
        "string": new ConfigFieldString(),
        "number": new ConfigFieldNumber(),
        "boolean": new ConfigFieldBoolean(),
        "select": new ConfigFieldSelect(),
        "list": new ConfigFieldList(),
        "vts_emotions_list": new ConfigFieldVtsEmotionList(),
        "contextual_memory_list": new ConfigFieldContextualMemoryList()
    };

    for (let [ main_field, main_value ] of Object.entries(new Config())) {

        if (main_field in json_obj === false) {
            IO.warn(`ERROR: Field "${main_field}" is missing from the parsed config file. w-AI-fu will try to generate a new one.`);
            regenConfigFromBackup();
            return importFromFile_impl(tries + 1);
        }

        for (let [ field, field_obj ] of Object.entries(main_value)) {

            if (typeof field_obj !== "object" || field_obj === null || field_obj === undefined) {
                IO.warn(`ERROR: Field "${main_field}.${field}" in config is not an object. w-AI-fu will try to generate a new one.`);
                regenConfigFromBackup();
                return importFromFile_impl(tries + 1);
            }

            if ("type" in field_obj === false) {
                IO.warn(`ERROR: Field "type" is missing from "${main_field}.${field}" in config. w-AI-fu will try to generate a new one.`);
                regenConfigFromBackup();
                return importFromFile_impl(tries + 1);
            }

            if ("type" in field_obj && typeof field_obj["type"] !== "string") {
                IO.warn(`ERROR: Field "type" in "${main_field}.${field}" in config should be a string. w-AI-fu will try to generate a new one.`);
                regenConfigFromBackup();
                return importFromFile_impl(tries + 1);
            }

            // @ts-ignore fuck this shit, even when holding typescript's hand it still manages to fuck it up
            let config_type: ConfigField = FIELDS_TYPES_DICT[field_obj["type"]];

            for (let [expected_field, _] of Object.entries(config_type)) {
                if (expected_field in field_obj === false) {
                    IO.warn(`ERROR: Missing field "${expected_field}" in "${main_field}.${field}" in config. w-AI-fu will try to generate a new one.`);
                    regenConfigFromBackup();
                    return importFromFile_impl(tries + 1);
                }

                // @ts-ignore I swear typescript is so fucking [FILTERED]
                if (typeof field_obj[expected_field] !== typeof config_type[expected_field]) {
                    IO.warn(`ERROR: Invalid value of field "${expected_field}" in "${main_field}.${field}" in config. w-AI-fu will try to generate a new one.`);
                    regenConfigFromBackup();
                    return importFromFile_impl(tries + 1);
                }
            }
        }
    }
    // Welp glad I'm done with that shit.
    return json_obj as Config;
}