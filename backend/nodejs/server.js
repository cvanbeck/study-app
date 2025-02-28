import expressLayouts from 'express-ejs-layouts';
import express from 'express';
import session from 'express-session';
import ejs from 'ejs';
import bodyParser from 'body-parser';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import SQLiteDbContext from './database/SQLiteDbContext.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const __frontend_dirname = join(__dirname, '../../frontend', 'nodejs');
const port = 8000;

// Instantiate your DbContext (database connection)
const connectionString = '../sqllite-database/Chinook.db';
const db = new SQLiteDbContext(connectionString);

// Add the db instance to your shared appData object
const appData = { appName: "Study App", db };

const app = express();
app.use(express.static(join(__frontend_dirname, 'public')));
app.set('views', join(__frontend_dirname, 'views'));
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.engine('html', ejs.renderFile);
// Set the layout to the file in the shared subfolder:
app.set('layout', 'shared/layout.ejs');

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'transrights', resave: false, saveUninitialized: true }));

import("./routes/mapRoutes.js").then(module => module.default(app, appData));

app.listen(port, () => console.log(`${appData.appName} listening on port ${port}!`));
