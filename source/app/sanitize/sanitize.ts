export function removeNovelAIspecialSymbols(text: string): string {
    let rgx: RegExp = /\<\|.*\|\>|\*\*\*|⁂|{ | }|\[ | \]|----|======|─|##/g;
    return text.replaceAll(rgx, '');
}

export function removeNonAsciiSymbols(text: string): string {
    let rgx: RegExp = /[^a-zA-Z0-9 \.\,\'\"\^\?\!\+\-\%\*\=\/\_\:\;\$\€\@\<\>\(\)]/g
    return text.replaceAll(rgx, '');
}