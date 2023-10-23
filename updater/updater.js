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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const cproc = __importStar(require("child_process"));
const extract_zip_1 = __importDefault(require("extract-zip"));
const CWD = process.cwd();
const TMP = CWD + "/tmp";
const LOG_FILE = TMP + "/update_log.txt";
process.on("uncaughtException", (e) => {
    log(e.stack);
});
process.on("warning", (e) => {
    log(e.stack);
});
function log(...args) {
    console.log(args.join(" "));
    fs.appendFileSync(LOG_FILE, args.join(" "));
}
function silentLog(...args) {
    fs.appendFileSync(LOG_FILE, args.join(" "));
}
function logWarn(...args) {
    console.warn(args.join(" "));
    fs.appendFileSync(LOG_FILE, args.join(" "));
}
function logErr(...args) {
    console.error(args.join(" "));
    fs.appendFileSync(LOG_FILE, args.join(" "));
}
function printProgress(percent = 0, step_name) {
    let buff = "".padStart(Math.round(percent * 35), "#").padEnd(35, " ");
    process.stdout.write("\r                                                               ");
    process.stdout.write("\r[" + buff + "] " + Math.round(percent * 100).toString() + "%");
    process.stdout.write(" : " + step_name);
}
function createTempFolder() {
    if (fs.existsSync(TMP) === false) {
        fs.mkdirSync(TMP);
    }
    fs.writeFileSync(LOG_FILE, "");
}
async function unzip(zip_file_path, to_directory) {
    try {
        await (0, extract_zip_1.default)(zip_file_path, { dir: to_directory });
        return true;
    }
    catch (e) {
        logErr(`Error: Could not unzip file ${zip_file_path} to directory ${to_directory}\n`);
        console.error(e);
        return false;
    }
}
async function update() {
    console.log("w-AI-fu V2 Updater\n");
    console.log("Updating...");
    printProgress(0, "Creating tmp folder");
    createTempFolder();
    silentLog("Created tmp folder\n");
    printProgress(0.1, "Downloading archive");
    let query;
    try {
        query = await fetch("https://github.com/wAIfu-DEV/w-AI-fu_v2/releases/latest/download/w-AI-fu_v2.zip");
    }
    catch (e) {
        logWarn("\nError: Could not contact github while trying to download w-AI-fu.\n");
        return;
    }
    silentLog("Downloaded archive\n");
    printProgress(0.2, "Reading archive");
    let arbuff;
    try {
        arbuff = await query.arrayBuffer();
    }
    catch (e) {
        logWarn("\nError: Could not read received data from github while trying to download w-AI-fu.\n");
        return;
    }
    silentLog("Read archive\n");
    printProgress(0.3, "Buffering archive");
    const buff = Buffer.from(arbuff);
    silentLog("Buffered archive\n");
    printProgress(0.4, "Writing archive");
    fs.writeFileSync(TMP + "/temp.zip", buff);
    silentLog("Wrote archive to disk\n");
    printProgress(0.5, "Copying userdata");
    if (fs.existsSync(TMP + "/userdata") === false) {
        fs.mkdirSync(TMP + "/userdata");
    }
    fs.cpSync(CWD + "/userdata", TMP + "/userdata", {
        recursive: true,
        force: true,
    });
    silentLog("Copied userdata\n");
    printProgress(0.6, "Removing old files");
    try {
        let contents = fs.readdirSync(CWD);
        for (let path of contents) {
            if (path === "tmp")
                continue;
            fs.rmSync(CWD + "/" + path, { recursive: true, force: true });
        }
    }
    catch (e) {
        logErr('\nCritical Error: Could not remove some files while updating, total reinstallation might be required. User data such as characters and scripts will be present in the "tmp" directory.\n');
        return;
    }
    silentLog("Removed old files\n");
    printProgress(0.7, "Unzipping archive");
    await unzip(TMP + "/temp.zip", CWD);
    silentLog("Unzipped archive\n");
    printProgress(0.8, "Restoring userdata");
    fs.cpSync(TMP + "/userdata", CWD + "/userdata", {
        recursive: true,
        force: true,
    });
    silentLog("Restored userdata\n");
    printProgress(0.9, "Cleaning up");
    fs.copyFileSync(LOG_FILE, CWD + "/update_log.txt");
    fs.rmSync(TMP, { recursive: true, force: true });
    printProgress(1, "Finished");
    console.log("");
    console.log("Running install script...");
    await new Promise((resolve) => {
        let proc = cproc.spawn(require.resolve(CWD + "/INSTALL.bat"));
        proc.stdout.on("data", (chunk) => {
            process.stdout.write(chunk.toString("utf8"));
        });
        proc.stderr.on("data", (chunk) => {
            process.stdout.write(chunk.toString("utf8"));
        });
        proc.on("close", () => {
            resolve();
        });
    });
    process.exit(0);
}
update();
