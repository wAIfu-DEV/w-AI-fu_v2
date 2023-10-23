import WebSocket, { WebSocketServer } from "ws"
import { handleUImessage_impl } from "./ui_ws_handling";
import { wAIfu } from "../types/Waifu";
import { IO } from "../io/io";

type SEND_PREFIX = 'PRESETS'|'CONFIG'|'AUTH'|'UPDATE'|'CHARACTERS'|'DEVICES'|'MESSAGE_CHAR'|'MESSAGE_USER'|'MESSAGE_CHAT'|'CONSOLE_MESSAGE'|'CONSOLE_DEBUG';

export class UserInterface {

    #websocket_server: WebSocketServer;
    #websocket: WebSocket = new WebSocket(null);

    closed = false;

    constructor() {
        this.#websocket_server = new WebSocketServer({ host: '127.0.0.1', port: 8459 });
    }

    async initialize(): Promise<void> {
        return new Promise((resolve) => {
            this.#websocket_server.on('connection', (ws: WebSocket) => {
                this.#websocket = ws;
                this.#websocket.on('error', (err: Error) => IO.print(err));
                this.#websocket.on('message', (data: WebSocket.RawData) => {
                    const data_str: string = data.toString('utf-8');
                    this.handleUImessage(this, data_str);
                });
                this.#websocket.on('close', () => {
                    this.closed = true;
                });
                this.#sendConfig();
                this.#sendAuth();
                this.#sendCharacters();
                this.#sendDevices();
                this.#sendPresets();
                resolve();
            });
        });
    }

    #sendPresets() {
        this.send('PRESETS', { presets: wAIfu.state!.presets, current: wAIfu.state?.current_preset });
    }

    #sendConfig() {
        this.send('CONFIG', wAIfu.state!.config);
    }

    #sendAuth() {
        this.send('AUTH', wAIfu.state!.auth);
    }

    #sendCharacters() {
        this.send('CHARACTERS', wAIfu.state!.characters);
    }

    #sendDevices() {
        this.send('DEVICES', wAIfu.state!.devices);
    }

    send(prefix: SEND_PREFIX, payload: any) {
        if (this.#websocket.readyState === WebSocket.OPEN && this.closed === false)
            this.#websocket.send(prefix + ' ' + JSON.stringify(payload));
        else
            IO.warn(`ERROR: Tried sending message ${prefix} to UI, but websocket is not open.`);
    }

    free() {
        this.#websocket.close();
        this.#websocket_server.close();
    }

    handleUImessage = handleUImessage_impl;
}