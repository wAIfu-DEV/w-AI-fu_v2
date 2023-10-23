import WebSocket from "ws";
import * as http from "http";
import * as url from "url";
import { wAIfu } from "../types/Waifu";
import { BrowserWindow, app } from "electron";
import { IO } from "../io/io";

type EvListener = () => any;

export class TwitchEventSubs {
    http_server: http.Server | undefined = undefined;
    websocket: WebSocket | null = null;
    HOST_PATH: "127.0.0.1" = "127.0.0.1";
    PORT_TWITCH_AUTH_CALLBACK: 3000 = 3000;

    free() {
        if (this.websocket !== null) {
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

    reconnect_listeners: EvListener[] = [];

    on(event: "reconnect", listener: EvListener): void {
        switch (event) {
            case "reconnect":
                this.reconnect_listeners.push(listener);
                break;
        }
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
            `&redirect_uri=http://localhost:${this.PORT_TWITCH_AUTH_CALLBACK}/callback` +
            `&response_type=token+id_token` +
            `&scope=channel:read:subscriptions+moderator:read:followers+bits:read+openid+channel:manage:redemptions`;

        await app.whenReady();
        let win = new BrowserWindow({
            height: 900,
            width: 900,
            show: false,
        });
        win.on("page-title-updated", (_, title) => {
            if (
                title === "Log In - Twitch" ||
                title === "Twitch - Authorize Application"
            ) {
                win?.show();
            }
        });
        await win.loadURL(redirect_url);
        // cproc.spawn('cmd.exe', ['/C', 'start ' + formated_redirect_url]);
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
        })
            /*.then((response) => {
                response.json().then((json) => {
                    IO.print(json);
                });
            })*/
            .catch((reason) => {
                console.log(reason);
            });
    }

    subscribeToEvents(user_id: string, user_token: string, session_id: string) {
        this.subscribeToEventSub(
            EVENT_TYPE.EVENT_FOLLOW,
            "2",
            { broadcaster_user_id: user_id, moderator_user_id: user_id },
            user_token,
            session_id
        );
        this.subscribeToEventSub(
            EVENT_TYPE.EVENT_SUBSCRIBE,
            "1",
            { broadcaster_user_id: user_id },
            user_token,
            session_id
        );
        this.subscribeToEventSub(
            EVENT_TYPE.EVENT_GIFT_SUB,
            "1",
            { broadcaster_user_id: user_id },
            user_token,
            session_id
        );
        this.subscribeToEventSub(
            EVENT_TYPE.EVENT_BITS,
            "1",
            { broadcaster_user_id: user_id },
            user_token,
            session_id
        );
        this.subscribeToEventSub(
            EVENT_TYPE.EVENT_RAID,
            "1",
            { to_broadcaster_user_id: user_id },
            user_token,
            session_id
        );
        this.subscribeToEventSub(
            EVENT_TYPE.EVENT_REDEEM,
            "1",
            { broadcaster_user_id: user_id },
            user_token,
            session_id
        );
    }

    async connectTwitchEventSub() {
        let app_token = await this.getTwitchAppAccessToken();
        if (app_token === "") {
            IO.warn(
                "Could not connect to Twitch EventSub.\nw-AI-fu will continue without reading follows, subs and bits.\nFollow this tutorial to enable the feature: https://github.com/wAIfu-DEV/w-AI-fu/wiki/Follower,-Subscribers,-Bits-interactions"
            );
            return;
        }
        let user_id = await this.getTwitchUID(
            wAIfu.state!.auth.twitch.channel_name,
            app_token
        );
        if (user_id === "") {
            IO.warn(
                "Could not connect to Twitch EventSub.\nw-AI-fu will continue without reading follows, subs and bits.\nFollow this tutorial to enable the feature: https://github.com/wAIfu-DEV/w-AI-fu/wiki/Follower,-Subscribers,-Bits-interactions"
            );
            return;
        }

        let user_token = "";
        //@ts-ignore
        let user_id_token = "";
        let ws_session_id = "";

        const DEFAULT_EVENTSUB_WS_URL = "wss://eventsub.wss.twitch.tv/ws";
        let latest_eventsub_ws_url = DEFAULT_EVENTSUB_WS_URL;

        let create_ws = (url: string | null = null) => {
            this.websocket = new WebSocket(
                url === null ? DEFAULT_EVENTSUB_WS_URL : url
            );
            let ws = this.websocket;
            ws.on("open", () => {
                const reconnect = (_: string) => {
                    ws.close();
                    for (let listener of this.reconnect_listeners) listener();
                    //setTimeout(() => create_ws(), 0);
                };

                ws.on("ping", () => ws.pong());
                ws.on("message", (data: WebSocket.RawData, _is_bin) => {
                    let obj = JSON.parse(data.toString());

                    const MSG_WELCOME = "session_welcome";
                    const MSG_KEEPALIVE = "session_keepalive";
                    const MSG_RECONNECT = "session_reconnect";
                    const MSG_NOTIFICATION = "notification";

                    const msg_type = obj["metadata"]["message_type"];

                    switch (msg_type) {
                        case MSG_WELCOME: {
                            IO.debug(
                                "Successfully connected to Twitch EventSub WebSocket."
                            );
                            ws_session_id = obj["payload"]["session"]["id"];
                            return;
                        }
                        case MSG_KEEPALIVE: {
                            return;
                        }
                        case MSG_RECONNECT: {
                            IO.warn(
                                "Received reconnection message from Twich EventSub WebSocket."
                            );
                            latest_eventsub_ws_url =
                                obj["payload"]["session"]["reconnect_url"];
                            reconnect(latest_eventsub_ws_url);
                            return;
                        }
                        case MSG_NOTIFICATION: {
                            this.handleTwitchEvent(obj);
                            return;
                        }
                        default:
                            IO.warn("Received unhandled message:", obj);
                            break;
                    }
                });
                ws.on("error", (err: Error) => {
                    IO.warn(
                        "Error: Twitch Events WebSocket experienced an error."
                    );
                    console.log(err);
                    reconnect(latest_eventsub_ws_url);
                });
                ws.on("close", (code: number, reason: Buffer) => {
                    IO.print(
                        `Closed Twitch Events WebSocket with message: ${code} ${reason.toString(
                            "utf8"
                        )}`
                    );
                    this.websocket = null;
                });
            });
        };
        create_ws();

        /** Sent to the callback adress */
        const CALLBACK_LANDING_PAGE = `
        <head>
            <title>redirecting...</title>
        </head>
        <body>
            <script>
                let payload = window.location.hash.replace('#', '');
                fetch('${this.HOST_PATH}:${this.PORT_TWITCH_AUTH_CALLBACK}/token?' + payload)
                .then(() => {
                    window.close();
                });
            </script>
        </body>
        `;

        const validateToken = async () => {
            let req = await fetch("https://id.twitch.tv/oauth2/validate", {
                headers: {
                    Authorization: "OAuth " + user_token,
                },
            });
            if (req.status == 401) {
                IO.warn("Could not validate Twitch User Access Token.");
                wAIfu.state!.command_queue.pushFront("!reload");
            } else {
                IO.debug("Validated Twitch User Access Token.");
            }
            setTimeout(validateToken, 3_600_000); // re-validate in 1h
        };

        this.http_server = http.createServer();
        let server: http.Server | undefined = this.http_server;
        server.listen(this.PORT_TWITCH_AUTH_CALLBACK, this.HOST_PATH, () => {
            const REQUEST_SUCCESS = 200;
            const REQUEST_FAILURE = 400;

            server!.on("request", async (req, res) => {
                if (req.url?.includes("/callback", 0)) {
                    res.statusCode = REQUEST_SUCCESS;
                    res.end(CALLBACK_LANDING_PAGE);
                } else if (req.url?.includes("/token", 0)) {
                    IO.debug("Received Auth token from Twitch API.");
                    let url_query = url.parse(req.url, true).query;
                    user_token = url_query["access_token"]?.toString()!;
                    user_id_token = url_query["id_token"]?.toString()!;
                    await validateToken();
                    this.subscribeToEvents(user_id, user_token, ws_session_id);
                    res.statusCode = REQUEST_SUCCESS;
                    res.end("");
                    server?.close();
                    server = undefined; // Hopefully memory is cleaned
                } else {
                    res.statusCode = REQUEST_FAILURE;
                    res.end("");
                }
            });
        });
        await this.getTwitchUserAccessToken();
    }

    handleTwitchEvent(obj: any) {
        const event_type = obj["metadata"]["subscription_type"];
        const user_name = obj["payload"]["event"]["user_name"];
        switch (event_type) {
            case EVENT_TYPE.EVENT_FOLLOW: {
                wAIfu.state!.command_queue.pushFront(
                    `!say Thank you ${user_name} for following my channel!`
                );
                return;
            }
            case EVENT_TYPE.EVENT_SUBSCRIBE: {
                let was_gifted = obj["payload"]["event"]["is_gift"];
                if (was_gifted === true) return;

                let sub_tier = Number(obj["payload"]["event"]["tier"]) / 1_000;
                wAIfu.state!.command_queue.pushFront(
                    `!say Thank you ${user_name} for your tier ${sub_tier} sub to my channel!`
                );
                return;
            }
            case EVENT_TYPE.EVENT_GIFT_SUB: {
                let anonymous = obj["payload"]["event"]["is_anonymous"];
                let sub_tier = Number(obj["payload"]["event"]["tier"]) / 1_000;
                let total = obj["payload"]["event"]["total"];
                wAIfu.state!.command_queue.pushFront(
                    `!say Thank you ${
                        anonymous ? "anonymous" : user_name
                    } for your ${total} tier ${sub_tier} gifted subs to my channel!`
                );
                return;
            }
            case EVENT_TYPE.EVENT_BITS: {
                let anonymous = obj["payload"]["event"]["is_anonymous"];
                let bits = obj["payload"]["event"]["bits"];
                wAIfu.state!.command_queue.pushFront(
                    `!say Thank you ${
                        anonymous ? "anonymous" : user_name
                    } for the ${bits} bits!`
                );
                return;
            }
            case EVENT_TYPE.EVENT_RAID: {
                let from =
                    obj["payload"]["event"]["from_broadcaster_user_name"];
                wAIfu.state!.memory.addMemory(
                    `[ ${from} has raided the channel with their viewers! ]\n`
                );
                wAIfu.state!.command_queue.pushFront(
                    `!say Thank you ${from} for the raid!`
                );
                return;
            }
            case EVENT_TYPE.EVENT_REDEEM: {
                let from = obj["payload"]["event"]["user_name"];
                let redeem_name = obj["payload"]["event"]["reward"]["title"];
                for (let plugin of wAIfu.plugins)
                    plugin.onTwitchRedeem(redeem_name, from);
                return;
            }
            default:
                IO.warn("ERROR: Twitch EventSub API ");
                IO.print(obj);
                break;
        }
    }
}

enum EVENT_TYPE {
    EVENT_FOLLOW = "channel.follow",
    EVENT_SUBSCRIBE = "channel.subscribe",
    EVENT_GIFT_SUB = "channel.subscription.gift",
    EVENT_BITS = "channel.cheer",
    EVENT_RAID = "channel.raid",
    EVENT_REDEEM = "channel.channel_points_custom_reward_redemption.add",
}
