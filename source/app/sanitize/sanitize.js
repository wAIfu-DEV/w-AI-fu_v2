"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeNovelAIspecialSymbols = void 0;
function removeNovelAIspecialSymbols(text) {
    let rgx = /\*\*\*|⁂|{ | }|\[ | \]|----|======|─|##/g;
    return text.replaceAll(rgx, '');
}
exports.removeNovelAIspecialSymbols = removeNovelAIspecialSymbols;
