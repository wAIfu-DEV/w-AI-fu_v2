import * as fs from 'fs';
import { IO } from '../io/io';

const LOGS_PATH = `${process.cwd()}/logs/`;
const ts = process.getCreationTime() || 0;
const date = new Date(ts);
let log_path = 
    `${LOGS_PATH}log_${
        date.getFullYear().toString().padStart(4, '0')
    }-${
        (date.getMonth() + 1).toString().padStart(2, '0')
    }-${
        date.getDate().toString().padStart(2, '0')
    }_${
        Math.floor(ts).toString()}.txt`;

export function logToFile(): void {

    for (let log of IO.log_buffer) {
        let new_date = new Date(log.time);
        let time_str = `${
            new_date.getHours().toString().padStart(2, '0')
        }:${
            new_date.getMinutes().toString().padStart(2, '0')
        }:${
            new_date.getSeconds().toString().padStart(2, '0')
        }`;
        let data = `[${time_str}] ${log.text}\r\n`;

        if (fs.existsSync(LOGS_PATH) === false)
            fs.mkdirSync(LOGS_PATH);

        if (fs.existsSync(log_path) === false) {
            fs.writeFileSync(log_path, data, { encoding: "utf8" });
        } else {
            fs.appendFileSync(log_path, data, { encoding: "utf8" });
        }
    }
}