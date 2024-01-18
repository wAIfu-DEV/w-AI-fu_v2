import { IO } from "../io/io";
import { wAIfu } from "../types/Waifu";

export function shouldUseEventSub(): boolean {
    if (wAIfu.state?.config.live_chat.livestream_platform.value !== "twitch")
        return false;

    if (
        wAIfu.state?.auth.twitch.twitchapp_clientid === "" ||
        wAIfu.state?.auth.twitch.twitchapp_secret === ""
    ) {
        IO.warn(
            "Could not connect to Twitch EventSub.\nw-AI-fu will continue without reading follows, subs and bits.\nFollow this tutorial to enable the feature: https://github.com/wAIfu-DEV/w-AI-fu/wiki/Follower,-Subscribers,-Bits-interactions"
        );
        return false;
    }
    return true;
}
