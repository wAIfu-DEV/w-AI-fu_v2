"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTwitchEventSubListeners = void 0;
const io_1 = require("../io/io");
const Waifu_1 = require("../types/Waifu");
function setupTwitchEventSubListeners(eventsub) {
    eventsub.on("follow", (ev) => {
        if (Waifu_1.wAIfu.state.config.twitch.thank_new_followers.value === false)
            return;
        io_1.IO.print(`Twitch: ${ev.user_name} followed.`);
        const template = Waifu_1.wAIfu.state.config.twitch.follower_thanking_template.value;
        Waifu_1.wAIfu.state.command_queue.pushFront(`!say ${template.replaceAll("<USER>", ev.user_name)}`);
    });
    eventsub.on("subscribe", (ev) => {
        if (Waifu_1.wAIfu.state.config.twitch.thank_new_subscribtions.value === false)
            return;
        io_1.IO.print(`Twitch: ${ev.user_name} subscribed with tier ${ev.tier}.`);
        const template = Waifu_1.wAIfu.state.config.twitch.subscriber_thanking_template.value;
        Waifu_1.wAIfu.state.command_queue.pushFront(`!say ${template
            .replaceAll("<USER>", ev.user_name)
            .replaceAll("<TIER>", ev.tier.toString())}`);
    });
    eventsub.on("sub_message", (ev) => {
        if (Waifu_1.wAIfu.state.config.live_chat.read_live_chat.value === false)
            return;
        io_1.IO.print(`Twitch: ${ev.user_name} sent a message with their subscription.`);
        Waifu_1.wAIfu.dependencies?.live_chat.prioritized_msg_buffer.push({
            sender: ev.user_name,
            content: ev.message,
            trusted: false,
        });
    });
    eventsub.on("gifted_sub", (ev) => {
        if (Waifu_1.wAIfu.state.config.twitch.thank_new_subscribtions.value === false)
            return;
        io_1.IO.print(`Twitch: ${ev.user_name} gifted ${ev.amount} tier ${ev.tier} subs.`);
        const template = Waifu_1.wAIfu.state.config.twitch.gifted_sub_thanking_template.value;
        Waifu_1.wAIfu.state.command_queue.pushFront(`!say ${template
            .replaceAll("<USER>", ev.user_name)
            .replaceAll("<AMOUNT>", ev.amount.toString())
            .replaceAll("<TIER>", ev.tier.toString())}`);
    });
    eventsub.on("cheer", (ev) => {
        if (Waifu_1.wAIfu.state.config.twitch.thank_new_cheers.value === false)
            return;
        const is_under_required = ev.bits <
            Waifu_1.wAIfu.state.config.twitch.minimum_cheer_amount_reaction.value;
        if (is_under_required)
            return;
        io_1.IO.print(`Twitch: ${ev.user_name} cheered ${ev.bits} bits.`);
        const template = Waifu_1.wAIfu.state.config.twitch.cheer_thanking_template.value;
        Waifu_1.wAIfu.state.command_queue.pushFront(`!say ${template
            .replaceAll("<USER>", ev.user_name)
            .replaceAll("<AMOUNT>", ev.bits.toString())}`);
        if (Waifu_1.wAIfu.state.config.live_chat.read_live_chat.value === false)
            return;
        io_1.IO.print(`Twitch: ${ev.user_name} sent a message with their bits.`);
        const message_without_bits = ev.message.replaceAll(/Cheer[0-9]+/g, "");
        Waifu_1.wAIfu.dependencies?.live_chat.prioritized_msg_buffer.push({
            sender: ev.user_name,
            content: message_without_bits,
            trusted: false,
        });
    });
    eventsub.on("raid", (ev) => {
        if (Waifu_1.wAIfu.state.config.twitch.thank_raids.value === false)
            return;
        const is_under_required = ev.viewers <
            Waifu_1.wAIfu.state.config.twitch.minimum_raid_viewers_amount_reaction
                .value;
        if (is_under_required)
            return;
        io_1.IO.print(`Twitch: ${ev.from} raided with ${ev.viewers} viewers.`);
        const template = Waifu_1.wAIfu.state.config.twitch.raid_thanking_template.value;
        Waifu_1.wAIfu.state.command_queue.pushFront(`!say ${template
            .replaceAll("<FROM>", ev.from)
            .replaceAll("<VIEWERS>", ev.viewers.toString())}`);
    });
    eventsub.on("reconnect", () => {
        io_1.IO.print("Reconnected to Twitch EventSub API.");
    });
}
exports.setupTwitchEventSubListeners = setupTwitchEventSubListeners;
