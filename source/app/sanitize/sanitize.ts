export function removeNovelAIspecialSymbols(text: string): string {
    let rgx: RegExp = /\*\*\*|⁂|{ | }|\[ | \]|----|======|─|##/g;
    return text.replaceAll(rgx, '');
}