export function insertInArray<T>(item: T, index: number, array: T[]): void {
    if (index >= array.length) {
        array.push(item);
        return;
    }
    if (index <= 0) {
        array.unshift(item);
        return;
    }
    array.splice(index, 0, item);
}
