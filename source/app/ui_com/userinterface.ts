import WebSocket, { WebSocketServer } from "ws"
import { handleUImessage_impl } from "./ui_ws_handling";
//import * as cproc from 'child_process';
import { BrowserWindow } from 'electron';
import { IO } from "../io/io";
import { wAIfu } from "../types/Waifu";

export class UserInterface {

    #websocket_server: WebSocketServer;
    #websocket: WebSocket = new WebSocket(null);

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
                this.#sendConfig();
                this.#sendAuth();
                this.#sendCharacters();
                this.#sendDevices();
                resolve();
            });
        });
    }

    #sendConfig() {
        this.send('CONFIG', wAIfu.state.config);
    }

    #sendAuth() {
        this.send('AUTH', wAIfu.state.auth);
    }

    #sendCharacters() {
        this.send('CHARACTERS', wAIfu.state.characters);
    }

    #sendDevices() {
        this.send('DEVICES', wAIfu.state.devices);
    }

    /**
     * Creates en Electron window with the html file of our choice
     * ONLY call after UserInterface is initialized.
     * @param html_file_path 
     */
    createWindow(options: {title: string, html_path: string, icon_path: string}) {
        // Use Electron to display the window
        // Should be the only place we use Electron
        // Any communcation will be done by rawdogged Websockets
        const win = new BrowserWindow({
            title: options.title,
            width: 900,
            height: 900,
            icon: options.icon_path,
            autoHideMenuBar: true,
        });
        win.loadFile(options.html_path);
        // vvv Using browser instead of Electron
        //cproc.spawn('cmd.exe', ['/C', 'start index.html'], {cwd: process.cwd() + '/source/ui'});
    }

    send(prefix: string, payload: any) {
        if (this.#websocket.readyState === WebSocket.OPEN)
            this.#websocket.send(prefix + ' ' + JSON.stringify(payload));
        else
            IO.warn('ERROR: Tried sending message to UI, but websocket is not open.');
    }

    handleUImessage = handleUImessage_impl;
}