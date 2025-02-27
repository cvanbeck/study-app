import ExampleItem from '../models/exampleItem.js';

export default class HomeController {
    constructor(appData) {
        this.appData = appData;
    }

    async index(req, res) {
        // Now you can simply use the view name without the folder
        res.render("index.ejs", { ...this.appData, user: req.session.user });
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
