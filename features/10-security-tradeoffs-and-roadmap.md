# 🔒 Security Architecture, Trade-offs & Future Roadmap

## 1. Security Architecture & Threat Defenses

Cortex AI implements a **Defense-in-Depth** security model across all tiers:

```
[ Ingress / Client ]
      │
      ├── 1. CORS Whitelist (Restricts frontend origins :5173, :5174)
      ├── 2. HTTP-Only Cookies (Session tokens unreachable via document.cookie; XSS-proof)
      │
[ API Gateway (:8000) ]
      │
      ├── 3. Redis Sliding-Window Rate Limiter (Blocks volumetric DDoS & brute-force)
      ├── 4. Pure Stream Proxying (Omission of body parsers eliminates prototype pollution)
      │
[ Internal Microservices (:8001, :8002, :8003) ]
      │
      ├── 5. Cryptographic HMAC-SHA256 (Verifies Razorpay payments server-side)
      ├── 6. Redis Idempotency Locks (Eliminates payment replay & double-crediting attacks)
      ├── 7. Atomic Redis Lua Scripts (Prevents concurrent double-spending of credits)
      │
[ Browser Sandbox ]
      │
      └── 8. Sandboxed Iframe (srcDoc without allow-same-origin isolates AI code)
```

---

## 2. Documented Engineering Trade-offs

| Decision | Prioritized Attribute | Compromised / Sacrificed | Justification |
| :--- | :--- | :--- | :--- |
| **Fail-Open Rate Limiter** | High Availability | Absolute Strictness | If Redis is momentarily unreachable during maintenance, API traffic is allowed through rather than taking down the entire studio. |
| **Context Window Slicing (`slice(-20)`)** | Cost Control & Latency | Full Historical Recall | Retaining unlimited conversation turns in system prompts would exhaust LLM token limits and create exponential latency. The latest 20 turns preserve working memory. |
| **Client-Side Artifact Execution** | Zero Server Compute & Speed | Node.js Runtime Support | Executing code in an iframe is instantaneous and serverless, but limits execution to browser-supported technologies (HTML/JS/CSS/SVG) rather than backend Python or C++. |
| **Client Verification vs Webhooks** | Local Development Simplicity | Disconnect Redundancy | Client-to-server HMAC verification operates seamlessly on `localhost:8000` without requiring external tunneling utilities (`ngrok`). Webhooks serve as the production redundancy layer. |

---

## 3. Future Roadmap

### Phase 1: Semantic Long-Term Memory (RAG + Vector DB)
* **Goal**: Enable the assistant to recall conversations, user preferences, and code snippets discussed months ago.
* **Architecture**:
  - Integrate **Qdrant** or **Pinecone** vector databases.
  - Chunk and embed conversation transcripts using Google `text-embedding-004`.
  - Retrieve top-k semantic context when user references past topics, supplementing the active 20-message window.

### Phase 2: Server-Side Webhook Listener
* **Goal**: Provide 100% payment capture redundancy if a user closes their browser tab immediately after UPI authorization.
* **Architecture**:
  - Mount `POST /api/payments/webhook` in the Auth Service.
  - Verify Razorpay webhook secret.
  - Listen for `order.paid` and `payment.captured` events to atomically credit the user's account asynchronously.

### Phase 3: Direct Git & Export Integrations
* **Goal**: Allow users to push Artifact components directly into developer workflows.
* **Features**:
  - "Export to GitHub Gist" button in the Artifact Panel.
  - "Open in CodeSandbox / StackBlitz" integration for rapid prototyping.
  - Download presentation decks as standalone HTML/ZIP archives.

### Phase 4: True Server-Sent Events (SSE) LLM Streaming
* **Goal**: Transition from frontend token-simulation streaming to true backend SSE token pipes.
* **Architecture**:
  - Stream tokens from Gemini and Groq LangGraph nodes over chunked HTTP streams (`text/event-stream`) through the Gateway proxy directly into the React message thread.
