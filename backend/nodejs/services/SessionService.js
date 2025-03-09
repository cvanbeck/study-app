import Note from '../models/Note.js';

export default class SessionService {
    constructor(database) {
        this.dbContext = database;

    }

    // Store a code with a note
    async storeCode(code, id) { 
        try {
            const result = await this.dbContext.query("INSERT INTO SessionCodes VALUES (?, ?)", [code, id]);
            console.log("Sucessfully stored");
        } catch (error) {
            console.error('Error querying Notes table:', error);

        }
    }

    // Retrieves a note from the DB based on session code linked to Note ID
    async getNote(code) {
        try {
            const result = await this.dbContext.query("SELECT id, name, content FROM SessionCodes JOIN Notes on SessionCodes.NoteID = Notes.id WHERE code = ?", [code]);

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




}