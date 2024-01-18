"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Auth = void 0;
const import_auth_1 = require("./import_auth");
class Auth {
    "novelai" = {
        mail: "",
        password: "",
    };
    "openai" = {
        token: "",
    };
    "characterai" = {
        token: "",
    };
    "twitch" = {
        channel_name: "",
        oauth_token: "",
        twitchapp_clientid: "",
        twitchapp_secret: "",
    };
    "youtube" = {
        api_key: "",
    };
    "azure" = {
        token: "",
        region: "",
    };
    static AUTH_PATH = process.cwd() + "/userdata/auth/auth.json";
    static importFromFile = import_auth_1.importAuthFromFile_impl;
}
exports.Auth = Auth;
