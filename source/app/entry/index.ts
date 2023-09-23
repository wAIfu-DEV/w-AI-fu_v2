import { UserInterface } from "../ui_com/userinterface";
import { wAIfu } from "../types/Waifu";
import { BrowserWindow, app } from "electron";
import { loadDependencies } from "../dependencies/dependency_loader";
import { getDevices } from "../devices/devices";
import { setClosedCaptions } from "../closed_captions/closed_captions";
import { loadPlugins } from "../plugins/load_plugins";
import { IO } from "../io/io";
import { AppState } from "../state/state";
import { logToFile } from "../logging/log_to_file";
import { freeDependencies } from "../dependencies/dependency_freeing";
import { freePlugins } from "../plugins/free_plugins";
import { checkUpdates } from "../update/should_update";

/**
 * @deprecated THIS FUNCTION IS ALREADY BEING CALLED AT PROCESS EXIT,
 *             DO NOT CALL DURING PROCESS EXECUTION.
 */
export async function exit(): Promise<void> {
    for (let plugin of wAIfu.plugins)
        plugin.onQuit();
    freePlugins(wAIfu.plugins);
    await freeDependencies(wAIfu.dependencies!);
    wAIfu.dependencies?.ui?.free();
    setClosedCaptions('');
    logToFile();
}

/**
 * Entry point of the program.
*/
export async function main(): Promise<void> {

    console.log(process.cwd());

    process.on('uncaughtException', (e) => {
        IO.error('w-AI-fu encountered an unhandled exception.');
        IO.error(e.stack);
    });

    process.on('unhandledRejection', (e) => {
        IO.error('w-AI-fu encountered an unhandled exception.');
        // @ts-ignore
        IO.error(e.stack);
    });

    app.on('quit', () => {
        exit();
    });

    /*
    // MIGHT BE LEAKING MEMORY SINCE
    // ELECTRON USES app.quit() instead of process.exit()
    process.on('exit', () => {
        try {
            exit();
        } catch {
            process.abort();
        }
    });*/

    process.title = 'w-AI-fu';
    wAIfu.version = wAIfu.getVersion();
    IO.print('w-AI-fu', wAIfu.version);

    wAIfu.state = new AppState();
    wAIfu.state!.devices = getDevices();
    wAIfu.dependencies = await loadDependencies(wAIfu.state!.config);

    wAIfu.dependencies.ui = new UserInterface();

    wAIfu.plugins = loadPlugins();

    // Required by Electron before displaying the window.
    // This is unavoidable dead time so better use it to load our own deps.
    await app.whenReady();
    app.name = "w-AI-fu";
    const win = new BrowserWindow({
        title: 'w-AI-fu',
        width: 900,
        height: 900,
        icon: process.cwd() + '/source/ui/icon.ico',
        autoHideMenuBar: true
    });
    win.loadFile(process.cwd() + '/source/ui/index.html');
    win.on('close', () => {
        IO.print('Exited after UI closing.')
        app.quit();
    });
    
    await wAIfu.dependencies.ui.initialize();
    IO.bindToUI(wAIfu.dependencies.ui);

    checkUpdates();

    while(true)
        await wAIfu.mainLoop();
}
setTimeout(main, 0); // <-- should prevent circular dependency issues.
                     // Makes it so main is called only after having full
                     // initialization of the program.