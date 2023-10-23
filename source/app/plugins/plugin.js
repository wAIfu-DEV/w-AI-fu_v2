"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plugin = exports.PluginFile = void 0;
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
class PluginFile {
    "name" = "";
    "description" = "";
    "author" = "";
    "version" = "";
    "npm-dependencies" = {};
    "subscribes" = {
        load: "",
        "main-loop-start": "",
        "input-source": "",
        "command-handling": "",
        "response-handling": "",
        "main-loop-end": "",
        "twitch-reward-redeem": "",
        quit: "",
        interrupt: "",
    };
    "activated" = false;
}
exports.PluginFile = PluginFile;
class Plugin {
    definition = new PluginFile();
    code = {};
    #callEvent(name, ...args) {
        if (this.definition.subscribes[name] === undefined)
            return;
        if (this.definition.subscribes[name] === "")
            return;
        let hook = this.definition.subscribes[name];
        if (this.code[hook] === undefined ||
            typeof this.code[hook] !== "function") {
            io_1.IO.warn("ERROR: Plugin", this.definition.name, "does not define the function", hook, "even though it is subscribed to event", name);
            return;
        }
        try {
            return this.code[hook](...args);
        }
        catch (e) {
            io_1.IO.warn("ERROR: Function", hook, "in plugin", this.definition.name, "has thrown an Exception.");
            io_1.IO.warn(e.stack);
            return undefined;
        }
    }
    onLoad() {
        this.#callEvent("load", io_1.IO, Waifu_1.wAIfu);
    }
    onQuit() {
        this.#callEvent("quit");
    }
    onMainLoopStart() {
        this.#callEvent("main-loop-start");
    }
    onMainLoopEnd() {
        this.#callEvent("main-loop-end");
    }
    onInputSource() {
        let ret = this.#callEvent("input-source");
        return typeof ret === "string" ? ret : undefined;
    }
    onCommandHandling(command, trusted, username) {
        let ret = this.#callEvent("command-handling", command, trusted, username);
        return typeof ret === "boolean" ? ret : false;
    }
    onResponseHandling(response) {
        let ret = this.#callEvent("response-handling", response);
        return typeof ret === "string" ? ret : undefined;
    }
    onInterrupt() {
        this.#callEvent("interrupt");
    }
    onTwitchRedeem(reward_name, redeemer_name) {
        this.#callEvent("twitch-reward-redeem", reward_name, redeemer_name);
    }
}
exports.Plugin = Plugin;
