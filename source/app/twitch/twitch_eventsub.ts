import WebSocket from "ws";
import * as http from "http";
import * as url from "url";
import { wAIfu } from "../types/Waifu";
import { BrowserWindow, app } from "electron";
import { IO } from "../io/io";

type EventListener = (ev?: any) => any;
type EventListenerType =
    | "reconnect"
    | "connected"
    | "follow"
    | "subscribe"
    | "subscription_gifted"
    | "cheer"
    | "raid"
    | "channel_points_custom_reward_redemption";

enum EVENT_TYPE {
    FOLLOW = "channel.follow",
    SUBSCRIBE = "channel.subscribe",
    GIFT_SUB = "channel.subscription.gift",
    BITS = "channel.cheer",
    RAID = "channel.raid",
    REDEEM = "channel.channel_points_custom_reward_redemption.add",
}

enum MESSAGE_TYPE {
    WELCOME = "session_welcome",
    KEEPALIVE = "session_keepalive",
    RECONNECT = "session_reconnect",
    NOTIFICATION = "notification",
}

enum REQUEST_STATUS {
    SUCCESS = 200,
    FAILURE = 400,
}

export class TwitchEventSubs {
    http_server?: http.Server | undefined = undefined;
    websocket?: WebSocket = undefined;

    websocket_session_id?: string = undefined;
    user_id?: string = undefined;
    user_token?: string = undefined;
    app_token?: string = undefined;
    user_id_token?: string = undefined;

    free() {
        if (this.websocket !== undefined) {
            if (
                this.websocket.readyState !== WebSocket.CLOSED &&
                this.websocket.readyState !== WebSocket.CLOSING
            ) {
                this.websocket.close();
            }
            this.websocket.removeAllListeners();
        }
        if (this.http_server !== undefined) {
            this.http_server.close();
        }
    }

    #listeners: Record<EventListenerType, Array<EventListener>> = {
        connected: new Array<EventListener>(),
        reconnect: new Array<EventListener>(),
        follow: new Array<EventListener>(),
        subscribe: new Array<EventListener>(),
        subscription_gifted: new Array<EventListener>(),
        cheer: new Array<EventListener>(),
        raid: new Array<EventListener>(),
        channel_points_custom_reward_redemption: new Array<EventListener>(),
    } as const;

    on(event: EventListenerType, listener: EventListener): void {
        this.#listeners[event].push(listener);
    }

    removeAllListeners() {
        for (let arr of Object.values(this.#listeners))
            while (arr.length > 0) arr.pop();
    }

    async getTwitchAppAccessToken(): Promise<string> {
        let req = await fetch(
            `https://id.twitch.tv/oauth2/token` +
                `?client_id=${wAIfu.state!.auth.twitch.twitchapp_clientid}` +
                `&client_secret=${wAIfu.state!.auth.twitch.twitchapp_secret}` +
                `&grant_type=client_credentials`,
            {
                method: "POST",
            }
        );
        let resp = await req.json();
        if (resp["access_token"] === undefined) {
            IO.warn(
                "Failed to get Twitch App Access Token. This may be due to incorrect Twitch App ClientId or Secret."
            );
            return "";
        }
        IO.debug("Obtained Twitch Access Token.");
        return resp["access_token"];
    }

    async getTwitchUserAccessToken(): Promise<void> {
        let redirect_url =
            `https://id.twitch.tv/oauth2/authorize` +
            `?client_id=${wAIfu.state!.auth.twitch.twitchapp_clientid}` +
            `&redirect_uri=http://localhost:3000/callback` +
            `&response_type=token+id_token` +
            `&scope=channel:read:subscriptions+moderator:read:followers+bits:read+openid+channel:manage:redemptions`;

        await app.whenReady();
        let win = new BrowserWindow({
            height: 900,
            width: 900,
            show: false,
        });
        await win.loadURL(redirect_url);
        win.on("page-title-updated", (_, title) => {
            if (title !== "redirecting...") win?.show();
        });
    }

    async getTwitchUID(login: string, app_token: string): Promise<string> {
        let req = await fetch(
            `https://api.twitch.tv/helix/users?login=${login}`,
            {
                method: "GET",
                headers: {
                    Authorization: "Bearer " + app_token,
                    "Client-Id": wAIfu.state!.auth.twitch.twitchapp_clientid,
                },
            }
        );
        let resp = await req.json();
        if (resp["data"][0]["id"] !== undefined) {
            IO.debug("Obtained Twitch UID.");
            return resp["data"][0]["id"];
        } else {
            IO.warn("Failed to get get Twitch UID.");
            return "";
        }
    }

    subscribeToEventSub(
        event_name: string,
        version: string,
        condition: any = {},
        user_token: string,
        session_id: string
    ): void {
        fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + user_token,
                "Client-Id": wAIfu.state!.auth.twitch.twitchapp_clientid,
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
                    IO.warn("Could not subscribe to Twitch event:", event_name);
                    IO.warn(json);
                }
            });
        });
    }

    subscribeToEvents(user_id: string, user_token: string, session_id: string) {
        this.subscribeToEventSub(
            EVENT_TYPE.FOLLOW,
            "2",
            { broadcaster_user_id: user_id, moderator_user_id: user_id },
            user_token,
            session_id
        );
        this.subscribeToEventSub(
            EVENT_TYPE.SUBSCRIBE,
            "1",
            { broadcaster_user_id: user_id },
            user_token,
            session_id
        );
        this.subscribeToEventSub(
            EVENT_TYPE.GIFT_SUB,
            "1",
            { broadcaster_user_id: user_id },
            user_token,
            session_id
        );
        this.subscribeToEventSub(
            EVENT_TYPE.BITS,
            "1",
            { broadcaster_user_id: user_id },
            user_token,
            session_id
        );
        this.subscribeToEventSub(
            EVENT_TYPE.RAID,
            "1",
            { to_broadcaster_user_id: user_id },
            user_token,
            session_id
        );
        this.subscribeToEventSub(
            EVENT_TYPE.REDEEM,
            "1",
            { broadcaster_user_id: user_id },
            user_token,
            session_id
        );
    }

    reconnectTwitchEventSubWebsocket() {
        if (this.websocket !== undefined) this.websocket.close();
        for (let listener of this.#listeners.reconnect) listener();
    }

    handleEventSubMessage(data: WebSocket.RawData, _is_bin: any) {
        let obj = JSON.parse(data.toString());
        const msg_type = obj["metadata"]["message_type"];

        switch (msg_type) {
            case MESSAGE_TYPE.WELCOME: {
                IO.debug(
                    "Successfully connected to Twitch EventSub WebSocket."
                );
                this.websocket_session_id = obj["payload"]["session"]["id"];
                return;
            }
            case MESSAGE_TYPE.KEEPALIVE: {
                return;
            }
            case MESSAGE_TYPE.RECONNECT: {
                IO.warn(
                    "Received reconnection message from Twich EventSub WebSocket."
                );
                this.reconnectTwitchEventSubWebsocket();
                return;
            }
            case MESSAGE_TYPE.NOTIFICATION: {
                this.handleTwitchEvent(obj);
                return;
            }
            default:
                IO.warn("Received unhandled message:", obj);
                break;
        }
    }

    async createTwitchEventSubWebsocket(url: string | null) {
        this.websocket = new WebSocket(
            url === null ? "wss://eventsub.wss.twitch.tv/ws" : url
        );
        let ws = this.websocket;

        ws.on("open", () => {
            ws.on("ping", () => ws.pong());
            ws.on("message", (data, _) => this.handleEventSubMessage(data, _));
            ws.on("error", (err: Error) => {
                IO.warn("Error: Twitch Events WebSocket experienced an error.");
                console.log(err);
                this.reconnectTwitchEventSubWebsocket();
            });
            ws.on("close", (code: number, reason: Buffer) => {
                IO.print(
                    `Closed Twitch Events WebSocket with message: ${code} ${reason.toString(
                        "utf8"
                    )}`
                );
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
            IO.warn("Could not validate Twitch User Access Token.");
            wAIfu.state!.command_queue.pushFront("!reload");
        } else {
            IO.debug("Validated Twitch User Access Token.");
        }
        setTimeout(() => {
            this.validateUserToken();
        }, 3_600_000); // re-validate in 1h
    }

    async handleServerRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse<http.IncomingMessage>
    ) {
        if (req.url?.includes("/callback", 0)) {
            res.statusCode = REQUEST_STATUS.SUCCESS;
            res.end(
                `<head>
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
                </body>`
            );
            return;
        } else if (req.url?.includes("/token", 0)) {
            IO.debug("Received Auth token from Twitch API.");

            let url_query = url.parse(req.url, true).query;
            this.user_token = url_query["access_token"]?.toString()!;
            this.user_id_token = url_query["id_token"]?.toString()!;

            await this.validateUserToken();

            if (this.websocket_session_id === undefined) {
                IO.warn(
                    "ERROR: Received Auth token before WebSocket session ID."
                );
                return;
            }

            if (this.user_id === undefined) {
                IO.warn("ERROR: user_id is undefined.");
                return;
            }

            this.subscribeToEvents(
                this.user_id,
                this.user_token,
                this.websocket_session_id!
            );

            res.statusCode = REQUEST_STATUS.SUCCESS;
            res.end("");
            this.http_server?.close();
            this.http_server = undefined;
            return;
        } else {
            res.statusCode = REQUEST_STATUS.FAILURE;
            res.end("");
        }
    }

    async initialize() {
        this.app_token = await this.getTwitchAppAccessToken();
        if (this.app_token === "" || this.app_token === undefined) {
            IO.warn(
                "Could not connect to Twitch EventSub.\nw-AI-fu will continue without reading follows, subs and bits.\nFollow this tutorial to enable the feature: https://github.com/wAIfu-DEV/w-AI-fu/wiki/Follower,-Subscribers,-Bits-interactions"
            );
            return;
        }

        this.user_id = await this.getTwitchUID(
            wAIfu.state!.auth.twitch.channel_name,
            this.app_token
        );
        if (this.user_id === "" || this.user_id === undefined) {
            IO.warn(
                "Could not connect to Twitch EventSub.\nw-AI-fu will continue without reading follows, subs and bits.\nFollow this tutorial to enable the feature: https://github.com/wAIfu-DEV/w-AI-fu/wiki/Follower,-Subscribers,-Bits-interactions"
            );
            return;
        }

        this.createTwitchEventSubWebsocket(null);

        this.http_server = http.createServer();
        let server = this.http_server;
        server.listen(3000, "127.0.0.1", () => {
            server!.on("request", (req, res) =>
                this.handleServerRequest(req, res)
            );
        });

        await this.getTwitchUserAccessToken();
    }

    handleTwitchEvent(ev: any) {
        const event_type = ev["metadata"]["subscription_type"];
        const user_name = ev["payload"]["event"]["user_name"];
        switch (event_type) {
            case EVENT_TYPE.FOLLOW: {
                for (let listener of this.#listeners.follow)
                    listener({ user_name: user_name });

                wAIfu.state!.command_queue.pushFront(
                    `!say Thank you ${user_name} for following my channel!`
                );
                return;
            }
            case EVENT_TYPE.SUBSCRIBE: {
                let was_gifted = ev["payload"]["event"]["is_gift"];
                if (was_gifted === true) return;

                let sub_tier = Number(ev["payload"]["event"]["tier"]) / 1_000;

                for (let listener of this.#listeners.subscribe)
                    listener({ user_name: user_name, tier: sub_tier });

                wAIfu.state!.command_queue.pushFront(
                    `!say Thank you ${user_name} for your tier ${sub_tier} sub to my channel!`
                );
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

                wAIfu.state!.command_queue.pushFront(
                    `!say Thank you ${
                        anonymous ? "anonymous" : user_name
                    } for your ${total} tier ${sub_tier} gifted subs to my channel!`
                );
                return;
            }
            case EVENT_TYPE.BITS: {
                let anonymous = ev["payload"]["event"]["is_anonymous"];
                let bits = ev["payload"]["event"]["bits"];

                for (let listener of this.#listeners.cheer)
                    listener({ user_name: user_name, bits: bits });

                wAIfu.state!.command_queue.pushFront(
                    `!say Thank you ${
                        anonymous ? "anonymous" : user_name
                    } for the ${bits} bits!`
                );
                return;
            }
            case EVENT_TYPE.RAID: {
                let from = ev["payload"]["event"]["from_broadcaster_user_name"];
                let viewers = ev["payload"]["event"]["viewers"];

                for (let listener of this.#listeners.raid)
                    listener({ from: from, viewers: viewers });

                wAIfu.state!.memory.addMemory(
                    `[ ${from} has raided the channel with their viewers! ]\n`
                );
                wAIfu.state!.command_queue.pushFront(
                    `!say Thank you ${from} for the raid!`
                );
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

                for (let plugin of wAIfu.plugins)
                    plugin.onTwitchRedeem(redeem_name, user_name);
                return;
            }
            default:
                IO.warn("ERROR: Twitch EventSub API sent unhandled event.");
                IO.print(ev);
                return;
        }
    }
}
