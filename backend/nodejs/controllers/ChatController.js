import BaseController from "./base/BaseController.js";
import ChatService from "../services/ChatService.js";

export default class ChatController extends BaseController {
    constructor(appData) {
        super(appData);
        this.chatService = new ChatService();
    }

    async index(req, res) {
        this.chatService.clearHistory();
        return res.render("index", { ...this.appData });
    }

    async getChatResponse(req, res) {
        try {
            // Read prompt and mode from the POST body
            const prompt = req.body.prompt;
            const mode = req.body.mode || "default";

            if (!prompt) {
                return res.status(400).json({ error: "Prompt is required" });
            }

            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            const stream = await this.chatService.getChatResponse(prompt, mode);

            stream.on("data", (chunk) => {
                res.write(`data: ${chunk.toString()}\n\n`);
            });
            
            stream.on("end", () => {
                res.end();
            });
        } catch (error) {
            console.error("Chat API Error:", error);
            res.write("data: Error occurred while fetching response\n\n");
            res.end();
        }
    }
}
