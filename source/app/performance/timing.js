"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timing = void 0;
const io_1 = require("../io/io");
exports.Timing = {
    getExecTimeMs(func, args) {
        const start_time = new Date().getTime();
        func(...args);
        return new Date().getTime() - start_time;
    },
    async asyncGetExecTimeMs(func, args) {
        const start_time = new Date().getTime();
        await func(...args);
        return new Date().getTime() - start_time;
    },
    printExecTime(func, args, name = undefined) {
        let fname = name || func.name;
        let time = this.getExecTimeMs(func, args);
        io_1.IO.print("Timing:", fname, "took", time, "ms to execute.");
    },
    async asyncPrintExecTime(func, args, name = undefined) {
        let fname = name || func.name;
        let time = await this.asyncGetExecTimeMs(func, args);
        io_1.IO.print("Timing:", fname, "took", time, "ms to execute.");
    },
};
