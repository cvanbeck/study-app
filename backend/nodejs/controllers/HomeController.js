import BaseController from "./base/BaseController.js";
import ExampleItem from "../models/exampleItem.js";

export default class HomeController extends BaseController {
    // REQUIRED FOR ALL CONTROLLERS
    constructor(appData) {
        super(appData); // REQUIRED
        
        // Access the database context from the shared appData object
        this.db = appData.db; // OPTIONAL
    }

    // REQUIRED FOR ALL CONTROLLERS
    async index(req, res) {
        // Now you can simply use the view name without the folder
        return res.render("index.ejs", { ...this.appData, user: req.session.user });
    }
}
