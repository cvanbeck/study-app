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
            let prompt = req.body.prompt;

            if (!prompt) {
                return res.status(400).json({ error: "Prompt is required" });
            }

            const response = await axios.post(
                "https://ai.api.parsonlabs.com/v1/chat/completions",
                {
                    model: "deepseek-r1:1.5b",
                    messages: [{ role: "user", content: prompt }],
                    stream: false,  // Important: make sure stream is disabled
                },
                {
                    headers: { "Content-Type": "application/json" },
                    responseType: "stream",  // This is critical for streaming
                }
            );

            // Create a writable stream to collect data
            let responseData = "";
            const writableStream = new Writable({
                write(chunk, encoding, callback) {
                    responseData += chunk.toString();  // Collect data in a variable
                    callback();
                }
            });

            // Pipe the AI response stream into the writable stream
            response.data.pipe(writableStream);

            // Wait for the stream to finish
            writableStream.on('finish', () => {
                // At this point, responseData contains the entire response as a string

                // Now you can use responseData, for example, rendering it:
                res.renderPartial("aiResponse", { ...this.appData, response: JSON.parse(responseData) });
            });

        } catch (error) {
            console.error("Chat API Error:", error);
            res.renderPartial("aiResponse", { ...this.appData, response: error.message });
        }
    }
}