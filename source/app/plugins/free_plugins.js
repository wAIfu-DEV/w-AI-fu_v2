"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.freePlugins = void 0;
function freePlugins(plugins) {
    for (let plugin of plugins)
        plugin.onQuit();
    while (plugins.length > 0)
        plugins.pop();
}
exports.freePlugins = freePlugins;
