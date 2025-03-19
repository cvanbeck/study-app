import BaseController from "./base/BaseController.js";
import ExampleItem from "../models/exampleItem.js";

export default class ExampleController extends BaseController {
    // REQUIRED FOR ALL CONTROLLERS
    constructor(appData) {
        super(appData); // REQUIRED
        
        // Access the database context from the shared appData object
        this.db = appData.db; // OPTIONAL
    }

    // REQUIRED FOR ALL CONTROLLERS
    async index(req, res) {
        let firstRow = null;
        try {
            const result = await this.db.query('SELECT * FROM Employee LIMIT 1', []);

            // Extract the first row from the result
            firstRow = result.rows ? result.rows[0] : result[0];

            // Option 2: If you prefer to return JSON directly, you could do:
            // res.json(firstRow);
        } catch (error) {
            console.error('Error querying Employee table:', error);
            // Send an error response if the query fails
            return res.status(500).json({ error: 'Database query error' });
        }

        // Now you can simply use the view name without the folder
        return res.render("index.ejs", { ...this.appData, user: req.session.user, dbItem: firstRow });
    }

    // OPTIONAL, EXAMPLE FUNCTION (routes to (url)/example)
    async example(req, res) {
        const item = new ExampleItem({
            name: "Sample Item",
            description: "This is a detailed description of the item"
        });

        // Pass data to the view
        return res.render("example", { ...this.appData, item });
    }

    // OPTIONAL, EXAMPLE FUNCTION (routes to (url)/ajaxTest)
    async ajaxTest(req, res) {
        const item = new ExampleItem({
            name: "Test",
            description: "Test"
        });
        
        // Prepare the content to send as a partial
        return res.renderPartial("partials/ajaxTest", { ...this.appData, message: "This is the AJAX loaded content!", item });
    }

    // OPTIONAL, EXAMPLE FUNCTION (routes to (url)/ajaxModalTest)
    async ajaxModalTest(req, res) {
        const item = new ExampleItem({
            name: "Modal Test",
            description: "This is content loaded in a Bootbox modal!"
        });

        // Render the partial view
        return res.renderPartial("partials/ajaxTest", { ...this.appData, message: "This content is loaded in a Bootbox modal!", item });
    }

}