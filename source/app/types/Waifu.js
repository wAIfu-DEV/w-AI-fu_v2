"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wAIfu = exports.WaifuApp = exports.ENV = void 0;
const version_1 = require("../version/version");
const main_loop_1 = require("../main_loop/main_loop");
exports.ENV = {
    PYTHON_PATH: "python",
};
class WaifuApp {
    version = "";
    getVersion = version_1.getVersion_impl;
    mainLoop = main_loop_1.mainLoop_impl;
    state = undefined;
    dependencies = undefined;
    plugins = [];
}
exports.WaifuApp = WaifuApp;
exports.wAIfu = new WaifuApp();
