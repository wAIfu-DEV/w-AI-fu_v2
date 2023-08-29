"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const userinterface_1 = require("../ui_com/userinterface");
const Waifu_1 = require("../types/Waifu");
const electron_1 = require("electron");
const io_1 = require("../io/io");
const dependency_loader_1 = require("../dependencies/dependency_loader");
const devices_1 = require("../devices/devices");
const vtube_studio_1 = require("../vtube_studio/vtube_studio");
const closed_captions_1 = require("../closed_captions/closed_captions");
const load_plugins_1 = require("../plugins/load_plugins");
async function main() {
    process.on('uncaughtException', (e) => {
        io_1.IO.error('w-AI-fu encountered an unhandled exception.');
        io_1.IO.error(e.stack);
    });
    process.on('unhandledRejection', (e) => {
        io_1.IO.error('w-AI-fu encountered an unhandled exception.');
        io_1.IO.error(e.stack);
    });
    process.on('exit', () => {
        for (let plugin of Waifu_1.wAIfu.plugins)
            plugin.onQuit();
        (0, closed_captions_1.setClosedCaptions)('');
    });
    process.title = 'w-AI-fu';
    io_1.IO.print('w-AI-fu', Waifu_1.wAIfu.getVersion());
    Waifu_1.wAIfu.state.devices = (0, devices_1.getDevices)();
    Waifu_1.wAIfu.dependencies = await (0, dependency_loader_1.loadDependencies)(Waifu_1.wAIfu.state.config);
    Waifu_1.wAIfu.dependencies.ui = new userinterface_1.UserInterface();
    Waifu_1.wAIfu.dependencies.vts = new vtube_studio_1.VtubeStudioAPI();
    Waifu_1.wAIfu.plugins = (0, load_plugins_1.loadPlugins)();
    await electron_1.app.whenReady();
    Waifu_1.wAIfu.dependencies.ui.createWindow({
        title: 'w-AI-fu',
        html_path: process.cwd() + '/source/ui/index.html',
        icon_path: process.cwd() + '/source/ui/icon.ico'
    });
    await Waifu_1.wAIfu.dependencies.ui.initialize();
    io_1.IO.bindToUI(Waifu_1.wAIfu.dependencies.ui);
    while (true)
        await Waifu_1.wAIfu.mainLoop();
}
main();
