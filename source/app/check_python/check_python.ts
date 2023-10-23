import * as cproc from "child_process";
import { ENV } from "../types/Waifu";
import { IO } from "../io/io";

export function checkPythonInstall(): boolean {
    try {
        cproc.execSync(`where ${ENV.PYTHON_PATH}`);
        return true;
    } catch (e) {}

    IO.debug("Could not find python env variable, trying with absolute path.");

    try {
        let local = process.env["LOCALAPPDATA"];
        let path = local + "\\Programs\\Python\\Python310\\python.exe";
        cproc.execSync(`"${path}" --version`);
        ENV.PYTHON_PATH = path;
        return true;
    } catch (e) {}

    IO.error(
        'Failed to find a suitable python environment.\nPlease install Python (prefer v3.10.1X) from the official website: https://www.python.org/downloads/windows/\nMake sure to tick "Add python to PATH" during installation.'
    );

    return false;
}
