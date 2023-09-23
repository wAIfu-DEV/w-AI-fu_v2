import { wAIfu } from "../types/Waifu";
import { IO } from "../io/io";

export function checkForBadWords(text: string): string[] | null {
    if (wAIfu.state!.config.moderation.filter_bad_words.value === false) return null;

    let matched_words: string[] = [];

    const low_text = text.toLowerCase().trim();

    for (const bw of wAIfu.state!.bad_words) {
        if (low_text.includes(bw)) {
            matched_words.push(bw);
        }
    }
    if (matched_words.length > 0) {
        IO.print('Bad words filter matched "' + matched_words.join('","') + '" in\r\n"' + text.trim() + '"');
        return matched_words;
    }
    else return null;
}