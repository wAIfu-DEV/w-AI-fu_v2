"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preventFreakout = void 0;
const io_1 = require("../io/io");
const check_for_spam_1 = require("../moderation/check_for_spam");
function preventFreakout(text) {
    let ret_val = text;
    let modified = false;
    const regex = /(.)\1{3,}/g;
    let results = text.matchAll(regex);
    for (let match of results) {
        ret_val = ret_val.replace(match[0], match[1] + match[1] + match[1]);
        modified = true;
    }
    if ((0, check_for_spam_1.isSpamMessage)(text) === true) {
        ret_val = ret_val.toLowerCase();
        modified = true;
    }
    if (modified === true) {
        io_1.IO.print('Freakout prevention replaced "', text, '" with "', ret_val, '"');
    }
    return ret_val;
}
exports.preventFreakout = preventFreakout;
