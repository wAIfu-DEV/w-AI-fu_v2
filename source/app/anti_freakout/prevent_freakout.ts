import { IO } from "../io/io";
import { isSpamMessage } from "../moderation/check_for_spam";

export function preventFreakout(text: string): string {
    let ret_val = text;
    let modified = false;
    
    const regex: RegExp = /(.)\1{2,}/g;
    let results = text.matchAll(regex);

    for (let match of results) {
        ret_val = ret_val.replace(match[0]!, match[1]! + match[1]! + match[1]!);
        modified = true;
    }

    if (isSpamMessage(text) === true) {
        ret_val = ret_val.toLowerCase();
        modified = true;
    }

    if (modified === true) {
        IO.print('Freakout prevention replaced "', text, '" with "', ret_val, '"');
    }

    return ret_val;
}