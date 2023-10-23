import * as fs from 'fs';
import { IO } from '../io/io';

const LOGS_PATH = `${process.cwd()}/logs/`;
const ts = process.getCreationTime() || 0;
const date = new Date(ts);
let log_path =
    `${LOGS_PATH}log_${date.getFullYear().toString().padStart(4, '0')
    }-${(date.getMonth() + 1).toString().padStart(2, '0')
    }-${date.getDate().toString().padStart(2, '0')
    }_${Math.floor(ts).toString()}.txt`;

if (fs.existsSync(LOGS_PATH) === false)
    fs.mkdirSync(LOGS_PATH);

export function logToFile(): void {

    let str_array: string[] = [];

    for (let log of IO.log_buffer) {
        let new_date = new Date(log.time);
        let time_str = `${new_date.getHours().toString().padStart(2, '0')
            }:${new_date.getMinutes().toString().padStart(2, '0')
            }:${new_date.getSeconds().toString().padStart(2, '0')
            }`;
        let suffix = (log.text.endsWith('\n')) ? '' : '\n';
        str_array.push(`[${time_str}] ${log.text}${suffix}`);
    }

    let data = str_array.join('');
    fs.appendFileSync(log_path, data, { encoding: "utf8" });
}

export function appendLog(log: { text: string, time: number }) {
    let new_date = new Date(log.time);
    let time_str = `${new_date.getHours().toString().padStart(2, '0')
        }:${new_date.getMinutes().toString().padStart(2, '0')
        }:${new_date.getSeconds().toString().padStart(2, '0')
        }`;
    let suffix = (log.text.endsWith('\n')) ? '' : '\n';
    let data = `[${time_str}] ${log.text}${suffix}`;

    fs.appendFile(log_path, data, { encoding: "utf8" }, (err) => {
        if (err === null) return;
        console.error(err.stack); // <- Don't use IO here. Will cause recusrsion
    });
}