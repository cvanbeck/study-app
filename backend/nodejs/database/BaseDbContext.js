export default class BaseDbContext {
    constructor(connectionString) {
        if (!connectionString) {
            throw new Error('A connection string must be provided.');
        }
        this.connectionString = connectionString;
    }

    // Must be implemented by subclasses
    async query(text, params) {
        throw new Error('query() method must be implemented in the derived class.');
    }

    // Must be implemented by subclasses
    async close() {
        throw new Error('close() method must be implemented in the derived class.');
    }
}  