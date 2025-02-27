export default {
    index: (req, res, appData) => {
        res.render("about/index.ejs", { ...appData, user: req.session.user });
    }
};