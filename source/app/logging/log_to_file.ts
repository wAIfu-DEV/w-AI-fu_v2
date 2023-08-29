import * as fs from 'fs';

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

export function logToFile(text: string): void {
    let new_date = new Date();
    let time_str = `${
        new_date.getHours().toString().padStart(2, '0')
    }:${
        new_date.getMinutes().toString().padStart(2, '0')
    }:${
        new_date.getSeconds().toString().padStart(2, '0')
    }`;
    let data = `[${time_str}] ${text}\r\n`;
    if (fs.existsSync(log_path) === false) {
        fs.writeFileSync(log_path, data, { encoding: "utf8" });
    } else {
        fs.appendFileSync(log_path, data, { encoding: "utf8" });
    }
}