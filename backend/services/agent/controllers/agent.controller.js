import axios from "axios";
import { graph } from "../graph/graph.js";
import { getMessages, appendMessageToCache } from "../utils/getMessages.js";
import {
    AGENT_CREDIT_COSTS,
    reserveCredits,
    refundCredits,
    recordLedgerAsync,
} from "../utils/creditManager.js";

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || "http://localhost:8002";

/**
 * List of registered agents and their capabilities with credit cost
 */
const AVAILABLE_AGENTS = [
    {
        id: "chat",
        name: "Conversational Agent",
        description: "General Q&A and friendly interactive chat assistant",
        model: "Groq (openai/gpt-oss-120b)",
        credits: AGENT_CREDIT_COSTS.chat,
    },
    {
        id: "coding",
        name: "Coding Agent",
        description: "Code generation, debugging, code review, and technical solutions",
        model: "Gemini (gemini-2.5-flash)",
        credits: AGENT_CREDIT_COSTS.coding,
    },
    {
        id: "vision",
        name: "Vision & Image Agent",
        description: "Image generation, image interpretation, and visual understanding",
        model: "Gemini (gemini-2.5-flash)",
        credits: AGENT_CREDIT_COSTS.vision,
    },
    {
        id: "pdf",
        name: "PDF Document Agent",
        description: "Professional PDF reports, invoices, whitepapers, and printable documents",
        model: "Gemini (gemini-2.5-flash)",
        credits: AGENT_CREDIT_COSTS.pdf,
    },
    {
        id: "ppt",
        name: "Presentation Agent",
        description: "Interactive 16:9 presentation slide decks, keynotes, and pitch decks",
        model: "Gemini (gemini-2.5-flash)",
        credits: AGENT_CREDIT_COSTS.ppt,
    },
    {
        id: "search",
        name: "Web Search Agent",
        description: "Live internet search and real-time knowledge retrieval",
        model: "Gemini + Google Search Grounding",
        credits: AGENT_CREDIT_COSTS.search,
    }
];

/**
 * Helper to build auth headers for calling Chat Service
 */
const getChatServiceHeaders = (req) => {
    const userId = req.headers["x-user-id"] || req.user?.userId || req.body?.userId || "anonymous";
    const headers = {
        "Content-Type": "application/json",
        "x-user-id": String(userId)
    };

    if (req.headers["x-user"]) headers["x-user"] = req.headers["x-user"];
    if (req.headers.cookie) headers.cookie = req.headers.cookie;
    if (req.headers.authorization) headers.authorization = req.headers.authorization;

    return headers;
};

/**
 * Controller to execute the LangGraph Agent Workflow
 * Accepts a user prompt and optional conversationId.
 * Creates/appends to conversation and saves user & assistant messages via Chat Service.
 * Enforces atomic credit reservation and write-behind settlement.
 */
export const runAgent = async (req, res) => {
    let creditReservation = null;
    let creditCost = 1;
    let userId = null;

    try {
        const { prompt, message, query, agent, conversationId } = req.body;
        const userPrompt = (prompt || message || query || "").trim();

        if (!userPrompt) {
            return res.status(400).json({
                success: false,
                message: "A prompt is required. Please provide 'prompt', 'message', or 'query' in the request body."
            });
        }

        userId = req.headers["x-user-id"] || req.user?.userId || req.body?.userId;
        const requestedAgent = (agent || req.headers["x-agent-type"] || "chat").toLowerCase().trim();
        creditCost = AGENT_CREDIT_COSTS[requestedAgent] || AGENT_CREDIT_COSTS.default;

        // 1. Pre-flight Atomic Credit Reservation
        if (userId && userId !== "anonymous") {
            creditReservation = await reserveCredits(userId, creditCost);
            if (!creditReservation.success) {
                return res.status(402).json({
                    success: false,
                    error: "InsufficientCredits",
                    message: `Insufficient credits to run ${requestedAgent.toUpperCase()} Agent. Required: ${creditCost}, available: ${creditReservation.currentCredits}. Please top up your account.`,
                    requiredCredits: creditCost,
                    currentCredits: creditReservation.currentCredits,
                });
            }
        }

        const headers = getChatServiceHeaders(req);
        let activeConversationId = conversationId;

        // 2. Ensure conversation exists; if not provided, create a new one
        if (!activeConversationId) {
            try {
                const autoTitle = userPrompt.length > 35 
                    ? `${userPrompt.slice(0, 32)}...` 
                    : userPrompt;

                const createConvRes = await axios.post(
                    `${CHAT_SERVICE_URL}/conversations`,
                    { title: autoTitle },
                    { headers, timeout: 5000 }
                );

                if (createConvRes.data?.conversation?._id) {
                    activeConversationId = createConvRes.data.conversation._id;
                }
            } catch (convErr) {
                console.warn("Could not create conversation in chat service:", convErr.response?.data || convErr.message);
            }
        }

        // 3. Fetch previous conversation messages so the AI remembers context
        let pastMessages = [];
        if (activeConversationId) {
            try {
                pastMessages = await getMessages(activeConversationId, headers);
            } catch (histErr) {
                console.warn("Could not fetch conversation history from chat service:", histErr.message);
            }
        }

        // 4. Record the User's Message in the conversation
        let savedUserMessage = null;
        if (activeConversationId) {
            try {
                const userMsgRes = await axios.post(
                    `${CHAT_SERVICE_URL}/conversations/${activeConversationId}/messages`,
                    {
                        content: userPrompt,
                        role: "user"
                    },
                    { headers, timeout: 5000 }
                );
                savedUserMessage = userMsgRes.data?.data || null;
                if (savedUserMessage) {
                    await appendMessageToCache(activeConversationId, savedUserMessage);
                }
            } catch (msgErr) {
                console.warn("Could not save user message in chat service:", msgErr.response?.data || msgErr.message);
            }
        }

        // 5. Prepare input state and execute the compiled LangGraph workflow with conversation memory
        const initialState = {
            prompt: userPrompt,
            agent: agent ? agent.toLowerCase().trim() : undefined,
            aiResponse: "",
            messages: pastMessages,
            history: pastMessages
        };

        let result;
        try {
            result = await graph.invoke(initialState, {
                configurable: { thread_id: String(activeConversationId || "default") }
            });
        } catch (graphError) {
            // Refund reserved credits if the agent graph workflow fails
            if (creditReservation && userId && userId !== "anonymous") {
                await refundCredits(userId, creditCost, "graph_execution_error");
            }
            throw graphError;
        }

        const aiResponse = result.aiResponse || "No response generated by agent.";

        // 6. Record the Assistant's Response in the conversation
        let savedAssistantMessage = null;
        if (activeConversationId) {
            try {
                const assistantMsgRes = await axios.post(
                    `${CHAT_SERVICE_URL}/conversations/${activeConversationId}/messages`,
                    {
                        content: aiResponse,
                        role: "assistant"
                    },
                    { headers, timeout: 5000 }
                );
                savedAssistantMessage = assistantMsgRes.data?.data || null;
                if (savedAssistantMessage) {
                    await appendMessageToCache(activeConversationId, savedAssistantMessage);
                }
            } catch (msgErr) {
                console.warn("Could not save assistant message in chat service:", msgErr.response?.data || msgErr.message);
            }
        }

        // 7. Asynchronously record write-behind ledger audit entry
        if (creditReservation && userId && userId !== "anonymous") {
            recordLedgerAsync({
                userId,
                amount: -creditCost,
                balanceAfter: creditReservation.remainingCredits,
                action: "agent_run",
                agentType: result.agent || requestedAgent,
                metadata: {
                    conversationId: activeConversationId || null,
                    cost: creditCost,
                },
            });
        }

        // 8. Return complete structured response with conversation & message details
        return res.status(200).json({
            success: true,
            data: {
                conversationId: activeConversationId || null,
                prompt: result.prompt,
                agent: result.agent,
                response: aiResponse,
                sources: result.sources || [],
                searchQueries: result.searchQueries || [],
                remainingCredits: creditReservation ? creditReservation.remainingCredits : undefined,
                creditsDeducted: creditCost,
                messages: {
                    user: savedUserMessage,
                    assistant: savedAssistantMessage
                }
            }
        });
        
    } catch (error) {
        console.error("Error executing agent workflow:", error);

        // Refund reserved credits on uncaught controller errors
        if (creditReservation && userId && userId !== "anonymous") {
            await refundCredits(userId, creditCost, "uncaught_controller_error");
        }

        return res.status(500).json({
            success: false,
            message: "Failed to execute agent workflow.",
            error: error.message || "Internal server error"
        });
    }
};

/**
 * Controller to list all available specialist agents
 */
export const getAvailableAgents = async (req, res) => {
    return res.status(200).json({
        success: true,
        count: AVAILABLE_AGENTS.length,
        agents: AVAILABLE_AGENTS
    });
};
