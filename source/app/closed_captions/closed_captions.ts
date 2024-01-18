import * as fs from "fs";

import { getAudioDuration } from "../audio_duration/get_audio_duration";
import { streamSubtitles } from "./stream_captions";
import { wAIfu } from "../types/Waifu";

type CCGenOptions = {
    id?: string | undefined;
    persistent?: boolean | undefined;
    is_narrator?: boolean | undefined;
};

/**
 * Writes text to `closed_captions.txt` file
 * @param text
 */
export function setClosedCaptions_impl(
    text: string,
    options: CCGenOptions | undefined = undefined
): void {
    if (options === undefined) {
        options = {
            id: undefined,
            is_narrator: false,
            persistent: false,
        };
    }

    fs.writeFile(process.cwd() + "/closed_captions.txt", text, (err) => {
        if (err === null) return;
        throw err;
    });
    if (text === "") return;
    if (options.id === undefined || options.id === "") {
        streamSubtitles(text, {
            is_narrator: options.is_narrator || false,
            persistant: options.persistent || false,
        });
        return;
    }

    getAudioDuration(
        wAIfu.state?.config.text_to_speech.tts_provider.value === "novelai" ||
            wAIfu.state?.config.text_to_speech.tts_provider.value ===
                "novelai+rvc"
            ? process.cwd() +
                  "/source/app/novelai_api/audio/" +
                  options.id +
                  ".mp3"
            : process.cwd() + "/source/app/audio/" + options.id + ".wav"
    ).then((value) => {
        if (options === undefined) return;
        streamSubtitles(text, {
            time_ms: value,
            is_narrator: options.is_narrator,
            persistant: options.persistent,
        });
    });
}
