import { IO } from "../io/io";

/**
 * Checks the string for spammy contents.
 * @param text
 * @returns true if spam, false if not spam
 */
export function isSpamMessage(text: string): boolean {
    let result =
        /([A-Z0-9]| ){20,}|([A-Z0-9a-z]){20,}|(.)\3{5,}|(.*? )\4{2,}/g.test(
            text
        );
    if (result === true) IO.print('Spam filter flagged "', text.trim(), '"');
    return result;
}
