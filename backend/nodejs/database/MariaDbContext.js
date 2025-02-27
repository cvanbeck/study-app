// MariaDbContext.js
import mariadb from 'mariadb';
import BaseDbContext from './BaseDbContext.js';

export default class MariaDbContext extends BaseDbContext {
    constructor(connectionString) {
        super(connectionString);
        this.pool = mariadb.createPool(this.connectionString);
        console.log('MariaDB connection pool created.');
    }

    async query(text, params) {
        let connection;
        try {
            connection = await this.pool.getConnection();
            const rows = await connection.query(text, params);
            return rows;
        } catch (error) {
            console.error('MariaDB query error:', error);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    async close() {
        await this.pool.end();
        console.log('MariaDB database connection closed.');
    }
}