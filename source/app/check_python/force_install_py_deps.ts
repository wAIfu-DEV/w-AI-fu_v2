import * as cproc from "child_process";

export function installPyDepsWithPath(directory_path: string): void {
    const PIP_PATH = directory_path + "pip.exe";
    cproc.execSync(
        `"${PIP_PATH}" install -r "${process.cwd()}\\install\\requirements.txt"`
    );
}
