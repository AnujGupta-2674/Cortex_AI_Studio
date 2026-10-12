# 🚀 Cortex AI Studio

> **An Autonomous Multi-Agent AI Development Platform with Live Code Execution, In-Memory Quotas, and Real-Time Billing.**

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19.2-blue.svg)](https://react.dev/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-orange.svg)](https://langchain.com/langgraph)
[![Redis](https://img.shields.io/badge/Redis-In--Memory-red.svg)](https://redis.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-emerald.svg)](https://mongodb.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-purple.svg)](LICENSE)

---

## 🌟 1. Project Introduction

**Cortex AI Studio** is an enterprise-grade AI development workspace that unifies autonomous multi-agent task routing with a **Claude-style Live Interactive Artifact Sandbox**.

Instead of interacting with a single general-purpose chatbot, Cortex AI coordinates an **Autonomous Agent Mesh powered by LangGraph**. It automatically classifies user intent and routes tasks to dedicated specialist agents:
* **Coding Agent** (Google Gemini 2.5 Flash): Writes clean, self-contained frontend widgets, full-stack components, and algorithms.
* **Presentation (PPT) Agent** (Google Gemini 2.5 Flash): Generates interactive 16:9 widescreen slide decks with keyboard navigation.
* **Document (PDF) Agent** (Google Gemini 2.5 Flash): Produces executive research reports, invoices, and A4 printable documents.
* **Web Search Agent** (Google Search Grounding): Fetches real-time internet intelligence with citations.
* **Conversational Agent** (Groq / Llama 3 120B): Delivers ultra-low-latency, natural dialogue.
* **Vision Agent** (Google Gemini 2.5 Flash): Multimodal analysis and visual reasoning.

When an agent produces code, the platform compiles and executes it in real time inside an isolated, sandboxed browser iframe beside the chat window.

---

## 💡 2. Why This Project Exists

1. **The Monolithic LLM Bottleneck**: Standard AI chatbots rely on a single model. A model optimized for conversational speed often produces poor code, while a model with heavy web-search latency is frustrating for simple inquiries. Cortex AI routes prompts to the best model for the job.
2. **Static Text vs. Live Execution**: Conventional tools output static markdown code blocks that users must copy and run locally. Cortex AI's **Live Artifact Sandbox** renders generated HTML, JavaScript, CSS, and presentations directly in the browser.
3. **API Cost Explosions & Quota Abuse**: Multi-agent workflows are computationally intensive. Without strict quota controls, a few abusive users can exhaust API budgets. Cortex AI implements a **Sliding-Window Redis Rate Limiter** and an **Atomic User Credit Wallet** with **Razorpay Top-Up billing**.

---

## 🏗️ 3. How It Works (System Workflow)

```mermaid
flowchart TD
    User([User Prompt / Starter Card]) --> UI[Frontend SPA<br/><i>React 19 + Vite :5173</i>]
    
    UI -->|HTTP / HTTP-Only Cookies| GW[API Gateway :8000]
    
    subgraph GatewayChecks["Gateway Ingress Pipeline"]
        Auth[authMiddleware<br/><i>Validates session-{uuid} in Redis</i>]
        Rate[agentRateLimiter<br/><i>Redis ZSET 60s Sliding Window</i>]
    end

    GW --> Auth --> Rate
    
    Rate -->|Forward Stream| AgentSvc[Agent Service :8003]
    
    subgraph AgentExecution["LangGraph Multi-Agent Engine"]
        CreditReserve[Atomic Pre-Flight Credit Check<br/><i>Redis Lua Script: DEDUCT_CREDITS_LUA</i>]
        HistoryLoad[Context Hydration<br/><i>Redis Cache: conversation:{id}:messages</i>]
        Router[Router Node<br/><i>Groq gpt-oss-120b</i>]
        Specialist[Specialist Agent Node<br/><i>Gemini 2.5 Flash / Groq</i>]
    end

    AgentSvc --> CreditReserve
    CreditReserve -->|If Approved| HistoryLoad --> Router --> Specialist
    
    Specialist -->|AI Response Stream| UI
    Specialist -.->|Async Message Persistence| ChatSvc[Chat Service :8002<br/><i>MongoDB</i>]
    
    subgraph ClientExecution["Client-Side Presentation"]
        Typewriter[Word-by-Word Streaming Engine]
        CodeParser[codeParser.js: Regex Block Extractor]
        ArtifactSandbox[Artifact Panel: Sandboxed Iframe srcDoc]
    end

    UI --> Typewriter
    UI --> CodeParser --> ArtifactSandbox
```

---

## ⚡ 4. Key Features & Documentation Links

Detailed feature specifications are organized in the [`features/`](./features/README.md) directory:

| Feature Specification | Key Focus |
| :--- | :--- |
| **[01. Product Overview](./features/01-product-overview.md)** | Core value proposition, user journey, and problem statements. |
| **[02. Authentication & Sessions](./features/02-authentication-and-sessions.md)** | Firebase Google OAuth popup, 7-day Redis session cookies, and Gateway proxying. |
| **[03. LangGraph Multi-Agent Mesh](./features/03-langgraph-multi-agent-orchestration.md)** | Stateful cyclic graph topology, finite state machines, router intent classification, and state schemas. |
| **[04. Specialist Agents Deep-Dive](./features/04-specialist-agents.md)** | Detailed breakdown of all 6 specialist agents: Chat, Coding, Web Search, Vision, PDF, and PPT. |
| **[05. Interactive Artifact Sandbox](./features/05-interactive-artifact-sandbox.md)** | Claude-style live code execution, regex code block extraction, sandboxed iframe, and typewriter streaming. |
| **[06. Rate Limiting & Credit System](./features/06-rate-limiting-and-credit-system.md)** | Sliding-window Redis rate limiter (`ZSET`, `MULTI`, 65s TTL) and atomic Lua credit reservation. |
| **[07. Razorpay Payments & Billing](./features/07-razorpay-payments-and-billing.md)** | Pricing tiers, server-side HMAC-SHA256 signature verification, Redis idempotency locking, and audit ledger. |
| **[08. System Architecture & Data Flow](./features/08-system-architecture-and-data-flow.md)** | Microservice port topology, reverse proxy stream passthrough, and Redis in-memory caching architecture. |
| **[09. Brainstorming & Design Decisions](./features/09-brainstorming-and-design-decisions.md)** | Why midnight cron jobs failed, lazy credit replenishment, dual-wallet mechanics, and post-mortems. |
| **[10. Security, Trade-offs & Roadmap](./features/10-security-tradeoffs-and-roadmap.md)** | Defense-in-depth model, architectural trade-offs, and future roadmap (Vector DB / RAG, Webhooks, SSE). |

---

## 🛠️ 5. Technology Stack

### Frontend
- **Framework**: React 19 (`react@^19.2.x`, `react-dom@^19.2.x`)
- **Build Tool**: Vite v8 (`vite@^8.3.x`)
- **Styling**: Tailwind CSS v4 (`tailwindcss@^4.3.x`, `@tailwindcss/vite`)
- **State Management**: Redux Toolkit (`@reduxjs/toolkit@^2.13.x`)
- **Routing**: React Router v7 (`react-router-dom@^7.18.x`)
- **Authentication Client**: Firebase Web SDK (`firebase@^12.19.x`)
- **Payments**: Razorpay Checkout SDK (`checkout.js`)

### Backend Microservices
- **Runtime**: Node.js v20+ (ES Modules)
- **Web Framework**: Express v5 (`express@^5.2.x`)
- **Reverse Proxy**: `express-http-proxy`
- **Session & Security**: `cookie-parser`, `firebase-admin`, native `crypto` HMAC-SHA256
- **Database ORM**: Mongoose (`mongoose@^9.10.x`)
- **Payments SDK**: `razorpay` (`^2.9.x`)

### In-Memory & Database Layer
- **Databases**: MongoDB (Users, Conversations, Messages, CreditLedgers)
- **In-Memory Store**: Redis (Sessions, ZSET Rate Limits, Credit Balances, Message Caching, Idempotency Locks)

### AI & Agent Infrastructure
- **Orchestration**: LangGraph (`@langchain/langgraph@^1.4.x`)
- **Foundational LLMs**:
  - Google Gemini Flash (`@langchain/google-genai` / `gemini-2.5-flash`)
  - Groq LPU (`@langchain/groq` / `openai/gpt-oss-120b`)
- **Search Grounding**: Google Search Retrieval integration

---

## 📂 6. Repository Structure

```text
cortex-ai/
├── README.md                        # Master project documentation
│
├── backend/                         # Distributed backend microservices
│   ├── README.md                    # Backend architecture & API specifications
│   ├── gateway/                     # Port 8000: API Gateway & Reverse Proxy
│   ├── services/
│   │   ├── auth/                    # Port 8001: Firebase Auth & Razorpay Payments
│   │   ├── chat/                    # Port 8002: Conversation & Message CRUD
│   │   └── agent/                   # Port 8003: LangGraph AI Multi-Agent Service
│   └── shared/
│       └── redis/                   # Centralized Redis connection instance
│
├── frontend/                        # Client single-page application
│   ├── README.md                    # Frontend architecture, components & streaming
│   ├── src/
│   │   ├── components/              # ArtifactPanel, ChatInput, ChatMessage, CreditTopupModal, etc.
│   │   ├── pages/                   # Home, Login, NotFound
│   │   ├── redux/                   # Redux slices: auth, chat, agent, artifact
│   │   └── utils/                   # codeParser.js, firebase.js, storage.js
│   └── package.json
│
├── features/                        # Dedicated technical feature specifications
│   ├── README.md                    # Master navigation index and learning paths
│   ├── 01-product-overview.md
│   ├── 02-authentication-and-sessions.md
│   ├── 03-langgraph-multi-agent-orchestration.md
│   ├── 04-specialist-agents.md
│   ├── 05-interactive-artifact-sandbox.md
│   ├── 06-rate-limiting-and-credit-system.md
│   ├── 07-razorpay-payments-and-billing.md
│   ├── 08-system-architecture-and-data-flow.md
│   ├── 09-brainstorming-and-design-decisions.md
│   └── 10-security-tradeoffs-and-roadmap.md
│
└── docs/                            # Internal engineering notes (git-ignored)
```

---

## 🚀 7. Getting Started

### Prerequisites
Ensure you have the following installed locally:
- **Node.js** (v20.0.0 or higher)
- **MongoDB** running on `mongodb://localhost:27017`
- **Redis Server** running on `redis://localhost:6379`
- Google Gemini API Key and Groq API Key
- Firebase Project with Google Authentication enabled
- Razorpay Test Account credentials

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/AnujGupta-2674/Cortex_AI_Studio.git
cd Cortex_AI_Studio
```

---

### Step 2: Configure Environment Variables
Create `.env` files for each microservice using the provided `.env.example` templates:

```bash
# 1. API Gateway
cp backend/gateway/.env.example backend/gateway/.env

# 2. Auth Service
cp backend/services/auth/.env.example backend/services/auth/.env

# 3. Chat Service
cp backend/services/chat/.env.example backend/services/chat/.env

# 4. Agent Service
cp backend/services/agent/.env.example backend/services/agent/.env

# 5. Frontend
cp frontend/.env.example frontend/.env
```

Populate the required API keys (`GROQ_API_KEY`, `GEMINI_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and Firebase credentials).

---

### Step 3: Install Dependencies & Run Microservices
Open 5 terminal tabs to run all microservices concurrently in development mode:

```bash
# Terminal 1: API Gateway (:8000)
cd backend/gateway && npm install && npm run dev

# Terminal 2: Auth Service (:8001)
cd backend/services/auth && npm install && npm run dev

# Terminal 3: Chat Service (:8002)
cd backend/services/chat && npm install && npm run dev

# Terminal 4: Agent Service (:8003)
cd backend/services/agent && npm install && npm run dev

# Terminal 5: Frontend Studio (:5173)
cd frontend && npm install && npm run dev
```

Open your browser at **`http://localhost:5173`** to access Cortex AI Studio.

---

## 📖 8. Documentation Navigation

- **[Features Directory (`features/`)](./features/README.md)**: Exhaustive product, AI, and architecture guides.
- **[Backend Architecture (`backend/README.md`)](./backend/README.md)**: Microservice endpoints, data flow, and deployment.
- **[Frontend Architecture (`frontend/README.md`)](./frontend/README.md)**: UI components, live artifact execution, and Redux state.

---

## 📜 9. License

This project is licensed under the **ISC License**.
