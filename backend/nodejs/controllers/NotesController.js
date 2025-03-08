import BaseController from "./base/BaseController.js";
import Note from '../models/Note.js';
import InputForm from '../models/InputForm.js';
import NoteService from "../services/NoteService.js";
import SessionService from "../services/SessionService.js";

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
        return res.renderPartial("partials/noteID", { ...this.appData, message: "This content is loaded in a Bootbox modal!", note });
    }

    // Calls getNote in noteservice. requires note ID from client, retrieves note based on ID.
    async getExistingNote(req, res) {
        const id = req.body.result; // Get the note id from the query parameter
        console.log(id);
        try {
            // Fetch the note from the database
            const note = await this.noteService.getNote(id);
            if (note) {
                
                res.json(note);
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

    
    async generateSession(req, res) {
        const sessionCode = this.#createSessionCode(7)
        const noteID = req.query.id;
        this.sessionService.storeCode(sessionCode, noteID);
        console.log(sessionCode);
        // return res.render("noteSession", { ...this.appData, sessionCode});
        return res.send(sessionCode);
    }
      

    #createSessionCode(length) {
        return btoa(
            crypto
              .getRandomValues(new Uint8Array((length * 3) / 4))
              .reduce((str, byte) => str + String.fromCharCode(byte), '')
          )
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, length);
    }

    async joinSession(req, res) {
        const code = req.body.result; // Get the note id from the query parameter
        console.log(code);
        try {
            // Fetch the note from the database
            const note = await this.sessionService.getNote(code);
            if (note) {
                res.json(note);
            } else {
                res.status(404).send("Note not found.");
            }
        } catch (error) {
            console.error('Error fetching note or updating pad:', error);
            res.status(500).send("Internal server error");
        }

    }


}