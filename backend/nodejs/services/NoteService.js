import Note from '../models/Note.js';

export default class NoteService {
    constructor(database) {
        this.dbContext = database;

    }

    // Stores a note in DB
    async storeNote(note) {
        try {
            const result = await this.dbContext.query("INSERT INTO Notes VALUES (?, ?, ?)", [note.id, note.name, note.content]);
            console.log("Sucessfully stored");
        } catch (error) {
            console.error('Error querying Notes table:', error);

        }
    }

    // Retrieve note using Note ID
    async getNote(id) {
        try {
            const result = await this.dbContext.query("SELECT * FROM Notes WHERE id = ?", [id]);

            // Ensure we have a valid result
            if (result && result.length > 0) {
                const row = result[0]; // Assuming 'id' is unique, we take the first result

                // Convert all keys to lowercase
                const formattedRow = Object.fromEntries(
                    Object.entries(row).map(([key, value]) => [key.toLowerCase(), value])
                );

                return new Note(formattedRow); // Return a Note object
            } else {
                console.log(`Note with id ${id} not found`);
                return null; // Return null if the note is not found
            }
        } catch (error) {
            console.error('Error querying Notes table:', error);
            return null; // Return null if there is an error
        }
    }

    // Updates contents of an existing note in the DB
    async updateNote(content, id) {
        try {
            const result = await this.dbContext.query("UPDATE Notes SET Content = ? WHERE id = ?", [content, id]);
        } catch (error) {
            console.error('Error querying Notes table:', error);
            return null; // Return null if there is an error
        }
    }

}