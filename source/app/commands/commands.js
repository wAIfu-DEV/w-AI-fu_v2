"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HANDLE_STATUS = exports.COMMAND_TYPE = void 0;
var COMMAND_TYPE;
(function (COMMAND_TYPE) {
    COMMAND_TYPE["SAY"] = "!say";
    COMMAND_TYPE["RESET"] = "!reset";
    COMMAND_TYPE["MEMORY"] = "!memory";
})(COMMAND_TYPE || (exports.COMMAND_TYPE = COMMAND_TYPE = {}));
var HANDLE_STATUS;
(function (HANDLE_STATUS) {
    HANDLE_STATUS[HANDLE_STATUS["HANDLED"] = 0] = "HANDLED";
    HANDLE_STATUS[HANDLE_STATUS["UNHANDLED"] = 1] = "UNHANDLED";
})(HANDLE_STATUS || (exports.HANDLE_STATUS = HANDLE_STATUS = {}));
