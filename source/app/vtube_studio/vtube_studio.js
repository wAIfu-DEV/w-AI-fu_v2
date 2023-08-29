"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MSG_ERR_TYPE = exports.MESSAGE_TYPE = exports.VtubeStudioAPI = void 0;
const ws_1 = __importDefault(require("ws"));
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
const export_config_1 = require("../config/export_config");
class VtubeStudioAPI {
    #PORT = `ws://0.0.0.0:${Waifu_1.wAIfu.state.config.vts.api_port.value.toString()}`;
    #websocket = new ws_1.default(null);
    #authToken = '';
    current_emotion = '';
    constructor() {
        this.#websocket = new ws_1.default(this.#PORT);
        this.#messageHandler();
    }
    reconnect() {
        this.#websocket = new ws_1.default(this.#PORT);
        this.#messageHandler();
    }
    #messageHandler() {
        this.#websocket.on('error', (err) => {
            io_1.IO.debug('ERROR: VtubeStudio API encountered an error.');
            io_1.IO.debug(err);
        });
        this.#websocket.on('close', () => {
            io_1.IO.debug('Lost connection to the VtubeStudio API. Will try again shortly.');
            setTimeout(() => this.reconnect(), 7_500);
        });
        this.#websocket.on('message', (data) => {
            const message = JSON.parse(data.toString('utf-8'));
            if (message === undefined) {
                io_1.IO.warn('ERROR: VtubeStudio returned undefined.');
                return;
            }
            if (message["messageType"] === undefined) {
                io_1.IO.warn('ERROR: undefined messageType in VtubeStudio response.');
                return;
            }
            switch (message["messageType"]) {
                case MESSAGE_TYPE.AUTH_SUCCESS:
                    {
                        this.#authToken = message["data"]["authenticationToken"];
                        Waifu_1.wAIfu.state.config._.vts_session_token.value = this.#authToken;
                        (0, export_config_1.writeConfig)(Waifu_1.wAIfu.state.config);
                        Waifu_1.wAIfu.dependencies?.ui?.send('CONFIG', Waifu_1.wAIfu.state.config);
                        this.#authenticateSession();
                    }
                    break;
                case MESSAGE_TYPE.SESSION_AUTH_RESPONSE:
                    {
                        if (message["data"]["authenticated"] !== true)
                            io_1.IO.warn('ERROR: Could not authenticate current VtubeStudio API session.\nReason:' + message["data"]["reason"]);
                        this.#initialize();
                    }
                    break;
                case MESSAGE_TYPE.TRIGGER_RESPONSE:
                    break;
                case MESSAGE_TYPE.ERROR:
                    {
                        io_1.IO.warn('ERROR: VtubeStudio API sent: ' + message["data"]["message"]);
                        switch (message["data"]["errorID"]) {
                            case MSG_ERR_TYPE.USER_AUTH_REFUSAL:
                                {
                                    io_1.IO.warn('ERROR: Could not authenticate with VtubeStudio due to user refusal.');
                                }
                                break;
                            default:
                                break;
                        }
                    }
                    break;
                default:
                    io_1.IO.warn('ERROR: Received unhandled message from VtubeStudio API.');
                    io_1.IO.debug(message);
                    break;
            }
        });
        this.#websocket.on('ping', () => this.#websocket.pong());
        this.#websocket.on('open', () => {
            if (Waifu_1.wAIfu.state.config._.vts_session_token.value === '')
                this.#authenticate();
            else {
                this.#authToken = Waifu_1.wAIfu.state.config._.vts_session_token.value;
                this.#authenticateSession();
            }
        });
    }
    #initialize() {
        this.fullReset();
    }
    #authenticate() {
        this.#websocket.send(JSON.stringify({
            "apiName": "VTubeStudioPublicAPI",
            "apiVersion": "1.0",
            "requestID": "x",
            "messageType": "AuthenticationTokenRequest",
            "data": {
                "pluginName": "w-AI-fu",
                "pluginDeveloper": "w-AI-fu_DEV"
            }
        }));
    }
    #authenticateSession() {
        this.#websocket.send(JSON.stringify({
            "apiName": "VTubeStudioPublicAPI",
            "apiVersion": "1.0",
            "requestID": "x",
            "messageType": "AuthenticationRequest",
            "data": {
                "pluginName": "w-AI-fu",
                "pluginDeveloper": "w-AI-fu_DEV",
                "authenticationToken": this.#authToken
            }
        }));
    }
    #findEmotion(name) {
        if (name === undefined)
            return null;
        let em_array = Waifu_1.wAIfu.state.config.vts.emotions.value;
        for (let emotion of em_array) {
            if (emotion === undefined)
                continue;
            if (emotion.emotion_name === undefined)
                continue;
            if (emotion.emotion_name === name)
                return emotion;
        }
        return null;
    }
    playSequence(emotion_name, type) {
        let emotion = this.#findEmotion(emotion_name);
        if (emotion === null) {
            io_1.IO.debug('ERROR: Tried to play undefined emotion: ' + emotion_name);
            return;
        }
        let steps = emotion[`${type}_hotkey_sequence`];
        for (let step of steps) {
            this.#websocket.send(JSON.stringify({
                "apiName": "VTubeStudioPublicAPI",
                "apiVersion": "1.0",
                "requestID": "x",
                "messageType": "HotkeyTriggerRequest",
                "data": {
                    "hotkeyID": step
                }
            }));
        }
    }
    fullReset() {
        this.current_emotion = '';
        let steps = Waifu_1.wAIfu.state.config.vts.full_reset_hotkey_sequence.value;
        for (let step of steps) {
            this.#websocket.send(JSON.stringify({
                "apiName": "VTubeStudioPublicAPI",
                "apiVersion": "1.0",
                "requestID": "x",
                "messageType": "HotkeyTriggerRequest",
                "data": {
                    "hotkeyID": step
                }
            }));
        }
    }
    setAnimationSequences(emotion) {
        let found_emotion = this.#findEmotion(emotion);
        if (found_emotion === null) {
            io_1.IO.debug('ERROR: Tried to use undefined emotion: ' + emotion);
            return;
        }
        this.current_emotion = emotion;
    }
    async reset() {
        let emotion = this.#findEmotion(this.current_emotion);
        if (emotion === null) {
            io_1.IO.debug('ERROR: Tried to play undefined emotion: ' + this.current_emotion);
            return;
        }
        let steps = emotion.reset_hotkey_sequence;
        for (let step of steps) {
            this.#websocket.send(JSON.stringify({
                "apiName": "VTubeStudioPublicAPI",
                "apiVersion": "1.0",
                "requestID": "x",
                "messageType": "HotkeyTriggerRequest",
                "data": {
                    "hotkeyID": step
                }
            }));
        }
        await new Promise((resolve) => setTimeout(() => resolve(), 100));
        return;
    }
    animateTalking() {
        let emotion = this.#findEmotion(this.current_emotion);
        if (emotion === null) {
            io_1.IO.debug('ERROR: Tried to play undefined emotion: ' + this.current_emotion);
            return;
        }
        let steps = emotion.talking_hotkey_sequence;
        for (let step of steps) {
            this.#websocket.send(JSON.stringify({
                "apiName": "VTubeStudioPublicAPI",
                "apiVersion": "1.0",
                "requestID": "x",
                "messageType": "HotkeyTriggerRequest",
                "data": {
                    "hotkeyID": step
                }
            }));
        }
    }
    animateIdle() {
        let emotion = this.#findEmotion(this.current_emotion);
        if (emotion === null) {
            io_1.IO.debug('ERROR: Tried to play undefined emotion: ' + this.current_emotion);
            return;
        }
        let steps = emotion.idle_hotkey_sequence;
        for (let step of steps) {
            this.#websocket.send(JSON.stringify({
                "apiName": "VTubeStudioPublicAPI",
                "apiVersion": "1.0",
                "requestID": "x",
                "messageType": "HotkeyTriggerRequest",
                "data": {
                    "hotkeyID": step
                }
            }));
        }
    }
    close() {
        if (this.#websocket.readyState !== ws_1.default.CLOSED)
            this.#websocket.close();
    }
}
exports.VtubeStudioAPI = VtubeStudioAPI;
var MESSAGE_TYPE;
(function (MESSAGE_TYPE) {
    MESSAGE_TYPE["AUTH_SUCCESS"] = "AuthenticationTokenResponse";
    MESSAGE_TYPE["SESSION_AUTH_RESPONSE"] = "AuthenticationResponse";
    MESSAGE_TYPE["TRIGGER_RESPONSE"] = "HotkeyTriggerResponse";
    MESSAGE_TYPE["ERROR"] = "APIError";
})(MESSAGE_TYPE || (exports.MESSAGE_TYPE = MESSAGE_TYPE = {}));
var MSG_ERR_TYPE;
(function (MSG_ERR_TYPE) {
    MSG_ERR_TYPE[MSG_ERR_TYPE["USER_AUTH_REFUSAL"] = 50] = "USER_AUTH_REFUSAL";
})(MSG_ERR_TYPE || (exports.MSG_ERR_TYPE = MSG_ERR_TYPE = {}));
