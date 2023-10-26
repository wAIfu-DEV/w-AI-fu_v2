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
        subscription_gifted: new Array(),
        cheer: new Array(),
        raid: new Array(),
        channel_points_custom_reward_redemption: new Array(),
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
            `&scope=channel:read:subscriptions+moderator:read:followers+bits:read+openid+channel:manage:redemptions`;
        await electron_1.app.whenReady();
        let win = new electron_1.BrowserWindow({
            height: 900,
            width: 900,
            show: false,
        });
        await win.loadURL(redirect_url);
        win.on("page-title-updated", (_, title) => {
            if (title !== "redirecting...")
                win?.show();
        });
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
        this.subscribeToEventSub(EVENT_TYPE.GIFT_SUB, "1", { broadcaster_user_id: user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.BITS, "1", { broadcaster_user_id: user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.RAID, "1", { to_broadcaster_user_id: user_id }, user_token, session_id);
        this.subscribeToEventSub(EVENT_TYPE.REDEEM, "1", { broadcaster_user_id: user_id }, user_token, session_id);
    }
    reconnectTwitchEventSubWebsocket() {
        if (this.websocket !== undefined)
            this.websocket.close();
        for (let listener of this.#listeners.reconnect)
            listener();
    }
    handleEventSubMessage(data, _is_bin) {
        let obj = JSON.parse(data.toString());
        const msg_type = obj["metadata"]["message_type"];
        switch (msg_type) {
            case MESSAGE_TYPE.WELCOME: {
                io_1.IO.debug("Successfully connected to Twitch EventSub WebSocket.");
                this.websocket_session_id = obj["payload"]["session"]["id"];
                return;
            }
            case MESSAGE_TYPE.KEEPALIVE: {
                return;
            }
            case MESSAGE_TYPE.RECONNECT: {
                io_1.IO.warn("Received reconnection message from Twich EventSub WebSocket.");
                this.reconnectTwitchEventSubWebsocket();
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
    async createTwitchEventSubWebsocket(url) {
        this.websocket = new ws_1.default(url === null ? "wss://eventsub.wss.twitch.tv/ws" : url);
        let ws = this.websocket;
        ws.on("open", () => {
            ws.on("ping", () => ws.pong());
            ws.on("message", (data, _) => this.handleEventSubMessage(data, _));
            ws.on("error", (err) => {
                io_1.IO.warn("Error: Twitch Events WebSocket experienced an error.");
                console.log(err);
                this.reconnectTwitchEventSubWebsocket();
            });
            ws.on("close", (code, reason) => {
                io_1.IO.print(`Closed Twitch Events WebSocket with message: ${code} ${reason.toString("utf8")}`);
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
        this.createTwitchEventSubWebsocket(null);
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
        switch (event_type) {
            case EVENT_TYPE.FOLLOW: {
                for (let listener of this.#listeners.follow)
                    listener({ user_name: user_name });
                Waifu_1.wAIfu.state.command_queue.pushFront(`!say Thank you ${user_name} for following my channel!`);
                return;
            }
            case EVENT_TYPE.SUBSCRIBE: {
                let was_gifted = ev["payload"]["event"]["is_gift"];
                if (was_gifted === true)
                    return;
                let sub_tier = Number(ev["payload"]["event"]["tier"]) / 1_000;
                for (let listener of this.#listeners.subscribe)
                    listener({ user_name: user_name, tier: sub_tier });
                Waifu_1.wAIfu.state.command_queue.pushFront(`!say Thank you ${user_name} for your tier ${sub_tier} sub to my channel!`);
                return;
            }
            case EVENT_TYPE.GIFT_SUB: {
                let anonymous = ev["payload"]["event"]["is_anonymous"];
                let sub_tier = Number(ev["payload"]["event"]["tier"]) / 1_000;
                let total = ev["payload"]["event"]["total"];
                for (let listener of this.#listeners.subscribe)
                    listener({
                        user_name: user_name,
                        tier: sub_tier,
                        amount: total,
                    });
                Waifu_1.wAIfu.state.command_queue.pushFront(`!say Thank you ${anonymous ? "anonymous" : user_name} for your ${total} tier ${sub_tier} gifted subs to my channel!`);
                return;
            }
            case EVENT_TYPE.BITS: {
                let anonymous = ev["payload"]["event"]["is_anonymous"];
                let bits = ev["payload"]["event"]["bits"];
                for (let listener of this.#listeners.cheer)
                    listener({ user_name: user_name, bits: bits });
                Waifu_1.wAIfu.state.command_queue.pushFront(`!say Thank you ${anonymous ? "anonymous" : user_name} for the ${bits} bits!`);
                return;
            }
            case EVENT_TYPE.RAID: {
                let from = ev["payload"]["event"]["from_broadcaster_user_name"];
                let viewers = ev["payload"]["event"]["viewers"];
                for (let listener of this.#listeners.raid)
                    listener({ from: from, viewers: viewers });
                Waifu_1.wAIfu.state.memory.addMemory(`[ ${from} has raided the channel with their viewers! ]\n`);
                Waifu_1.wAIfu.state.command_queue.pushFront(`!say Thank you ${from} for the raid!`);
                return;
            }
            case EVENT_TYPE.REDEEM: {
                let redeem_name = ev["payload"]["event"]["reward"]["title"];
                for (let listener of this.#listeners
                    .channel_points_custom_reward_redemption)
                    listener({
                        user_name: user_name,
                        redeem_name: redeem_name,
                    });
                for (let plugin of Waifu_1.wAIfu.plugins)
                    plugin.onTwitchRedeem(redeem_name, user_name);
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
