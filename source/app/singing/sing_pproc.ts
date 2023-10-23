import * as cproc from "child_process";
import * as fs from "fs";

import { IO } from "../io/io";
import { ENV, wAIfu } from "../types/Waifu";

import { getDeviceIndex } from "../devices/devices";

export async function playSongPreprocessed(song_name: string): Promise<void> {
    const SONGS_PATH = process.cwd() + "/userdata/songs/";

    const vocals = SONGS_PATH + `${song_name}_vocals.wav`;
    const instrumentals = SONGS_PATH + `${song_name}_instrumentals.wav`;

    if (fs.existsSync(SONGS_PATH) === false) {
        IO.warn(
            "Warning: Could not find the folder userdata/songs. w-AI-fu will create a new one."
        );
        try {
            fs.mkdirSync(SONGS_PATH, { recursive: true });
        } catch {
            IO.error(
                "Could not create the folder userdata/songs. Something went very wrong."
            );
        }
    }

    if (fs.existsSync(vocals) === false) {
        IO.warn("Error: Could not find file: " + vocals);
        IO.print(
            "Reminder: Song must be split in two files,\n<SONG NAME>_vocals.wav and <SONG NAME>_instrumentals.wav\nFiles must be placed in the folder userdata/songs."
        );
        return;
    }
    if (fs.existsSync(instrumentals) === false) {
        IO.warn("Error: Could not find file: " + instrumentals);
        IO.print(
            "Reminder: Song must be split in two files,\n<SONG NAME>_vocals.wav and <SONG NAME>_instrumentals.wav\nFiles must be placed in the folder userdata/songs."
        );
        return;
    }

    await wAIfu.dependencies?.vts.reset();
    wAIfu.dependencies?.vts.animateSinging();

    if (fs.existsSync(__dirname + "/sync0.lock")) {
        fs.unlinkSync(__dirname + "/sync0.lock");
    }
    if (fs.existsSync(__dirname + "/sync1.lock")) {
        fs.unlinkSync(__dirname + "/sync1.lock");
    }

    let player1 = cproc.spawn(
        ENV.PYTHON_PATH,
        [
            __dirname + "/sing.py",
            vocals,
            String(
                getDeviceIndex(
                    wAIfu.state?.config.devices.tts_output_device.value!
                )
            ),
            String(0),
        ],
        { cwd: __dirname, detached: false, shell: false }
    );
    let player2 = cproc.spawn(
        ENV.PYTHON_PATH,
        [
            __dirname + "/sing.py",
            instrumentals,
            String(
                getDeviceIndex(
                    wAIfu.state?.config.devices.alt_output_device.value!
                )
            ),
            String(1),
        ],
        { cwd: __dirname, detached: false, shell: false }
    );

    player1.stdout.on("data", (data) => IO.print(data.toString("utf8")));
    player1.stderr.on("data", (data) => IO.warn(data.toString("utf8")));

    player2.stdout.on("data", (data) => IO.print(data.toString("utf8")));
    player2.stderr.on("data", (data) => IO.warn(data.toString("utf8")));

    await new Promise<void>(async (resolve) => {
        let resolved = false;

        let player1_closed = false;
        let player2_closed = false;

        player1.on("close", () => {
            player1_closed = true;
            if (player2_closed === true) {
                if (resolved === true) return;
                resolved = true;
                resolve();
                wAIfu.dependencies?.vts.animateTalking();
                wAIfu.dependencies?.vts.animateIdle();
            }
            return;
        });
        player2.on("close", () => {
            player2_closed = true;
            if (player1_closed === true) {
                if (resolved === true) return;
                resolved = true;
                resolve();
                wAIfu.dependencies?.vts.animateTalking();
                wAIfu.dependencies?.vts.animateIdle();
            }
            return;
        });

        while (resolved === false) {
            if (wAIfu.dependencies?.tts.skip === true) {
                wAIfu.dependencies!.tts.skip = false;
                player1.kill(2);
                player2.kill(2);
                resolved = true;
                resolve();
                wAIfu.dependencies?.vts.animateTalking();
                wAIfu.dependencies?.vts.animateIdle();
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
    });
    return;
}
