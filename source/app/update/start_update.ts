import * as cproc from "child_process";

import { app } from "electron";

/**
 * Launch the updater in a detached process and close the current application,
 * Full control of the updating system is passed to root/updater/updater.ts
 */
export async function startUpdate() {
    
    const updater_process = cproc.spawn('cmd.exe', ['/C', 'node', process.cwd() + '/updater/updater.js'], {
        detached: true,
        stdio: 'ignore',
    });
    updater_process.unref();

    app.quit()
}