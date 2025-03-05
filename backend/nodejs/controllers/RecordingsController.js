import BaseController from "./base/BaseController.js"

export default class RecordingsController extends BaseController{
    constructor(appData){
        super(appData);
    }

    async index(req, res){
        return res.render("index.ejs", {...this.appData, user: req.session.user})
    }
}