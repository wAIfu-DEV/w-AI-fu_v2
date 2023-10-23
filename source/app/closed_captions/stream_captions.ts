import { WebSocket, WebSocketServer } from "ws";
import { wAIfu } from "../types/Waifu";

// TODO: THERE MUST BE A BETTER WAY TO DO THIS
let ClosedCaptionsWSS = new WebSocketServer({ host: "127.0.0.1", port: 8756 });
let ClosedCaptionsWS = new WebSocket(null);
ClosedCaptionsWSS.on("connection", (ws, _) => {
    ClosedCaptionsWS = ws;
});

let is_writing = false;
let skip_next: true | false = false;

type Word = { text: string; chars: number };

export function clearStreamedSubtitles(): void {
    skip_next = true;
    if (ClosedCaptionsWS.readyState === WebSocket.OPEN)
        ClosedCaptionsWS.send("CLEAR");
}

export function streamSubtitles(
    text: string,
    time_ms: number,
    persistant: boolean,
    is_narrator: boolean
): Promise<void> {
    return new Promise(async (resolve) => {
        let is_resolved = false;

        let words = text.split(/ +/g);
        let total_chars = 0;

        let word_list: Word[] = [];

        for (let word of words) {
            let char_count = word.length;
            total_chars += char_count;
            word_list.push({ text: word, chars: char_count });
        }

        let ms_per_char = time_ms / total_chars;

        is_writing = true;

        if (ClosedCaptionsWS.readyState === WebSocket.OPEN)
            ClosedCaptionsWS.send("CLEAR");

        while (word_list.length !== 0) {
            if (is_resolved) return;
            if (skip_next) {
                skip_next = false;
                if (ClosedCaptionsWS.readyState === WebSocket.OPEN) {
                    ClosedCaptionsWS.send("CLEAR");
                }
                is_writing = false;
                is_resolved = true;
                resolve();
                return;
            }

            let to_display = word_list.shift();
            if (to_display === undefined) continue;

            if (ClosedCaptionsWS.readyState === WebSocket.OPEN)
                ClosedCaptionsWS.send(`WORD ${to_display.text}`);

            if (!is_narrator)
                wAIfu.dependencies?.vts.tryPlayKeywordSequence(to_display.text);

            await new Promise((resolve_sleep) =>
                setTimeout(resolve_sleep, to_display!.chars * ms_per_char)
            );
        }

        is_writing = false;

        if (persistant) return;

        setTimeout(() => {
            if (is_writing === true) return;
            if (ClosedCaptionsWS.readyState === WebSocket.OPEN)
                ClosedCaptionsWS.send("CLEAR");
        }, 2_500);

        is_resolved = true;
        resolve();
        return;
    });
}
