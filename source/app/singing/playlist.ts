import * as fs from "fs";
import { getAudioDuration } from "../audio_duration/get_audio_duration";
import { IO } from "../io/io";
import { wAIfu } from "../types/Waifu";

export function startPlaylist() {
    const playlist = structuredClone(
        wAIfu.state!.config.singing.song_playlist.value
    );
    const PL_TIMEOUT_MIN =
        wAIfu.state!.config.singing.timeout_minutes_between_playlist_songs
            .value;
    const PL_TIMEOUT_MS = PL_TIMEOUT_MIN * 60 * 1_000;
    const PL_SIZE = playlist.length;

    if (playlist.length === 0) return;

    const listener = (index: number) => {
        test_label: if (index >= PL_SIZE) {
            IO.print("Finished playing playlist.");
            return;
        }

        const song_name = playlist[index]!;

        if (song_name === "") {
            setTimeout(() => listener(++index), PL_TIMEOUT_MS);
            return;
        }

        const PATH =
            process.cwd() + "/userdata/songs/" + song_name + "_vocals.wav";

        if (!fs.existsSync(PATH)) {
            IO.warn(
                `ERROR: Could not find song: ${song_name} even though it is in the playlist.\nMake sure both ${song_name}_vocals.wav and ${song_name}_instrumentals.wav are present in the folder userdata/songs/ folder.`
            );
            setTimeout(() => listener(++index), 0);
            return;
        }
        getAudioDuration(PATH).then((duration) => {
            setTimeout(() => listener(++index), PL_TIMEOUT_MS + duration + 100);
        });

        wAIfu.state!.command_queue.pushFront(`!sing ${song_name}`);
        return;
    };
    listener(0);
}
