import { getModel } from "../config/llmModel.js";

export const router = async (state) => {
    const llm = await getModel("router");

    const history = state.messages || state.history || [];
    const recentHistory = Array.isArray(history) ? history.slice(-4) : [];
    const contextSnippet = recentHistory.length > 0
        ? `\nRecent conversation context:\n${recentHistory.map(m => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`).join("\n")}\n`
        : "";

    const prompt = `You are an agent router. Analyze the user's request and conversation context to decide which agent to call. Return your choice as a single word: chat, coding, vision, pdf, ppt, or search. If unsure, default to chat.${contextSnippet}
User request: ${state.prompt}`;

    const result = await llm.invoke(prompt);
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    const matched = content.toLowerCase().match(/\b(chat|coding|vision|pdf|ppt|search)\b/);

    return {
        ...state,
        agent: matched ? matched[1] : "chat"
    };
};