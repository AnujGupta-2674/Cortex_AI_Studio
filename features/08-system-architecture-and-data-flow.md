# 🏗️ System Architecture & Data Flow

## 1. Microservice Topology

Cortex AI is structured as a modular, distributed microservice architecture. Services communicate via high-speed internal HTTP and share an in-memory **Redis** cache and **MongoDB** databases.

```mermaid
flowchart TB
    Client["Frontend Client<br/><i>React 19 + Vite :5173</i>"]
    
    subgraph GatewayLayer["API Gateway Layer (:8000)"]
        GW["Express API Gateway"]
        RateLimiter["agentRateLimiter Middleware<br/><i>Redis ZSET Sliding Window</i>"]
        AuthCheck["authMiddleware<br/><i>Session Validator</i>"]
    end

    subgraph ServiceMesh["Backend Microservice Mesh"]
        AuthSvc["Auth & Payment Service<br/><i>Port :8001</i>"]
        ChatSvc["Chat & Conversation Service<br/><i>Port :8002</i>"]
        AgentSvc["Agent Service<br/><i>Port :8003 | LangGraph</i>"]
    end

    subgraph DataLayer["Data & Persistence Layer"]
        Redis[("Redis In-Memory Data Store<br/><i>Sessions, Credits, Caches</i>")]
        MongoAuth[("MongoDB: Auth DB<br/><i>Users, CreditLedger</i>")]
        MongoChat[("MongoDB: Chat DB<br/><i>Conversations, Messages</i>")]
    end

    subgraph External["External AI & Payment Providers"]
        Groq["Groq LPU<br/><i>openai/gpt-oss-120b</i>"]
        Gemini["Google Gemini<br/><i>gemini-2.5-flash</i>"]
        Rzp["Razorpay API<br/><i>Orders & Webhooks</i>"]
        Firebase["Firebase Admin<br/><i>Google Auth Verify</i>"]
    end

    Client -->|HTTP / Cookies| GW
    GW --> AuthCheck
    AuthCheck -.->|Session Verify| Redis
    GW --> RateLimiter
    RateLimiter -.->|Sliding Window Check| Redis

    GW -->|/api/auth & /api/payments| AuthSvc
    GW -->|/api/chat| ChatSvc
    GW -->|/api/agent| AgentSvc

    AuthSvc --> MongoAuth
    AuthSvc --> Redis
    AuthSvc --> Rzp
    AuthSvc --> Firebase

    ChatSvc --> MongoChat
    ChatSvc --> Redis

    AgentSvc --> Redis
    AgentSvc -->|Axios Message Sync| ChatSvc
    AgentSvc --> Groq
    AgentSvc --> Gemini
```

---

## 2. Microservice Directory & Port Mapping

| Service | Port | Primary Directory | Responsibilities |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `:8000` | `backend/gateway/` | Single entry point, reverse proxy routing, session validation, sliding-window rate limiting, `/api/me`. |
| **Auth Service** | `:8001` | `backend/services/auth/` | Google OAuth token verification, user profiles, Razorpay order creation and verification, credit ledger audits. |
| **Chat Service** | `:8002` | `backend/services/chat/` | Conversation management, message CRUD, cascading thread deletions, message search. |
| **Agent Service** | `:8003` | `backend/services/agent/` | LangGraph multi-agent orchestration, atomic credit reservation & refund, specialist agent prompts, LLM invocations. |
| **Frontend** | `:5173` | `frontend/` | React 19 single-page application, Redux state management, typewriter streaming, Live Artifact Sandbox. |

---

## 3. Redis In-Memory Key Architecture

Redis serves as the high-speed data backbone of Cortex AI:

| Key Pattern | Data Structure | TTL | Purpose |
| :--- | :--- | :--- | :--- |
| `session-{uuid}` | String (JSON) | 7 Days | Authenticated user session cookie mapping. |
| `ratelimit:{userId}:{agentType}` | Sorted Set (`ZSET`) | 65 Seconds | Sliding-window request timestamps for rate limiting. |
| `user:{userId}:credits` | String (Integer) | Persistent / Hydrated | Live in-memory balance for sub-millisecond atomic checks. |
| `conversation:{id}:messages` | String (JSON Array) | 24 Hours | Recent message cache for instant context hydration without Mongo disk reads. |
| `payment:processed:{paymentId}` | String (`"1"`) | 7 Days | Idempotency lock to prevent duplicate payment crediting. |

---

## 4. Reverse Proxy Stream Passthrough Pattern

### Architectural Decision: Omission of `express.json()` at Gateway
In typical Express apps, `app.use(express.json())` is mounted globally. 
However, in an API Gateway acting as a reverse proxy via `express-http-proxy`:
- Parsing the body into memory and re-serializing it back to a stream introduces significant latency and CPU overhead.
- Streaming uploads or large payloads can corrupt or crash with `Error: Can't set headers after they are sent` or `body already read`.

**Implementation**: The Cortex AI Gateway (`backend/gateway/index.js`) mounts `cookieParser()` and routes requests as **raw HTTP byte streams directly to downstream microservices**. Body parsing occurs only at the target microservice where the payload is consumed.

---

## 5. Sub-Millisecond Context Hydration (`getMessages.js`)

When an agent is invoked, the AI needs the previous conversation history. Reading 20+ messages from MongoDB on every turn creates unacceptable latency (`20ms–50ms`).

Cortex AI implements a **Write-Through / Cache-Aside Strategy**:
1. When `runAgent` starts, it checks `redis.get("conversation:<id>:messages")`.
2. **Cache Hit (`<1ms`)**: Instantly parses messages from RAM. Zero MongoDB queries.
3. **Cache Miss**: Queries Chat Service HTTP API, fetches from MongoDB, and repopulates Redis with a 24-hour TTL.
4. **Context Window Protection**: Automatically slices the latest 20 messages (`slice(-20)`) to prevent context overflow and excessive token billing.
5. **Cache Invalidation**: Any message deletion or conversation clearing immediately triggers `redis.del("conversation:<id>:messages")`.
