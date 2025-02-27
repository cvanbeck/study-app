export default class AboutController {
    constructor(appData) {
        this.appData = appData;
    }

    async index(req, res) {
        res.render("index.ejs", { ...this.appData, user: req.session.user });
    }
}
