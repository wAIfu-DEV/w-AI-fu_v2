"use strict";
/**
 * Script is called from INSTALL.bat
 * Responsible for finding a suitable python install and create a venv
 */

const cproc = require("child_process");
const fs = require("fs");
const nodepath = require("path");

const MINIMUM_PYTHON_VERSION_STR = "3.10.11";
const MINIMUM_PYTHON_VERSION = 310.11;

const MAXIMUM_PYTHON_VERSION_STR = "3.12.1";
const MAXIMUM_PYTHON_VERSION = 312.1;

const SUPPORTED_PY_INSTALL_PATHS = [
    "\\Python310\\",
    "\\Python311\\",
    "\\Python312\\",
];

/**
 * Parses a version string and returns a version as number
 * @param { string } version_string
 * @returns { number }
 */
function parseVersion(version_string) {
    const split = version_string.trim().split(".");
    if (split.length !== 3) {
        console.log("Failed to parse version");
        return 0;
    }
    return Number(split[0]) * 100 + Number(split[1]) + Number(split[2]) * 0.01;
}

/**
 * Checks if python version is within the bounds of allowed versions.
 * @param { number } version
 * @returns { boolean }
 */
function isSuitableVersion(version) {
    const is_suitable = !(
        version > MAXIMUM_PYTHON_VERSION + 0.001 ||
        version < MINIMUM_PYTHON_VERSION - 0.001
    );

    if (!is_suitable) {
        console.log(version, "is not a suitable version.");
    } else {
        console.log(version, "is a suitable version.");
    }

    return is_suitable;
}

/**
 * Gets version from a python install path
 * @param { string } path
 * @returns { number }
 */
function getPythonVersionFromPath(path) {
    let buff;
    try {
        buff = cproc.execSync(`"${path}" --version`);
    } catch {
        console.log("Failed to get version from path:", path);
        return 0;
    }
    let version_str = buff.toString("utf8").replace("Python ", "");
    console.log("Python at path:", path, "is of version:", version_str);
    return parseVersion(version_str);
}

/**
 * Returns a list of all the python install paths listed in the sys env variables
 * @returns { string[] }
 */
function getSysEnvPythonPaths() {
    let buff;
    try {
        buff = cproc.execSync("where python");
    } catch {
        return [];
    }
    let buff_str = buff.toString("utf8");
    console.log(buff_str);
    return buff_str.split(/\r\n|\n/g).filter((val) => val !== "");
}

/**
 *
 * @param { string[] } paths
 * @returns { string | undefined }
 */
function checkSysEnvPython(paths) {
    for (let path of paths) {
        console.log("Checking:", path);
        const version = getPythonVersionFromPath(path);
        if (isSuitableVersion(version)) return path;
    }
    return undefined;
}

/**
 * Checks for python install within this path. Returns path of found python executable or undefined.
 * @param { string } path
 * @returns { string | undefined }
 */
function forceCheckPythonInPath(path) {
    for (let py_path_fragment of SUPPORTED_PY_INSTALL_PATHS) {
        let ppath = path + py_path_fragment + "python.exe";
        const version = getPythonVersionFromPath(ppath);
        if (isSuitableVersion(version)) return ppath;
    }
    return undefined;
}

/**
 * Returns a suitable python install path if found, or undefined if not found.
 * @returns { string | undefined }
 */
function getSuitablePythonPath() {
    // Check for python using sys env variables
    const python_paths = getSysEnvPythonPaths();
    let python_path = undefined;

    if (!python_paths.length) {
        console.log("Could not find any sys env python variables.");
    } else {
        python_path = checkSysEnvPython(python_paths);
        if (python_path) return python_path;
    }

    // Check for python in AppData\Local\
    const LOCAL = process.env["LOCALAPPDATA"] + "\\Programs\\Python";
    console.log("Checking inside:", LOCAL);
    python_path = forceCheckPythonInPath(LOCAL);
    if (python_path) return python_path;

    // Check for python in C:\
    const ROOT = process.env["HOMEDRIVE"];
    console.log("Checking inside:", ROOT);
    python_path = forceCheckPythonInPath(ROOT);
    if (python_path) return python_path;

    // Check for python in AppData\Roaming\
    const ROAMING = process.env["APPDATA"] + "\\Python";
    console.log("Checking inside:", ROAMING);
    python_path = forceCheckPythonInPath(ROAMING);
    if (python_path) return python_path;

    // Check for python in C:\Program Files\
    const PROGFILES = process.env["HOMEDRIVE"] + "\\Program Files";
    console.log("Checking inside:", PROGFILES);
    python_path = forceCheckPythonInPath(PROGFILES);
    if (python_path) return python_path;
}

/**
 * Creates a python venv from a suitable python install path.
 * @param { string } path
 * @returns { boolean }
 */
function createPythonVenv(path) {
    const root = nodepath.resolve("..\\");
    const venv_path = root + "\\venv";

    console.log(venv_path);

    if (fs.existsSync(venv_path)) {
        console.log("Removing existing Python venv");
        fs.rmSync(venv_path, { recursive: true });
    }

    console.log("Creating new Python venv, this may take a while...");
    let result = cproc.spawnSync(path, ["-m", "venv", venv_path]);
    console.log(result.stdout.toString("utf8"));
    console.error(result.stderr.toString("utf8"));

    if (result.error) return false;
    return true;
}

/**
 * Entry point
 */
function main() {
    let path = getSuitablePythonPath();

    if (!path) {
        console.error(
            "Could not find a suitable Pyhton install.",
            "Please download one from the official site: https://www.python.org/downloads/windows/"
        );
        console.error(
            "Note that the supported python versions are:",
            MINIMUM_PYTHON_VERSION_STR,
            "up to",
            MAXIMUM_PYTHON_VERSION_STR
        );
        return 1;
    }

    console.log("Found suitable python path at:", path);
    if (!createPythonVenv(path)) {
        console.error("Python venv creation failed.");
        return 1;
    }
    return 0;
}

process.exitCode = main();
