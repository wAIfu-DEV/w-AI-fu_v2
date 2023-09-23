"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importAuthFromFile_impl = void 0;
const fs = __importStar(require("fs"));
const auth_1 = require("./auth");
const Helper_1 = require("../types/Helper");
const io_1 = require("../io/io");
function importAuthFromFile_impl() {
    let raw_data;
    try {
        raw_data = fs.readFileSync(auth_1.Auth.AUTH_PATH, { encoding: 'utf8' });
    }
    catch (error) {
        io_1.IO.warn('ERROR: Could not read auth.json file.');
        return new auth_1.Auth();
    }
    let json_obj;
    try {
        json_obj = JSON.parse(raw_data);
    }
    catch (error) {
        io_1.IO.warn('ERROR: Could not parse auth.json file.');
        return new auth_1.Auth();
    }
    if ((0, Helper_1.isOfClassDeep)(json_obj, new auth_1.Auth(), { print: true, obj_name: "auth", add_missing_fields: true }) === false) {
        io_1.IO.warn('ERROR: Auth object failed to pass the sanity check.');
        return new auth_1.Auth();
    }
    return json_obj;
}
exports.importAuthFromFile_impl = importAuthFromFile_impl;
