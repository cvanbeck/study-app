//Import axios for making HTTP requests
import axios from "axios";

//Define a ChatController class to handle chat-related API requests
export default class ChatController {
    
    constructor(appData) {
        this.appData = appData; 
    }

    async index(req, res) {
        res.render("chat/index", {...this.appData });
    }

    //Handles POST requests
    //This receives a user prompt, sends it to an external AI API, and streams the response back.
    
    async chat(req, res) {
        try {
            //Extract prompt from the incoming request body
            const { prompt } = req.body;

            //Check if prompt is missing
            if (!prompt) {
                return res.status(400).json({ error: "Prompt is required" }); 
            }

            //Make an API request to the AI
            const response = await axios.post(
                "https://ai.api.parsonlabs.com/v1/chat/completions", 
                {
                    model: "deepseek-r1:1.5b",
                    messages: [{ role: "user", content: prompt }],
                    stream: true,
                },
                {
                    headers: { "Content-Type": "application/json" },
                    responseType: "stream",
                }
            );

            //Stream the AI response directly to the client
            response.data.pipe(res);

        } catch (error) {
            console.error("Chat API Error:", error);

            res.status(500).json({ error: "Internal Server Error" });
        }
    }
}
