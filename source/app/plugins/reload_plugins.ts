import { freePlugins } from "./free_plugins";
import { loadPlugins } from "./load_plugins";
import { Plugin } from "./plugin";

export function reloadPlugins(plugins: Plugin[]): Plugin[] {
    freePlugins(plugins);
    return loadPlugins();
}