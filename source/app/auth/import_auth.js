"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importAuthFromFile_impl = void 0;
const auth_1 = require("./auth");
const Helper_1 = require("../types/Helper");
const io_1 = require("../io/io");
const file_system_1 = require("../file_system/file_system");
function importAuthFromFile_impl() {
    let parse_result = (0, file_system_1.readParseJSON)(auth_1.Auth.AUTH_PATH);
    if (parse_result.success === false) {
        io_1.IO.warn("ERROR: Could not import auth infos.");
        return new auth_1.Auth();
    }
    let json_obj = parse_result.value;
    if ((0, Helper_1.isOfClassDeep)(json_obj, new auth_1.Auth(), {
        print: true,
        obj_name: "auth",
        add_missing_fields: true,
    }) === false) {
        io_1.IO.warn("ERROR: Auth object failed to pass the sanity check.");
        return new auth_1.Auth();
    }
    return json_obj;
}
exports.importAuthFromFile_impl = importAuthFromFile_impl;
