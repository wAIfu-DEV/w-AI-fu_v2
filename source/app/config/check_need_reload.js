"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkNeedsReload = void 0;
function checkNeedsReload(old_config, new_config) {
    for (let section of Object.keys(old_config)) {
        for (let [param_name, param_val] of Object.entries(old_config[section])) {
            if (param_val["value"] !== new_config[section][param_name]["value"]) {
                if (param_val["reload"] === true)
                    return true;
            }
        }
    }
    return false;
}
exports.checkNeedsReload = checkNeedsReload;
