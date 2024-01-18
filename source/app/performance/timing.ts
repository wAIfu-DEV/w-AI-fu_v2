import { IO } from "../io/io";

export const Timing = {
    getExecTimeMs(func: (...args: any[]) => any, args: any[]): number {
        const start_time = new Date().getTime();
        func(...args);
        return new Date().getTime() - start_time;
    },
    async asyncGetExecTimeMs(
        func: (...args: any[]) => Promise<any>,
        args: any[]
    ): Promise<number> {
        const start_time = new Date().getTime();
        await func(...args);
        return new Date().getTime() - start_time;
    },
    printExecTime(
        func: (...args: any[]) => any,
        args: any[],
        name: string | undefined = undefined
    ): void {
        let fname = name || func.name;
        let time = this.getExecTimeMs(func, args);
        IO.print("Timing:", fname, "took", time, "ms to execute.");
    },
    async asyncPrintExecTime(
        func: (...args: any[]) => Promise<any>,
        args: any[],
        name: string | undefined = undefined
    ): Promise<void> {
        let fname = name || func.name;
        let time = await this.asyncGetExecTimeMs(func, args);
        IO.print("Timing:", fname, "took", time, "ms to execute.");
    },
};
