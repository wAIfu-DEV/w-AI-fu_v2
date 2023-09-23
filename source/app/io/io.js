"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IO = void 0;
class IO {
    static ui_ref = undefined;
    static buffer = [];
    static log_buffer = [];
    static print(...args) {
        let args_stringified = args.map(v => {
            if (typeof v !== "object" || v === null)
                return String(v);
            else
                return JSON.stringify(v);
        });
        let result = args_stringified.join(' ');
        process.stdout.write(result + '\r\n');
        if (this.ui_ref && this.ui_ref.closed === false)
            this.ui_ref.send('CONSOLE_MESSAGE', { text: result, color: "lightgrey" });
        else
            this.buffer.push({ text: result, color: "lightgrey", debug: false });
        this.log_buffer.push({ text: result, time: new Date().getTime() });
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
        if (this.ui_ref && this.ui_ref.closed === false)
            this.ui_ref.send('CONSOLE_DEBUG', { text: result, color: "grey" });
        else
            this.buffer.push({ text: result, color: "grey", debug: true });
        this.log_buffer.push({ text: result, time: new Date().getTime() });
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
        this.log_buffer.push({ text: result, time: new Date().getTime() });
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
        if (this.ui_ref && this.ui_ref.closed === false)
            this.ui_ref.send('CONSOLE_MESSAGE', { text: result, color: "orange" });
        else
            this.buffer.push({ text: result, color: "orange", debug: false });
        this.log_buffer.push({ text: result, time: new Date().getTime() });
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
        if (this.ui_ref && this.ui_ref.closed === false)
            this.ui_ref.send('CONSOLE_MESSAGE', { text: result, color: "red" });
        else
            this.buffer.push({ text: result, color: "red", debug: false });
        this.log_buffer.push({ text: result, time: new Date().getTime() });
    }
    static bindToUI(ui) {
        this.ui_ref = ui;
        while (this.buffer.length !== 0) {
            let entry = this.buffer.shift();
            this.ui_ref.send((entry?.debug) ? 'CONSOLE_DEBUG' : 'CONSOLE_MESSAGE', { text: entry?.text, color: entry?.color });
        }
    }
}
exports.IO = IO;
