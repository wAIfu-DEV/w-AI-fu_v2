import * as fs from 'fs';
import { Auth } from './auth';
import { IO } from '../io/io';

/**
 * Write Auth object to the file `userdata/auth/auth.json`
 * @param auth Auth object
 */
export function writeAuth(auth: Auth) {
    try {
        fs.writeFileSync(Auth.AUTH_PATH, JSON.stringify(auth));
    } catch {
        IO.warn('ERROR: Failed to write auth to file.');
    }
}