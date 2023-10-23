import { Config } from "./config";

/**
 * Compares the old config object with the new config object and check for
 * modified fields requiring a reload of the dependencies.
 * @param old_config 
 * @param new_config 
 * @returns 
 */
export function checkNeedsReload(old_config: Config, new_config: Config): boolean {

    for (let section of Object.keys(old_config)) {

        // Lord forgive me for all these ts-ignores
        // @ts-ignore
        for (let [param_name, param_val] of Object.entries(old_config[section])) {
            // @ts-ignore
            if (param_val["value"] !== new_config[section][param_name]["value"]) {
                // @ts-ignore
                if (param_val["reload"] === true) return true;
            }
        }
    }
    return false;
}