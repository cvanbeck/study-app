import ExampleItem from '../models/exampleItem.js';

export default {
    index: (req, res, appData) => {
        // Now you can simply use the view name without the folder
        res.render("index.ejs", { ...appData, user: req.session.user });
        // Or you can even skip the .ejs extension if you prefer
        // res.render("index", { ...appData, user: req.session.user });
    },
    
    example: async (req, res, appData) => {
        const item = new ExampleItem({
            name: "Sample Item",
            description: "This is a detailed description of the item"
        });
        
        // Pass data to the view
        res.render("example", { ...appData, item });
    },
};