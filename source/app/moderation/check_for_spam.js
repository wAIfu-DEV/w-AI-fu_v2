"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSpamMessage = void 0;
const io_1 = require("../io/io");
function isSpamMessage(text) {
    let result = /([A-Z0-9]| ){20,}|([A-Z0-9a-z]){15,}|(.)\3{5,}|(.*? )\4{2,}/g.test(text);
    if (result === true)
        io_1.IO.print('Spam filter flagged "', text.trim(), '"');
    return result;
}
exports.isSpamMessage = isSpamMessage;
