import * as fs from "fs";
import { IO } from "../io/io";

export function pickRandomSong(): string {

    let files: string[] = fs.readdirSync(process.cwd() + '/userdata/songs/', { recursive: false, withFileTypes: false, encoding: 'utf8' });

    if (files.length === 0) {
        IO.warn('ERROR: Could not pick random song since there are no songs in the userdata/songs folder');
        return '';
    }

    let tries = 0;

    while (++tries < 10) {

        let rdm_i = Math.round(Math.random() * files.length);
        let picked_file = files[rdm_i] || '';

        let split_name = picked_file.split('_');

        switch (split_name[split_name.length - 1]) {
            case 'vocals.wav': {
                return split_name.slice(0, -1).join('_');
            }
            case 'instrumentals.wav': {
                return split_name.slice(0, -1).join('_');
            }
            case 'info.txt': {
                return split_name.slice(0, -1).join('_');
            }
            default:
                continue;
        }
    }
    IO.warn('ERROR: Failed to pick song after multiple tries.');
    return '';
}