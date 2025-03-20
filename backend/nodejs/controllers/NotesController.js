import BaseController from "./base/BaseController.js";
import Note from '../models/Note.js';
import NoteService from "../services/NoteService.js";
import SessionService from "../services/SessionService.js";
import Delta from 'quill-delta';

export default class NotesController extends BaseController{
    constructor(appData) {
        super(appData);
        this.noteService = new NoteService(appData.db);
        this.sessionService = new SessionService(appData.db);
    }

    async index(req, res) {
        res.render("index.ejs", { ...this.appData, user: req.session.user });
    }


    // Generates a note item and calls storeNote in notesservice 
    async generateNote(req, res) {
        const note = new Note({

        });
        this.noteService.storeNote(note);
        console.log(note.id);
        return res.send(note);
    }

    // Calls getNote in noteservice. requires note ID from client, retrieves note based on ID.
    async getExistingNote(req, res) {
        const id = req.body.result; // Get the note id from the query parameter

        try {
            // Fetch the note from the database
            const note = await this.noteService.getNote(id);
            if (note) {
                res.send(note);
            } else {
                res.status(404).send("Note not found.");
            }
        } catch (error) {
            console.error('Error fetching note or updating pad:', error);
            res.status(500).send("Internal server error");
        }
    }

    // Update note in db with current content
    async updateNote(req, res) {
        const id = req.body.id;
        const content = req.body.content;
        this.noteService.updateNote(content, id);
    }

    // Generates a session code and stores with noteID sent from view
    async generateSession(req, res) {
        const sessionCode = this.#createSessionCode(7) // Random 7 character code
        const noteID = req.query.id; // Note ID retrieved from view query
        const sessionPage = new URL(req.get('Referer')).pathname; // Gets the url path of the notes page

        this.sessionService.storeCode(sessionCode, sessionPage, noteID);
        console.log(sessionCode);
        return res.send(sessionCode);
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
        const code = req.body.result; // Get the session code
        try {
            // Fetch the note from the database
            const result = await this.sessionService.getNote(code);
            if (result) {
                res.send(result);
            } else {
                res.status(404).send("Note not found.");
            }
        } catch (error) {
            console.error('Error fetching note or updating pad:', error);
            res.status(500).send("Internal server error");
        }

    }

    // Renders the Notes with AI page
    async notesAI (req, res) {
        return res.render("notesAI", { ...this.appData});
    }

    async newNoteVersion(req, res) {

        const noteID = req.query.id;
        try {
            await this.noteService.newNoteVersion(noteID);
        } catch (error) {
            console.error('Error fetching note or updating pad:', error);
            res.status(500).send("Internal server error");
        }
    }

}