import { getModel } from "../config/llmModel.js";
import { formatMessageHistory } from "../config/memory.js";

export const codingAgent = async (state) => {
    const rawHistory = state.messages || state.history || [];
    const formattedHistory = formatMessageHistory(rawHistory);

    const systemPrompt = `You are an expert software engineer and technical architect.
When asked to write code, provide clean, modern, well-structured, production-ready code with clear explanations.
For frontend UI components or web apps, provide complete, self-contained HTML/CSS/JS or React code inside standard markdown code blocks (e.g. \`\`\`html or \`\`\`jsx) so the user can preview them directly in the artifact code previewer.`;

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

    try {
        const llm = await getModel("coding");
        const response = await llm.invoke(messages);

        return {
            ...state,
            aiResponse: typeof response.content === "string" ? response.content : JSON.stringify(response.content)
        };
    } catch (err) {
        console.warn("Coding agent LLM error, falling back to chat LLM:", err.message);
        const fallbackLlm = await getModel("chat");
        const fallbackRes = await fallbackLlm.invoke(messages);
        return {
            ...state,
            aiResponse: typeof fallbackRes.content === "string" ? fallbackRes.content : JSON.stringify(fallbackRes.content)
        };
    }
};