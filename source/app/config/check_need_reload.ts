import { Config } from "./config";

export function checkNeedsReload(old_config: Config, new_config: Config) {

    for (let section of Object.keys(old_config)) {

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