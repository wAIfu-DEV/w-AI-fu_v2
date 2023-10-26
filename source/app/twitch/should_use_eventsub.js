"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldUseEventSub = void 0;
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
function shouldUseEventSub() {
    if (Waifu_1.wAIfu.state?.config.live_chat.livestream_platform.value !== "twitch")
        return false;
    if (Waifu_1.wAIfu.state?.auth.twitch.twitchapp_clientid === "" ||
        Waifu_1.wAIfu.state?.auth.twitch.twitchapp_secret === "") {
        io_1.IO.warn("Could not connect to Twitch EventSub.\nw-AI-fu will continue without reading follows, subs and bits.\nFollow this tutorial to enable the feature: https://github.com/wAIfu-DEV/w-AI-fu/wiki/Follower,-Subscribers,-Bits-interactions");
        return false;
    }
    return true;
}
exports.shouldUseEventSub = shouldUseEventSub;
