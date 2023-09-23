import { UserInterface } from "../ui_com/userinterface";

/**
 * Responsible for basic logging, similar to `console` with support for the UI.
 */
export class IO {

    static ui_ref: UserInterface|undefined = undefined;
    static buffer: {text: string, color: string, debug: boolean}[] = [];
    static log_buffer: {text: string, time: number}[] = [];

    /**
     * Similar to `console.log()` with support for UI.
     * @param args arguments to stringify and print to console.
     */
    static print(...args: any[]) {
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

    /**
     * Similar to `console.log()` with support for UI.
     * @param args arguments to stringify and print to console.
     */
    static debug(...args: any[]) {
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

    /**
     * Similar to `console.log()`, but does not print to the UI.
     * @param args arguments to stringify and print to console.
     */
    static quietPrint(...args: any[]) {
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

    /**
     * Similar to `console.warn()` with support for UI.
     * @param args arguments to stringify and print to console.
     */
    static warn(...args: any[]) {
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

    /**
     * Similar to `console.error()` with support for UI.
     * @param args arguments to stringify and print to console.
     */
    static error(...args: any[]) {
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

    /**
     * Bind the UI to the IO methods. Any buffered logs will be sent to the UI.
     * @param ui UserInterface instance
     */
    static bindToUI(ui: UserInterface) {
        this.ui_ref = ui;
        // Send data in buffer to UI
        while (this.buffer.length !== 0) {
            let entry = this.buffer.shift();
            this.ui_ref.send((entry?.debug) ? 'CONSOLE_DEBUG' : 'CONSOLE_MESSAGE', { text: entry?.text, color: entry?.color });
        }
    }
}