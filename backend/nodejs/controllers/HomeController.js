import ExampleItem from '../models/exampleItem.js';

export default class HomeController {
    constructor(appData) {
        this.appData = appData;

        // Access the database context from the shared appData object
        this.db = appData.db;
    }

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
            res.status(500).json({ error: 'Database query error' });
            return;
        }

        // Now you can simply use the view name without the folder
        res.render("index.ejs", { ...this.appData, user: req.session.user, dbItem: firstRow });
    }

    async example(req, res) {
        const item = new ExampleItem({
            name: "Sample Item",
            description: "This is a detailed description of the item"
        });

        // Pass data to the view
        res.render("example", { ...this.appData, item });
    }

    // Example AJAX function for dynamic content on other pages
    async ajaxTest(req, res) {
        const item = new ExampleItem({
            name: "Test",
            description: "Test"
        });
        // Prepare the content to send as a partial
        res.renderPartial("partials/ajaxTest", { ...this.appData, message: "This is the AJAX loaded content!", item });
    }
}
