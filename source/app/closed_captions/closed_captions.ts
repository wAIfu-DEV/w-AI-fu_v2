import * as fs from "fs";

import { getAudioDuration } from "../audio_duration/get_audio_duration";
import { streamSubtitles } from "./stream_captions";

/**
 * Writes text to `closed_captions.txt` file
 * @param text
 */
export function setClosedCaptions_impl(
    text: string,
    id: string,
    persistent = false,
    is_narrator = false
): void {
    fs.writeFile(process.cwd() + "/closed_captions.txt", text, (err) => {
        if (err === null) return;
        throw err;
    });
    if (text === "") return;
    if (id === "") {
        streamSubtitles(text, 0, persistent, is_narrator);
        return;
    }
    getAudioDuration(
        process.cwd() + "/source/app/novelai_api/audio/" + id + ".mp3"
    ).then((value) => {
        streamSubtitles(text, value, persistent, is_narrator);
    });
}
