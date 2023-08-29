import { UserInterface } from "../ui_com/userinterface";
import { wAIfu } from "../types/Waifu";
import { app } from "electron";
import { IO } from "../io/io";
import { loadDependencies } from "../dependencies/dependency_loader";
import { getDevices } from "../devices/devices";
import { VtubeStudioAPI } from "../vtube_studio/vtube_studio";
import { setClosedCaptions } from "../closed_captions/closed_captions";
import { loadPlugins } from "../plugins/load_plugins";

/**
 * Entry point of the program.
*/
async function main(): Promise<void> {

    process.on('uncaughtException', (e) => {
        IO.error('w-AI-fu encountered an unhandled exception.');
        IO.error(e.stack);
    });

    process.on('unhandledRejection', (e) => {
        IO.error('w-AI-fu encountered an unhandled exception.');
        // @ts-ignore
        IO.error(e.stack);
    });

    process.on('exit', () => {
        for (let plugin of wAIfu.plugins)
            plugin.onQuit();
        setClosedCaptions('');
    });

    process.title = 'w-AI-fu';
    IO.print('w-AI-fu', wAIfu.getVersion());

    wAIfu.state.devices = getDevices();
    wAIfu.dependencies = await loadDependencies(wAIfu.state.config);

    wAIfu.dependencies.ui = new UserInterface();
    wAIfu.dependencies.vts = new VtubeStudioAPI();

    wAIfu.plugins = loadPlugins();

    // Required by Electron before displaying the window.
    // This is unavoidable dead time so better use it to load our own deps.
    await app.whenReady();
    wAIfu.dependencies.ui.createWindow({
        title: 'w-AI-fu',
        html_path: process.cwd() + '/source/ui/index.html',
        icon_path: process.cwd() + '/source/ui/icon.ico'
    });
    
    await wAIfu.dependencies.ui.initialize();
    IO.bindToUI(wAIfu.dependencies.ui);

    while(true)
        await wAIfu.mainLoop();
}
main();