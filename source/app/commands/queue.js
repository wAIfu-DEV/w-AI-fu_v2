"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandQueue = void 0;
const io_1 = require("../io/io");
class CommandQueue {
    #data = [];
    notEmpty() {
        return this.#data.length !== 0;
    }
    consume() {
        return (this.#data.length > 0)
            ? this.#data.shift()
            : '';
    }
    pushBack(item) {
        io_1.IO.quietPrint(`Added to queue: ${item}`);
        this.#data.push(item);
    }
    pushFront(item) {
        this.#data.unshift(item);
    }
    clear() {
        this.#data = [];
    }
}
exports.CommandQueue = CommandQueue;
