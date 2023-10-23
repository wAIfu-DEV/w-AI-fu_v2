import * as cproc from "child_process";
import * as fs from "fs";

/**
 *
 * @param file_id
 */
export function getAudioDuration(absolute_path: string): Promise<number> {
    return new Promise((resolve) => {
        cproc.exec(
            `${process.cwd()}\\bin\\ffmpeg\\ffmpeg.exe -i "${absolute_path}"`,
            (_error, _stdout, stder) => {
                let results = /[0-9]{2}\:[0-9]{2}\:[0-9]{2}\.[0-9]{2}/g.exec(
                    stder
                );
                if (results === null) return 0;

                let split_time = results?.[0]!.split(/\:|\./g)!;

                let hours = parseInt(split_time[0]!) * 3_600_000;
                let minutes = parseInt(split_time[1]!) * 60_000;
                let seconds = parseInt(split_time[2]!) * 1_000;
                let mseconds = parseInt(split_time[3]!) * 10;

                resolve(hours + minutes + seconds + mseconds);
                return;
            }
        );
    });
}

export function __getAudioDuration(file_id: string): Promise<number> {
    return new Promise((resolve) => {
        let wav_buff = fs.readFileSync(
            `${process.cwd()}\\source\\app\\novelai_api\\audio\\${file_id}.mp3`
        );

        var audio_context = new window.AudioContext();
        audio_context.decodeAudioData(wav_buff.buffer, (audio_buffer) => {
            resolve(Math.round(audio_buffer.duration * 1_000));
        });
    });
}
