import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import BaseDbContext from './BaseDbContext.js';

export default class SQLiteDbContext extends BaseDbContext {
  constructor(connectionString) {
    super(connectionString);
    // Open the SQLite database; the connection string here is the file path
    this.dbPromise = open({
      filename: this.connectionString,
      driver: sqlite3.Database
    }).then((db) => {
      console.log('Connected to the SQLite database.');
      return db;
    });
  }

  async query(text, params) {
    try {
      const db = await this.dbPromise;
      return await db.all(text, params);
    } catch (error) {
      console.error('SQLite query error:', error);
      throw error;
    }
  }

  async close() {
    try {
      const db = await this.dbPromise;
      await db.close();
      console.log('SQLite database connection closed.');
    } catch (error) {
      console.error('Error closing SQLite database:', error);
    }
  }
}
