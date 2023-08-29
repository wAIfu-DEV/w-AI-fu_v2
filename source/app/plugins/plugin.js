"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plugin = exports.PluginFile = void 0;
const io_1 = require("../io/io");
class PluginFile {
    "name" = "";
    "description" = "";
    "author" = "";
    "version" = "";
    "npm-dependencies" = {};
    "subscribes" = {
        "load": "",
        "main-loop-start": "",
        "input-source": "",
        "command-handling": "",
        "response-handling": "",
        "main-loop-end": "",
        "quit": ""
    };
}
exports.PluginFile = PluginFile;
class Plugin {
    definition = new PluginFile();
    code = {};
    #callEvent(name, args) {
        if (this.definition.subscribes[name] === undefined)
            return;
        if (this.definition.subscribes[name] === "")
            return;
        let hook = this.definition.subscribes[name];
        if (this.code[hook] === undefined || typeof this.code[hook] !== "function") {
            io_1.IO.warn('ERROR: Plugin', this.definition.name, 'does not define the function', hook, 'even though it is subscribed to event', name);
            return;
        }
        return this.code[hook](...args);
    }
    onLoad() {
        this.#callEvent("load", [io_1.IO]);
    }
    onQuit() {
        this.#callEvent("quit", []);
    }
    onMainLoopStart() {
        this.#callEvent("main-loop-start", []);
    }
    onMainLoopEnd() {
        this.#callEvent("main-loop-end", []);
    }
    onInputSource() {
        let ret = this.#callEvent("input-source", []);
        return (typeof ret === "string") ? ret : undefined;
    }
    onCommandHandling(command, trusted) {
        let ret = this.#callEvent("command-handling", [command, trusted]);
        return (typeof ret === "boolean") ? ret : false;
    }
    onResponseHandling(response) {
        let ret = this.#callEvent("response-handling", [response]);
        return (typeof ret === "string") ? ret : undefined;
    }
}
exports.Plugin = Plugin;
