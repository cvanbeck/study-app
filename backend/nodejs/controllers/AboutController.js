export default class AboutController {
    constructor(appData) {
        this.appData = appData;
    }

    async index(req, res) {
        res.render("index.ejs", { ...this.appData, user: req.session.user });
        return null; // Explicitly return null since we're handling the response
    }
}
