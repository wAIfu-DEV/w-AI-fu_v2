"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeNonAsciiSymbols = exports.removeNovelAIspecialSymbols = void 0;
function removeNovelAIspecialSymbols(text) {
    let rgx = /\<\|.*\|\>|\*\*\*|⁂|{ | }|\[ | \]|----|======|─|##/g;
    return text.replaceAll(rgx, '');
}
exports.removeNovelAIspecialSymbols = removeNovelAIspecialSymbols;
function removeNonAsciiSymbols(text) {
    let rgx = /[^a-zA-Z0-9 \.\,\'\"\^\?\!\+\-\%\*\=\/\_\:\;\$\€\@\<\>\(\)]/g;
    return text.replaceAll(rgx, '');
}
exports.removeNonAsciiSymbols = removeNonAsciiSymbols;
