"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersion_impl = void 0;
const file_system_1 = require("../file_system/file_system");
function getVersion_impl() {
    const PACKAGE_PATH = process.cwd() + '/package.json';
    return (0, file_system_1.readParseAs)(PACKAGE_PATH, new Package()).version;
}
exports.getVersion_impl = getVersion_impl;
class Package {
    version = "";
}
