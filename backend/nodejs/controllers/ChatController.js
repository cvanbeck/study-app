import axios from "axios";
import { Writable } from "stream";

export default class ChatController {
    constructor(appData) {
        this.appData = appData; 
    }

    async index(req, res) {
        res.render("index", { ...this.appData });
    }

    async getChatResponse(req, res) {
        try {
            // Get prompt from the query parameter
            let prompt = req.query.prompt;
    
            if (!prompt) {
                return res.status(400).json({ error: "Prompt is required" });
            }
    
            // Set response type to stream for Server-Sent Events
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
    
            // Start the AI request
            const response = await axios.post(
                "https://ai.api.parsonlabs.com/v1/chat/completions",
                {
                    model: "deepseek-r1:1.5b",
                    messages: [{ role: "user", content: prompt }],
                    stream: true,  // Enable streaming
                },
                {
                    headers: { "Content-Type": "application/json" },
                    responseType: "stream",  // Ensure response is a stream
                }
            );
    
            // Pipe the AI response to the response object
            response.data.on('data', (chunk) => {
                // Send chunks as event data
                res.write(`data: ${chunk.toString()}\n\n`);
            });
    
            response.data.on('end', () => {
                // When the stream ends, notify the client
                res.write('data: [DONE]\n\n');
                res.end();
            });
    
        } catch (error) {
            console.error("Chat API Error:", error);
            res.write('data: Error occurred while fetching response\n\n');
            res.end();
        }
    }    
}
