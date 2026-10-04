import { getModel } from "../config/llmModel.js";
import { formatMessageHistory } from "../config/memory.js";

export const chatAgent = async (state) => {
    const llm = await getModel("chat");
    
    const systemPrompt = `You are a friendly and helpful AI assistant. Your job is to answer the user's question clearly and concisely.
If you don't know the answer, just say so.`;

    // Extract previous conversation messages from state
    const rawHistory = state.messages || state.history || [];
    const formattedHistory = formatMessageHistory(rawHistory);

    // Prevent duplicate user prompt if it was already recorded in history
    const lastMsg = formattedHistory[formattedHistory.length - 1];
    const isCurrentPromptInHistory = lastMsg && lastMsg.role === "human" && lastMsg.content === state.prompt;

    const messages = [
        {
            role: "system",
            content: systemPrompt
        },
        ...formattedHistory,
        ...(isCurrentPromptInHistory ? [] : [{ role: "human", content: state.prompt }])
    ];

    const response = await llm.invoke(messages);

    return {
        ...state,
        aiResponse: typeof response.content === "string" ? response.content : JSON.stringify(response.content)
    };  
};