import BaseController from "./base/BaseController.js";
import Note from '../models/Note.js';
import NoteService from "../services/NoteService.js";
import SessionService from "../services/SessionService.js";
import NavOptions from "../models/NavOptions.js";

export default class NotesController extends BaseController {
    constructor(appData) {
        super(appData);
        // Use the injected noteService if available, otherwise create a new one
        this.noteService = appData.noteService || new NoteService(appData.db);
        this.sessionService = appData.sessionService || new SessionService(appData.db);

        this.bindNavMethod("notesAI", new NavOptions({ overrideShowInNavbar: true, priority: 0, customNavText: "Notes With AI" }));
    }

    async index(req, res) {
        res.render("index.ejs", { ...this.appData, user: req.session.user });
    }

    // Generates a note item and calls storeNote in notesservice 
    async generateNote(req, res) {
        try {
            const note = new Note({
                content: req.body.content || '{"ops":[]}'
            });
            
            await this.noteService.storeNote(note);
            return res.send(note);
        } catch (error) {
            console.error('Error generating note:', error);
            return res.status(500).send('Internal server error');
        }
    }

    // Calls getNote in noteservice. requires note ID from client, retrieves note based on ID.
    async getExistingNote(req, res) {
        try {
            const noteId = req.body.result;
            const note = await this.noteService.getNote(noteId);
            
            if (!note) {
                return res.status(404).send('Note not found.');
            }
            
            return res.send(note);
        } catch (error) {
            console.error('Error retrieving note:', error);
            return res.status(500).send('Internal server error');
        }
    }

    async updateNote(req, res) {
        try {
            const { id, content } = req.body;
            const updatedNote = await this.noteService.updateNote(id, { content });
            
            if (!updatedNote) {
                return res.status(404).send('Note not found.');
            }
            
            return res.send(updatedNote);
        } catch (error) {
            console.error('Error updating note:', error);
            return res.status(500).send('Internal server error');
        }
    }

    // Generates a session code and stores with noteID sent from view
    async generateSession(req, res) {
        try {
            const sessionCode = this.#createSessionCode(7) // Random 7 character code
            const noteID = req.query.id; // Note ID retrieved from view query
            const sessionPage = new URL(req.get('Referer')).pathname; // Gets the url path of the notes page

            await this.sessionService.storeCode(sessionCode, sessionPage, noteID);
            console.log(sessionCode);
            return res.send(sessionCode);
        } catch (error) {
            console.error('Error generating session:', error);
            return res.status(500).send('Internal server error');
        }
    }
      
    // Generates a code for sharing a collaborative session
    #createSessionCode(length) {
        return btoa(
            crypto
              .getRandomValues(new Uint8Array((length * 3) / 4))
              .reduce((str, byte) => str + String.fromCharCode(byte), '')
          )
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, length);
    }

    // Calls sends session code to sessionService for note retrival
    async joinSession(req, res) {
        try {
            const code = req.body.result; // Get the session code
            const result = await this.sessionService.getNote(code);

            if (!result) {
                return res.status(404).send("Session not found.");
            }
            
            return res.send(result);
        } catch (error) {
            console.error('Error joining session:', error);
            return res.status(500).send("Internal server error");
        }
    }

    async deleteSessionCode(req, res) {
        try {
            const noteID = req.query.id;
            const code = req.query.code;
            
            const result = await this.sessionService.deleteCode(code, noteID);
            if (!result) {
                return res.status(404).send("Session not found.");
            }
            
            return res.send(result);
        } catch (error) {
            console.error('Error deleting code:', error);
            return res.status(500).send("Internal server error");
        }
    }

    // Renders the Notes with AI page
    async notesAI (req, res) {
        try {
            return res.render("notesAI", { ...this.appData});
        } catch (error) {
            console.error('Error rendering notesAI page:', error);
            return res.status(500).send('Internal server error');
        }
    }

    async newNoteVersion(req, res) {
        try {
            const noteID = req.query.id;
            await this.noteService.newNoteVersion(noteID);
            return res.send({ message: 'New note version created successfully' });
        } catch (error) {
            console.error('Error creating new note version:', error);
            return res.status(500).send('Internal server error');
        }
    }

    async getNoteVersion(req, res) {
        try {
            const noteID = req.query.id;
            const version = req.query.version;
            const result = await this.noteService.getNoteVersion(noteID, version);
            
            if (!result) {
                return res.status(404).send('Note version not found.');
            }
            
            return res.send(result);
        } catch (error) {
            console.error('Error fetching note version:', error);
            return res.status(500).send('Internal server error');
        }
    }

    // Calls the service to remove VersionControlDelta from the db
    async deleteVersion(req, res) {
        try {
            const noteID = req.query.id;
            const version = req.query.version;
            const result = await this.noteService.deleteVersion(noteID, version);
            
            if (!result) {
                return res.status(404).send('Note version not found.');
            }
            
            return res.send(result);
        } catch (error) {
            console.error('Error deleting note version:', error);
            return res.status(500).send('Internal server error');
        }
    }
}