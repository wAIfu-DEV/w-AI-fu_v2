import * as cproc from "child_process";
import { wAIfu, ENV } from "../types/Waifu";
import { IO } from "../io/io";

export function getDevices(): Record<string, number> {
    let proc = cproc.spawnSync(ENV.PYTHON_PATH, ["audio_devices.py"], {
        cwd: process.cwd() + "/source/app/devices/",
        shell: false,
    });
    let err = proc.stderr;
    if (err !== null) {
        let err_str = err.toString("utf8");
        if (err_str !== "") IO.error(err_str);
    }
    let output = proc.stdout;
    return JSON.parse(output.toString("utf8"));
}

export function getDeviceIndex(device_name: string): number {
    return wAIfu.state!.devices[device_name] || 0;
}
