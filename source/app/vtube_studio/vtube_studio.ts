import WebSocket from "ws";
import { wAIfu } from "../types/Waifu";
import { writeConfig } from "../config/export_config";
import { VtsEmotion } from "../config/config";
import { IO } from "../io/io";

export class VtubeStudioAPI {
    #PORT: string = `ws://0.0.0.0:${wAIfu.state!.config.vts.api_port.value.toString()}`;
    #websocket: WebSocket = new WebSocket(null);
    #authToken: string = "";

    current_emotion: string = "";

    /**
     * Automatically connects to the VtubeStudio API
     */
    constructor() {
        this.#websocket = new WebSocket(this.#PORT);
        this.#messageHandler();
    }

    reconnect() {
        this.#websocket = new WebSocket(this.#PORT);
        this.#messageHandler();
    }

    /**
     * Responsible for the handling of incoming responses and state changes
     */
    #messageHandler() {
        this.#websocket.on("error", (err: any) => {
            if (err.code === "ECONNREFUSED") return;
            IO.debug("ERROR: VtubeStudio API encountered an error.");
            IO.debug(err);
        });

        this.#websocket.on("close", () => {
            // IO.debug('Lost connection to the VtubeStudio API. Will try again shortly.');
            setTimeout(() => this.reconnect(), 7_500);
        });

        this.#websocket.on("message", (data: WebSocket.RawData) => {
            const message: any = JSON.parse(data.toString("utf-8"));

            if (message === undefined) {
                IO.warn("ERROR: VtubeStudio returned undefined.");
                return;
            }
            if (message["messageType"] === undefined) {
                IO.warn(
                    "ERROR: undefined messageType in VtubeStudio response."
                );
                return;
            }

            switch (message["messageType"]) {
                case MESSAGE_TYPE.AUTH_SUCCESS:
                    {
                        this.#authToken =
                            message["data"]["authenticationToken"];
                        wAIfu.state!.config._.vts_session_token.value =
                            this.#authToken;
                        writeConfig(
                            wAIfu.state!.config,
                            wAIfu.state!.current_preset
                        );
                        wAIfu.dependencies?.ui?.send(
                            "CONFIG",
                            wAIfu.state!.config
                        );
                        wAIfu.dependencies?.ui?.send(
                            "DEVICES",
                            wAIfu.state!.devices
                        );
                        this.#authenticateSession();
                    }
                    break;
                case MESSAGE_TYPE.SESSION_AUTH_RESPONSE:
                    {
                        if (message["data"]["authenticated"] !== true) {
                            IO.warn(
                                "ERROR: Could not authenticate current VtubeStudio API session.\nReason: " +
                                    message["data"]["reason"]
                            );
                            this.#authenticate();
                            return;
                        }
                        this.#initialize();
                    }
                    break;
                case MESSAGE_TYPE.TRIGGER_RESPONSE:
                    break;
                case MESSAGE_TYPE.ERROR:
                    {
                        IO.warn(
                            "ERROR: VtubeStudio API sent: " +
                                message["data"]["message"]
                        );

                        switch (message["data"]["errorID"]) {
                            case MSG_ERR_TYPE.USER_AUTH_REFUSAL:
                                {
                                    IO.warn(
                                        "ERROR: Could not authenticate with VtubeStudio due to user refusal."
                                    );
                                }
                                break;
                            default:
                                break;
                        }
                    }
                    break;
                default:
                    IO.warn(
                        "ERROR: Received unhandled message from VtubeStudio API."
                    );
                    IO.debug(message);
                    break;
            }
        });

        this.#websocket.on("ping", () => this.#websocket.pong());

        this.#websocket.on("open", () => {
            if (wAIfu.state!.config._.vts_session_token.value === "")
                this.#authenticate();
            else {
                this.#authToken = wAIfu.state!.config._.vts_session_token.value;
                this.#authenticateSession();
            }
        });
    }

    #initialize() {
        this.fullReset();
    }

    /**
     * Preflight request sent to Vtube studio in order to allow following resuest
     * to API
     */
    #authenticate() {
        this.#websocket.send(
            JSON.stringify({
                apiName: "VTubeStudioPublicAPI",
                apiVersion: "1.0",
                requestID: "x",
                messageType: "AuthenticationTokenRequest",
                data: {
                    pluginName: "w-AI-fu",
                    pluginDeveloper: "w-AI-fu_DEV",
                },
            })
        );
    }

    #authenticateSession() {
        this.#websocket.send(
            JSON.stringify({
                apiName: "VTubeStudioPublicAPI",
                apiVersion: "1.0",
                requestID: "x",
                messageType: "AuthenticationRequest",
                data: {
                    pluginName: "w-AI-fu",
                    pluginDeveloper: "w-AI-fu_DEV",
                    authenticationToken: this.#authToken,
                },
            })
        );
    }

    #findEmotion(name: string): VtsEmotion | null {
        if (name === undefined) return null;
        let em_array = wAIfu.state!.config.vts.emotions.value;
        for (let emotion of em_array) {
            if (emotion === undefined) continue;
            if (emotion.emotion_name === undefined) continue;
            if (emotion.emotion_name === name) return emotion;
        }
        return null;
    }

    /**
     * Plays the specified animation sequence
     * @param animation_sequence Name of the animation sequence to play
     */
    playSequence(
        emotion_name: string,
        type: "talking" | "idle" | "reset"
    ): void {
        if (this.#websocket.readyState !== WebSocket.OPEN) return;
        let emotion = this.#findEmotion(emotion_name);
        if (emotion === null) {
            IO.debug("ERROR: Tried to play undefined emotion: " + emotion_name);
            return;
        }

        let steps = emotion[`${type}_hotkey_sequence`];
        for (let step of steps) {
            this.#websocket.send(
                JSON.stringify({
                    apiName: "VTubeStudioPublicAPI",
                    apiVersion: "1.0",
                    requestID: "x",
                    messageType: "HotkeyTriggerRequest",
                    data: {
                        hotkeyID: step,
                    },
                })
            );
        }
    }

    playCustomSequence(steps: string[]): void {
        if (this.#websocket.readyState !== WebSocket.OPEN) return;
        for (let step of steps) {
            this.#websocket.send(
                JSON.stringify({
                    apiName: "VTubeStudioPublicAPI",
                    apiVersion: "1.0",
                    requestID: "x",
                    messageType: "HotkeyTriggerRequest",
                    data: {
                        hotkeyID: step,
                    },
                })
            );
        }
    }

    fullReset() {
        if (this.#websocket.readyState !== WebSocket.OPEN) return;
        this.current_emotion = "";
        let steps = wAIfu.state!.config.vts.full_reset_hotkey_sequence.value;
        for (let step of steps) {
            this.#websocket.send(
                JSON.stringify({
                    apiName: "VTubeStudioPublicAPI",
                    apiVersion: "1.0",
                    requestID: "x",
                    messageType: "HotkeyTriggerRequest",
                    data: {
                        hotkeyID: step,
                    },
                })
            );
        }
    }

    /** Set the default talking and idle animations for the VtubeStudio API */
    setAnimationSequences(emotion: string) {
        let found_emotion = this.#findEmotion(emotion);
        if (found_emotion === null) {
            IO.debug("ERROR: Tried to use undefined emotion: " + emotion);
            return;
        }

        this.current_emotion = emotion;
    }

    async reset(): Promise<void> {
        if (this.#websocket.readyState !== WebSocket.OPEN) return;
        let emotion = this.#findEmotion(this.current_emotion);
        if (emotion === null) {
            IO.debug(
                "ERROR: Tried to play undefined emotion: " +
                    this.current_emotion
            );
            return;
        }

        let steps = emotion.reset_hotkey_sequence;
        for (let step of steps) {
            this.#websocket.send(
                JSON.stringify({
                    apiName: "VTubeStudioPublicAPI",
                    apiVersion: "1.0",
                    requestID: "x",
                    messageType: "HotkeyTriggerRequest",
                    data: {
                        hotkeyID: step,
                    },
                })
            );
        }

        await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
        return;
    }

    animateSinging() {
        if (this.#websocket.readyState !== WebSocket.OPEN) return;
        let steps = wAIfu.state!.config.vts.singing_hotkey_sequence.value;
        for (let step of steps) {
            this.#websocket.send(
                JSON.stringify({
                    apiName: "VTubeStudioPublicAPI",
                    apiVersion: "1.0",
                    requestID: "x",
                    messageType: "HotkeyTriggerRequest",
                    data: {
                        hotkeyID: step,
                    },
                })
            );
        }
    }

    /** Plays the set talking animation */
    animateTalking() {
        if (this.#websocket.readyState !== WebSocket.OPEN) return;
        let emotion = this.#findEmotion(this.current_emotion);
        if (emotion === null) {
            IO.debug(
                "ERROR: Tried to play undefined emotion: " +
                    this.current_emotion
            );
            return;
        }

        let steps = emotion.talking_hotkey_sequence;
        for (let step of steps) {
            this.#websocket.send(
                JSON.stringify({
                    apiName: "VTubeStudioPublicAPI",
                    apiVersion: "1.0",
                    requestID: "x",
                    messageType: "HotkeyTriggerRequest",
                    data: {
                        hotkeyID: step,
                    },
                })
            );
        }
    }

    /** Plays the set talking animation */
    animateListening() {
        if (this.#websocket.readyState !== WebSocket.OPEN) return;
        let steps = wAIfu.state!.config.vts.listening_hotkey_sequence.value;
        for (let step of steps) {
            this.#websocket.send(
                JSON.stringify({
                    apiName: "VTubeStudioPublicAPI",
                    apiVersion: "1.0",
                    requestID: "x",
                    messageType: "HotkeyTriggerRequest",
                    data: {
                        hotkeyID: step,
                    },
                })
            );
        }
    }

    /** Plays the set idle animation */
    animateIdle() {
        if (this.#websocket.readyState !== WebSocket.OPEN) return;
        let emotion = this.#findEmotion(this.current_emotion);
        if (emotion === null) {
            IO.debug(
                "ERROR: Tried to play undefined emotion: " +
                    this.current_emotion
            );
            return;
        }

        let steps = emotion.idle_hotkey_sequence;
        for (let step of steps) {
            this.#websocket.send(
                JSON.stringify({
                    apiName: "VTubeStudioPublicAPI",
                    apiVersion: "1.0",
                    requestID: "x",
                    messageType: "HotkeyTriggerRequest",
                    data: {
                        hotkeyID: step,
                    },
                })
            );
        }
    }

    tryPlayKeywordSequence(text: string): void {
        const val_array =
            wAIfu.state!.config.vts.keyword_based_animations.value;

        const text_lower = text.toLowerCase();

        for (let item of val_array) {
            let keywords = item.keywords;
            for (let keyword of keywords) {
                if (text_lower.includes(keyword.toLowerCase())) {
                    for (let step of item.hotkey_sequence) {
                        this.#websocket.send(
                            JSON.stringify({
                                apiName: "VTubeStudioPublicAPI",
                                apiVersion: "1.0",
                                requestID: "x",
                                messageType: "HotkeyTriggerRequest",
                                data: {
                                    hotkeyID: step,
                                },
                            })
                        );
                    }
                    return;
                }
            }
        }
    }

    /** Ends connection with the VtubeStudio API */
    free() {
        if (this.#websocket.readyState !== WebSocket.CLOSED)
            this.#websocket.close();
    }
}

export enum MESSAGE_TYPE {
    AUTH_SUCCESS = "AuthenticationTokenResponse",
    SESSION_AUTH_RESPONSE = "AuthenticationResponse",
    TRIGGER_RESPONSE = "HotkeyTriggerResponse",
    ERROR = "APIError",
}

export enum MSG_ERR_TYPE {
    USER_AUTH_REFUSAL = 50,
}
