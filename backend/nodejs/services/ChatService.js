import axios from "axios";

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
            // Make API request
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

            return response.data;
        } catch (error) {
            console.error("Chat API Error:", error);
            throw new Error("Error occurred while fetching response");
        }
    }
}