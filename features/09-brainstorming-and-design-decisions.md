# 💡 Brainstorming, Architecture Decisions & Incident Post-Mortems

This document preserves the engineering rationale, alternatives explored, technical trade-offs, and incident post-mortems conducted throughout the development of Cortex AI Studio.

---

## 1. Decision History & Incident Analysis

### Incident 1: The 5K–10K Request/Second Infinite Auth Loop
* **Initial Symptom**: Clicking "Open Cortex AI Studio" triggered 3,000 to 10,000 requests per second to `/api/me`, causing 100% CPU lockup and browser crashes.
* **Root Cause Discovered**:
  - `Home.jsx` triggered `fetchCurrentUser()` inside `useEffect`.
  - Pending action set `isCheckingAuth = true` in Redux.
  - `ProtectedRoute` in `App.jsx` rendered `<Spinner />`, immediately unmounting `Home.jsx`.
  - Because localhost response took `<0.5ms`, `isCheckingAuth` flipped back to `false`, remounting `Home.jsx`.
  - Remounting re-executed `useEffect`, initiating an endless mount-fetch-unmount-remount loop.
* **Resolution**:
  - Confined authentication checks to top-level `App.jsx`.
  - Added an authentication guard in `ProtectedRoute` (`isCheckingAuth && !isAuthenticated`) so background revalidations never unmount active pages.

---

### Decision 2: Why Midnight Database Cron Jobs Were Rejected for Daily Credits
* **The Problem**: How to provide free daily credits (e.g. 50 credits/day) without overloading the database at midnight.
* **Alternative 1 Considered (Midnight Cron)**:
  - Run a scheduled job at 12:00 AM: `User.updateMany({}, { $inc: { credits: 50 } })`.
  - **Why Rejected**: If the platform grows to 100,000+ users, running bulk writes simultaneously at midnight causes massive database locks, CPU spikes, and degrades active chat performance. Crucially, 80% of those database writes are wasted on inactive users who will not visit the app that day.
* **Selected Approach (Lazy Accrual / On-Demand Replenishment)**:
  - Zero background midnight cron jobs.
  - When an active user logs in or sends a prompt, the system calculates `daysPassed = today - lastAccrualDate`.
  - Instantly computes `Math.min(currentCredits + (daysPassed * 50), MAX_CAP)` in Redis (`<0.1ms`).
  - Active users receive their credits instantly; inactive users consume zero database I/O.

---

### Decision 3: The Dual-Wallet Model & "Burn Free First" Priority
* **The Problem**: Users have both daily free credits and paid lifetime credits purchased via Razorpay. How should deductions be ordered?
* **Alternative Considered**: Burn paid credits first.
  - **Why Rejected**: Burning paid credits first would cause the user's free daily quota to expire unused at midnight, generating frustration and distrust.
* **Selected Approach ("Burn Free First")**:
  - Deductions always exhaust the ephemeral free quota first.
  - Only when free credits reach zero does the system draw from the user's permanent paid balance.
  - Paid credits have lifetime validity and never expire.

---

### Decision 4: Carry-Forward (Rollover) Mechanics & The "Max Cap" Requirement
* **The Problem**: What happens if a user does not use their 50 daily credits? Should they roll over indefinitely?
* **Why Uncapped Rollover is Dangerous in AI Platforms**:
  - LLMs (Groq, Gemini Flash, OpenAI) incur real API token costs for every word generated.
  - If a free user accumulates 50 credits/day without a ceiling, a bot network of 1,000 accounts could sit dormant for 6 months, accumulate 9,000 credits per account, and execute massive automated scraping attacks, resulting in catastrophic API bills.
* **Selected Approach (Capped Rollover)**:
  - Daily credits carry forward, but with a hard ceiling (e.g., `MAX_FREE_CAP = 150 credits`).
  - Active, loyal users accumulate up to 3 days of buffer, while platform financial risk remains strictly bounded.

---

### Decision 5: Why `multi.expire(key, 65)` Uses 65s Instead of 60s
* **The Question**: If `zremrangebyscore` already removes requests older than 60 seconds, why is `expire(key, 65)` necessary?
* **Dual Purpose Identified**:
  1. **Garbage Collection**: `zremrangebyscore` only runs when an active request arrives. If a user sends prompts and closes their laptop, `zremrangebyscore` will never run again. Without `expire`, the user's rate-limit key would sit in Redis RAM forever.
  2. **5-Second Grace Buffer**: Exact 60-second expiration risks boundary race conditions where a key is deleted while a request at second 59.9 is being evaluated. The 5-second buffer absorbs clock drift and network jitter safely.

---

### Decision 6: Client-Side Iframe Sandbox vs Server-Side Execution (VM2)
* **The Problem**: How to render and execute user-requested UI widgets, presentations, and code.
* **Alternative Considered (Server-Side Sandboxing / VM2 / Docker)**:
  - Execute code on a backend container and stream screenshots or video back to client.
  - **Why Rejected**: Prohibitive server compute costs, latency delays, and security attack surfaces.
* **Selected Approach (Client-Side Sandboxed Iframe with `srcDoc`)**:
  - Renders code directly inside the user's browser using an iframe with `sandbox="allow-scripts allow-modals allow-forms"`.
  - Omits `allow-same-origin`, completely isolating the widget from the parent window's cookies, sessions, and storage.
  - Zero server compute overhead; instantaneous interactive responsiveness.
