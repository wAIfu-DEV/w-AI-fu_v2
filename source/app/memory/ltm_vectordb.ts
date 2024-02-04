import * as cproc from "child_process";
import WebSocket, { WebSocketServer } from "ws";
import * as crypto from "crypto";
import * as fs from "fs";

import { ILongTermMemory, QueryResult } from "./ltm_interface";
import { ENV } from "../types/Waifu";
import { IO } from "../io/io";

export class LongTermMemoryVectorDB implements ILongTermMemory {
    #child_process: cproc.ChildProcess;
    #websocket: WebSocket = new WebSocket(null);
    #websocket_server: WebSocketServer;

    constructor() {
        this.#websocket_server = new WebSocketServer({
            host: "127.0.0.1",
            port: 9251,
        });

        const VDB_CWD = process.cwd() + "/source/app/vectordb";
        const VENV_PATH = process.cwd() + "/source/app/vectordb/venv";
        const VENV_PYTHON = VENV_PATH + "/Scripts/python.exe";
        const VENV_PIP = VENV_PATH + "/Scripts/pip.exe";
        // First time setup, gotta make a python venv because of dep conflict
        if (fs.existsSync(VENV_PATH) === false) {
            IO.warn(
                "First time setup of vector database, this might take some time (~3GB)..."
            );
            fs.mkdirSync(VENV_PATH);
            IO.warn("- Creating python venv... (~30s)");
            const venv_creation_result = cproc.spawnSync(ENV.PYTHON_PATH, [
                "-m",
                "venv",
                VENV_PATH,
            ]);

            venv_creation_result.output.forEach((v) => {
                if (!v) return;
                let s = v.toString("utf8");
                if (s !== "") IO.quietPrint(s);
            });

            IO.warn("- Installing dependencies... (~4min)");
            const dep_install_result = cproc.spawnSync(VENV_PIP, [
                "install",
                "-r",
                VDB_CWD + "/requirements.txt",
            ]);

            dep_install_result.output.forEach((v) => {
                if (!v) return;
                let s = v.toString("utf8");
                if (s !== "") IO.quietPrint(s);
            });
        }

        this.#child_process = cproc.spawn(VENV_PYTHON, ["vectordb_test.py"], {
            cwd: process.cwd() + "/source/app/vectordb/",
            detached: false,
            shell: false,
        });
        this.#child_process.stderr?.on("data", (data) => {
            IO.warn(data.toString());
        });
        this.#child_process.stdout?.on("data", (data) => {
            IO.print(data.toString());
        });
    }

    initialize(): Promise<void> {
        return new Promise((resolve) => {
            this.#websocket_server.on("connection", (socket) => {
                this.#websocket = socket;
                this.#websocket.on("error", (err: Error) => IO.print(err));
                this.#websocket.send("");
                IO.debug("Loaded LongTermMemoryVectorDB.");
                resolve();
            });
        });
    }

    free(): Promise<void> {
        return new Promise((resolve) => {
            this.#child_process.on("close", () => {
                this.#child_process.removeAllListeners();
                this.#websocket_server.removeAllListeners();
                this.#websocket.removeAllListeners();
                this.#websocket.close();
                this.#websocket_server.close();

                let el = () => {
                    if (this.#websocket.readyState === WebSocket.CLOSED) {
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

    store(text: string): void {
        let timestamp = new Date().getTime();
        const sanitized = text.replaceAll(/[^a-zA-Z0-9\s\.\,\;\:]/g, "");
        const formated_text = `[${new Date().toLocaleDateString("en", {
            month: "numeric",
            year: "numeric",
        })}]${sanitized}`;
        this.#websocket.send(`STORE ${timestamp} ${formated_text}`);
    }

    query(text: string, items: number): Promise<QueryResult[]> {
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

            this.#websocket.send(
                "QUERY " +
                    JSON.stringify({
                        id: expected_id,
                        text: formated_text,
                        items: items,
                    })
            );

            const e = (ev: WebSocket.MessageEvent) => {
                if (is_resolved === true) return;
                let resp = ev.data.toString("utf8");
                let split_data = resp.split(" ");
                let id = split_data[0];
                if (id !== expected_id) return;

                let payload = split_data.slice(1, undefined).join(" ");

                let payload_obj = JSON.parse(payload);

                is_resolved = true;

                let results: QueryResult[] = [];
                for (let obj of payload_obj["results"]) {
                    let sanitized_text = obj["chunk"].replaceAll(
                        /^\[.*?\]/g,
                        ""
                    );
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

    clear(): void {
        this.#websocket.send("CLEAR");
    }

    dump(): void {
        this.#websocket.send("DUMP");
    }
}
