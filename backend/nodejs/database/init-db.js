import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes the database by executing the SQL setup script only once.
 * @param {string} dbPath - Path to the database file.
 * @param {string} setupSqlPath - Path to the SQL setup file.
 * @param {string} markerPath - Path to the marker file indicating the script has run.
 * @returns {Promise<void>}
 */
export function initializeDatabase(dbPath, setupSqlPath, markerPath) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(markerPath)) {
            console.log('Database already initialized, skipping setup.');
            return resolve();
        }

        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                return reject(err);
            }
        });

        const sql = fs.readFileSync(setupSqlPath, 'utf8');

        db.exec(sql, (err) => {
            if (err) {
                console.error('Error executing SQL:', err);
                return reject(err);
            }
            console.log('Database setup complete.');
            db.close();

            // Create marker file to indicate the setup has run
            fs.writeFile(markerPath, 'initialized', (err) => {
                if (err) {
                    console.error('Error creating marker file:', err);
                    return reject(err);
                }
                resolve();
            });
        });
    });
}
