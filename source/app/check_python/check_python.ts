import * as cproc from "child_process";
import { ENV } from "../types/Waifu";
import { IO } from "../io/io";
import { installPyDepsWithPath } from "./force_install_py_deps";

const SUPPORTED_PY_INSTALL_PATHS = [
    "\\Python309\\",
    "\\Python310\\",
    "\\Python311\\",
    "\\Python312\\",
];

/**
 * Checks for installed python installs, changes `ENV.PYTHON_PATH`
 * @returns success
 */
export function isPythonInstalledPlusSetup(): boolean {
    // Check for python env variable
    try {
        cproc.execSync(`where ${ENV.PYTHON_PATH}`);
        return true;
    } catch (e) {}
    IO.warn("Could not find python env variable, trying with absolute path.");

    // Check for python in AppData\Local\
    const LOCAL = process.env["LOCALAPPDATA"] + "\\Programs\\Python";
    for (let py_path_fragment of SUPPORTED_PY_INSTALL_PATHS) {
        let path = LOCAL + py_path_fragment;
        if (trySetPyInstall(path)) return true;
    }

    // Check for python in C:\
    const ROOT = process.env["HOMEDRIVE"];
    for (let py_path_fragment of SUPPORTED_PY_INSTALL_PATHS) {
        let path = ROOT + py_path_fragment;
        if (trySetPyInstall(path)) return true;
    }

    IO.error(
        'Failed to find a suitable python environment.\nPlease install Python (prefer v3.10.1X) from the official website: https://www.python.org/downloads/windows/\nMake sure to tick "Add python to PATH" during installation.'
    );
    return false;
}

/**
 * Checks for `python.exe` inside of directoty and sets `ENV.PYTHON_PATH` if found.
 * @param directory_path separator-terminated path to the directory containing the executable
 * @returns success
 */
function trySetPyInstall(directory_path: string): boolean {
    try {
        cproc.execSync(`"${directory_path}python.exe" --version`);
        IO.warn(
            `Found viable python install at "${directory_path}",\ndownloading dependencies.`
        );
        ENV.PYTHON_PATH = directory_path + "python.exe";
        installPyDepsWithPath(directory_path + "Scripts\\");
        return true;
    } catch (e) {
        return false;
    }
}
