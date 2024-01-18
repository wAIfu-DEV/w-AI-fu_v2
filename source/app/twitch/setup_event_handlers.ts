import { IO } from "../io/io";
import { wAIfu } from "../types/Waifu";
import { TwitchEventSubs } from "./twitch_eventsub";

export function setupTwitchEventSubListeners(eventsub: TwitchEventSubs) {
    eventsub.on("follow", (ev) => {
        if (wAIfu.state!.config.twitch.thank_new_followers.value === false)
            return;

        IO.print(`Twitch: ${ev.user_name} followed.`);

        const template =
            wAIfu.state!.config.twitch.follower_thanking_template.value;

        wAIfu.state!.command_queue.pushFront(
            `!say ${template.replaceAll("<USER>", ev.user_name)}`
        );
    });

    eventsub.on("subscribe", (ev) => {
        if (wAIfu.state!.config.twitch.thank_new_subscribtions.value === false)
            return;

        IO.print(`Twitch: ${ev.user_name} subscribed with tier ${ev.tier}.`);

        const template =
            wAIfu.state!.config.twitch.subscriber_thanking_template.value;

        wAIfu.state!.command_queue.pushFront(
            `!say ${template
                .replaceAll("<USER>", ev.user_name)
                .replaceAll("<TIER>", ev.tier.toString())}`
        );
    });

    eventsub.on("sub_message", (ev) => {
        if (wAIfu.state!.config.live_chat.read_live_chat.value === false)
            return;

        IO.print(
            `Twitch: ${ev.user_name} sent a message with their subscription.`
        );

        wAIfu.dependencies?.live_chat.prioritized_msg_buffer.push({
            sender: ev.user_name,
            content: ev.message,
            trusted: false,
        });
    });

    eventsub.on("gifted_sub", (ev) => {
        if (wAIfu.state!.config.twitch.thank_new_subscribtions.value === false)
            return;

        IO.print(
            `Twitch: ${ev.user_name} gifted ${ev.amount} tier ${ev.tier} subs.`
        );

        const template =
            wAIfu.state!.config.twitch.gifted_sub_thanking_template.value;

        wAIfu.state!.command_queue.pushFront(
            `!say ${template
                .replaceAll("<USER>", ev.user_name)
                .replaceAll("<AMOUNT>", ev.amount.toString())
                .replaceAll("<TIER>", ev.tier.toString())}`
        );
    });

    eventsub.on("cheer", (ev) => {
        if (wAIfu.state!.config.twitch.thank_new_cheers.value === false) return;

        const is_under_required =
            ev.bits <
            wAIfu.state!.config.twitch.minimum_cheer_amount_reaction.value;

        if (is_under_required) return;

        IO.print(`Twitch: ${ev.user_name} cheered ${ev.bits} bits.`);

        const template =
            wAIfu.state!.config.twitch.cheer_thanking_template.value;

        wAIfu.state!.command_queue.pushFront(
            `!say ${template
                .replaceAll("<USER>", ev.user_name)
                .replaceAll("<AMOUNT>", ev.bits.toString())}`
        );

        if (wAIfu.state!.config.live_chat.read_live_chat.value === false)
            return;

        IO.print(`Twitch: ${ev.user_name} sent a message with their bits.`);

        const message_without_bits = ev.message.replaceAll(/Cheer[0-9]+/g, "");

        wAIfu.dependencies?.live_chat.prioritized_msg_buffer.push({
            sender: ev.user_name,
            content: message_without_bits,
            trusted: false,
        });
    });

    eventsub.on("raid", (ev) => {
        if (wAIfu.state!.config.twitch.thank_raids.value === false) return;

        const is_under_required =
            ev.viewers <
            wAIfu.state!.config.twitch.minimum_raid_viewers_amount_reaction
                .value;

        if (is_under_required) return;

        IO.print(`Twitch: ${ev.from} raided with ${ev.viewers} viewers.`);

        const template =
            wAIfu.state!.config.twitch.raid_thanking_template.value;

        wAIfu.state!.command_queue.pushFront(
            `!say ${template
                .replaceAll("<FROM>", ev.from)
                .replaceAll("<VIEWERS>", ev.viewers.toString())}`
        );
    });

    eventsub.on("reconnect", () => {
        IO.print("Reconnected to Twitch EventSub API.");
    });
    /* // Works, just not really needed.
    eventsub.on("redeem", (ev) => {
        IO.print(`Twitch: ${ev.user_name} redeemed "${ev.reward_name}".`);
    });*/
}
