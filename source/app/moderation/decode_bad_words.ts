import * as fs from "fs";

export function getBadWords() {
    const PATH = process.cwd() + '/userdata/moderation/bad_words_b64';
    let fcontent = fs.readFileSync(PATH).toString();
    const buff = Buffer.from(fcontent, 'base64');
    const tostr = buff.toString('utf-8');
    return tostr.split(/\r\n|\n/g).map((v) => { return v.toLowerCase() });
}