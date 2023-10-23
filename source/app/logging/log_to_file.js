"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendLog = exports.logToFile = void 0;
const fs = __importStar(require("fs"));
const io_1 = require("../io/io");
const LOGS_PATH = `${process.cwd()}/logs/`;
const ts = process.getCreationTime() || 0;
const date = new Date(ts);
let log_path = `${LOGS_PATH}log_${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${Math.floor(ts).toString()}.txt`;
if (fs.existsSync(LOGS_PATH) === false)
    fs.mkdirSync(LOGS_PATH);
function logToFile() {
    let str_array = [];
    for (let log of io_1.IO.log_buffer) {
        let new_date = new Date(log.time);
        let time_str = `${new_date.getHours().toString().padStart(2, '0')}:${new_date.getMinutes().toString().padStart(2, '0')}:${new_date.getSeconds().toString().padStart(2, '0')}`;
        let suffix = (log.text.endsWith('\n')) ? '' : '\n';
        str_array.push(`[${time_str}] ${log.text}${suffix}`);
    }
    let data = str_array.join('');
    fs.appendFileSync(log_path, data, { encoding: "utf8" });
}
exports.logToFile = logToFile;
function appendLog(log) {
    let new_date = new Date(log.time);
    let time_str = `${new_date.getHours().toString().padStart(2, '0')}:${new_date.getMinutes().toString().padStart(2, '0')}:${new_date.getSeconds().toString().padStart(2, '0')}`;
    let suffix = (log.text.endsWith('\n')) ? '' : '\n';
    let data = `[${time_str}] ${log.text}${suffix}`;
    fs.appendFile(log_path, data, { encoding: "utf8" }, (err) => {
        if (err === null)
            return;
        console.error(err.stack);
    });
}
exports.appendLog = appendLog;
