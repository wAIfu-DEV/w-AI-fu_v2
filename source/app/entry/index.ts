import { UserInterface } from "../ui_com/userinterface";
import { wAIfu } from "../types/Waifu";
import { BrowserWindow, app } from "electron";
import { loadDependencies } from "../dependencies/dependency_loader";
import { getDevices } from "../devices/devices";
import { loadPlugins } from "../plugins/load_plugins";
import { IO } from "../io/io";
import { AppState } from "../state/state";
import { freeDependencies } from "../dependencies/dependency_freeing";
import { freePlugins } from "../plugins/free_plugins";
import { checkUpdates } from "../update/should_update";
import { TwitchEventSubs } from "../twitch/twitch_eventsub";
import { shouldUseEventSub } from "../twitch/should_use_eventsub";
import { setupTwitchEventSubListeners } from "../twitch/setup_event_handlers";

/**
 * @info THIS FUNCTION IS ALREADY BEING CALLED AT PROCESS EXIT,
 *             DO NOT CALL DURING PROCESS EXECUTION.
 */
export async function exit(): Promise<void> {
    IO.quietPrint("Exiting w-AI-fu...");
    for (let plugin of wAIfu.plugins) plugin.onQuit();
    freePlugins(wAIfu.plugins);
    await freeDependencies(wAIfu.dependencies!);
    if (wAIfu.dependencies?.twitch_eventsub !== undefined)
        wAIfu.dependencies.twitch_eventsub.free();
    wAIfu.dependencies?.ui?.free();
    IO.setClosedCaptions("");
    app.exit();
}

/**
 * Entry point of the program.
 */
export async function main(): Promise<void> {
    process.on("uncaughtException", (e: Error) => {
        IO.error("w-AI-fu encountered an unhandled exception.");
        IO.error(e.stack);
    });

    process.on("unhandledRejection", (e: any) => {
        IO.error("w-AI-fu encountered an unhandled rejection.");
        if (e !== undefined && e.stack !== undefined) IO.error(e.stack);
        else IO.error(e);
    });

    IO.debug("Awaiting Electron...");
    await app.whenReady();

    // Display placeholder starting screen
    const startup_win = new BrowserWindow({
        alwaysOnTop: true,
        title: "w-AI-fu startup",
        width: 400,
        height: 200,
        icon: process.cwd() + "/source/ui/icon.ico",
        autoHideMenuBar: true,
        titleBarStyle: "hidden",
        show: false,
        center: true,
        skipTaskbar: true,
    });
    startup_win
        .loadFile(process.cwd() + "/source/ui/startup_placeholder.html")
        .then(() => {
            startup_win.show();
        });

    process.title = "w-AI-fu";

    wAIfu.version = wAIfu.getVersion();
    IO.print("w-AI-fu", wAIfu.version);

    IO.debug("Loading application state...");
    wAIfu.state = new AppState();

    IO.debug("Fetching audio devices...");
    wAIfu.state!.devices = getDevices();

    IO.debug("Loading dependencies...");
    wAIfu.dependencies = await loadDependencies();
    wAIfu.dependencies!.ui = new UserInterface();

    IO.debug("Loading plugins...");
    wAIfu.plugins = loadPlugins();

    IO.debug("Creating Electron window...");
    app.name = "w-AI-fu";
    const win = new BrowserWindow({
        title: "w-AI-fu",
        width: 900,
        height: 900,
        icon: process.cwd() + "/source/ui/icon.ico",
        autoHideMenuBar: true,
        show: false,
    });
    win.on("close", (e) => {
        e.preventDefault();
        IO.quietPrint("Exited after UI closing.");
        exit();
    });
    await win.loadFile(process.cwd() + "/source/ui/index.html");

    await wAIfu.dependencies!.ui!.initialize();
    IO.bindToUI(wAIfu.dependencies!.ui!);

    startup_win.close();
    win.show();

    IO.debug("Checking for updates...");
    checkUpdates();

    if (shouldUseEventSub() === true) {
        IO.debug("Loading Twitch EventSub API...");
        wAIfu.dependencies!.twitch_eventsub = new TwitchEventSubs();
        await wAIfu.dependencies!.twitch_eventsub.initialize();
        setupTwitchEventSubListeners(wAIfu.dependencies!.twitch_eventsub);
    }

    IO.debug("Initialization done.");
    while (true) await wAIfu.mainLoop();
}
setImmediate(main); // <-- should prevent circular dependency issues.
// Makes it so main is called only after having full initialization of the
// program.
