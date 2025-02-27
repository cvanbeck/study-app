import expressLayouts from 'express-ejs-layouts';
import express from 'express';
import session from 'express-session';
import ejs from 'ejs';
import bodyParser from 'body-parser';
import { dirname } from 'path';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const __frontend_dirname = join(__dirname, '../../frontend', 'nodejs-frontend');
const port = 8000;
const appData = { appName: "Study App" };

// Configure the Express app
function configureApp(app, express) {
    app.use(express.static(__frontend_dirname + '/public'));
    app.set('views', __frontend_dirname + '/views');
    app.use(expressLayouts);
    app.set('view engine', 'ejs');
    app.engine('html', ejs.renderFile);
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(session({ secret: 'transrights', resave: false, saveUninitialized: true }));
}

// Map routes and pass shared data
function mapRoutes(app) {
    const layoutData = { layout: 'shared/layout.ejs' };
    const combinedData = { ...layoutData, ...appData };
    import("./routes/main.js").then(module => module.default(app, combinedData));
}

// Initialize and start the app
function main() {
    const app = express();
    configureApp(app, express);
    mapRoutes(app);
    app.listen(port, () => console.log(`${appData.appName} listening on port ${port}!`));
}

main();
