import { Result } from "./Result";
import { IO } from "../io/io";

/**
 * Helper function to check if object x contains the same fields as object y
 */
export function isOfClass(x: unknown, y: unknown, options = { print: false, obj_name: "x", add_missing_fields: false }): boolean {
    if (x === undefined || x === null) {
        if (x === y) return true;
        if (options.print === true)
            IO.warn('WARNING:', options.obj_name, 'failed the type check.');
        return false;
    }
    if (typeof x !== "object") {
        if (typeof x === typeof y) return true
        if (options.print === true)
            IO.warn('WARNING:', options.obj_name, 'failed the type check.');
        return false;
    }
    for(let key of Object.keys(y as any)) {
        if (key in x === false) {
            if (options.print === true) {
                IO.warn('WARNING:', options.obj_name, 'failed the type check.');
                if (options.add_missing_fields === true) {
                    IO.warn('WARNING: creating new field', key, 'in', options.obj_name);
                    (x as any)[key] = (y as any)[key];
                    return true;
                }
            }
            return false;
        }
    }
    return true;
}

/**
 * Recursive version of isOfClass
 */
export function isOfClassDeep(x: unknown, y: unknown, options = { print: false, obj_name: "x", add_missing_fields: false }): boolean {
    if (x === undefined || x === null) {
        if (x === y) return true;
        if (options.print === true)
            IO.warn('WARNING:', options.obj_name, 'failed the type check.');
        return false;
    }
    if (typeof x !== "object") {
        if (typeof x === typeof y) return true
        if (options.print === true)
            IO.warn('WARNING:', options.obj_name, 'failed the type check.');
        return false;
    }
    for(let key of Object.keys(y as any)) {
        if (key in x === false) {
            if (options.print === true) {
                IO.warn('WARNING:', options.obj_name, 'failed the type check.');
                if (options.add_missing_fields === true) {
                    IO.warn('WARNING: creating new field', key, 'in', options.obj_name);
                    (x as any)[key] = (y as any)[key];
                    return true;
                }
            }
            return false;
        }
        if (isOfClassDeep((x as any)[key],(y as any)[key], { print: options.print, obj_name: options.obj_name + '.' + key, add_missing_fields: options.add_missing_fields }) === false) {
            if (options.print === true)
                IO.warn('WARNING:', options.obj_name, 'failed the type check.');
            return false;
        }
    }
    return true;
}

export enum addMissingFields_ERRORS {
    NONE = "NONE",
    NOT_AN_OBJECT = "NOT_AN_OBJECT",
}

export function addMissingFields<T>(x: unknown, y: T): Result<T, addMissingFields_ERRORS> {
    if (x === undefined || x === null) {
        return new Result(false, y, addMissingFields_ERRORS.NOT_AN_OBJECT);
    }
    if (typeof x !== "object") {
        return new Result(false, y, addMissingFields_ERRORS.NOT_AN_OBJECT);
    }
    for(let key of Object.keys(y as any)) {
        if (key in x === false)
            (x as any)[key] = (y as any)[key];
    }
    return new Result(true, x as T, addMissingFields_ERRORS.NONE);
}