"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldMonologue = void 0;
const Waifu_1 = require("../types/Waifu");
function shouldMonologue() {
    let cfg = Waifu_1.wAIfu.state.config;
    if (cfg.behaviour.monologue.value === false)
        return false;
    let rdm = Math.random();
    return (rdm < (cfg.behaviour.monologue_chance_percent.value / 100));
}
exports.shouldMonologue = shouldMonologue;
