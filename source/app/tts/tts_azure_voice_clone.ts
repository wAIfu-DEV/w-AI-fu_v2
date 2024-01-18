const azure = require("microsoft-cognitiveservices-speech-sdk");
import * as fs from "fs";
import * as crypto from "crypto";
import * as cproc from "child_process";
import WebSocket, { WebSocketServer } from "ws";

import { Result } from "../types/Result";
import {
    TTS_GEN_ERROR,
    TTS_PLAY_ERROR,
    ITextToSpeech,
    TtsGenerationSettings,
    TtsPlaySettings,
} from "./tts_interface";
import { ENV, wAIfu } from "../types/Waifu";
import { IO } from "../io/io";
import { clearStreamedSubtitles } from "../closed_captions/stream_captions";

const AUDIO_PATH = process.cwd() + "/source/app/audio/";
// const VOICE_CLONE_PATH = process.cwd() + "/source/app/voice_clone/";

export class TextToSpeechAzureVoiceClone implements ITextToSpeech {
    #azure_config;
    #player: cproc.ChildProcess;

    #player_websocket: WebSocket = new WebSocket(null);
    #player_websocket_server: WebSocketServer;

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

        this.#player_websocket_server = new WebSocketServer({
            host: "127.0.0.1",
            port: 8769,
        });
    }

    initialize(): Promise<void> {
        return new Promise((resolve) => {
            let resolved = false;

            this.#player_websocket_server.on("connection", (socket) => {
                this.#player_websocket = socket;
                this.#player_websocket.on("error", (err: Error) =>
                    IO.print(err)
                );

                this.#player_websocket.send("");
                if (resolved) return;
                resolved = true;
                IO.debug("Loaded TextToSpeechAzure.");
                IO.warn(
                    "WARNING: In order to use RVC TTS models, you need to have RVC opened with a loaded voice model."
                );
                resolve();
            });
        });
    }

    free(): Promise<void> {
        return new Promise((resolve) => {
            this.#player.on("close", () => {
                this.#player.removeAllListeners();
                this.#player_websocket_server.removeAllListeners();
                this.#player_websocket.removeAllListeners();
                this.#player_websocket.close();
                this.#player_websocket_server.close();

                let el = () => {
                    if (
                        this.#player_websocket.readyState === WebSocket.CLOSED
                    ) {
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
        this.#player_websocket.send("INTERRUPT");
        clearStreamedSubtitles();
    }

    #sendToAzure(ssml: string, file_path: string): Promise<boolean> {
        return new Promise((resolve) => {
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
                        resolve(true);
                        return fs.createReadStream(file_path);
                    }
                    return undefined;
                },
                (error: any) => {
                    console.log(error);
                    synthesizer.close();
                    resolve(false);
                }
            );
        });
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
                        0, // ID
                        file_path, // File path for conversion
                        0, // Pitch correction
                        null, // f0 file
                        "pm", // model
                        "", // ?
                        "", // index file
                        0.75, // accent
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
        params: TtsGenerationSettings
    ): Promise<Result<string, TTS_GEN_ERROR>> {
        return new Promise((resolve) => {
            const id = crypto.randomUUID();
            let tmp_file_path = AUDIO_PATH + "tmp_" + id + ".wav";
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

            let pitch_modifier = params.is_narrator
                ? wAIfu.state!.config.text_to_speech.azure_narrator_pitch_percentage.value.toString()
                : wAIfu.state!.config.text_to_speech.azure_pitch_percentage.value.toString();

            const ssml =
                '<speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis"  xml:lang="en-US">' +
                `<voice name="${params.voice.trim()}">` +
                `<prosody pitch="${pitch_modifier}%">${sanitized_text.trim()}</prosody>` +
                "</voice></speak>";

            if (
                wAIfu.state?.config.text_to_speech.rvc_voice_cloning.value ===
                    false ||
                params.is_narrator === true
            ) {
                tmp_file_path = file_path;
            }

            this.#sendToAzure(ssml, tmp_file_path).then((success) => {
                if (!success) {
                    resolve(
                        new Result(false, id, TTS_GEN_ERROR.RESPONSE_FAILURE)
                    );
                    return;
                }

                if (
                    wAIfu.state?.config.text_to_speech.rvc_voice_cloning
                        .value === false ||
                    params.is_narrator === true
                ) {
                    //let data = fs.readFileSync(tmp_file_path);
                    //fs.writeFileSync(file_path, data);
                    resolve(new Result(true, id, TTS_GEN_ERROR.NONE));
                    return;
                }

                // TODO: REPLACE GALETTE
                this.#toClonedVoice(tmp_file_path, file_path).then(
                    (success) => {
                        fs.unlinkSync(tmp_file_path);
                        if (!success) {
                            resolve(
                                new Result(
                                    false,
                                    id,
                                    TTS_GEN_ERROR.RESPONSE_FAILURE
                                )
                            );
                            return;
                        }
                        resolve(new Result(true, id, TTS_GEN_ERROR.NONE));
                    }
                );
            });
        });
    }

    async playSpeech(
        id: string,
        options: TtsPlaySettings
    ): Promise<Result<void, TTS_PLAY_ERROR>> {
        await_connect: while (true) {
            if (this.#player_websocket.readyState === WebSocket.OPEN)
                break await_connect;
            await new Promise<void>((resolve) =>
                setTimeout(() => resolve(), 100)
            );
        }

        return new Promise((resolve) => {
            let resolved: boolean = false;
            this.#player_websocket.send(
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
                this.#player_websocket.removeEventListener("message", el);
                return;
            };

            this.#player_websocket.addEventListener("message", el);
        });
    }
}
