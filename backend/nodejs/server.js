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
    useAuthentication: true,
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
wss.on('connection', (ws, req, client) => {
    console.log('New Client Connected');
    ws.id = crypto.randomUUID(); // sets client id
    ws.send(JSON.stringify({ type: 'id', data: ws.id })); // sends id back to client (for cursor labels)
    // Calls when data is recieved from client
    ws.on('message', (message, isBinary) => {
        const data = JSON.parse(message); // Response depends on message type
        switch(data.type) {
            case "init": // When a new client first connects
                ws.note = data.content; // Stores the current session code
                ws.session = data.session;
                // Sends the new clients ID to all other clients in the same session
                wss.clients.forEach((client) => {
                    if(client !== ws && client.readyState === WebSocket.OPEN && client.session === ws.session && client.note === ws.note) { // both note ID and session code must match
                        client.send(JSON.stringify({ type: 'newClient', data: ws.id }));
                    }
                });
                break;
            case "collab": // When a client joins a collab session
                ws.session = data.content;
                break;
            case "sync": // Sync tape updates clients Quill editor view with current content. Excludes message sender
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.session === ws.session && client.note === ws.note) {
                        client.send(JSON.stringify({ type: 'update', data: data.content }));
                    }
                });
                ws.idle = false; // sets the client to an active state
                break;
            case "cursorSync": // Sends new cursor movements to other clients
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.session === ws.session && client.note === ws.note) {
                        client.send(JSON.stringify({ type: 'cursorUpdate', data: data.data }));
                    }
                });
                break;
            case "newSession": // received when user generates a collab session
                ws.session = data.data;
                break;
            case "inactivity": // client is inactive
                ws.idle = true;
                const sessionClients = [...wss.clients].filter(clientFilter(ws)); // Leeps clients only part of the shared session
                if (sessionClients.every(idleSession)) { // True if all clients in session are idle
                    ws.send(JSON.stringify({ type: 'newVersion' })); // Only sent to the most recent inactive client
                }
                break;
            case "disconnect":
                console.log(`Client ${ws.id} is disconnecting`);
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'clientDisconnect',
                            data: { id: ws.id }
                        }));
                    }
                });
                break;
            case "endSession":
                console.log(`Session ${ws.session} is ending`);
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.session === ws.session && client.note === ws.note) {
                        client.send(JSON.stringify({ type: 'sessionClosed' }));
                    }
                });

        }
    });

    ws.on('close', () => {
        console.log(`Client ${ws.id} connection closed`);
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'clientDisconnect',
                    data: { id: ws.id }
                }));
            }
        });
    });
});

// Filter returning clients that are part of the same notes collab session
function clientFilter(ws) {
    return function(client) {
        return client.note === ws.note && client.session == ws.session;
    }
}

// Returns true if all clients connected to a session are inactive
function idleSession(client) {
    return client.idle;
}

app.listen(port, () => console.log(`${appData.appName} listening on port ${port}!`));