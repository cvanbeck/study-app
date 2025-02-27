export default {
    index: (req, res, appData) => {
        // Now you can simply use the view name without the folder
        res.render("index.ejs", { ...appData, user: req.session.user });
        // Or you can even skip the .ejs extension if you prefer
        // res.render("index", { ...appData, user: req.session.user });
    },
    
    example: (req, res, appData) => {
        // Simulating fetching an item (replace with actual data fetching)
        const item = {
            name: "Sample Item ",
            description: "This is a detailed description of the item",
            createdAt: new Date().toLocaleDateString()
        };
        
        // Pass data to the view
        res.render("example", { ...appData, item });
    }
};