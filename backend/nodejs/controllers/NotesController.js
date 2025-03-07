import BaseController from "./base/BaseController.js";
import Note from '../models/Note.js';
import InputForm from '../models/InputForm.js';
import NoteService from "../services/NoteService.js";

export default class NotesController extends BaseController{
    constructor(appData) {
        super(appData);
        this.noteService = new NoteService(appData.db);
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
        return res.renderPartial("partials/note", { ...this.appData, message: "This content is loaded in a Bootbox modal!", note });
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



}