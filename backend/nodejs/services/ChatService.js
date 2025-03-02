import axios from "axios";
import JSONStreamService from "./JSONStreamService.js";

export default class ChatService {
    constructor() {
        this.conversationHistory = [];
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    async getChatResponse(prompt) {
        if (!prompt) {
            throw new Error("Prompt is required");
        }

        // Add user input to conversation history
        this.conversationHistory.push({ role: "user", content: prompt });

        try {
            const response = await axios.post(
                "https://ai.api.parsonlabs.com/v1/chat/completions",
                {
                    model: "deepseek-r1:1.5b",
                    messages: this.conversationHistory,
                    stream: true,
                },
                {
                    headers: { "Content-Type": "application/json" },
                    responseType: "stream",
                }
            );

            // Pipe the response stream through the JSONStreamService
            const jsonStreamService = new JSONStreamService();
            response.data.pipe(jsonStreamService);
            return jsonStreamService;
        } catch (error) {
            console.error("Chat API Error:", error);
            throw new Error("Error occurred while fetching response");
        }
    }
}