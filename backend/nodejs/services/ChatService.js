import axios from "axios";
import JSONStreamService from "./JSONStreamService.js";

export default class ChatService {
    constructor() {
        this.conversationHistory = [];
        this.quizInProgress = false;
        this.currentQuestion = null;
        this.correctAnswer = null;
        this.lastAnsweredBy = null;
    }

    clearHistory() {
        this.conversationHistory = [];
        this.quizInProgress = false;
        this.currentQuestion = null;
        this.correctAnswer = null;
        this.lastAnsweredBy = null;
    }

    async getChatResponse(prompt, mode) {
        if (!prompt) {
            throw new Error("Prompt is required");
        }

        let formattedPrompt;
        let isQuizAnswer = false;
        
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
                    formattedPrompt = `Generate a single question about ${topic}. Format your response exactly like this: "QUIZ QUESTION: " followed by a question, followed by "CORRECT ANSWER: " and then the correct answer.`;
                    this.quizInProgress = true;
                } else if (this.quizInProgress && prompt.toLowerCase().includes("next question")){
                    const topic = prompt.replace(/next question/i, "").trim();
                    formattedPrompt = `Generate another question about ${topic}. Format your response exactly like this: "QUIZ QUESTION: " followed by a question, followed by "CORRECT ANSWER: " and then the correct answer.`;
                } else if (this.quizInProgress && this.currentQuestion && this.correctAnswer){
                    isQuizAnswer = true;
                    let username = "";
                    let userAnswer = prompt;
                    const colonIndex = prompt.indexOf(':');
                    if (colonIndex >0) {
                        username = prompt.substring(0, colonIndex).trim();
                        userAnswer = prompt.substring(colonIndex+1).trim();
                    }
                    if (this.isCorrectAnswer(userAnswer, this.correctAnswer)) {
                        if (this.lastAnsweredBy){
                            formattedPrompt = `That's correct, ${username}! But ${this.lastAnsweredBy} already answered this question correctly. The answer is ${this.correctAnswer}. Type "next question" for another question.`;
                        } else {
                            formattedPrompt = `Correct, ${username} gets 1 exp! The answer was ${this.correctAnswer}. Type "next question" for another question.`;
                            this.lastAnsweredBy = username;
                        }
                    } else {
                        formattedPrompt = `Sorry ${username}, that's not correct. Try again!`;
                    }
                }
                else if (this.quizInProgress && prompt.toLowerCase().includes("end quiz")){
                    formattedPrompt = `The quiz has ended. Thanks for playing!`;
                    this.quizInProgress = false
                    this.currentQuestion = null;
                    this.correctAnswer = null;
                    this.lastAnsweredBy = null;
                } else {
                    formattedPrompt = prompt;
                    if (this.quizInProgress) {
                        formattedPrompt = `I'm in quizmode right now. Type "start quiz [topic]" to start a new quiz, "next question" for another question, or "end quiz" to finish.`;
                    }
                }
                break
            default:
                formattedPrompt = prompt;
        }
        
        this.conversationHistory.push({ role: "user", content: formattedPrompt });
        
        try {
            const response = await axios.post(
                "http://localhost:11434/v1/chat/completions",
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
                            this.processQuizResponse(assistantMessage);
                        }
                    }
                } catch (e) {
                    console.error("Error parsing streamed data:", e);
                }
            });

            // Stores the full assistant message in the conversation history array when stream ends
            jsonStreamService.on("end", () => {
                if (assistantMessage) {
                    const cleanedMessage = assistantMessage.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

                    if(!isQuizAnswer){
                        this.conversationHistory.push({ role: "assistant", content: cleanedMessage });
                    }
                    if (mode == "quizmaster" && cleanedMessage.includes("QUIZ QUESTION:")){
                        this.lastAnsweredBy = null;
                    }
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
                this.lastAnsweredBy = null;
            }
        }
    }

    isCorrectAnswer(userAnswer, correctAnswer){
        if (!userAnswer || !correctAnswer) return false

        const normalUserAnswer = userAnswer.toLowerCase().trim();
        const normalCorrectAnswer = correctAnswer.toLowerCase().trim();

        if (normalUserAnswer === normalCorrectAnswer) {
            return true;
        }
        if (normalUserAnswer.includes(normalCorrectAnswer) || normalCorrectAnswer.includes(normalUserAnswer)){
            return true;
        }
    }
}
