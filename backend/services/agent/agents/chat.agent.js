import { getModel } from "../config/llmModel.js"

export const chatAgent = async (state) => {
    const llm = await getModel("chat");
    
    const systemPrompt = `You are a friendly and helpful AI assistant. Your job is to answer the user's question clearly and concisely.
    User's Question:${state.prompt}
    If you don't know the answer, just say so.`;

    const response = await llm.invoke([
        {
            role:"system",
            content:systemPrompt
        },
        {
            role: "human",
            content:state.prompt
        }
    ]);

    return {
        ...state,
        aiResponse: response.content
    };  
}