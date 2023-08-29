export class Result<T, E> {
    success: boolean;
    value: T;
    error: E;

    constructor(success: boolean, value: T, error: E) {
        this.success = success;        
        this.value = value;
        this.error = error;
    }
}