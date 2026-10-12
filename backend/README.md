# ⚙️ Cortex AI — Backend Architecture & Microservices

Welcome to the backend engineering documentation for **Cortex AI Studio**. 

The backend is organized as a distributed, high-performance Node.js microservice architecture coordinating API routing, Firebase session validation, persistent chat storage, LangGraph AI orchestration, atomic credit management, and Razorpay billing.

---

## 1. Architecture & Service Topology

```mermaid
flowchart TD
    Client["Client Request"] --> GW["API Gateway :8000"]
    
    subgraph GatewayMiddleware["Gateway Ingress Middleware"]
        AuthMid["authMiddleware<br/><i>Redis Session Validator</i>"]
        RateMid["agentRateLimiter<br/><i>Redis ZSET 60s Sliding Window</i>"]
    end

    GW --> AuthMid --> RateMid

    RateMid -->|/api/auth & /api/payments| AuthSvc["Auth & Payment Service :8001"]
    RateMid -->|/api/chat| ChatSvc["Chat & History Service :8002"]
    RateMid -->|/api/agent| AgentSvc["Agent Orchestration Service :8003"]

    AuthSvc --> MongoDB_Auth[("MongoDB: Auth DB")]
    AuthSvc --> Redis[("Redis In-Memory Store")]

    ChatSvc --> MongoDB_Chat[("MongoDB: Chat DB")]
    ChatSvc --> Redis

    AgentSvc --> Redis
    AgentSvc -->|Axios Message Persistence| ChatSvc
    AgentSvc --> LLMs["Groq LPU & Google Gemini Flash"]
```

---

## 2. Microservice Inventory

| Service | Port | Entrypoint | Database | Primary Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Gateway** | `:8000` | `backend/gateway/index.js` | Redis | Ingress routing, reverse proxying, distributed session checks, sliding-window rate limiting, `/api/me`. |
| **Auth** | `:8001` | `backend/services/auth/index.js` | MongoDB + Redis | Firebase Google token verification, user accounts, Razorpay payment orders & verification, credit ledger audits. |
| **Chat** | `:8002` | `backend/services/chat/index.js` | MongoDB + Redis | Thread creation, message append, conversation pagination, cascading thread deletion, search. |
| **Agent** | `:8003` | `backend/services/agent/index.js` | Redis | LangGraph cyclic graph execution, atomic credit reservation & refunds, prompt routing, model invocations. |

---

## 3. Technology Stack

- **Runtime**: Node.js (v20+ recommended, ES Modules enabled).
- **Web Framework**: Express v5 (`express@^5.2.1`).
- **Proxy Engine**: `express-http-proxy` (pure byte-stream proxying without body parsing overhead).
- **Primary Databases**: MongoDB (via `mongoose@^9.10.x`) for users, conversations, messages, and credit ledgers.
- **In-Memory Cache & Quotas**: Redis (`ioredis` / shared client) for sessions, rate limits, credit balances, and message caches.
- **AI Framework**: `@langchain/langgraph` (v1.4.x), `@langchain/google-genai`, `@langchain/groq`, `@langchain/core`.
- **Payment Gateway**: `razorpay` (v2.9.x) with Node.js native `crypto` HMAC-SHA256 signature verification.
- **Authentication**: `firebase-admin` (v14.5.x) + HTTP-only `cookie-parser`.

---

## 4. Directory Structure

```text
backend/
├── gateway/                         # Port 8000 (Ingress & Reverse Proxy)
│   ├── controllers/
│   │   └── user.controller.js       # /api/me (hydrates user profile + live Redis credits)
│   ├── middlewares/
│   │   ├── auth.middleware.js       # Validates session-{uuid} in Redis
│   │   └── rateLimiter.middleware.js# ZSET sliding-window rate limiting
│   ├── index.js                     # Gateway server setup & proxy routes
│   └── package.json
│
├── services/
│   ├── auth/                        # Port 8001 (Identity & FinTech)
│   │   ├── config/db.js             # MongoDB connection logic
│   │   ├── controllers/
│   │   │   ├── auth.controller.js   # Google OAuth handshake, session generation, logout
│   │   │   └── payment.controller.js# Razorpay orders, HMAC verify, ledger recording
│   │   ├── models/
│   │   │   ├── user.model.js        # User schema (email, name, avatar, credits)
│   │   │   └── creditLedger.model.js# Audit trail of purchases, runs, and refunds
│   │   ├── routes/
│   │   │   ├── auth.routes.js       # /login, /logout, /me
│   │   │   └── payment.routes.js    # /packages, /create-order, /verify, /balance
│   │   ├── index.js
│   │   └── package.json
│   │
│   ├── chat/                        # Port 8002 (Conversations & History)
│   │   ├── config/db.js
│   │   ├── controllers/
│   │   │   ├── conversation.controller.js # Thread CRUD, auto-titling, pagination
│   │   │   └── message.controller.js      # Message append, delete, clear
│   │   ├── models/
│   │   │   ├── conversation.model.js      # Thread schema
│   │   │   └── message.model.js           # Message schema (role: user/assistant)
│   │   ├── routes/chat.routes.js
│   │   ├── index.js
│   │   └── package.json
│   │
│   └── agent/                       # Port 8003 (LangGraph AI Engine)
│       ├── agents/                  # Specialist Agent nodes
│       │   ├── chat.agent.js        # Groq Conversational Agent
│       │   ├── coding.agent.js      # Gemini Coding & Sandbox Agent
│       │   ├── pdf.agent.js         # Gemini Printable A4 Document Agent
│       │   ├── ppt.agent.js         # Gemini Interactive 16:9 Deck Agent
│       │   ├── search.agent.js      # Gemini + Google Search Grounding
│       │   └── vision.agent.js      # Gemini Multimodal Vision Agent
│       ├── config/
│       │   ├── llmModel.js          # Groq & Gemini provider instances
│       │   └── memory.js            # Message history slicing & formatting
│       ├── controllers/
│       │   └── agent.controller.js  # Pre-flight credit check, graph invocation, refund
│       ├── graph/
│       │   ├── graph.js             # LangGraph StateGraph assembly & conditional edges
│       │   ├── router.js            # Intent classification node (Groq 120B)
│       │   └── state.js             # Annotation schema
│       ├── utils/
│       │   ├── creditManager.js     # Atomic Redis Lua script, reserve & refund
│       │   └── getMessages.js       # Sub-ms message caching & context hydration
│       ├── index.js
│       └── package.json
│
└── shared/
    └── redis/
        └── redis.js                 # Centralized Redis connection instance
```

---

## 5. API Endpoint Specifications

### A. Authentication & Payments (`Auth Service :8001`)
* `POST /api/auth/login`: Exchange Firebase ID token for 7-day HTTP-only session cookie.
* `POST /api/auth/logout`: Revoke Redis session and clear cookie.
* `GET /api/me`: Return authenticated user profile and live Redis credit balance.
* `GET /api/payments/packages`: Public list of available credit top-up tiers.
* `POST /api/payments/create-order`: Create Razorpay payment order for selected pack.
* `POST /api/payments/verify`: Cryptographically verify payment signature and credit balance atomically.
* `GET /api/payments/balance`: Fetch current credit balance for logged-in user.

### B. Conversation Management (`Chat Service :8002`)
* `POST /api/chat/conversations`: Create new conversation thread.
* `GET /api/chat/conversations`: List paginated conversation threads.
* `GET /api/chat/conversations/:id`: Retrieve single conversation metadata.
* `PATCH /api/chat/conversations/:id`: Rename conversation title.
* `DELETE /api/chat/conversations/:id`: Delete conversation and cascade-delete all messages.
* `GET /api/chat/conversations/:conversationId/messages`: Fetch conversation messages.
* `POST /api/chat/conversations/:conversationId/messages`: Append user or assistant message.
* `DELETE /api/chat/conversations/:conversationId/messages/:messageId`: Delete individual message.
* `DELETE /api/chat/conversations/:conversationId/messages`: Clear all messages in thread.

### C. Agent Execution (`Agent Service :8003`)
* `POST /api/agent`: Run autonomous LangGraph agent workflow.
  - **Body**: `{ "prompt": "Create an interactive counter", "agent": "coding", "conversationId": "..." }`
  - **Headers**: `x-user-id`, `x-agent-type`
  - **Status 200**: AI response, selected agent, remaining credit balance, saved messages.
  - **Status 402**: Insufficient credits.
  - **Status 429**: Rate limit exceeded.
* `GET /api/agent/agents`: List all available specialist agents with credit costs and model backings.

---

## 6. Environment Configuration

### Gateway (`backend/gateway/.env`)
```bash
PORT=8000
AUTH_SERVICE=http://localhost:8001
CHAT_SERVICE=http://localhost:8002
AGENT_SERVICE=http://localhost:8003
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Auth Service (`backend/services/auth/.env`)
```bash
PORT=8001
MONGO_URI=mongodb://localhost:27017/cortex_auth
REDIS_HOST=localhost
REDIS_PORT=6379
RAZORPAY_KEY_ID=rzp_test_YourTestKeyHere
RAZORPAY_KEY_SECRET=YourTestSecretHere
# Firebase service account credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Chat Service (`backend/services/chat/.env`)
```bash
PORT=8002
MONGO_URI=mongodb://localhost:27017/cortex_chat
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Agent Service (`backend/services/agent/.env`)
```bash
PORT=8003
CHAT_SERVICE_URL=http://localhost:8002
AUTH_SERVICE_URL=http://localhost:8001
REDIS_HOST=localhost
REDIS_PORT=6379
GROQ_API_KEY=gsk_your_groq_api_key_here
GEMINI_API_KEY=your_google_gemini_api_key_here
```

---

## 7. Local Installation & Startup

### Prerequisites
- Node.js (v20+ recommended)
- MongoDB instance running on `localhost:27017`
- Redis server running on `localhost:6379`

### Starting the Microservices
In separate terminal windows, start each service in development mode:

```bash
# 1. API Gateway (:8000)
cd backend/gateway && npm install && npm run dev

# 2. Auth Service (:8001)
cd backend/services/auth && npm install && npm run dev

# 3. Chat Service (:8002)
cd backend/services/chat && npm install && npm run dev

# 4. Agent Service (:8003)
cd backend/services/agent && npm install && npm run dev
```

### Health Check Verification
Verify that microservices are operational:
```bash
curl http://localhost:8001/health   # Auth Service Health
curl http://localhost:8002/health   # Chat Service Health
curl http://localhost:8000/api/payments/packages # Gateway Proxy Check
```
