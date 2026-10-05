import { getModel } from "../config/llmModel.js";
import { formatMessageHistory } from "../config/memory.js";

/**
 * Search Agent:
 * Conducts live internet search using Google Search grounding.
 * Extracts web findings, generated search queries, and citation links.
 * Passes the grounded knowledge and sources to the Chat Agent for user-facing synthesis.
 * 
 * @param {Object} state - The LangGraph agent state
 * @returns {Promise<Object>} Updated state with searchResults, searchQueries, and sources
 */
export const searchAgent = async (state) => {
    const rawHistory = state.messages || state.history || [];
    const formattedHistory = formatMessageHistory(rawHistory);
    const userPrompt = (state.prompt || "").trim();

    const systemPrompt = `You are a real-time web research specialist.
Your task is to search the live web to find accurate, up-to-date facts, current events, recent developments, and reliable information answering the user's inquiry.
Provide comprehensive and detailed factual findings based on real-time search results.`;

    const lastMsg = formattedHistory[formattedHistory.length - 1];
    const isCurrentPromptInHistory = lastMsg && lastMsg.role === "human" && lastMsg.content === userPrompt;

    const messages = [
        {
            role: "system",
            content: systemPrompt
        },
        ...formattedHistory,
        ...(isCurrentPromptInHistory ? [] : [{ role: "human", content: userPrompt }])
    ];

    try {
        console.log(`[Search Agent] Executing web search for prompt: "${userPrompt.slice(0, 80)}..."`);
        const searchLlm = await getModel("search");
        const response = await searchLlm.invoke(messages);

        const content = typeof response.content === "string" 
            ? response.content 
            : JSON.stringify(response.content);

        // Extract Google Search Grounding metadata (queries & web citation sources)
        const metadata = response.response_metadata?.groundingMetadata || {};
        const searchQueries = metadata.webSearchQueries || [];
        const rawChunks = metadata.groundingChunks || [];

        const sources = [];
        for (const chunk of rawChunks) {
            if (chunk?.web?.uri) {
                let hostname = "";
                try {
                    hostname = new URL(chunk.web.uri).hostname.replace(/^www\./, "");
                } catch {
                    hostname = "source";
                }

                sources.push({
                    title: chunk.web.title || hostname,
                    url: chunk.web.uri
                });
            }
        }

        // Deduplicate sources by URL and limit to top 8 most relevant
        const uniqueSources = Array.from(new Map(sources.map((s) => [s.url, s])).values()).slice(0, 8);

        console.log(`[Search Agent] Search complete. Retrieved ${uniqueSources.length} sources and ${searchQueries.length} query variations.`);

        return {
            ...state,
            agent: "search",
            searchResults: content,
            searchQueries: searchQueries.length > 0 ? searchQueries : [userPrompt],
            sources: uniqueSources
        };
    } catch (err) {
        console.error("[Search Agent] Error executing web search:", err.message);
        
        // Graceful fallback to continue workflow without crashing
        return {
            ...state,
            agent: "search",
            searchResults: `Could not complete live web search (${err.message}). Answer using internal knowledge.`,
            searchQueries: [userPrompt],
            sources: []
        };
    }
};
