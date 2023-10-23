import { Config, ConfigField } from "./config";

type Section = Record<string, ConfigField>;

export function generateUpdatedConfig(old_config: Config): Config {
    const new_config = new Config();

    iter_sections: for (let section_name of Object.keys(old_config)) {
        const old_section: Section = (old_config as any)[section_name]!;

        if (!Object.hasOwn(new_config, section_name)) continue iter_sections;
        const new_section: Section = (new_config as any)[section_name]!;

        iter_fields: for (let field_name of Object.keys(old_section)) {
            if (!Object.hasOwn(new_section, field_name)) continue iter_fields;
            new_section[field_name]!.value = old_section[field_name]!.value;
        }
    }

    return new_config;
}
