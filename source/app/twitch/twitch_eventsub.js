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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitchEventSubs = void 0;
const ws_1 = __importDefault(require("ws"));
const http = __importStar(require("http"));
const url = __importStar(require("url"));
const Waifu_1 = require("../types/Waifu");
const electron_1 = require("electron");
const io_1 = require("../io/io");
class TwitchEventSubs {
    http_server = undefined;
    websocket = null;
    HOST_PATH = "127.0.0.1";
    PORT_TWITCH_AUTH_CALLBACK = 3000;
    free() {
        if (this.websocket !== null) {
            if (this.websocket.readyState !== ws_1.default.CLOSED
                && this.websocket.readyState !== ws_1.default.CLOSING) {
                this.websocket.close();
            }
            this.websocket.removeAllListeners();
        }
        if (this.http_server !== undefined) {
            this.http_server.close();
        }
    }
    async getTwitchAppAccessToken() {
        let req = await fetch(`https://id.twitch.tv/oauth2/token`
            + `?client_id=${Waifu_1.wAIfu.state.auth.twitch.twitchapp_clientid}`
            + `&client_secret=${Waifu_1.wAIfu.state.auth.twitch.twitchapp_secret}`
            + `&grant_type=client_credentials`, {
            method: 'POST'
        });
        let resp = await req.json();
        if (resp["access_token"] === undefined) {
            io_1.IO.warn('Failed to get Twitch App Access Token. This may be due to incorrect Twitch App ClientId or Secret.');
            return '';
        }
        io_1.IO.debug('Obtained Twitch Access Token.');
        return resp["access_token"];
    }
    async getTwitchUserAccessToken() {
        let redirect_url = `https://id.twitch.tv/oauth2/authorize`
            + `?client_id=${Waifu_1.wAIfu.state.auth.twitch.twitchapp_clientid}`
            + `&redirect_uri=http://localhost:${this.PORT_TWITCH_AUTH_CALLBACK}/callback`
            + `&response_type=token+id_token`
            + `&scope=channel:read:subscriptions+moderator:read:followers+bits:read+openid`;
        await electron_1.app.whenReady();
        let win = new electron_1.BrowserWindow({
            height: 900,
            width: 900,
            show: false
        });
        win.on('page-title-updated', (_, title) => {
            if (title === "Log In - Twitch") {
                win?.show();
            }
        });
        await win.loadURL(redirect_url);
    }
    async getTwitchUID(login, app_token) {
        let req = await fetch(`https://api.twitch.tv/helix/users?login=${login}`, {
            method: 'GET',
            headers: {
                "Authorization": "Bearer " + app_token,
                "Client-Id": Waifu_1.wAIfu.state.auth.twitch.twitchapp_clientid
            }
        });
        let resp = await req.json();
        if (resp["data"][0]["id"] !== undefined) {
            io_1.IO.debug('Obtained Twitch UID.');
            return resp["data"][0]["id"];
        }
        else {
            io_1.IO.warn('Failed to get get Twitch UID.');
            return '';
        }
    }
    subscribeToEventSub(event_name, version, condition = {}, user_token, session_id) {
        fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + user_token,
                "Client-Id": Waifu_1.wAIfu.state.auth.twitch.twitchapp_clientid,
            },
            body: JSON.stringify({
                "type": event_name,
                "version": version,
                "condition": condition,
                "transport": {
                    "method": "websocket",
                    "session_id": session_id
                }
            })
        })
            .catch((reason) => {
            console.log(reason);
        });
    }
    subscribeToEvents(user_id, user_token, session_id) {
        this.subscribeToEventSub(EVENT_TYPE.EVENT_FOLLOW, "2", { "broadcaster_user_id": user_id, "moderator_user_id": user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.EVENT_SUBSCRIBE, "1", { "broadcaster_user_id": user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.EVENT_GIFT_SUB, "1", { "broadcaster_user_id": user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.EVENT_BITS, "1", { "broadcaster_user_id": user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.EVENT_RAID, "1", { "to_broadcaster_user_id": user_id }, user_token, session_id);
    }
    async connectTwitchEventSub() {
        let app_token = await this.getTwitchAppAccessToken();
        if (app_token === '') {
            io_1.IO.warn('Could not connect to Twitch EventSub.\nw-AI-fu will continue without reading follows, subs and bits.\nFollow this tutorial to enable the feature: https://github.com/wAIfu-DEV/w-AI-fu/wiki/Follower,-Subscribers,-Bits-interactions');
            return;
        }
        ;
        let user_id = await this.getTwitchUID(Waifu_1.wAIfu.state.auth.twitch.channel_name, app_token);
        if (user_id === '') {
            io_1.IO.warn('Could not connect to Twitch EventSub.\nw-AI-fu will continue without reading follows, subs and bits.\nFollow this tutorial to enable the feature: https://github.com/wAIfu-DEV/w-AI-fu/wiki/Follower,-Subscribers,-Bits-interactions');
            return;
        }
        ;
        let user_token = '';
        let user_id_token = '';
        let ws_session_id = '';
        const DEFAULT_EVENTSUB_WS_URL = 'wss://eventsub.wss.twitch.tv/ws';
        let latest_eventsub_ws_url = DEFAULT_EVENTSUB_WS_URL;
        let create_ws = (url = null) => {
            this.websocket = new ws_1.default((url === null)
                ? DEFAULT_EVENTSUB_WS_URL
                : url);
            let ws = this.websocket;
            ws.on('open', () => {
                const reconnect = (url) => {
                    ws.close();
                    setTimeout(() => create_ws(url), 0);
                };
                ws.on('ping', () => ws.pong());
                ws.on('message', (data, _is_bin) => {
                    let obj = JSON.parse(data.toString());
                    const MSG_WELCOME = "session_welcome";
                    const MSG_KEEPALIVE = "session_keepalive";
                    const MSG_RECONNECT = "session_reconnect";
                    const MSG_NOTIFICATION = "notification";
                    const msg_type = obj["metadata"]["message_type"];
                    switch (msg_type) {
                        case MSG_WELCOME: {
                            io_1.IO.debug('Successfully connected to Twitch EventSub WebSocket.');
                            ws_session_id = obj["payload"]["session"]["id"];
                            return;
                        }
                        case MSG_KEEPALIVE: {
                            return;
                        }
                        case MSG_RECONNECT: {
                            io_1.IO.warn('Received reconnection message from Twich EventSub WebSocket.');
                            latest_eventsub_ws_url = obj["payload"]["session"]["reconnect_url"];
                            reconnect(latest_eventsub_ws_url);
                            return;
                        }
                        case MSG_NOTIFICATION: {
                            this.handleTwitchEvent(obj);
                            return;
                        }
                        default:
                            io_1.IO.warn('Received unhandled message:', obj);
                            break;
                    }
                });
                ws.on('error', (err) => {
                    io_1.IO.warn('Error: Twitch Events WebSocket experienced an error.');
                    console.log(err);
                    reconnect(latest_eventsub_ws_url);
                });
                ws.on('close', (code, reason) => {
                    io_1.IO.print(`Closed Twitch Events WebSocket with message: ${code} ${reason.toString("utf8")}`);
                    this.websocket = null;
                });
            });
        };
        create_ws();
        const CALLBACK_LANDING_PAGE = `
        <head>
            <title>redirecting...</title>
        </head>
        <body>
            <script>
                let payload = window.location.hash.replace('#', '');
                fetch('${this.HOST_PATH}:${this.PORT_TWITCH_AUTH_CALLBACK}/token?' + payload)
                .then(() => {
                    //window.close();
                });
            </script>
        </body>
        `;
        const validateToken = async () => {
            let req = await fetch('https://id.twitch.tv/oauth2/validate', {
                headers: {
                    "Authorization": "OAuth " + user_token,
                }
            });
            if (req.status == 401) {
                io_1.IO.warn('Could not validate Twitch User Access Token.');
                Waifu_1.wAIfu.state.command_queue.pushFront('!reload');
            }
            else {
                io_1.IO.debug('Validated Twitch User Access Token.');
            }
            setTimeout(validateToken, 3_600_000);
        };
        this.http_server = http.createServer();
        let server = this.http_server;
        server.listen(this.PORT_TWITCH_AUTH_CALLBACK, this.HOST_PATH, () => {
            const REQUEST_SUCCESS = 200;
            const REQUEST_FAILURE = 400;
            server.on('request', async (req, res) => {
                if (req.url?.includes('/callback', 0)) {
                    res.statusCode = REQUEST_SUCCESS;
                    res.end(CALLBACK_LANDING_PAGE);
                }
                else if (req.url?.includes('/token', 0)) {
                    io_1.IO.debug('Received Auth token from Twitch API.');
                    let url_query = url.parse(req.url, true).query;
                    user_token = url_query["access_token"]?.toString();
                    user_id_token = url_query["id_token"]?.toString();
                    await validateToken();
                    this.subscribeToEvents(user_id, user_token, ws_session_id);
                    res.statusCode = REQUEST_SUCCESS;
                    res.end('');
                    server?.close();
                    server = undefined;
                }
                else {
                    res.statusCode = REQUEST_FAILURE;
                    res.end('');
                }
            });
        });
        await this.getTwitchUserAccessToken();
    }
    handleTwitchEvent(obj) {
        const event_type = obj["metadata"]["subscription_type"];
        const user_name = obj["payload"]["event"]["user_name"];
        switch (event_type) {
            case EVENT_TYPE.EVENT_FOLLOW: {
                Waifu_1.wAIfu.state.command_queue.pushFront(`!say Thank you ${user_name} for following my channel!`);
                return;
            }
            case EVENT_TYPE.EVENT_SUBSCRIBE: {
                let was_gifted = obj["payload"]["event"]["is_gift"];
                if (was_gifted === true)
                    return;
                let sub_tier = Number(obj["payload"]["event"]["tier"]) / 1_000;
                Waifu_1.wAIfu.state.command_queue.pushFront(`!say Thank you ${user_name} for your tier ${sub_tier} sub to my channel!`);
                return;
            }
            case EVENT_TYPE.EVENT_GIFT_SUB: {
                let anonymous = obj["payload"]["event"]["is_anonymous"];
                let sub_tier = Number(obj["payload"]["event"]["tier"]) / 1_000;
                let total = obj["payload"]["event"]["total"];
                Waifu_1.wAIfu.state.command_queue.pushFront(`!say Thank you ${(anonymous) ? 'anonymous' : user_name} for your ${total} tier ${sub_tier} gifted subs to my channel!`);
                return;
            }
            case EVENT_TYPE.EVENT_BITS: {
                let anonymous = obj["payload"]["event"]["is_anonymous"];
                let bits = obj["payload"]["event"]["bits"];
                Waifu_1.wAIfu.state.command_queue.pushFront(`!say Thank you ${(anonymous) ? 'anonymous' : user_name} for the ${bits} bits!`);
                return;
            }
            case EVENT_TYPE.EVENT_RAID: {
                let from = obj["payload"]["event"]["from_broadcaster_user_name"];
                Waifu_1.wAIfu.state.command_queue.pushFront(`!say Thank you ${from} for the raid!`);
                return;
            }
            default:
                break;
        }
    }
}
exports.TwitchEventSubs = TwitchEventSubs;
var EVENT_TYPE;
(function (EVENT_TYPE) {
    EVENT_TYPE["EVENT_FOLLOW"] = "channel.follow";
    EVENT_TYPE["EVENT_SUBSCRIBE"] = "channel.subscribe";
    EVENT_TYPE["EVENT_GIFT_SUB"] = "channel.subscription.gift";
    EVENT_TYPE["EVENT_BITS"] = "channel.cheer";
    EVENT_TYPE["EVENT_RAID"] = "channel.raid";
})(EVENT_TYPE || (EVENT_TYPE = {}));
