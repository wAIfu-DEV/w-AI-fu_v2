import * as fs from 'fs'
import { Character } from './character';
import { IO } from '../io/io';
import { wAIfu } from '../types/Waifu';
import { readParseJSON } from '../file_system/file_system';
import { isOfClassDeep } from '../types/Helper';

export function getCharByFileName(file_name: string): Character {
    let character = wAIfu.state!.characters[file_name];

    if (character === undefined) {
        IO.warn('ERROR: Could not access character data for:', file_name, 'Please retry with another character.');
        return new Character();
    }
    return character;
}

export function getCurrentCharacter(): Character {
    return getCharByFileName(wAIfu.state!.config._.character_name.value);
}

/**
 * @returns a list of characters from the folder `userdata/characters`
 */
export function retreiveCharacters(): Record<string, Character> {

    let CHARA_PATH = process.cwd() + '/userdata/characters/';
    let result: Record<string, Character> = {};
    let files = fs.readdirSync(CHARA_PATH, { recursive: false, encoding: 'utf8' });

    for (let f of files) {

        let name_no_extension: string = f.replaceAll(/\..*/g, '');
        const PATH = CHARA_PATH + f;

        let parse_result = readParseJSON(PATH);
        if (parse_result.success === false) {
            IO.warn('Could not import character file', PATH);
            continue;
        }
        let parsed_obj = parse_result.value;

        let type_match = isOfClassDeep<Character>(parsed_obj, new Character(), { obj_name: 'character', add_missing_fields: true, print: true });
        if (type_match === false) {
            IO.warn('ERROR: Character file', PATH, 'failed the sanity check.');
            continue;
        }
        result[name_no_extension] = parsed_obj as Character;
    }
    return result;
}

/**
 * Writes Charater object to file in `userdata/characters/`.
 * @param file_name name of the character json file (no extension)
 * @param char Character object
 */
export function writeCharacter(file_name: string, char: Character) {
    let CHARA_PATH = process.cwd() + '/userdata/characters/';
    fs.writeFileSync(CHARA_PATH + file_name + '.json', JSON.stringify(char));
}