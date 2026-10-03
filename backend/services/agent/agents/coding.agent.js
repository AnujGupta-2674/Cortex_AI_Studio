import { getModel } from "../config/llmModel.js";

export const codingAgent = async (state) => {
    try {
        const llm = await getModel("coding");
        const systemPrompt = `You are an expert software engineer and technical architect.
When asked to write code, provide clean, modern, well-structured, production-ready code with clear explanations.
For frontend UI components or web apps, provide complete, self-contained HTML/CSS/JS or React code inside standard markdown code blocks (e.g. \`\`\`html or \`\`\`jsx) so the user can preview them directly in the artifact code previewer.`;

        const response = await llm.invoke([
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "human",
                content: state.prompt
            }
        ]);

        return {
            ...state,
            aiResponse: typeof response.content === "string" ? response.content : JSON.stringify(response.content)
        };
    } catch (err) {
        console.warn("Coding agent LLM error, falling back to chat LLM:", err.message);
        const fallbackLlm = await getModel("chat");
        const fallbackRes = await fallbackLlm.invoke([
            { role: "system", content: "You are an expert coding assistant. Provide clean code and explanations." },
            { role: "human", content: state.prompt }
        ]);
        return {
            ...state,
            aiResponse: typeof fallbackRes.content === "string" ? fallbackRes.content : JSON.stringify(fallbackRes.content)
        };
    }
};