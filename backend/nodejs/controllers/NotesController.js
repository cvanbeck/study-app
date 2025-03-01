import axios from "axios";
import Note from '../models/Note.js';
// import ExampleItem from '../models/exampleItem.js';

export default class NotesController {
    constructor(appData) {
        this.appData = appData;
    }

    async index(req, res) {
        res.render("index.ejs", { ...this.appData, user: req.session.user });
    }



    async getToken() {
        try {
            const response = await axios.post('http://localhost:9001/oidc/token', new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: 'client_credentials',
                client_secret: 'client_credentials'
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            return response.data.access_token;
        } catch (error) {
            console.error('Error obtaining token:', error.response ? error.response.data : error.message);
        }
    }
    
    async newNote(req, res) {
        let note = new Note();
        let padID = this.getRndInteger(100, 10000000000).toString()
        res.renderPartial("partials/newNote", { ...this.appData, padID});

    }

    getRndInteger(min, max) {
        return Math.floor(Math.random() * (max - min) ) + min;
      }

}