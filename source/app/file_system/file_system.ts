import * as fs from 'fs';
import { isOfClass, addMissingFields } from "../types/Helper";
import { IO } from '../io/io';
import { Result } from '../types/Result';

enum READPARSE_ERROR {
    NONE = "NONE",
    READ_ERROR = "READ_ERROR",
    PARSE_ERROR = "PARSE_ERROR",
}

export function readParseJSON(path: string): Result<unknown, READPARSE_ERROR> {

    let raw_data: string;
    try {
        raw_data = fs.readFileSync(path, { encoding: 'utf8' });
    } catch (error) {
        IO.warn('ERROR: Could not read file', path);
        return {
            success: true,
            value: {} as unknown,
            error: READPARSE_ERROR.READ_ERROR
        };
    }

    let json_obj: unknown;
    try {
        json_obj = JSON.parse(raw_data);
    } catch (error) {
        IO.warn('ERROR: Could not parse file', path);
        return {
            success: true,
            value: {} as unknown,
            error: READPARSE_ERROR.PARSE_ERROR
        };
    }

    return {
        success: true,
        value: json_obj,
        error: READPARSE_ERROR.NONE
    };
}

/**
 * Reads the file, handles errors and returns a parsed object of type T 
 * Warning: the type checking is surface-level, nested objects might break this.
*/
export function readParseAs<T>(path: string, sentinel_value: T): T {
    let data: Buffer;
    try {
        data = fs.readFileSync(path);
    } catch (error) {
        IO.warn('ERROR: Could not read file', path);
        fs.writeFileSync(path, JSON.stringify(sentinel_value));
        return sentinel_value;
    }
    let parsed_obj: unknown;
    try {
        parsed_obj = JSON.parse(data.toString('utf-8'));
    } catch (error) {
        IO.warn('ERROR: Could not parse file', path);
        fs.writeFileSync(path, JSON.stringify(sentinel_value));
        return sentinel_value;
    }
    if (isOfClass(parsed_obj, sentinel_value) === false) {
        let fixed_config_result = addMissingFields<T>(parsed_obj, sentinel_value);
        if (fixed_config_result.success === false) {
            IO.warn('ERROR: Failed to reconstruct incomplete config file with error message:', fixed_config_result.error);
            fs.writeFileSync(path, JSON.stringify(sentinel_value));
            return sentinel_value;
        }
        return fixed_config_result.value
    }
    return parsed_obj as T;
}