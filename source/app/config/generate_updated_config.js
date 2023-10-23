"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUpdatedConfig = void 0;
const config_1 = require("./config");
function generateUpdatedConfig(old_config) {
    const new_config = new config_1.Config();
    iter_sections: for (let section_name of Object.keys(old_config)) {
        const old_section = old_config[section_name];
        if (!Object.hasOwn(new_config, section_name))
            continue iter_sections;
        const new_section = new_config[section_name];
        iter_fields: for (let field_name of Object.keys(old_section)) {
            if (!Object.hasOwn(new_section, field_name))
                continue iter_fields;
            new_section[field_name].value = old_section[field_name].value;
        }
    }
    return new_config;
}
exports.generateUpdatedConfig = generateUpdatedConfig;
