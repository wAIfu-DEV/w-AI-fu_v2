import * as fs from 'fs';

export function setClosedCaptions(text: string) {
    fs.writeFileSync(process.cwd() + '/closed_captions.txt', text);
}