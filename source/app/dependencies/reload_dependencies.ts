import { Config } from "../config/config";
import { IO } from "../io/io";
import { Dependencies } from "./dependencies";
import { freeDependencies } from "./dependency_freeing";
import { loadDependencies } from "./dependency_loader";

export async function reloadDependencies(dependencies: Dependencies, config: Config): Promise<Dependencies> {
    IO.print('Reloading dependencies...');
    let ui_ref = dependencies.ui;
    await freeDependencies(dependencies);
    let dep = await loadDependencies(config);
    dep.ui = ui_ref;
    IO.print('Reloaded dependencies.');
    return dep;
}