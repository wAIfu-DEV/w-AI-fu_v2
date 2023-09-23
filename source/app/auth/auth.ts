import { importAuthFromFile_impl } from "./import_auth";

export class Auth {
    "novelai" = {
        "mail": "",
        "password": ""
    };
    "openai" = {
        "token": ""
    };
    "characterai" = {
        "token": ""
    }
    "twitch" = {
        "channel_name": "",
        "oauth_token": "",
        "twitchapp_clientid": "",
        "twitchapp_secret": ""
    };

    static AUTH_PATH = process.cwd() + "/userdata/auth/auth.json";

    static importFromFile: (() => Auth) = importAuthFromFile_impl;
}