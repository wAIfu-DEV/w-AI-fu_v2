"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkForBadWords = void 0;
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
function checkForBadWords(text) {
    if (Waifu_1.wAIfu.state.config.moderation.filter_bad_words.value === false)
        return null;
    let matched_words = [];
    const low_text = text.toLowerCase().trim();
    for (const bw of Waifu_1.wAIfu.state.bad_words) {
        if (low_text.includes(bw)) {
            matched_words.push(bw);
        }
    }
    if (matched_words.length > 0) {
        io_1.IO.print('Bad words filter matched "' + matched_words.join('","') + '" in\r\n"' + text.trim() + '"');
        return matched_words;
    }
    else
        return null;
}
exports.checkForBadWords = checkForBadWords;
