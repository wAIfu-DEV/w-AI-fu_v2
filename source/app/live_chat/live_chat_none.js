"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveChatNone = void 0;
const Message_1 = require("../types/Message");
const Result_1 = require("../types/Result");
class LiveChatNone {
    msg_buffer = [];
    prioritized_msg_buffer = [];
    async initialize() { }
    async free() { }
    nextMessage() {
        return new Result_1.Result(false, new Message_1.Message(), null);
    }
    send(_) { }
}
exports.LiveChatNone = LiveChatNone;
