import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import "dotenv/config"

export const groq = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0,
    maxRetries: 2,
})

export const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    maxRetries: 2
})

export const getModel = async (agent) => {
    switch (agent) {
        case "chat":
            return groq;
        case "coding":
            return gemini;
        case "vision":
            return gemini;
        case "pdf":
            return gemini;
        case "ppt":
            return gemini;
        case "search":
            return groq;
        default:
            return groq;
    }
}