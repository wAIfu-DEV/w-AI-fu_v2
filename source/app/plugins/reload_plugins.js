"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reloadPlugins = void 0;
const free_plugins_1 = require("./free_plugins");
const load_plugins_1 = require("./load_plugins");
function reloadPlugins(plugins) {
    (0, free_plugins_1.freePlugins)(plugins);
    return (0, load_plugins_1.loadPlugins)();
}
exports.reloadPlugins = reloadPlugins;
