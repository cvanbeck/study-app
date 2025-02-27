import { Pool } from 'pg';
import BaseDbContext from './BaseDbContext.js';

export default class PostgresDbContext extends BaseDbContext {
  constructor(connectionString) {
    super(connectionString);
    this.pool = new Pool({
      connectionString: this.connectionString
    });
    this.pool.on('connect', () => {
      console.log('Connected to the Postgres database.');
    });
  }

  async query(text, params) {
    try {
      return await this.pool.query(text, params);
    } catch (error) {
      console.error('Postgres query error:', error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
    console.log('Postgres database connection closed.');
  }
}