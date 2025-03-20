import Note from '../models/Note.js';
import VersionControlDelta from '../models/VersionControlDelta.js';
import Delta from 'quill-delta';

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
            console.log(result);

            if (result && result.length > 0) {
                const row = result[0]; // Assuming 'id' is unique, we take the first result

                // Convert all keys to lowercase
                const formattedRow = Object.fromEntries(
                    Object.entries(row).map(([key, value]) => [key.toLowerCase(), value])
                );
                const note = new Note(formattedRow);
                const deltas = await this.getDeltas(id);

                note.setContent(this.buildNote(note.content, deltas));
                return note;

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
            const result = await this.dbContext.query("SELECT Content FROM NoteVersionControl WHERE NoteID = ? AND Version = (SELECT MAX(Version) FROM NoteVersionControl WHERE NoteID = ?)", [id, id]);
            if (result && result.length > 0) {
                let delta = new Delta(JSON.parse(result[0].Content));
                delta = delta.compose(new Delta(JSON.parse(content)));
                const store = await this.dbContext.query("UPDATE NoteVersionControl SET Content = ? WHERE NoteID = ? AND Version = (SELECT MAX(Version) FROM NoteVersionControl WHERE NoteID = ?)", [JSON.stringify(delta), id, id]);
            } else {
                await this.newNoteVersion(id, content);
            }

        } catch (error) {
            console.error('Error querying Notes table:', error);
        }
    }

    buildNote(base, deltas) {
        let noteContent = new Delta(JSON.parse(base));
        for (let i = 0; i < deltas.length; i++) {
            let delta = new Delta (JSON.parse(deltas[i].content));
            noteContent = noteContent.compose(delta);
        }

        return noteContent
    }

    async getDeltas(id, maxVersion) {
        try {
            let queryString = "SELECT * FROM NoteVersionControl WHERE NoteID = ?";
            if(maxVersion) {
                queryString = queryString.concat(" AND Version <= ?");
            }
            const result = await this.dbContext.query(queryString, [id, maxVersion]);

            if (result && result.length > 0) {
                const deltas = result.map(row => {
                    // Convert all keys to lowercase
                    const formattedRow = Object.fromEntries(
                        Object.entries(row).map(([key, value]) => [key.toLowerCase(), value])
                    );
                    return new VersionControlDelta(formattedRow); // Return a Note object for each row
                });
                return deltas;
            } else {
                console.log(`Note with id ${id} not found`);
                return null; // Return null if the note is not found
            }

            
        } catch (error) {
            console.error('Error querying Notes table:', error);
            return null; // Return null if there is an error
        }
    }

    async newNoteVersion(id, content) {
        if(!content) {
            content = '{"ops":[]}';
        }
        try {
            await this.dbContext.query("INSERT INTO NoteVersionControl (NoteID, Version, Content) VALUES (?, (SELECT COUNT(*) FROM NoteVersionControl WHERE NoteID = ?), ?)", [id, id, content]);
            console.log("New version generated");
        } catch (error) {
            console.error('Error querying Notes table:', error);
        }
    }

    async getNoteVersion(id, version) {
        const deltas = await this.getDeltas(id, version);
        const note = new Note({ id: "none" });

        note.setContent(this.buildNote(note.content, deltas));
        return note;  
    }

}