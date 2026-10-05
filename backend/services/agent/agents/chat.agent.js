import { getModel } from "../config/llmModel.js";
import { formatMessageHistory } from "../config/memory.js";

/**
 * Chat Agent:
 * - General conversational Q&A and interactive assistant.
 * - When invoked after the Search Agent, synthesizes verified web findings into a
 *   clear, elegant, and citation-backed response for the user.
 * 
 * @param {Object} state - LangGraph agent state
 * @returns {Promise<Object>} Updated state with aiResponse
 */
export const chatAgent = async (state) => {
    // Extract previous conversation messages from state
    const rawHistory = state.messages || state.history || [];
    const formattedHistory = formatMessageHistory(rawHistory);

    // Prevent duplicate user prompt if it was already recorded in history
    const lastMsg = formattedHistory[formattedHistory.length - 1];
    const isCurrentPromptInHistory = lastMsg && lastMsg.role === "human" && lastMsg.content === state.prompt;

    let systemPrompt = `You are a friendly, knowledgeable, and articulate AI assistant. Your goal is to answer the user's questions clearly, concisely, and helpfully.
If you don't know the answer, just say so.`;

    let userMessageContent = state.prompt;

    // Check if live web search results were passed in from the Search Agent
    if (state.searchResults) {
        console.log(`[Chat Agent] Synthesizing search findings for prompt: "${state.prompt.slice(0, 60)}..."`);
        
        const sourcesMarkdown = Array.isArray(state.sources) && state.sources.length > 0
            ? state.sources.map((s, idx) => `${idx + 1}. [${s.title}](${s.url})`).join("\n")
            : "";

        systemPrompt = `You are Cortex AI's synthesis assistant.
A specialist Search Agent has gathered live, real-time web research findings to address the user's inquiry.
Your mission is to synthesize these search findings into an accurate, structured, and engaging response.

Guidelines:
1. Provide a direct, well-structured answer addressing the user's question.
2. Use markdown formatting (bolding, headers, bullet points) to make key takeaways easy to digest.
3. Incorporate facts, figures, and recent context accurately without fabricating information.
4. At the very end of your response, include a clean "### 🌐 Sources & References" section listing the citations as clickable markdown links (e.g., [Title](URL)).

Verified Search Findings:
${state.searchResults}

${sourcesMarkdown ? `Verified Web Sources:\n${sourcesMarkdown}` : ""}`;

        userMessageContent = `User Question: ${state.prompt}\n\nPlease provide a clear, comprehensive synthesis based on the search findings above.`;
    }

    const messages = [
        {
            role: "system",
            content: systemPrompt
        },
        ...formattedHistory,
        ...(isCurrentPromptInHistory && !state.searchResults ? [] : [{ role: "human", content: userMessageContent }])
    ];

    try {
        const llm = await getModel("chat");
        const response = await llm.invoke(messages);

        return {
            ...state,
            aiResponse: typeof response.content === "string" ? response.content : JSON.stringify(response.content)
        };
    } catch (err) {
        console.warn("[Chat Agent] Primary LLM failed, trying fallback model:", err.message);
        try {
            const fallbackLlm = await getModel("coding");
            const fallbackRes = await fallbackLlm.invoke(messages);
            return {
                ...state,
                aiResponse: typeof fallbackRes.content === "string" ? fallbackRes.content : JSON.stringify(fallbackRes.content)
            };
        } catch (fbErr) {
            console.error("[Chat Agent] Both primary and fallback LLMs failed:", fbErr.message);
            // If search results exist, return them directly rather than failing
            if (state.searchResults) {
                return {
                    ...state,
                    aiResponse: state.searchResults
                };
            }
            throw fbErr;
        }
    }
};