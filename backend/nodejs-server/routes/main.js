import { v4 as uuidv4 } from 'uuid';

/**
 * Map routes for the study app.
 * in the second parameter of res render, an object, we pass custom variables in like the layout.html file and the custom date function result
 *
 * @param {*} app - The Express.js application instance to which routes will be mapped.
 * @param {*} appData - An object storing the express ejs layout location and extra data like my forum name.
 */
export default function (app, appData) {
    let allowedItemTypes = ["topics", "posts", "users"];

    app.get("/", function (req, res) {
        let newData = Object.assign({}, appData, {
            user: req.session.user,
            userId: req.session.userId,
        });
        res.render("index.ejs", newData);
    });

    app.get("/about", function (req, res) {
        let newData = Object.assign({}, appData, {
            user: req.session.user,
            userId: req.session.userId,
        });
        res.render("about.ejs", newData);
    });
};