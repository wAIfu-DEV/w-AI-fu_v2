import * as cproc from "child_process";

import WebSocket, { WebSocketServer } from "ws";

import { ENV, wAIfu } from "../types/Waifu";
import { Result } from "../types/Result";
import { IO } from "../io/io";
import {
    TextToSpeech,
    TTS_GEN_ERROR,
    TTS_PLAY_ERROR,
    TtsGenerationSettings,
    TtsPlaySettings,
} from "./tts_interface";
import { clearStreamedSubtitles } from "../closed_captions/stream_captions";

const GENERATION_TIMEOUT_MS = 10_000 as const;

export class TextToSpeechNovelAI implements TextToSpeech {
    #child_process: cproc.ChildProcess;
    #websocket: WebSocket = new WebSocket(null);
    #websocket_server: WebSocketServer;

    #current_generations: number = 0;

    skip: boolean = false;

    constructor() {
        this.#child_process = cproc.spawn(ENV.PYTHON_PATH, ["novel_tts.py"], {
            cwd: process.cwd() + "/source/app/novelai_api/",
            env: {
                NAI_USERNAME: wAIfu.state!.auth["novelai"]["mail"],
                NAI_PASSWORD: wAIfu.state!.auth["novelai"]["password"],
                CWD: process.cwd(),
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
            port: 8766,
        });
    }

    initialize(): Promise<void> {
        return new Promise((resolve) => {
            this.#websocket_server.on("connection", (socket) => {
                this.#websocket = socket;
                this.#websocket.on("error", (err: Error) => IO.print(err));

                this.#websocket.send("");
                IO.debug("Loaded TextToSpeechAzure.");
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

    async generateSpeech(
        text: string,
        options: TtsGenerationSettings
    ): Promise<Result<string, TTS_GEN_ERROR>> {
        await_connect: while (true) {
            if (this.#websocket.readyState === WebSocket.OPEN)
                break await_connect;
            await new Promise<void>((resolve) =>
                setTimeout(() => resolve(), 100)
            );
        }

        this.#current_generations += 1;
        let expected_id = this.#current_generations;

        return new Promise((resolve) => {
            let is_resolved = false;

            this.#websocket.send(
                "GENERATE " +
                    JSON.stringify({
                        prompt: text,
                        options: {
                            voice_seed: options.voice,
                        },
                        concurrent_id: expected_id,
                    })
            );

            const timeout = () => {
                if (is_resolved === true) return;
                is_resolved = true;
                resolve(
                    new Result(
                        false,
                        "Timed out while waiting for TTS response.",
                        TTS_GEN_ERROR.RESPONSE_TIMEOUT
                    )
                );
                return;
            };
            setTimeout(timeout, GENERATION_TIMEOUT_MS);

            const el = (ev: WebSocket.MessageEvent) => {
                if (is_resolved === true) return;

                let split_data = ev.data.toString("utf8").split(" ");
                if (split_data[0] !== String(expected_id)) return;
                this.#current_generations -= 1;
                switch (split_data[1]) {
                    case "ERROR":
                        {
                            let err_type = split_data[2]!;
                            let err_msg = split_data
                                .slice(3, undefined)
                                .join(" ");
                            is_resolved = true;
                            resolve(
                                new Result(
                                    false,
                                    err_msg,
                                    err_type as TTS_GEN_ERROR
                                )
                            );
                        }
                        break;
                    default: {
                        let return_id = split_data.slice(1, undefined).join("");
                        is_resolved = true;
                        resolve(
                            new Result(true, return_id, TTS_GEN_ERROR.NONE)
                        );
                    }
                }
                this.#websocket.removeEventListener("message", el);
            };

            // @ts-ignore
            this.#websocket.addEventListener("message", el);
        });
    }

    async playSpeech(
        id: string,
        options: TtsPlaySettings
    ): Promise<Result<void, TTS_PLAY_ERROR>> {
        await_connect: while (true) {
            if (this.#websocket.readyState === WebSocket.OPEN)
                break await_connect;
            await new Promise<void>((resolve) =>
                setTimeout(() => resolve(), 100)
            );
        }

        this.#websocket.send(
            "PLAY " +
                JSON.stringify({
                    id: id,
                    options: {
                        device: options.device,
                        volume_modifier: options.volume_modifier,
                    },
                })
        );

        return new Promise((resolve) => {
            let resolved: boolean = false;

            const el = () => {
                if (resolved === true) return;
                resolved = true;
                this.#current_generations -= 1;
                resolve(new Result(true, undefined, TTS_PLAY_ERROR.NONE));
                this.#websocket.removeEventListener("message", el);
                return;
            };

            this.#websocket.addEventListener("message", el);
        });
    }

    interrupt(): void {
        this.skip = true;
        this.#websocket.send("INTERRUPT");
        clearStreamedSubtitles();
    }
}
