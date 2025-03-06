import BaseController from "./base/BaseController.js";
import Note from '../models/Note.js';
import InputForm from '../models/InputForm.js';

export default class NotesController extends BaseController{
    constructor(appData) {
        super(appData);
        this.currentNote;
    }

    async index(req, res) {
        res.render("index.ejs", { ...this.appData, user: req.session.user });
    }


    // Generates a note item and calls storeNote in notesservice 
    async generateNote(req, res) {
        const item = new Note({
            name: "Modal Test",
            
        });

        return res.renderPartial("partials/note", { ...this.appData, message: "This content is loaded in a Bootbox modal!", item });
    }

    // Calls getNote in noteservice. requires note ID from client, retrieves note based on ID.
    async getExistingNote(req, res) {
        

        return res.renderPartial("partials/note", { ...this.appData, message: "This content is loaded in a Bootbox modal!", item });
    }

    // Update note object with current content
    async updateNote() {

    }

    // Displays a bootbox where user inputs the code
    async getCode(req, res) {
        const form = new InputForm({
            name: "Modal Test",
            
        });
        return res.renderPartial("partials/codeInput", { ...this.appData, message: "This content is loaded in a Bootbox modal!", form });

    }



}