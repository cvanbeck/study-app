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
        let immediateLocalResponse = null;
        
        switch (mode) {
            case "steps":
                formattedPrompt = `Explain in a step by step format: ${prompt}`;
                this.conversationHistory.push({ role: "user", content: formattedPrompt });
                break;
            case "example":
                formattedPrompt = `Explain with a real world example: ${prompt}`;
                this.conversationHistory.push({ role: "user", content: formattedPrompt });
                break;
            case "flashcards":
                formattedPrompt = `Generate 10 questions and answers on this subject: ${prompt}`;
                this.conversationHistory.push({ role: "user", content: formattedPrompt });
                break;
            case "quizmaster":
                if (prompt.toLowerCase().includes("start quiz")){
                    const topic = prompt.replace(/start quiz/i, "").trim();
                    formattedPrompt = `Generate exactly one question strictly related to '${topic}' without introducing any unrelated details or explanations. 
                        Ensure the question is clear, relevant, and precise. Additionally, provide a direct and accurate answer to the generated question.
                        Format your response as valid JSON with no deviations, extra text, or explanations. Use the exact structure below:
                        [
                          {
                            "Question": "[the generated question]",
                            "Answer": "[the generated answer]"
                          }
                        ]
                        Failure to adhere to this format will result in an invalid response. Do not include additional text, formatting, alternative structures, 
                        variables, markdown, escapes, line breaks, or placeholders`;
                    this.quizInProgress = true;
                    this.conversationHistory.push({ role: "user", content: formattedPrompt });
                } else if (this.quizInProgress && prompt.toLowerCase().includes("next question")){
                    const topic = prompt.replace(/next question/i, "").trim();
                    formattedPrompt = `Generate exactly one more question strictly related to '${topic}' without introducing any unrelated details or explanations. 
                        Ensure the question is clear, relevant, and precise. Additionally, provide a direct and accurate answer to the generated question.
                        Format your response as valid JSON with no deviations, extra text, or explanations. Use the exact structure below:
                        [
                          {
                            "Question": "[the generated question]",
                            "Answer": "[the generated answer]"
                          }
                        ]
                        Failure to adhere to this format will result in an invalid response. Do not include additional text, formatting, alternative structures, 
                        variables, markdown, escapes, line breaks or placeholders`;
                    this.conversationHistory.push({ role: "user", content: formattedPrompt });
                }else if (this.quizInProgress && prompt.toLowerCase().includes("end quiz")){
                    this.quizInProgress = false
                    this.currentQuestion = null;
                    this.correctAnswer = null;
                    this.lastAnsweredBy = null;
                    immediateLocalResponse = "The quiz has ended. Thanks for playing!";
                } else if (this.quizInProgress && this.currentQuestion && this.correctAnswer){
                    isQuizAnswer = true;
                    immediateLocalResponse = this.validateQuizAnswer(prompt);
                }else if (this.quizInProgress){
                    immediateLocalResponse = `I'm in quiz mode right now. Type "start quiz [topic]" to start a new quiz, "next question" for another question, or "end quiz" to finish.`;
                } else {
                    this.conversationHistory.push({ role: "user", content: formattedPrompt });
                }
                break
            default:
                this.conversationHistory.push({ role: "user", content: formattedPrompt });
                break
        }
        if(immediateLocalResponse !== null || isQuizAnswer) {
            return immediateLocalResponse;
        }
        try {
            if(mode==='quizmaster' && this.quizInProgress){
                const res = await axios.post(
                    "http://bappity.net:11434/v1/chat/completions",
                    {
                        model: "deepseek-r1:1.5b",
                        messages: this.conversationHistory, // IMPORTANT! the entire history must be pushed here, not just one single message.
                    },
                    { headers: {"Content-Type": "application/json" } }
                );
                const fullText = res.data.choices?.[0]?.message?.content || "";
                this.conversationHistory.push({ role:"assistant", content: fullText.trim() });
                return fullText;
            }else{
                const response = await axios.post(
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
                let previousFullContent = "";
            
                jsonStreamService.on("data", (data) => {
                    try {
                        const textData = data.toString().trim();
                        if (textData === "[DONE]") return; // Ignore the [DONE] marker
                        const parsedData = JSON.parse(textData);
                        if (parsedData.fullContent) {
                            const newFull = parsedData.fullContent;
                            const diff = newFull.substring(previousFullContent.length);
                            previousFullContent = newFull;
                            assistantMessage = newFull;
                            if (mode == "quizmaster") {
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
                        const cleaned = assistantMessage.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
                        this.conversationHistory.push({ role: "assistant", content: cleaned });
                    }
                });

                return jsonStreamService;
            }
        } catch (error) {
            console.error("Chat API Error:", error);
            throw new Error("Error occurred while fetching response");
        }
    }
    validateQuizAnswer(prompt){
        let username = "";
        let userAnswer = prompt;
        const colonIndex = prompt.indexOf(':');
        if (colonIndex > 0) {
            username = prompt.substring(0, colonIndex).trim();
            userAnswer = prompt.substring(colonIndex+1).trim();
        }
        if (this.isCorrectAnswer(userAnswer, this.correctAnswer)){
            if(this.lastAnsweredBy){
                return `That's correct, ${username}! But ${this.lastAnsweredby} already answered this question correctly. The answer is ${this.correctAnswer}. Type "next question" for another question.`;
            }else{
                this.lastAnsweredBy = username;
                return `Correct, ${username} gets 1 exp!. The answer was ${this.correctAnswer}. Type "next question" for another question.`;
            }
        }else{
            return `Sorry ${username}, that's not correct. Try again!`;
        }
    }
    isCorrectAnswer(userAnswer, correctAnswer){
        if (!userAnswer || !correctAnswer) return false

        const normalUserAnswer = userAnswer.toLowerCase().trim();
        const normalCorrectAnswer = correctAnswer.toLowerCase().trim();
        if (normalUserAnswer.includes(normalCorrectAnswer) || normalCorrectAnswer.includes(normalUserAnswer)) return true;
        return false
    }
}
