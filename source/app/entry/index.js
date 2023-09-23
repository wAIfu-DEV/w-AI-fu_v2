"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = exports.exit = void 0;
const userinterface_1 = require("../ui_com/userinterface");
const Waifu_1 = require("../types/Waifu");
const electron_1 = require("electron");
const dependency_loader_1 = require("../dependencies/dependency_loader");
const devices_1 = require("../devices/devices");
const closed_captions_1 = require("../closed_captions/closed_captions");
const load_plugins_1 = require("../plugins/load_plugins");
const io_1 = require("../io/io");
const state_1 = require("../state/state");
const log_to_file_1 = require("../logging/log_to_file");
const dependency_freeing_1 = require("../dependencies/dependency_freeing");
const free_plugins_1 = require("../plugins/free_plugins");
const should_update_1 = require("../update/should_update");
async function exit() {
    for (let plugin of Waifu_1.wAIfu.plugins)
        plugin.onQuit();
    (0, free_plugins_1.freePlugins)(Waifu_1.wAIfu.plugins);
    await (0, dependency_freeing_1.freeDependencies)(Waifu_1.wAIfu.dependencies);
    Waifu_1.wAIfu.dependencies?.ui?.free();
    (0, closed_captions_1.setClosedCaptions)('');
    (0, log_to_file_1.logToFile)();
}
exports.exit = exit;
async function main() {
    console.log(process.cwd());
    process.on('uncaughtException', (e) => {
        io_1.IO.error('w-AI-fu encountered an unhandled exception.');
        io_1.IO.error(e.stack);
    });
    process.on('unhandledRejection', (e) => {
        io_1.IO.error('w-AI-fu encountered an unhandled exception.');
        io_1.IO.error(e.stack);
    });
    electron_1.app.on('quit', () => {
        exit();
    });
    process.title = 'w-AI-fu';
    Waifu_1.wAIfu.version = Waifu_1.wAIfu.getVersion();
    io_1.IO.print('w-AI-fu', Waifu_1.wAIfu.version);
    Waifu_1.wAIfu.state = new state_1.AppState();
    Waifu_1.wAIfu.state.devices = (0, devices_1.getDevices)();
    Waifu_1.wAIfu.dependencies = await (0, dependency_loader_1.loadDependencies)(Waifu_1.wAIfu.state.config);
    Waifu_1.wAIfu.dependencies.ui = new userinterface_1.UserInterface();
    Waifu_1.wAIfu.plugins = (0, load_plugins_1.loadPlugins)();
    await electron_1.app.whenReady();
    electron_1.app.name = "w-AI-fu";
    const win = new electron_1.BrowserWindow({
        title: 'w-AI-fu',
        width: 900,
        height: 900,
        icon: process.cwd() + '/source/ui/icon.ico',
        autoHideMenuBar: true
    });
    win.loadFile(process.cwd() + '/source/ui/index.html');
    win.on('close', () => {
        io_1.IO.print('Exited after UI closing.');
        electron_1.app.quit();
    });
    await Waifu_1.wAIfu.dependencies.ui.initialize();
    io_1.IO.bindToUI(Waifu_1.wAIfu.dependencies.ui);
    (0, should_update_1.checkUpdates)();
    while (true)
        await Waifu_1.wAIfu.mainLoop();
}
exports.main = main;
setTimeout(main, 0);
