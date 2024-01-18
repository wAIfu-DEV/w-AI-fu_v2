import { wAIfu } from "../types/Waifu";

export function shouldMonologue(): boolean {
    let rdm = Math.random();
    return (
        rdm < wAIfu.state!.config.behaviour.monologue_chance_percent.value / 100
    );
}
