import * as cproc from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";

import WebSocket, { WebSocketServer } from "ws";

import { ENV, wAIfu } from "../types/Waifu";
import { Result } from "../types/Result";
import { IO } from "../io/io";
import {
    ITextToSpeech,
    TTS_GEN_ERROR,
    TTS_PLAY_ERROR,
    TtsGenerationSettings,
    TtsPlaySettings,
} from "./tts_interface";
import { clearStreamedSubtitles } from "../closed_captions/stream_captions";

export class TextToSpeechNovelAiVoiceClone implements ITextToSpeech {
    #child_process: cproc.ChildProcess;
    #websocket: WebSocket = new WebSocket(null);
    #websocket_server: WebSocketServer;

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
                IO.debug("Loaded TextToSpeechNovelAI.");
                IO.warn(
                    "WARNING: In order to use RVC TTS models, you need to have RVC opened with a loaded voice model."
                );
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

    #parseData(
        data: string,
        expected_id: string
    ): Result<string, TTS_GEN_ERROR> | null {
        let split_data = data.split(" ");
        if (split_data[0] !== expected_id) return null;

        switch (split_data[1]) {
            case "ERROR": {
                let err_type = split_data[2]!;
                let err_msg = split_data.slice(3, undefined).join(" ");
                return new Result(false, err_msg, err_type as TTS_GEN_ERROR);
            }
            default: {
                return new Result(true, split_data[0], TTS_GEN_ERROR.NONE);
            }
        }
    }

    #toClonedVoice(file_path: string, result_path: string): Promise<boolean> {
        return new Promise((resolve) => {
            let is_resolved = false;

            fetch("http://127.0.0.1:7897/run/infer_convert", {
                method: "POST",
                headers: {
                    accept: "*/*",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    data: [
                        0, // speaker ID
                        file_path, // File path for conversion
                        0, // Pitch correction
                        null, // f0 file
                        "rmvpe", // model
                        "", // ?
                        "", // index file
                        0.8, // accent
                        3, // f0 filter
                        0, // resampling
                        0.25, // volume envelope
                        0.4, // breathiness
                    ],
                }),
            })
                .then((response) => {
                    response.json().then(
                        (val) => {
                            if (is_resolved === true) return;
                            let file = val["data"][1]["name"];
                            let data = fs.readFileSync(file);
                            fs.writeFileSync(result_path, data);
                            is_resolved = true;
                            resolve(true);
                        },
                        (reason) => IO.error(reason)
                    );
                })
                .catch((reason) => IO.error(reason));

            const timeout = () => {
                if (is_resolved === true) return;
                is_resolved = true;
                resolve(false);
                return;
            };
            setTimeout(
                timeout,
                wAIfu.state!.config.text_to_speech.timeout_seconds.value * 1_000
            );
        });
    }

    generateSpeech(
        text: string,
        options: TtsGenerationSettings
    ): Promise<Result<string, TTS_GEN_ERROR>> {
        return new Promise((resolve) => {
            let expected_id = crypto.randomUUID();
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

            const el = (ev: WebSocket.MessageEvent) => {
                if (is_resolved === true) return;
                const result = this.#parseData(
                    ev.data.toString("utf8"),
                    expected_id
                );
                if (result === null) return;
                is_resolved = true;

                if (
                    wAIfu.state?.config.text_to_speech.rvc_voice_cloning
                        .value === false ||
                    options.is_narrator === true
                ) {
                    resolve(new Result(true, expected_id, TTS_GEN_ERROR.NONE));
                    return;
                }

                const path =
                    process.cwd() +
                    "/source/app/novelai_api/audio/" +
                    expected_id +
                    ".mp3";

                this.#toClonedVoice(path, path).then((_) => {
                    resolve(result);
                    this.#websocket.removeEventListener("message", el);
                });
            };

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
                this.#websocket.removeEventListener("message", el);
                return;
            };
            setTimeout(
                timeout,
                wAIfu.state!.config.text_to_speech.timeout_seconds.value * 1_000
            );

            this.#websocket.addEventListener("message", el);
        });
    }

    playSpeech(
        id: string,
        options: TtsPlaySettings
    ): Promise<Result<void, TTS_PLAY_ERROR>> {
        return new Promise((resolve) => {
            let is_resolved: boolean = false;

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

            const el = (ev: WebSocket.MessageEvent) => {
                if (is_resolved === true) return;
                if (ev.data.toString("utf8") !== "PLAY DONE") return;

                is_resolved = true;
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
