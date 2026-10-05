import { getModel } from "../config/llmModel.js";

const VALID_AGENTS = ["chat", "coding", "vision", "pdf", "ppt", "search"];

export const router = async (state) => {
    // 1. If agent was explicitly selected by the user (and not "auto"), honor it immediately
    if (state.agent && VALID_AGENTS.includes(state.agent.toLowerCase().trim())) {
        const chosenAgent = state.agent.toLowerCase().trim();
        console.log(`[Router] Using explicitly requested agent: "${chosenAgent}"`);
        return {
            ...state,
            agent: chosenAgent
        };
    }

    // 2. Otherwise, use router LLM to intelligently classify user request
    const llm = await getModel("router");

    const history = state.messages || state.history || [];
    const recentHistory = Array.isArray(history) ? history.slice(-4) : [];
    const contextSnippet = recentHistory.length > 0
        ? `\nRecent conversation context:\n${recentHistory.map(m => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`).join("\n")}\n`
        : "";

    const prompt = `You are an agent router. Analyze the user's request and conversation context to decide which specialist agent to call. Return your choice as a SINGLE WORD: chat, coding, vision, pdf, ppt, or search.

Classification Guidelines:
- Return 'search' if the request asks for real-time information, latest news, current events, recent sports scores, live stock quotes, weather, facts requiring verification, or explicitly asks to search the web or internet.
- Return 'coding' if the request involves writing code, programming, debugging, refactoring, building UI widgets, or technical software architecture.
- Return 'vision' if the request asks to generate, interpret, or edit images.
- Return 'pdf' if the request asks to read, analyze, or parse a PDF document.
- Return 'ppt' if the request is about generating presentation slides or keynote outlines.
- Return 'chat' for general knowledge, creative writing, conceptual explanations, small talk, or when no other agent is needed.
${contextSnippet}
User request: ${state.prompt}`;

    try {
        const result = await llm.invoke(prompt);
        const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
        const matched = content.toLowerCase().match(/\b(chat|coding|vision|pdf|ppt|search)\b/);
        const selected = matched ? matched[1] : "chat";

        console.log(`[Router] Classified prompt to agent: "${selected}"`);
        return {
            ...state,
            agent: selected
        };
    } catch (err) {
        console.warn("[Router] Routing classification failed, defaulting to chat:", err.message);
        return {
            ...state,
            agent: "chat"
        };
    }
};