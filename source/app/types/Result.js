"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Result = void 0;
class Result {
    success;
    value;
    error;
    constructor(success, value, error) {
        this.success = success;
        this.value = value;
        this.error = error;
    }
}
exports.Result = Result;
