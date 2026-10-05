import { getModel } from "../config/llmModel.js";
import { formatMessageHistory } from "../config/memory.js";

/**
 * Presentation (PPT) Agent:
 * Generates interactive, animated 16:9 presentation slide decks, keynotes,
 * and startup pitch decks formatted in complete self-contained HTML/CSS/JS with
 * slide transitions, keyboard controls (Arrow Left/Right), progress indicators,
 * and fullscreen support.
 * 
 * @param {Object} state - LangGraph agent state
 * @returns {Promise<Object>} Updated state with aiResponse and agent: "ppt"
 */
export const pptAgent = async (state) => {
    const rawHistory = state.messages || state.history || [];
    const formattedHistory = formatMessageHistory(rawHistory);
    const userPrompt = (state.prompt || "").trim();

    const systemPrompt = `You are Cortex AI's specialized Presentation & Slide Deck Architect Agent.
Your mission is to generate comprehensive, compelling, visually captivating, and interactive slide presentations (pitch decks, keynote outlines, architecture deep-dives, or lecture slides) based on the user's request.

Requirements:
1. Provide a concise executive overview and slide-by-slide agenda in markdown.
2. In the same response, provide the COMPLETE, self-contained, production-ready interactive presentation inside a standard \`\`\`html code block with a top comment \`<!-- Title: [Deck Title] Interactive Deck -->\`.
3. Design Specifications for the Interactive HTML Slide Deck:
   - Layout & Aspect Ratio:
     * Modern 16:9 widescreen presentation container (e.g., width: 100%, max-width: 960px, aspect-ratio: 16 / 9, or fixed 960px x 540px with responsive scaling).
     * Center the slide deck with a sleek dark ambient background (\`#07090e\`).
   - Presentation Architecture:
     * Create 4 to 6 distinct, rich slides.
     * Slide 1: High-impact Title Slide (Main Title, Subtitle, Presenter/Date, Glowing Category Badge).
     * Slide 2: Problem & Market Opportunity (Pain points with red/amber accent tags, market stats).
     * Slide 3: Solution & Core Architecture (Key pillars, system diagram cards with icons, technical advantages).
     * Slide 4: Data & Performance Metrics (3-4 big stat counters, e.g. "99.9%", "10x", "<50ms").
     * Slide 5: Roadmap & Milestones or Business Model.
     * Slide 6: Summary & Call-to-Action.
   - Interactive Navigation Controls:
     * Floating or bottom control bar with:
       - "◀ Prev" and "Next ▶" buttons with hover states.
       - Slide Indicator Counter (e.g., "Slide 1 of 5").
       - Direct jump dots (clickable pills representing each slide).
       - Top or bottom smooth animated Progress Bar (\`width: (index + 1) / total * 100%\`).
       - Fullscreen toggle (\`document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()\`).
       - Return to Chat helper: Include an unobtrusive floating button "← Return to Cortex AI Chat" (\`onclick="window.close()"\`) so the user can easily exit or close the presentation tab.
       - CRITICAL RULE: NEVER replace or redirect the current window (never do \`window.location = ...\`). The user must always be able to easily return to their Cortex AI chat conversation.
     * Keyboard Navigation: Listen to \`keydown\` events for \`ArrowRight\`, \`ArrowLeft\`, \`Space\` (next), and \`Backspace\` (prev).
     * Slide Transition: Smooth opacity and transform animations (\`opacity 0.4s ease, transform 0.4s ease\`).
4. The code must be 100% self-contained with all CSS and vanilla JavaScript inside the HTML document so it can be previewed live and interacted with immediately in the Artifact panel.`;

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
        console.log(`[PPT Agent] Generating interactive presentation deck for: "${userPrompt.slice(0, 70)}..."`);
        const llm = await getModel("ppt");
        const response = await llm.invoke(messages, { signal: AbortSignal.timeout(35000) });

        const aiResponse = typeof response.content === "string" 
            ? response.content 
            : JSON.stringify(response.content);

        return {
            ...state,
            agent: "ppt",
            aiResponse
        };
    } catch (err) {
        console.warn("[PPT Agent] Primary LLM failed, trying fallback chat LLM:", err.message);
        try {
            const fallbackLlm = await getModel("chat");
            const fallbackRes = await fallbackLlm.invoke(messages);
            return {
                ...state,
                agent: "ppt",
                aiResponse: typeof fallbackRes.content === "string" ? fallbackRes.content : JSON.stringify(fallbackRes.content)
            };
        } catch (fbErr) {
            console.error("[PPT Agent] Failed to generate PPT deck:", fbErr.message);
            throw fbErr;
        }
    }
};