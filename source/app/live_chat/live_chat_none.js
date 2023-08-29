"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveChatNone = void 0;
const Message_1 = require("../types/Message");
const Result_1 = require("../types/Result");
class LiveChatNone {
    async initialize() { }
    async free() { }
    nextMessage() {
        return new Result_1.Result(false, new Message_1.Message(), null);
    }
}
exports.LiveChatNone = LiveChatNone;
