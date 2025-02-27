import mysql from 'mysql2/promise';
import BaseDbContext from './BaseDbContext.js';

export default class MySQLDbContext extends BaseDbContext {
    constructor(connectionString) {
        super(connectionString);
        this.pool = mysql.createPool(this.connectionString);
        console.log('MySQL connection pool created.');
    }

    async query(text, params) {
        try {
            const [rows] = await this.pool.query(text, params);
            return rows;
        } catch (error) {
            console.error('MySQL query error:', error);
            throw error;
        }
    }

    async close() {
        await this.pool.end();
        console.log('MySQL database connection closed.');
    }
}