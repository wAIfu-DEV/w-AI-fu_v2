import * as fs from 'fs'
import { IO } from '../io/io';
import { Character } from './character';

/**
 * @returns a list of characters from the folder `userdata/characters`
 */
export function retreiveCharacters(): any {

    let CHARA_PATH = process.cwd() + '/userdata/characters/';

    let result: any = {};

    let files = fs.readdirSync(CHARA_PATH, { recursive: false, encoding: 'utf8' });

    for (let f of files) {

        let name_no_extension = f.replaceAll(/\..*/g, '');

        let data: string;
        try {
            data = fs.readFileSync(CHARA_PATH + f, { encoding: 'utf8' });
        } catch (error) {
            IO.warn('ERROR: Could not read file', CHARA_PATH + f);
            return;
        }
        let parsed_obj: any;
        try {
            parsed_obj = JSON.parse(data);
        } catch (error) {
            IO.warn('ERROR: Could not parse file', CHARA_PATH + f);
            return;
        }
        result[name_no_extension] = parsed_obj;
    }
    return result;
}

export function writeCharacter(char: Character) {
    let CHARA_PATH = process.cwd() + '/userdata/characters/';
    fs.writeFileSync(CHARA_PATH + char.char_name + '.json', JSON.stringify(char));
}