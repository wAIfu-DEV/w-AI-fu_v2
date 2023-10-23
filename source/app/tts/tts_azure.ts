const azure = require("microsoft-cognitiveservices-speech-sdk");
import * as fs from "fs";
import * as crypto from "crypto";
import * as cproc from "child_process";
import WebSocket, { WebSocketServer } from "ws";

import { Result } from "../types/Result";
import {
    TTS_GEN_ERROR,
    TTS_PLAY_ERROR,
    TextToSpeech,
    TtsGenerationSettings,
    TtsPlaySettings,
} from "./tts_interface";
import { ENV, wAIfu } from "../types/Waifu";
import { IO } from "../io/io";
import { clearStreamedSubtitles } from "../closed_captions/stream_captions";

const AUDIO_PATH = process.cwd() + "/source/app/audio/";

export class TextToSpeechAzure implements TextToSpeech {
    #azure_config;
    #player: cproc.ChildProcess;

    #websocket: WebSocket = new WebSocket(null);
    #websocket_server: WebSocketServer;

    skip: boolean = false;

    constructor() {
        // Azure requires these env variables to be set for some reasons
        process.env["SPEECH_KEY"] = wAIfu.state!.auth.azure.token;
        process.env["SPEECH_REGION"] = wAIfu.state!.auth.azure.region;

        this.#azure_config = azure.SpeechConfig.fromSubscription(
            wAIfu.state!.auth.azure.token,
            wAIfu.state!.auth.azure.region
        );

        // Player init
        this.#player = cproc.spawn(ENV.PYTHON_PATH, ["player.py"], {
            cwd: AUDIO_PATH,
            env: {
                CWD: AUDIO_PATH,
            },
            detached: false,
            shell: false,
        });
        this.#player.stderr?.on("data", (data) => {
            IO.warn(data.toString());
        });
        this.#player.stdout?.on("data", (data) => {
            IO.print(data.toString());
        });

        this.#websocket_server = new WebSocketServer({
            host: "127.0.0.1",
            port: 8769,
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
            this.#player.on("close", () => {
                this.#player.removeAllListeners();
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
            this.#player.kill(2);
        });
    }

    interrupt(): void {
        this.skip = true;
        this.#websocket.send("INTERRUPT");
        clearStreamedSubtitles();
    }

    generateSpeech(
        text: string,
        params: TtsGenerationSettings
    ): Promise<Result<string, TTS_GEN_ERROR>> {
        return new Promise((resolve) => {
            const id = crypto.randomUUID();
            const file_path = AUDIO_PATH + id + ".wav";

            const sanitized_text = text
                .replaceAll("&", "&amp;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&apos;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;");

            // TODO: find a fix for volume, crashes if is present in prosody
            let volume_modifier =
                wAIfu.state!.config.text_to_speech.volume_modifier_db.value.toString();
            if (!volume_modifier.startsWith("-"))
                volume_modifier = "+" + volume_modifier;

            let pitch_modifier =
                wAIfu.state!.config.text_to_speech.azure_pitch_percentage.value.toString();

            const ssml =
                '<speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis"  xml:lang="en-US">' +
                `<voice name="${params.voice.trim()}">` +
                `<prosody pitch="${pitch_modifier}%">${sanitized_text.trim()}</prosody>` +
                "</voice></speak>";

            IO.print(ssml);

            const audio_config =
                azure.AudioConfig.fromAudioFileOutput(file_path);

            const synthesizer = new azure.SpeechSynthesizer(
                this.#azure_config,
                audio_config
            );

            synthesizer.speakSsmlAsync(
                ssml,
                (result: any) => {
                    if (result) {
                        synthesizer.close();
                        resolve(new Result(true, id, TTS_GEN_ERROR.NONE));
                        return fs.createReadStream(file_path);
                    }
                    return undefined;
                },
                (error: any) => {
                    console.log(error);
                    synthesizer.close();
                }
            );
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

        return new Promise((resolve) => {
            let resolved: boolean = false;
            this.#websocket.send(
                "PLAY_WAV " +
                    JSON.stringify({
                        id: id,
                        options: {
                            device: options.device,
                            volume_modifier: options.volume_modifier,
                        },
                    })
            );

            const el = () => {
                if (resolved === true) return;
                resolved = true;
                resolve(new Result(true, undefined, TTS_PLAY_ERROR.NONE));
                this.#websocket.removeEventListener("message", el);
                return;
            };

            this.#websocket.addEventListener("message", el);
        });
    }
}
