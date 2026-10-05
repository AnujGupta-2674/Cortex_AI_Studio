import { getModel } from "../config/llmModel.js";
import { formatMessageHistory } from "../config/memory.js";

/**
 * PDF Document Agent:
 * Generates professional, print-ready PDF reports, whitepapers, invoices, resumes,
 * and research briefs formatted in complete self-contained HTML/CSS with A4 pagination,
 * print stylesheets, and one-click PDF printing.
 * 
 * @param {Object} state - LangGraph agent state
 * @returns {Promise<Object>} Updated state with aiResponse and agent: "pdf"
 */
export const pdfAgent = async (state) => {
    const rawHistory = state.messages || state.history || [];
    const formattedHistory = formatMessageHistory(rawHistory);
    const userPrompt = (state.prompt || "").trim();

    const systemPrompt = `You are Cortex AI's specialized Document & PDF Generation Agent.
Your mission is to generate comprehensive, professional, beautifully styled, and print-ready documents (reports, whitepapers, proposals, invoices, resumes, or executive briefs) based on the user's inquiry.

Requirements:
1. Provide a concise executive overview and structural summary of the document in markdown.
2. In the same response, provide the COMPLETE, self-contained, production-ready HTML document inside a standard \`\`\`html code block with a top comment \`<!-- Title: [Document Title] PDF Document -->\`.
3. Design Specifications for the HTML document:
   - Typography: Clean Google Fonts (e.g., Plus Jakarta Sans, Inter, or Merriweather for editorial elegance).
   - Layout: Professional A4 dimensions (e.g., max-width: 800px, centered with subtle box-shadow for screen preview, margins: 0 auto).
   - Document Elements:
     * Header with corporate branding/badge, Document Title, Subtitle, Date, Document ID, and Author.
     * Summary Metrics Cards (e.g. 2-4 key numbers or KPIs in glowing or clean bordered boxes).
     * Structured Content Sections with numbered headings (##, ###).
     * Clean Data Tables with alternating row shading, bold headers, and rounded borders.
     * Highlight Callout Boxes (e.g., Key Takeaways, Important Notes, or Recommendations).
     * Formal Footer with page numbers and confidentiality/copyright note.
   - Print & PDF Capabilities:
     * Include an embedded \`@media print\` stylesheet that hides screen-only controls, removes outer shadows, and supports clean page breaks (\`page-break-after: always; break-after: page;\`).
     * Include a floating or top toolbar with a \`Print / Save as PDF\` button (\`onclick="window.print()"\`) with class \`no-print\`.
4. The code must be 100% self-contained with all CSS inside \`<style>\` tags so it renders immediately in the live Artifact preview without external file dependencies.`;

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
        console.log(`[PDF Agent] Generating printable PDF document for: "${userPrompt.slice(0, 70)}..."`);
        const llm = await getModel("pdf");
        const response = await llm.invoke(messages, { signal: AbortSignal.timeout(35000) });

        const aiResponse = typeof response.content === "string" 
            ? response.content 
            : JSON.stringify(response.content);

        return {
            ...state,
            agent: "pdf",
            aiResponse
        };
    } catch (err) {
        console.warn("[PDF Agent] Primary LLM failed, trying fallback chat LLM:", err.message);
        try {
            const fallbackLlm = await getModel("chat");
            const fallbackRes = await fallbackLlm.invoke(messages);
            return {
                ...state,
                agent: "pdf",
                aiResponse: typeof fallbackRes.content === "string" ? fallbackRes.content : JSON.stringify(fallbackRes.content)
            };
        } catch (fbErr) {
            console.error("[PDF Agent] Failed to generate PDF document:", fbErr.message);
            throw fbErr;
        }
    }
};
