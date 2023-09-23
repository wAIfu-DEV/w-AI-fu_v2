import { Dependencies } from "../dependencies/dependencies";
import { getVersion_impl } from "../version/version";
import { mainLoop_impl } from "../main_loop/main_loop";
import { AppState } from "../state/state";
import { Plugin } from "../plugins/plugin";

export class WaifuApp {
    version: string = '';
    getVersion = getVersion_impl;
    mainLoop = mainLoop_impl;
    state: AppState|undefined = undefined;
    dependencies: Dependencies|undefined = undefined;
    plugins: Plugin[] = [];
}

export const wAIfu = new WaifuApp();

