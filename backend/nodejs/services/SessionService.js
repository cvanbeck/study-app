import Note from '../models/Note.js';
import NoteService from "../services/NoteService.js";

export default class SessionService {
    constructor(database) {
        this.dbContext = database;
        this.noteService = new NoteService(this.dbContext);

    }

    // Store a code with a note
    async storeCode(code, page, id) { 
        try {
            const result = await this.dbContext.query("INSERT INTO SessionCodes VALUES (?, ?, ?)", [code, page, id]);
            console.log("Sucessfully stored");
        } catch (error) {
            console.error('Error querying SessionCodes table:', error);
        }
    }

    // Retrieves a note from the DB based on session code linked to Note ID
    async getNote(code) {
        try {
            const result = await this.dbContext.query("SELECT id, name, content, page FROM SessionCodes JOIN Notes on SessionCodes.NoteID = Notes.id WHERE code = ?", [code]);
            // Ensure we have a valid result
            if (result && result.length > 0) {
                const row = result[0]; // Assuming 'id' is unique, we take the first result

                // Convert all keys to lowercase
                const formattedRow = Object.fromEntries(
                    Object.entries(row).map(([key, value]) => [key.toLowerCase(), value])
                );
                const note = new Note(formattedRow)
                const deltas = await this.noteService.getDeltas(note.id);
                note.setContent(this.noteService.buildNote(note.content, deltas));
                return {note: note, page: formattedRow.page}; // Return a Note object
            } else {
                console.log(`Note with code ${code} not found`);
                return null; // Return null if the note is not found
            }
        } catch (error) {
            console.error('Error querying SessionCodes table:', error);
            return null; // Return null if there is an error
        }
    }

}