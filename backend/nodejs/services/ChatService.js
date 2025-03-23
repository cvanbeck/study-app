import axios from "axios";
import JSONStreamService from "./JSONStreamService.js";

export default class ChatService {
    constructor() {
        this.conversationHistory = [];
        this.quizInProgress = false;
        this.currentQuestion = null;
        this.correctAnswer = null;
    }

    clearHistory() {
        this.conversationHistory = [];
        this.quizInProgress = false;
        this.currentQuestion = null;
        this.correctAnswer = null;
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
            case "quizmaster":
                if (prompt.toLowerCase().includes("start quiz")){
                    const topic = prompt.replace(/start quiz/i, "").trim();
                    formattedPrompt = `Generate a quiz question about ${topic}. Format your response exactly like this: "QUIZ QUESTION: [your question here]" followed by "CORRECT ANSWER: [correct answer]". The correct answer should be hidden from users and only used to validate responses.`;
                    this.quizInProgress = true;
                } else if (this.quizInProgress && prompt.toLowerCase().includes("next question")){
                    const topic = prompt.replace(/next question/i, "").trim();
                    formattedPrompt = `Generate another quiz question about ${topic}. Format your response exactly like this: "QUIZ QUESTION: [your question here]" followed by "CORRECT ANSWER: [correct answer]". The correct answer should be hidden from users and only used to validate responses.`;
                } else if (this.quizInProgress){
                    const userAnswer = prompt.trim();
                    const username=prompt.split(':')[0].trim();
                    if (this.correctAnswer && this.isCorrectAnswer(userAnswer, this.correctAnswer)){
                        formattedPrompt = `RESPONSE: Correct, ${username} gets 1 exp! The answer was: ${this.correctAnswer}`;
                        this.currentQuestion = null;
                        this.correctAnswer = null;
                    } else {
                        formattedPrompt = `RESPONSE: Sorry, that's not correct. Try again!`;
                    }
                } else {
                    formattedPrompt = prompt;
                } break;
            default:
                formattedPrompt = prompt;
        }

        // Add user input to conversation history
        this.conversationHistory.push({ role: "user", content: formattedPrompt });

        try {
            const response = await axios.post(
                "https://ai.api.parsonlabs.com/v1/chat/completions",
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
                        
                        if (mode == "quizmaster" && this.quizInProgress) {
                            this.processQuizQuestion(assistantMessage);
                        }
                    }
                } catch (e) {
                    console.error("Error parsing streamed data:", e);
                }
            });

            // Stores the full assistant message in the conversation history array when stream ends
            jsonStreamService.on("end", () => {
                if (assistantMessage) {
                    cleanedMessage = assistantMessage.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

                    if (mode == "quizmaster" && this.quizInProgress && cleanedMessage.includes("QUIZ QUESTION:")){
                        const visibleQuestion = cleanedMessage.split("QUIZ QUESTION:")[1].split("CORRECT ANSWER:")[0].trim();
                        this.conversationHistory.push({ role: "assistant", content: "QUIZ QUESTION: " + visibleQuestion });
                    } else {
                        this.conversationHistory.push({ role: "assistant", content: cleanedMessage });
                }
            });

            return jsonStreamService;
        } catch (error) {
            console.error("Chat API Error:", error);
            throw new Error("Error occurred while fetching response");
        }
    }

    processQuizResponse(response){
        if(response.includes("QUIZ QUESTION:") && response.includes("CORRECT ANSWER:")){
            const questionMatch = response.match(/QUIZ QUESTION:\s*(.*?)(?=CORRECT ANSWER:|$)/s);
            const answerMatch = response.match(/CORRECT ANSWER:\s*(.*?)(?=$)/s);

            if (questionMatch && questionMatch[1] && answerMatch && answerMatch[1]){
                this.currentQuestion = questionMatch[1].trim();
                this.correctAnswer = answerMatch[1].trim();
            }
        }
    }

    isCorrectAnswer(userAnswer, correctAnswer){
        return userAnswer.toLowerCase().includes(correctAnswer.toLowerCase()) || correctAnswer.toLowerCase().includes(userAnswer.toLowerCase());
    }
}
