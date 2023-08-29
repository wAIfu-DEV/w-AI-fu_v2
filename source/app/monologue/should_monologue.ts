import { wAIfu } from "../types/Waifu";

export function shouldMonologue(): boolean {
    let cfg = wAIfu.state.config;
    if (cfg.behaviour.monologue.value === false) return false;
    let rdm = Math.random();
    return (rdm < (cfg.behaviour.monologue_chance_percent.value / 100) );
}