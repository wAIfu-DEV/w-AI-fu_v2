import { IO } from "../io/io";

export class PluginFile {
    "name": string = "";
    "description": string = "";
    "author": string = "";
    "version": string = "";
    "npm-dependencies": {} = {};
    "subscribes" = {
        "load": "",
        "main-loop-start": "",
        "input-source": "",
        "command-handling": "",
        "response-handling": "",
        "main-loop-end": "",
        "quit": "",
        "interrupt": ""
    };
    "activated": boolean = false;
}

export class Plugin {
    definition: PluginFile = new PluginFile();
    code: any = {};
    #callEvent(name: "load"|"main-loop-start"|"input-source"|"command-handling"|"response-handling"|"main-loop-end"|"quit"|"interrupt", args: any[]): any {
        if (this.definition.subscribes[name] === undefined) return;
        if (this.definition.subscribes[name] === "") return;
        let hook = this.definition.subscribes[name];
        if (this.code[hook] === undefined || typeof this.code[hook] !== "function") {
            IO.warn('ERROR: Plugin', this.definition.name, 'does not define the function', hook, 'even though it is subscribed to event', name);
            return;
        }
        return this.code[hook](...args);
    }
    /**
     * Called at launch of application or on reload.
     * Calls the function subscribed to the "load" event.
     * Passes a logging function, does not expect a return value.
     */
    onLoad(): void {
        this.#callEvent("load", [IO]);
    }
    /**
     * Called at application exit or before a reload.
     * Calls the function subscribed to the "quit" event.
     * No arguments passed, does not expect a return value.
     */
    onQuit(): void {
        this.#callEvent("quit", []);
    }
    /**
     * Called at the start of the main loop.
     * Calls the function subscribed to the "main-loop-start" event.
     * No arguments passed, does not expect a return value.
     */
    onMainLoopStart(): void {
        this.#callEvent("main-loop-start", []);
    }
    /**
     * Called at the end of the main loop.
     * Calls the function subscribed to the "main-loop-end" event.
     * No arguments passed, does not expect a return value.
     */
    onMainLoopEnd(): void {
        this.#callEvent("main-loop-end", []);
    }
    /**
     * Called before getting user input, value used as input.
     * Calls the function subscribed to the "input-source" event.
     * No arguments passed, expects a string to use as input, or undefined.
     */
    onInputSource(): string|undefined {
        let ret = this.#callEvent("input-source", []);
        return (typeof ret === "string") ? ret : undefined;
    }
    /**
     * Called when receiving an input.
     * Calls the function subscribed to the "command-handling" event.
     * Passes the command (string) and if the sender is trusted (boolean),
     * expects true if command has been handled, or false if unhandled.
     */
    onCommandHandling(command: string, trusted: boolean): boolean {
        let ret = this.#callEvent("command-handling", [command, trusted]);
        return (typeof ret === "boolean") ? ret : false;
    }
    /**
     * Called when receiving a response from the LLM.
     * Calls the function subscribed to the "response-handling" event.
     * Passes the llm response (string),
     * expects string containing new value if value was changed
     * or undefined if unchanged.
     */
    onResponseHandling(response: string): string|undefined {
        let ret = this.#callEvent("response-handling", [response]);
        return (typeof ret === "string") ? ret : undefined;
    }
    /**
     * Called when user presses the interrupt button.
     * Calls the function subscribed to the "interrupt" event.
     * No arguments passed, expects no return value.
     */
    onInterrupt(): void {
        this.#callEvent("interrupt", []);
    }
}