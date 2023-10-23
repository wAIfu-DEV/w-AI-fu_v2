"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertInArray = void 0;
function insertInArray(item, index, array) {
    if (index >= array.length) {
        array.push(item);
        return;
    }
    if (index <= 0) {
        array.unshift(item);
        return;
    }
    array.splice(index, 0, item);
}
exports.insertInArray = insertInArray;
