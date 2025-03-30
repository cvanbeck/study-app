import BaseController from "./base/BaseController.js";
import Note from '../models/Note.js';
import NoteService from "../services/NoteService.js";
import SessionService from "../services/SessionService.js";
import NavOptions from "../models/NavOptions.js";

export default class ResearchController extends BaseController {
    constructor(appData) {
        super(appData);
        // Use the injected noteService if available, otherwise create a new one
        this.noteService = appData.noteService || new NoteService(appData.db);
        this.sessionService = appData.sessionService || new SessionService(appData.db);
    }

    async index(req, res) {
        res.render("index.ejs", { ...this.appData, user: req.session.user });
    }
}