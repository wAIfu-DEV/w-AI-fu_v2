import { IO } from "../io/io";

export class CommandQueue {
    #data: string[] = [];

    notEmpty(): boolean {
        return this.#data.length !== 0;
    }

    consume(): string {
        return (this.#data.length > 0)
               ? this.#data.shift()!
               : '';
    }

    pushBack(item: string): void {
        IO.quietPrint(`Added to queue: ${item}`);
        this.#data.push(item);
    }

    pushFront(item: string): void {
        this.#data.unshift(item);
    }

    clear(): void {
        this.#data = [];
    }
}