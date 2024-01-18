export type QueryResult = {
    content: string;
    timestamp: number;
};

export interface ILongTermMemory {
    initialize(): Promise<void>;
    free(): Promise<void>;

    store(text: string): void;
    query(text: string, items: number): Promise<QueryResult[]>;
    clear(): void;
    dump(): void;
}
