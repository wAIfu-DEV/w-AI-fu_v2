import { IO } from "../io/io";
import { Dependencies } from "./dependencies";
import { freeDependencies } from "./dependency_freeing";
import { loadDependencies } from "./dependency_loader";

export async function reloadDependencies(
    dependencies: Dependencies
): Promise<Dependencies> {
    IO.print("Reloading dependencies...");
    let ui_ref = dependencies.ui;
    let eventsub_ref = dependencies.twitch_eventsub;
    await freeDependencies(dependencies);
    let dep = await loadDependencies();
    dep.ui = ui_ref;
    dep.twitch_eventsub = eventsub_ref;
    IO.print("Reloaded dependencies.");
    return dep;
}
