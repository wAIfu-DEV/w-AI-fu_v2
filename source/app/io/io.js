"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IO = void 0;
const log_to_file_1 = require("../logging/log_to_file");
const Waifu_1 = require("../types/Waifu");
class IO {
    static ui_ref = undefined;
    static buffer = [];
    static print(...args) {
        let args_stringified = args.map(v => {
            if (typeof v !== "object" || v === null)
                return String(v);
            else
                return JSON.stringify(v);
        });
        let result = args_stringified.join(' ');
        process.stdout.write(result + '\r\n');
        if (this.ui_ref)
            this.ui_ref.send('CONSOLE_MESSAGE', { text: result, color: "lightgrey" });
        else
            this.buffer.push({ text: result, color: "lightgrey" });
        if (Waifu_1.wAIfu.state.config.behaviour.log_to_file.value === true) {
            (0, log_to_file_1.logToFile)(result);
        }
    }
    static debug(...args) {
        let args_stringified = args.map(v => {
            if (typeof v !== "object" || v === null)
                return String(v);
            else
                return JSON.stringify(v);
        });
        let result = args_stringified.join(' ');
        process.stdout.write(result + '\r\n');
        if (Waifu_1.wAIfu.state.config.behaviour.additional_logs.value === true) {
            if (this.ui_ref)
                this.ui_ref.send('CONSOLE_MESSAGE', { text: result, color: "grey" });
            else
                this.buffer.push({ text: result, color: "grey" });
        }
        if (Waifu_1.wAIfu.state.config.behaviour.log_to_file.value === true) {
            (0, log_to_file_1.logToFile)(result);
        }
    }
    static quietPrint(...args) {
        let args_stringified = args.map(v => {
            if (typeof v !== "object" || v === null)
                return String(v);
            else
                return JSON.stringify(v);
        });
        let result = args_stringified.join(' ');
        process.stdout.write(result + '\r\n');
        if (Waifu_1.wAIfu.state.config.behaviour.log_to_file.value === true) {
            (0, log_to_file_1.logToFile)(result);
        }
    }
    static warn(...args) {
        let args_stringified = args.map(v => {
            if (typeof v !== "object" || v === null)
                return String(v);
            else
                return JSON.stringify(v);
        });
        let result = args_stringified.join(' ');
        process.stdout.write('\x1b[1;33m' + result + '\x1b[0m' + '\r\n');
        if (this.ui_ref)
            this.ui_ref.send('CONSOLE_MESSAGE', { text: result, color: "orange" });
        else
            this.buffer.push({ text: result, color: "orange" });
        if (Waifu_1.wAIfu.state.config.behaviour.log_to_file.value === true) {
            (0, log_to_file_1.logToFile)(result);
        }
    }
    static error(...args) {
        let args_stringified = args.map(v => {
            if (typeof v !== "object" || v === null)
                return String(v);
            else
                return JSON.stringify(v);
        });
        let result = args_stringified.join(' ');
        process.stdout.write('\x1b[0;31m' + result + '\x1b[0m' + '\r\n');
        if (this.ui_ref)
            this.ui_ref.send('CONSOLE_MESSAGE', { text: result, color: "red" });
        else
            this.buffer.push({ text: result, color: "red" });
        if (Waifu_1.wAIfu.state.config.behaviour.log_to_file.value === true) {
            (0, log_to_file_1.logToFile)(result);
        }
    }
    static bindToUI(ui) {
        this.ui_ref = ui;
        while (this.buffer.length !== 0)
            this.ui_ref.send('CONSOLE_MESSAGE', this.buffer.shift());
    }
}
exports.IO = IO;
