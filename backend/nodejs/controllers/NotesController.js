import axios from "axios";
import Note from '../models/Note.js';

export default class NotesController {
    constructor(appData) {
        this.appData = appData;
    }

    async index(req, res) {
        res.render("index.ejs", { ...this.appData, user: req.session.user });
    }

    // token = this.getToken();
    // async newNote(req, res) {
    //     const item = new ExampleItem({
    //         name: "Note",
    //         description: "New Note"
    //     });
    //     // Prepare the content to send as a partial
    //     res.renderPartial("partials/newNote", { ...this.appData, message: "This is the AJAX loaded content!", item });
    // }

    // async getToken() {
    //     try {
    //         const response = await axios.post('http://localhost:9001/oidc/token', new URLSearchParams({
    //             grant_type: 'code',
    //             client_id: 'client_credentials',
    //             client_secret: 'client_credentials'
    //         }), {
    //             headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    //         });
    
    //         console.log('Bearer Token:', response.data.access_token);
    //         return response.data.access_token;
    //     } catch (error) {
    //         console.error('Error obtaining token:', error.response ? error.response.data : error.message);
    //     }
    // }
    
    // async newNote(req, res) {
    //     const note = new Note(this.getToken());
    //     res.renderPartial("partials/newNote", { ...this.appData, note});

    // }

    async ajaxTest(req, res) {
        const item = new ExampleItem({
            name: "Test",
            description: "Test"
        });
        // Prepare the content to send as a partial
        res.renderPartial("partials/ajaxTest", { ...this.appData, message: "This is the AJAX loaded content!", item });
    }
    
    // async newNote(req, res) {

    //     try {
    //         const response = await axios.post(
    //             "http://localhost:9001/api/1.3.0/createPad",
    //             {
    //                 padID: "testpad",
    //                 text: "asdfghjkl",
    //             },
    //             {
    //                 headers: { "Authorization": token }
    //             }
    //         );
    //         console.log(response);
    //         item = response.data;
    //         res.render("newNote", { ...this.appData, item});
    //     } catch (error) {
    //         console.error();
    //         res.render("newNote", { ...this.appData});
    //     }


    // }
}