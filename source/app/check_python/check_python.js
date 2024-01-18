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
exports.isPythonInstalledPlusSetup = void 0;
const cproc = __importStar(require("child_process"));
const Waifu_1 = require("../types/Waifu");
const io_1 = require("../io/io");
const force_install_py_deps_1 = require("./force_install_py_deps");
const SUPPORTED_PY_INSTALL_PATHS = [
    "\\Python309\\",
    "\\Python310\\",
    "\\Python311\\",
    "\\Python312\\",
];
function isPythonInstalledPlusSetup() {
    try {
        cproc.execSync(`where ${Waifu_1.ENV.PYTHON_PATH}`);
        return true;
    }
    catch (e) { }
    io_1.IO.warn("Could not find python env variable, trying with absolute path.");
    const LOCAL = process.env["LOCALAPPDATA"] + "\\Programs\\Python";
    for (let py_path_fragment of SUPPORTED_PY_INSTALL_PATHS) {
        let path = LOCAL + py_path_fragment;
        if (trySetPyInstall(path))
            return true;
    }
    const ROOT = process.env["HOMEDRIVE"];
    for (let py_path_fragment of SUPPORTED_PY_INSTALL_PATHS) {
        let path = ROOT + py_path_fragment;
        if (trySetPyInstall(path))
            return true;
    }
    io_1.IO.error('Failed to find a suitable python environment.\nPlease install Python (prefer v3.10.1X) from the official website: https://www.python.org/downloads/windows/\nMake sure to tick "Add python to PATH" during installation.');
    return false;
}
exports.isPythonInstalledPlusSetup = isPythonInstalledPlusSetup;
function trySetPyInstall(directory_path) {
    try {
        cproc.execSync(`"${directory_path}python.exe" --version`);
        io_1.IO.warn(`Found viable python install at "${directory_path}",\ndownloading dependencies.`);
        Waifu_1.ENV.PYTHON_PATH = directory_path + "python.exe";
        (0, force_install_py_deps_1.installPyDepsWithPath)(directory_path + "Scripts\\");
        return true;
    }
    catch (e) {
        return false;
    }
}
