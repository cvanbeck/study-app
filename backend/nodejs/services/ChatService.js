import axios from "axios";
import JSONStreamService from "./JSONStreamService.js";

export default class ChatService {
    constructor() {
        this.conversationHistory = [];
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    async getChatResponse(prompt, mode) {
        if (!prompt) {
            throw new Error("Prompt is required");
        }

        let formattedPrompt;
        switch (mode) {
            case "steps":
                formattedPrompt = `Explain in a step by step format: ${prompt}`;
                break;
            case "example":
                formattedPrompt = `Explain with a real world example: ${prompt}`;
                break;
            case "flashcards":
                formattedPrompt = `Generate 10 questions and answers on this subject: ${prompt}`;
                break;
            default:
                formattedPrompt = prompt;
        }

        // Add user input to conversation history
        this.conversationHistory.push({ role: "user", content: formattedPrompt });

        try {
            const response = await axios.post(
                // "https://ai.api.parsonlabs.com/v1/chat/completions",
                "http://bappity.net:11434/v1/chat/completions",
                {
                    model: "deepseek-r1:1.5b",
                    messages: this.conversationHistory, // IMPORTANT! the entire history must be pushed here, not just one single message.
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

            // Builds and stores the assistant message as it is being streamed in
            let assistantMessage = "";
            jsonStreamService.on("data", (data) => {
                try {
                    const textData = data.toString().trim();
                    if (textData === "[DONE]") return; // Ignore the [DONE] marker
                    const parsedData = JSON.parse(textData);
                    if (parsedData.fullContent) {
                        assistantMessage = parsedData.fullContent;
                    }
                } catch (e) {
                    console.error("Error parsing streamed data:", e);
                }
            });

            // Stores the full assistant message in the conversation history array when stream ends
            jsonStreamService.on("end", () => {
                if (assistantMessage) {
                    assistantMessage = assistantMessage.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
                    this.conversationHistory.push({ role: "assistant", content: assistantMessage });
                }
            });

            return jsonStreamService;
        } catch (error) {
            console.error("Chat API Error:", error);
            throw new Error("Error occurred while fetching response");
        }
    }
}
