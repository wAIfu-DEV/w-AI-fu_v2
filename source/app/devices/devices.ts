import * as cproc from 'child_process';
import { wAIfu } from '../types/Waifu';
import { IO } from '../io/io';

export function getDevices(): any {
    let output = cproc.spawnSync('python', [ 'audio_devices.py' ], { 
        cwd: process.cwd() + '/source/app/devices/',
        shell: false
    })
    .stdout;
    IO.debug('DEVICES:', output.toString('utf8'));
    return JSON.parse(output.toString('utf8'));
}

export function getDeviceIndex(device_name: string): number {
    return wAIfu.state!.devices[device_name] || 0;
}