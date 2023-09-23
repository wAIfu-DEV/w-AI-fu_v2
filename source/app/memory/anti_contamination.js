"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decontaminateMemory = void 0;
const Waifu_1 = require("../types/Waifu");
function decontaminateMemory(short_term_memory) {
    let array = structuredClone(short_term_memory);
    const samples = [
        "Voices: Hilda, this is a reminder to keep your answer between 5 and 20 words.\nHilda: OK Voices, got it. From now on I will try to keep my answers around this length.\n",
        "Voices: Hi Hilda, just a reminder to not repeat yourself. If you notice you are repeating yourself, please change the subject.\nHilda: Alright, if I notice any repeating I will change the subject."
    ];
    let percentage = (Waifu_1.wAIfu.state?.config.memory.decontamination_percentage.value * 0.01);
    let memory_length = array.length;
    let add_x = Math.floor(memory_length * percentage);
    let add_every_x = Math.floor(memory_length / add_x);
    if (add_x <= 0)
        return array;
    array.unshift(samples[Math.floor(samples.length * Math.random())]);
    add_x -= 1;
    let insert_at = add_every_x + 1;
    while (true) {
        if (add_x <= 0)
            break;
        let sample = samples[Math.floor(samples.length * Math.random())];
        array.splice(insert_at, 0, sample);
        insert_at += add_every_x + 1;
        add_x -= 1;
    }
    return array;
}
exports.decontaminateMemory = decontaminateMemory;
