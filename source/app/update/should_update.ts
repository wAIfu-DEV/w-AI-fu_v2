import * as fs from "fs"
import { IO } from "../io/io";
import { wAIfu } from "../types/Waifu";

/**
 * Checks the github repository for newer versions, 
 * if newer version is found, prompt user for update.
 */
export async function checkUpdates(): Promise<void> {

    if (fs.existsSync(process.cwd() + '/.noupdate') === true) return;

    let query: Response;
    try {
        query = await fetch('https://api.github.com/repos/wAIfu-DEV/w-AI-fu_v2/tags');
    } catch(e) {
        IO.warn('Error: Could not contact github while trying to get latest version.');
        return;
    }

    let data: unknown;
    try {
        data = await query.json()
    } catch {
        IO.warn('Error: Could not retreive latest version from github.');
        return;
    }

    if (typeof data !== 'object' || data === null || data === undefined) {
        IO.warn('Error: Fetched invalid data from github while trying to retreive latest version.');
        return;
    }

    let latest_version = (data as Array<unknown>)[0];

    if (latest_version === undefined
        || latest_version === null
        || typeof latest_version !== "object")
    {
        IO.warn('Error: Fetched invalid data from github while trying to retreive latest version.');
        return;
    }

    if ("name" in latest_version && wAIfu.getVersion() !== latest_version["name"]) {
        const new_version = String(latest_version["name"])
        wAIfu.dependencies?.ui?.send('UPDATE', { version: new_version });
    }
}