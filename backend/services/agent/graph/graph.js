import { StateGraph, START, END } from "@langchain/langgraph";
import { agentState } from "./state.js";
import { router } from "./router.js";
import { chatAgent } from "../agents/chat.agent.js";
import { codingAgent } from "../agents/coding.agent.js";
import { imageGenAgent } from "../agents/vision.agent.js";
import { pdfAgent } from "../agents/pdf.agent.js";
import { pptAgent } from "../agents/ppt.agent.js";
import { searchAgent } from "../agents/search.agent.js";
import { memory } from "../config/memory.js";

// ============================================================================
// STEP 1: INITIALIZE THE GRAPH WORKFLOW
// ============================================================================
// We create our graph using `agentState`.
// Think of `agentState` as the "shared notebook" or memory that every node
// can read from and write to as the request travels through the system.
const workFlow = new StateGraph(agentState);

// ============================================================================
// STEP 2: REGISTER NODES (THE WORKERS / ACTIONS)
// ============================================================================
// A "Node" is an independent function or worker that performs one specific job.
// We give each node a friendly name ("router", "chat", etc.) and attach its function.

// 1. Router Node: Analyzes the prompt and decides which specialist to call
workFlow.addNode("router", router);

// 2. Specialist Worker Nodes:
workFlow.addNode("chat", chatAgent);         // General conversation & Q&A
workFlow.addNode("coding", codingAgent);     // Writes, explains, or fixes code
workFlow.addNode("vision", imageGenAgent);   // Image analysis & generation
workFlow.addNode("pdf", pdfAgent);           // PDF document reading & parsing
workFlow.addNode("ppt", pptAgent);           // Presentation/slide generation
workFlow.addNode("search", searchAgent);     // Web search for live information

// ============================================================================
// STEP 3: SET THE ENTRY POINT (WHERE EXECUTION BEGINS)
// ============================================================================
// Every request entering the system starts at the "START" marker.
// This line connects START directly to "router", ensuring the router is ALWAYS
// the very first worker to receive the user's prompt.
workFlow.addEdge(START, "router");

// ============================================================================
// STEP 4: CONDITIONAL ROUTING (THE TRAFFIC CONTROLLER)
// ============================================================================
// After the "router" node finishes, it updates `state.agent` with its choice.
// `addConditionalEdges` checks that value and dynamically sends the request
// to the appropriate specialist agent.
workFlow.addConditionalEdges(
    "router", // Source node: where we are coming from
    (state) => {
        // Decision function: read the selected agent from state
        switch (state.agent) {
            case "chat":
                return "chat";
            case "coding":
                return "coding";
            case "vision":
                return "vision";
            case "pdf":
                return "pdf";
            case "ppt":
                return "ppt";
            case "search":
                return "search";
            default:
                // Safe fallback: if not recognized, default to normal chat
                return "chat";
        }
    },
    // Routing map: translates the returned string above to the target node
    {
        chat: "chat",
        coding: "coding",
        vision: "vision",
        pdf: "pdf",
        ppt: "ppt",
        search: "search"
    }
);

// ============================================================================
// STEP 5: CONNECTING EDGES (HAND-OFF BETWEEN AGENTS)
// ============================================================================
// After "search" finishes fetching web data, it forwards its results to "chat"
// so the chat agent can summarize the findings nicely for the user.
workFlow.addEdge("search", "chat");

// ============================================================================
// STEP 6: EXIT POINTS (COMPLETING THE WORKFLOW)
// ============================================================================
// Once a specialist finishes their work, we route them to the "END" marker.
// Reaching "END" tells LangGraph that the workflow is complete and ready to return.
workFlow.addEdge("chat", END);
workFlow.addEdge("coding", END);
workFlow.addEdge("vision", END);
workFlow.addEdge("pdf", END);
workFlow.addEdge("ppt", END);
workFlow.addEdge("search", END);

// ============================================================================
// STEP 7: COMPILE & EXPORT THE RUNNABLE GRAPH
// ============================================================================
// We compile the `workFlow` blueprint into an executable runnable application (`graph`).
// `.compile()` checks the graph for errors, verifies that all nodes and edges
// are reachable, and returns a ready-to-execute agent application.
//
// Now controllers or routes can directly import `graph` and run it:
//
// Example:
//   import { graph } from "./graph/graph.js";
//   const response = await graph.invoke({ prompt: "Write a React component" });
//   console.log(response.aiResponse);
export const graph = workFlow.compile({ checkpointer: memory });


/*
 ============================================================================
  WORKFLOW VISUALIZATION
 ============================================================================

                     [ START ]
                         │
                         ▼
                   ┌───────────┐
                   │  router   │  ◄── (Inspects prompt, decides which agent to pick)
                   └─────┬─────┘
                         │
        ┌─────────┬──────┴──────┬──────────┬──────────┐
        │ (chat)  │ (coding)    │ (vision) │ (pdf)    │ (ppt)
        ▼         ▼             ▼          ▼          ▼
    ┌───────┐ ┌────────┐   ┌────────┐  ┌───────┐  ┌───────┐
    │ chat  │ │ coding │   │ vision │  │  pdf  │  │  ppt  │
    └───┬───┘ └───┬────┘   └───┬────┘  └───┬───┘  └───┬───┘
        │ ▲       │            │           │          │
        │ │       │            │           │          │
  ┌─────┼─┘       │            │           │          │
  │     │         │            │           │          │
  │ (search)      │            │           │          │
  │     │         │            │           │          │
  │  ┌──┴─────┐   │            │           │          │
  │  │ search │   │            │           │          │
  │  └──┬─────┘   │            │           │          │
  │     │         │            │           │          │
  ▼     ▼         ▼            ▼           ▼          ▼
 ────────────────────────────────────────────────────────
                         │
                         ▼
                      [ END ] ◄── (Final response returned to user)
 ============================================================================
*/


