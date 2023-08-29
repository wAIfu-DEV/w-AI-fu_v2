import * as fs from 'fs';
import { Auth } from './auth';
import { IO } from '../io/io';

export function writeAuth(auth: Auth) {
    try {
        fs.writeFileSync(Auth.AUTH_PATH, JSON.stringify(auth));
    } catch {
        IO.warn('ERROR: Failed to write auth to file.');
    }
}