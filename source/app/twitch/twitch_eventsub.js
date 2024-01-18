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
var EVENT_TYPE;
(function (EVENT_TYPE) {
    EVENT_TYPE["FOLLOW"] = "channel.follow";
    EVENT_TYPE["SUBSCRIBE"] = "channel.subscribe";
    EVENT_TYPE["SUBSCRIBE_MSG"] = "channel.subscription.message";
    EVENT_TYPE["GIFT_SUB"] = "channel.subscription.gift";
    EVENT_TYPE["BITS"] = "channel.cheer";
    EVENT_TYPE["RAID"] = "channel.raid";
    EVENT_TYPE["REDEEM"] = "channel.channel_points_custom_reward_redemption.add";
})(EVENT_TYPE || (EVENT_TYPE = {}));
var MESSAGE_TYPE;
(function (MESSAGE_TYPE) {
    MESSAGE_TYPE["WELCOME"] = "session_welcome";
    MESSAGE_TYPE["KEEPALIVE"] = "session_keepalive";
    MESSAGE_TYPE["RECONNECT"] = "session_reconnect";
    MESSAGE_TYPE["NOTIFICATION"] = "notification";
})(MESSAGE_TYPE || (MESSAGE_TYPE = {}));
var REQUEST_STATUS;
(function (REQUEST_STATUS) {
    REQUEST_STATUS[REQUEST_STATUS["SUCCESS"] = 200] = "SUCCESS";
    REQUEST_STATUS[REQUEST_STATUS["FAILURE"] = 400] = "FAILURE";
})(REQUEST_STATUS || (REQUEST_STATUS = {}));
class TwitchEventSubs {
    http_server = undefined;
    websocket = undefined;
    old_websocket = undefined;
    websocket_session_id = undefined;
    user_id = undefined;
    user_token = undefined;
    app_token = undefined;
    user_id_token = undefined;
    free() {
        if (this.websocket !== undefined) {
            if (this.websocket.readyState !== ws_1.default.CLOSED &&
                this.websocket.readyState !== ws_1.default.CLOSING) {
                this.websocket.close();
            }
            this.websocket.removeAllListeners();
        }
        if (this.http_server !== undefined) {
            this.http_server.close();
        }
    }
    #listeners = {
        connected: new Array(),
        reconnect: new Array(),
        follow: new Array(),
        subscribe: new Array(),
        sub_message: new Array(),
        gifted_sub: new Array(),
        cheer: new Array(),
        raid: new Array(),
        redeem: new Array(),
    };
    on(event, listener) {
        this.#listeners[event].push(listener);
    }
    removeAllListeners() {
        for (let arr of Object.values(this.#listeners))
            while (arr.length > 0)
                arr.pop();
    }
    async getTwitchAppAccessToken() {
        let req = await fetch(`https://id.twitch.tv/oauth2/token` +
            `?client_id=${Waifu_1.wAIfu.state.auth.twitch.twitchapp_clientid}` +
            `&client_secret=${Waifu_1.wAIfu.state.auth.twitch.twitchapp_secret}` +
            `&grant_type=client_credentials`, {
            method: "POST",
        });
        let resp = await req.json();
        if (resp["access_token"] === undefined) {
            io_1.IO.warn("Failed to get Twitch App Access Token. This may be due to incorrect Twitch App ClientId or Secret.");
            return "";
        }
        io_1.IO.debug("Obtained Twitch Access Token.");
        return resp["access_token"];
    }
    async getTwitchUserAccessToken() {
        let redirect_url = `https://id.twitch.tv/oauth2/authorize` +
            `?client_id=${Waifu_1.wAIfu.state.auth.twitch.twitchapp_clientid}` +
            `&redirect_uri=http://localhost:3000/callback` +
            `&response_type=token+id_token` +
            `&scope=channel:read:subscriptions+moderator:read:followers+bits:read+openid+channel:manage:redemptions+moderator:manage:banned_users`;
        await electron_1.app.whenReady();
        let win = new electron_1.BrowserWindow({
            height: 900,
            width: 900,
            show: false,
            alwaysOnTop: true,
        });
        win.on("page-title-updated", (_, title) => {
            if (title !== "redirecting...")
                win?.show();
        });
        await win.loadURL(redirect_url);
    }
    async getTwitchUID(login, app_token) {
        let req = await fetch(`https://api.twitch.tv/helix/users?login=${login}`, {
            method: "GET",
            headers: {
                Authorization: "Bearer " + app_token,
                "Client-Id": Waifu_1.wAIfu.state.auth.twitch.twitchapp_clientid,
            },
        });
        let resp = await req.json();
        if (resp["data"][0]["id"] !== undefined) {
            io_1.IO.debug("Obtained Twitch UID.");
            return resp["data"][0]["id"];
        }
        else {
            io_1.IO.warn("Failed to get get Twitch UID.");
            return "";
        }
    }
    subscribeToEventSub(event_name, version, condition = {}, user_token, session_id) {
        fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + user_token,
                "Client-Id": Waifu_1.wAIfu.state.auth.twitch.twitchapp_clientid,
            },
            body: JSON.stringify({
                type: event_name,
                version: version,
                condition: condition,
                transport: {
                    method: "websocket",
                    session_id: session_id,
                },
            }),
        }).then((response) => {
            response.json().then((json) => {
                if (json.error !== undefined) {
                    io_1.IO.warn("Could not subscribe to Twitch event:", event_name);
                    io_1.IO.warn(json);
                }
            });
        });
    }
    subscribeToEvents(user_id, user_token, session_id) {
        this.subscribeToEventSub(EVENT_TYPE.FOLLOW, "2", { broadcaster_user_id: user_id, moderator_user_id: user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.SUBSCRIBE, "1", { broadcaster_user_id: user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.SUBSCRIBE_MSG, "1", { broadcaster_user_id: user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.GIFT_SUB, "1", { broadcaster_user_id: user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.BITS, "1", { broadcaster_user_id: user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.RAID, "1", { to_broadcaster_user_id: user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.REDEEM, "1", { broadcaster_user_id: user_id }, user_token, session_id);
    }
    reconnectTwitchEventSubWebsocket(new_url) {
        this.createTwitchEventSubWebsocket(new_url);
        for (let listener of this.#listeners.reconnect)
            listener();
    }
    handleEventSubMessage(data, _is_bin) {
        let obj = JSON.parse(data.toString());
        const msg_type = obj["metadata"]["message_type"];
        switch (msg_type) {
            case MESSAGE_TYPE.WELCOME: {
                if (this.old_websocket !== undefined) {
                    io_1.IO.quietPrint("Closing old EventSub WebSocket.");
                    this.old_websocket.removeAllListeners();
                    this.old_websocket.close();
                    this.old_websocket = undefined;
                }
                io_1.IO.debug("Successfully connected to Twitch EventSub WebSocket.");
                this.websocket_session_id = obj["payload"]["session"]["id"];
                return;
            }
            case MESSAGE_TYPE.KEEPALIVE: {
                return;
            }
            case MESSAGE_TYPE.RECONNECT: {
                io_1.IO.warn("Received reconnection message from Twich EventSub WebSocket.");
                const reconnect_url = obj["payload"]["session"]["reconnect_url"];
                this.old_websocket = this.websocket;
                this.reconnectTwitchEventSubWebsocket(reconnect_url);
                return;
            }
            case MESSAGE_TYPE.NOTIFICATION: {
                this.handleTwitchEvent(obj);
                return;
            }
            default:
                io_1.IO.warn("Received unhandled message:", obj);
                break;
        }
    }
    createTwitchEventSubWebsocket(url) {
        return new Promise((resolve) => {
            let is_resolved = false;
            this.websocket = new ws_1.default(url === undefined ? "wss://eventsub.wss.twitch.tv/ws" : url);
            let ws = this.websocket;
            ws.on("open", () => {
                ws.on("ping", () => ws.pong());
                ws.on("message", (data, _) => {
                    this.handleEventSubMessage(data, _);
                    if (is_resolved)
                        return;
                    is_resolved = true;
                    resolve();
                });
                ws.on("error", (err) => {
                    io_1.IO.warn("Error: Twitch Events WebSocket experienced an error.");
                    console.log(err);
                });
                ws.on("close", (code, reason) => {
                    io_1.IO.print(`Closed Twitch Events WebSocket with message: ${code} ${reason.toString("utf8")}`);
                });
            });
        });
    }
    async validateUserToken() {
        let req = await fetch("https://id.twitch.tv/oauth2/validate", {
            headers: {
                Authorization: "OAuth " + this.user_token,
            },
        });
        if (req.status == 401) {
            io_1.IO.warn("Could not validate Twitch User Access Token.");
            Waifu_1.wAIfu.state.command_queue.pushFront("!reload");
        }
        else {
            io_1.IO.debug("Validated Twitch User Access Token.");
        }
        setTimeout(() => {
            this.validateUserToken();
        }, 3_600_000);
    }
    async handleServerRequest(req, res) {
        if (req.url?.includes("/callback", 0)) {
            res.statusCode = REQUEST_STATUS.SUCCESS;
            res.end(`<head>
                    <title>redirecting...</title>
                </head>
                <body>
                    <script>
                        let payload = window.location.hash.replace('#', '');
                        fetch('127.0.0.1:30000/token?' + payload)
                        .then(() => {
                            window.close();
                        });
                    </script>
                </body>`);
            return;
        }
        else if (req.url?.includes("/token", 0)) {
            io_1.IO.debug("Received Auth token from Twitch API.");
            let url_query = url.parse(req.url, true).query;
            this.user_token = url_query["access_token"]?.toString();
            this.user_id_token = url_query["id_token"]?.toString();
            await this.validateUserToken();
            await this.createTwitchEventSubWebsocket();
            if (this.websocket_session_id === undefined) {
                io_1.IO.warn("ERROR: Received Auth token before WebSocket session ID.");
                return;
            }
            if (this.user_id === undefined) {
                io_1.IO.warn("ERROR: user_id is undefined.");
                return;
            }
            this.subscribeToEvents(this.user_id, this.user_token, this.websocket_session_id);
            res.statusCode = REQUEST_STATUS.SUCCESS;
            res.end("");
            this.http_server?.close();
            this.http_server = undefined;
            return;
        }
        else {
            res.statusCode = REQUEST_STATUS.FAILURE;
            res.end("");
        }
    }
    async initialize() {
        this.app_token = await this.getTwitchAppAccessToken();
        if (this.app_token === "" || this.app_token === undefined) {
            io_1.IO.warn("Could not connect to Twitch EventSub.\nw-AI-fu will continue without reading follows, subs and bits.\nFollow this tutorial to enable the feature: https://github.com/wAIfu-DEV/w-AI-fu/wiki/Follower,-Subscribers,-Bits-interactions");
            return;
        }
        this.user_id = await this.getTwitchUID(Waifu_1.wAIfu.state.auth.twitch.channel_name, this.app_token);
        if (this.user_id === "" || this.user_id === undefined) {
            io_1.IO.warn("Could not connect to Twitch EventSub.\nw-AI-fu will continue without reading follows, subs and bits.\nFollow this tutorial to enable the feature: https://github.com/wAIfu-DEV/w-AI-fu/wiki/Follower,-Subscribers,-Bits-interactions");
            return;
        }
        this.http_server = http.createServer();
        let server = this.http_server;
        server.listen(3000, "127.0.0.1", () => {
            server.on("request", (req, res) => this.handleServerRequest(req, res));
        });
        await this.getTwitchUserAccessToken();
    }
    handleTwitchEvent(ev) {
        const event_type = ev["metadata"]["subscription_type"];
        const user_name = ev["payload"]["event"]["user_name"];
        io_1.IO.print("RECEIVED TWITCH EVENT:", event_type);
        switch (event_type) {
            case EVENT_TYPE.FOLLOW: {
                for (let listener of this.#listeners.follow)
                    listener({ user_name: user_name });
                return;
            }
            case EVENT_TYPE.SUBSCRIBE: {
                let was_gifted = ev["payload"]["event"]["is_gift"];
                if (was_gifted === true)
                    return;
                let sub_tier = Number(ev["payload"]["event"]["tier"]) / 1_000;
                for (let listener of this.#listeners.subscribe)
                    listener({ user_name: user_name, tier: sub_tier });
                return;
            }
            case EVENT_TYPE.SUBSCRIBE_MSG: {
                let sub_tier = Number(ev["payload"]["event"]["tier"]) / 1_000;
                let message = ev["payload"]["event"]["message"]["text"];
                for (let listener of this.#listeners.sub_message)
                    listener({
                        user_name: user_name,
                        tier: sub_tier,
                        message: message,
                    });
                return;
            }
            case EVENT_TYPE.GIFT_SUB: {
                let anonymous = ev["payload"]["event"]["is_anonymous"];
                let sub_tier = Number(ev["payload"]["event"]["tier"]) / 1_000;
                let total = ev["payload"]["event"]["total"];
                for (let listener of this.#listeners.gifted_sub)
                    listener({
                        user_name: anonymous ? "anonymous" : user_name,
                        tier: sub_tier,
                        amount: total,
                    });
                return;
            }
            case EVENT_TYPE.BITS: {
                let anonymous = ev["payload"]["event"]["is_anonymous"];
                let bits = ev["payload"]["event"]["bits"];
                let message = ev["payload"]["event"]["message"];
                for (let listener of this.#listeners.cheer)
                    listener({
                        user_name: anonymous ? "anonymous" : user_name,
                        bits: bits,
                        message: message,
                    });
                return;
            }
            case EVENT_TYPE.RAID: {
                let from = ev["payload"]["event"]["from_broadcaster_user_name"];
                let viewers = ev["payload"]["event"]["viewers"];
                for (let listener of this.#listeners.raid)
                    listener({ from: from, viewers: viewers });
                return;
            }
            case EVENT_TYPE.REDEEM: {
                let reward_name = ev["payload"]["event"]["reward"]["title"];
                for (let listener of this.#listeners.redeem)
                    listener({
                        user_name: user_name,
                        reward_name: reward_name,
                    });
                for (let plugin of Waifu_1.wAIfu.plugins)
                    plugin.onTwitchRedeem(reward_name, user_name);
                return;
            }
            default:
                io_1.IO.warn("ERROR: Twitch EventSub API sent unhandled event.");
                io_1.IO.print(ev);
                return;
        }
    }
}
exports.TwitchEventSubs = TwitchEventSubs;
