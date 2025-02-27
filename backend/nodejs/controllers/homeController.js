export default {
    index: (req, res, appData) => {
        res.render("home/index.ejs", { ...appData, user: req.session.user });
    }
};