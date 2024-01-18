import { IO } from "../io/io";
import { isSpamMessage } from "../moderation/check_for_spam";
import { wAIfu } from "../types/Waifu";

/**
 * Returns a modified verrsion of the string to hopefully reduce the likelyhood
 * of triggering a freakout when using the NovelAI models.
 * @param text LLM response
 * @returns modified response
 */
export function preventFreakout(text: string): string {
    let ret_val = text;
    let modified = false;

    const regex: RegExp = /(.)\1{3,}/g;
    let results = text.matchAll(regex);

    for (let match of results) {
        ret_val = ret_val.replace(match[0]!, match[1]! + match[1]! + match[1]!);
        modified = true;
    }

    if (
        wAIfu.state!.config.moderation.filter_spam_messages.value === true &&
        isSpamMessage(text) === true
    ) {
        ret_val = ret_val.toLowerCase();
        modified = true;
    }

    if (modified === true) {
        IO.print(
            'Freakout prevention replaced "',
            text,
            '" with "',
            ret_val,
            '"'
        );
    }

    return ret_val;
}
