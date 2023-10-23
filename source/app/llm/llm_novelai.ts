import WebSocket, { WebSocketServer } from "ws";

import * as cproc from "child_process";
import { Result } from "../types/Result";
import {
    LLM_GEN_ERRORS,
    LargeLanguageModel,
    LlmGenerationSettings,
} from "./llm_interface";
import { ENV, wAIfu } from "../types/Waifu";
import { IO } from "../io/io";

const GENERATION_TIMEOUT_MS = 10_000 as const;

export class LargeLanguageModelNovelAI implements LargeLanguageModel {
    #child_process: cproc.ChildProcess;
    #websocket: WebSocket = new WebSocket(null);
    #websocket_server: WebSocketServer;

    constructor() {
        this.#child_process = cproc.spawn(ENV.PYTHON_PATH, ["novel_llm.py"], {
            cwd: process.cwd() + "/source/app/novelai_api/",
            env: {
                NAI_USERNAME: wAIfu.state!.auth["novelai"]["mail"],
                NAI_PASSWORD: wAIfu.state!.auth["novelai"]["password"],
            },
            detached: false,
            shell: false,
        });
        this.#child_process.stderr?.on("data", (data) => {
            IO.warn(data.toString());
        });
        this.#child_process.stdout?.on("data", (data) => {
            IO.print(data.toString());
        });

        this.#websocket_server = new WebSocketServer({
            host: "127.0.0.1",
            port: 8765,
        });
    }

    async initialize(): Promise<void> {
        return new Promise((resolve) => {
            this.#websocket_server.on("connection", (socket) => {
                this.#websocket = socket;
                this.#websocket.on("error", (err: Error) => IO.print(err));

                this.#websocket.send("");

                IO.debug("Loaded LargeLanguageModelNovelAI.");
                resolve();
            });
        });
    }

    async free(): Promise<void> {
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

    async generate(
        prompt: string,
        args: LlmGenerationSettings
    ): Promise<Result<string, LLM_GEN_ERRORS>> {
        await_connect: while (true) {
            if (this.#websocket.readyState === WebSocket.OPEN)
                break await_connect;
            await new Promise<void>((resolve) =>
                setTimeout(() => resolve(), 100)
            );
        }

        (args as any)["model"] =
            wAIfu.state!.config.large_language_model.novelai_model.value;

        this.#websocket.send(
            "GENERATE " +
                JSON.stringify({
                    prompt: prompt,
                    config: args,
                })
        );

        return new Promise((resolve) => {
            let is_resolved = false;

            const timeout = () => {
                if (is_resolved === true) return;
                is_resolved = true;
                resolve(
                    new Result(
                        false,
                        "Timed out while waiting for LLM response.",
                        LLM_GEN_ERRORS.RESPONSE_TIMEOUT
                    )
                );
            };
            setTimeout(timeout, GENERATION_TIMEOUT_MS);

            const el = (ev: WebSocket.MessageEvent) => {
                let resp = ev.data.toString("utf8");
                let split_data = resp.split(" ");
                let prefix = split_data[0];
                let result: Result<string, LLM_GEN_ERRORS>;
                switch (prefix) {
                    case "TEXT":
                        {
                            let payload = split_data
                                .slice(1, undefined)
                                .join(" ");
                            if (/\n$/g.test(payload) === false) {
                                payload += "\n";
                            }
                            result = new Result(
                                true,
                                payload,
                                LLM_GEN_ERRORS.NONE
                            );
                        }
                        break;
                    case "ERROR":
                        {
                            let err_type = split_data[1];
                            let err_msg = split_data
                                .slice(2, undefined)
                                .join(" ");
                            result = new Result(
                                false,
                                err_msg,
                                err_type as LLM_GEN_ERRORS
                            );
                        }
                        break;
                    default:
                        result = new Result(
                            false,
                            "Received undefined response from LLM.",
                            LLM_GEN_ERRORS.UNDEFINED
                        );
                        break;
                }
                if (is_resolved === true) return;
                is_resolved = true;
                resolve(result);
                this.#websocket.removeEventListener("message", el);
                return;
            };
            this.#websocket.addEventListener("message", el);
        });
    }
}
