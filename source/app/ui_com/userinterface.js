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
exports.UserInterface = void 0;
const ws_1 = __importStar(require("ws"));
const ui_ws_handling_1 = require("./ui_ws_handling");
const electron_1 = require("electron");
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
class UserInterface {
    #websocket_server;
    #websocket = new ws_1.default(null);
    constructor() {
        this.#websocket_server = new ws_1.WebSocketServer({ host: '127.0.0.1', port: 8459 });
    }
    async initialize() {
        return new Promise((resolve) => {
            this.#websocket_server.on('connection', (ws) => {
                this.#websocket = ws;
                this.#websocket.on('error', (err) => io_1.IO.print(err));
                this.#websocket.on('message', (data) => {
                    const data_str = data.toString('utf-8');
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
        this.send('CONFIG', Waifu_1.wAIfu.state.config);
    }
    #sendAuth() {
        this.send('AUTH', Waifu_1.wAIfu.state.auth);
    }
    #sendCharacters() {
        this.send('CHARACTERS', Waifu_1.wAIfu.state.characters);
    }
    #sendDevices() {
        this.send('DEVICES', Waifu_1.wAIfu.state.devices);
    }
    createWindow(options) {
        const win = new electron_1.BrowserWindow({
            title: options.title,
            width: 900,
            height: 900,
            icon: options.icon_path,
            autoHideMenuBar: true,
        });
        win.loadFile(options.html_path);
    }
    send(prefix, payload) {
        if (this.#websocket.readyState === ws_1.default.OPEN)
            this.#websocket.send(prefix + ' ' + JSON.stringify(payload));
        else
            io_1.IO.warn('ERROR: Tried sending message to UI, but websocket is not open.');
    }
    handleUImessage = ui_ws_handling_1.handleUImessage_impl;
}
exports.UserInterface = UserInterface;
