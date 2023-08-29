import { Plugin } from "./plugin";

export function freePlugins(plugins: Plugin[]) {
    for(let plugin of plugins)
        plugin.onQuit();
    while(plugins.length > 0)
        plugins.pop();
}