import { readParseAs } from '../file_system/file_system';

export function getVersion_impl(): string {
    const PACKAGE_PATH = process.cwd() + '/package.json';
    return readParseAs<Package>(PACKAGE_PATH, new Package()).version;
}

class Package {
    version: string = "";
}