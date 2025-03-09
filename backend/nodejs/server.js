import dotenv from 'dotenv';
dotenv.config();  // Load the .env file

import expressLayouts from 'express-ejs-layouts';
import express from 'express';
import session from 'express-session';
import ejs from 'ejs';
import bodyParser from 'body-parser';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import SQLiteDbContext from './database/SQLiteDbContext.js';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import cors from 'cors';


const __dirname = dirname(fileURLToPath(import.meta.url));
const __frontend_dirname = join(__dirname, '../../frontend', 'nodejs');
const port = 8000;

// Connection string for the database you want to connect to
// SQLLite uses a file path as the connection string.
// Other database types have specific formats, look them up.
const connectionString = '../sqllite-database/Chinook.db';

const appData = {
    appName: "Study App", 
    db: new SQLiteDbContext(connectionString), // Include the db in the appData object
    environment: process.env.NODE_ENV,
};

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



app.use(cors()); 
// const server = http.createServer(app); //Only needed for ws to run on the same port. WS can run on another port.
const wss = new WebSocketServer({ port: 8001 }); 



//Pings when a new client is connected
wss.on('connection', (ws, req) => {
    console.log('New Client Connected');
    // Calls when data is recieved from client
    ws.on('message', (message, isBinary) => {
        const data = JSON.parse(message); // Response depends on message type
        switch(data.type) {
            case "init": // When a new client first connects
                ws.id = data.content;
                break;
            case "collab": // When a client joins a collab session
                ws.session = data.content;
            case "sync": // Sync tape updates clients Quill editor view with current content. Excludes message sender
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.id === ws.id) {  // only if ID matches
                        client.send(JSON.stringify(data.content));
                    }
                });
        }

    });

    ws.on('close', () => {
        console.log('Client Disconnected');
    });
});

app.listen(port, () => console.log(`${appData.appName} listening on port ${port}!`));