import * as fs from 'fs';
import { Auth } from './auth';
import { IO } from '../io/io';
import { isOfClassDeep } from '../types/Helper';

export function importAuthFromFile_impl(): Auth {

    let raw_data: string;
    try {
        raw_data = fs.readFileSync(Auth.AUTH_PATH, {encoding: 'utf8'});
    } catch (error) {
        IO.warn('ERROR: Could not read auth.json file.');
        return new Auth();
    }

    let json_obj: any;
    try {
        json_obj = JSON.parse(raw_data);
    } catch (error) {
        IO.warn('ERROR: Could not parse auth.json file.');
        return new Auth();
    }

    if (isOfClassDeep(json_obj, new Auth(), { print: true, obj_name: "auth" }) === false) {
        IO.warn('ERROR: Auth object failed to pass the sanity check.');
        return new Auth();
    }

    return json_obj as Auth;
}