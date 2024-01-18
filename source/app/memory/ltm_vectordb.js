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
exports.LongTermMemoryVectorDB = void 0;
const cproc = __importStar(require("child_process"));
const ws_1 = __importStar(require("ws"));
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
class LongTermMemoryVectorDB {
    #child_process;
    #websocket = new ws_1.default(null);
    #websocket_server;
    constructor() {
        this.#websocket_server = new ws_1.WebSocketServer({
            host: "127.0.0.1",
            port: 9251,
        });
        const VDB_CWD = process.cwd() + "/source/app/vectordb";
        const VENV_PATH = process.cwd() + "/source/app/vectordb/venv";
        const VENV_PYTHON = VENV_PATH + "/Scripts/python.exe";
        const VENV_PIP = VENV_PATH + "/Scripts/pip.exe";
        if (fs.existsSync(VENV_PATH) === false) {
            io_1.IO.warn("First time setup of vector database, this might take some time (~3GB)...");
            fs.mkdirSync(VENV_PATH);
            io_1.IO.warn("- Creating python venv... (~30s)");
            cproc.spawnSync(Waifu_1.ENV.PYTHON_PATH, ["-m", "venv", VENV_PATH]);
            io_1.IO.warn("- Installing dependencies... (~4min)");
            cproc.spawnSync(VENV_PIP, [
                "install",
                "-r",
                VDB_CWD + "/requirements.txt",
            ]);
        }
        this.#child_process = cproc.spawn(VENV_PYTHON, ["vectordb_test.py"], {
            cwd: process.cwd() + "/source/app/vectordb/",
            detached: false,
            shell: false,
        });
        this.#child_process.stderr?.on("data", (data) => {
            io_1.IO.warn(data.toString());
        });
        this.#child_process.stdout?.on("data", (data) => {
            io_1.IO.print(data.toString());
        });
    }
    initialize() {
        return new Promise((resolve) => {
            this.#websocket_server.on("connection", (socket) => {
                this.#websocket = socket;
                this.#websocket.on("error", (err) => io_1.IO.print(err));
                this.#websocket.send("");
                io_1.IO.debug("Loaded LongTermMemoryVectorDB.");
                resolve();
            });
        });
    }
    free() {
        return new Promise((resolve) => {
            this.#child_process.on("close", () => {
                this.#child_process.removeAllListeners();
                this.#websocket_server.removeAllListeners();
                this.#websocket.removeAllListeners();
                this.#websocket.close();
                this.#websocket_server.close();
                let el = () => {
                    if (this.#websocket.readyState === ws_1.default.CLOSED) {
                        resolve();
                        return;
                    }
                    setTimeout(el, 100);
                };
                setTimeout(el, 100);
            });
            this.#child_process.kill(2);
        });
    }
    store(text) {
        let timestamp = new Date().getTime();
        const sanitized = text.replaceAll(/[^a-zA-Z0-9\s\.\,\;\:]/g, "");
        const formated_text = `[${new Date().toLocaleDateString("en", {
            month: "numeric",
            year: "numeric",
        })}]${sanitized}`;
        this.#websocket.send(`STORE ${timestamp} ${formated_text}`);
    }
    query(text, items) {
        return new Promise((resolve) => {
            let is_resolved = false;
            if (text.trim() === "") {
                is_resolved = true;
                resolve([]);
                return;
            }
            const expected_id = crypto.randomUUID();
            const formated_text = `[${new Date().toLocaleDateString("en", {
                month: "numeric",
                year: "numeric",
            })}]${text}`;
            this.#websocket.send("QUERY " +
                JSON.stringify({
                    id: expected_id,
                    text: formated_text,
                    items: items,
                }));
            const e = (ev) => {
                if (is_resolved === true)
                    return;
                let resp = ev.data.toString("utf8");
                let split_data = resp.split(" ");
                let id = split_data[0];
                if (id !== expected_id)
                    return;
                let payload = split_data.slice(1, undefined).join(" ");
                let payload_obj = JSON.parse(payload);
                is_resolved = true;
                let results = [];
                for (let obj of payload_obj["results"]) {
                    let sanitized_text = obj["chunk"].replaceAll(/^\[.*?\]/g, "");
                    results.push({
                        content: sanitized_text,
                        timestamp: obj["metadata"],
                    });
                }
                resolve(results);
                this.#websocket.removeEventListener("message", e);
            };
            this.#websocket.addEventListener("message", e);
        });
    }
    clear() {
        this.#websocket.send("CLEAR");
    }
    dump() {
        this.#websocket.send("DUMP");
    }
}
exports.LongTermMemoryVectorDB = LongTermMemoryVectorDB;
