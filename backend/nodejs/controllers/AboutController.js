import BaseController from "./base/BaseController.js";

export default class AboutController extends BaseController {
    // REQUIRED FOR ALL CONTROLLERS
    constructor(appData) {
        super(appData); // REQUIRED

        // Optional things can be set in the constructor, e.g.
        // this.db = appData.db; // Access the database context from the shared appData object
    }

    // REQUIRED FOR ALL CONTROLLERS
    async index(req, res) {
        return res.render("index.ejs", { ...this.appData, user: req.session.user });
    }
}
