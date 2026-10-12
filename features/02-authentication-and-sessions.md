# 🔐 Authentication & Session Management

## 1. Feature Overview
Cortex AI Studio implements a secure, hybrid authentication system:
- **Client Side**: One-click **Firebase Google Authentication** popup.
- **Server Side**: **Firebase Admin SDK** token verification combined with **Redis-backed HTTP-only session cookies** (7-day lifespan).
- **Gateway Layer**: Distributed session verification at the API Gateway (`:8000`) before proxying requests to downstream microservices.

---

## 2. Why This Architecture Was Chosen

### Problem: Direct JWTs vs Centralized Session Revocation
While stateless JWT tokens are popular, they cannot be revoked instantly if a user's account is suspended or a session is compromised without maintaining an in-memory blocklist. Furthermore, sending large JWTs in request headers across internal microservices adds unnecessary network overhead.

### Cortex AI Solution: The Hybrid Session Pattern
1. Firebase handles the identity verification and OAuth popup cleanly on the client.
2. The backend exchanges the short-lived Firebase ID token for a **Redis-backed opaque session identifier** (`session-{uuid}`).
3. The session identifier is stored in a secure, `httpOnly` cookie.
4. The API Gateway verifies the session in Redis in sub-milliseconds (`~0.5ms`) and forwards standard lightweight headers (`x-user-id` and `x-user`) to downstream microservices (`chat-service`, `agent-service`).

---

## 3. End-to-End Authentication Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Frontend (React 19)
    participant Firebase as Firebase Auth
    participant Gateway as API Gateway (:8000)
    participant AuthService as Auth Service (:8001)
    participant Redis as Redis (In-Memory)
    participant MongoDB as MongoDB (Users Collection)

    User->>Frontend: Clicks "Sign in with Google"
    Frontend->>Firebase: signInWithPopup(googleProvider)
    Firebase-->>Frontend: Returns Firebase ID Token (JWT)
    Frontend->>Gateway: POST /api/auth/login { token: idToken }
    Gateway->>AuthService: Proxy Stream to :8001/login
    AuthService->>Firebase: admin.auth().verifyIdToken(idToken)
    Firebase-->>AuthService: Decoded token (email, name, picture, uid)
    AuthService->>MongoDB: User.findOneAndUpdate({ googleId }, { ... }, { upsert: true })
    MongoDB-->>AuthService: Returns User Document (credits: 50)
    AuthService->>Redis: SET session-{uuid} (7-day TTL)
    AuthService-->>Gateway: HTTP 200 + Set-Cookie: session=session-{uuid}; HttpOnly
    Gateway-->>Frontend: HTTP 200 + User Object
    Frontend->>Frontend: Updates Redux authSlice & navigates to Studio (/)
```

---

## 4. Key Components & Implementation Files

### A. Client Handshake (`frontend/src/redux/slices/authSlice.js`)
* Triggers `signInWithPopup(auth, googleProvider)`.
* Retrieves the raw ID token via `await credentials.user.getIdToken()`.
* Dispatches `POST /api/auth/login` to the Gateway.
* Caches user profile in `authStorage` (local storage with 7-day TTL) for optimistic UI rendering during page reloads.

### B. Auth Service Controller (`backend/services/auth/controllers/auth.controller.js`)
* Validates Google ID token using `firebase-admin`.
* Finds or creates the user in MongoDB:
  ```javascript
  let user = await User.findOne({ googleId: uid });
  if (!user) {
    user = await User.create({
      googleId: uid,
      email,
      name,
      avatar: picture,
      credits: 50, // Initial welcome quota
    });
  }
  ```
* Generates a cryptographically strong UUID session ID: `session-${crypto.randomUUID()}`.
* Sets key in Redis:
  ```javascript
  await redis.set(sessionId, JSON.stringify(sessionData), "EX", 7 * 24 * 60 * 60);
  ```
* Writes the cookie to the HTTP response:
  ```javascript
  res.cookie("session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  ```

### C. Gateway Middleware (`backend/gateway/middlewares/auth.middleware.js`)
Intercepts every request targeting `/api/chat`, `/api/agent`, `/api/payments`, and `/api/me`:
1. Reads `req.cookies.session`.
2. Queries Redis: `await redis.get(sessionId)`.
3. If valid, attaches user context to `req.user`.
4. Downstream proxy decorators automatically inject:
   - `x-user-id: req.user.userId`
   - `x-user: JSON.stringify(req.user)`

---

## 5. Session Termination (Logout)

When the user clicks "Sign Out" in the sidebar:
1. `POST /api/auth/logout` is sent to the Gateway.
2. Auth Service deletes the session key from Redis: `await redis.del(sessionId)`.
3. Clear-cookie header is sent to the browser: `res.clearCookie("session")`.
4. Client terminates the Firebase auth session and clears Redux state.

---

## 6. Architecture Post-Mortem: Infinite Mount Loop Fix

### The Problem
During development, clicking "Open Cortex AI Studio" triggered an infinite request storm of **3,000–10,000 requests per second** to `/api/me`, freezing the browser.

### The Root Cause
A ping-pong race condition between React state and component mounting:
1. `Home.jsx` triggered `fetchCurrentUser()` inside `useEffect`.
2. `fetchCurrentUser.pending` set `isCheckingAuth = true` in Redux.
3. `ProtectedRoute` in `App.jsx` inspected `isCheckingAuth` and unmounted `Home.jsx` to render `<Spinner />`.
4. When the API response arrived in `<1ms`, `isCheckingAuth` flipped back to `false`.
5. `ProtectedRoute` unmounted `<Spinner />` and remounted `Home.jsx`.
6. Mounting `Home.jsx` immediately re-triggered `useEffect`, repeating the cycle thousands of times per second.

### The Fix
1. Moved session initialization strictly to top-level `App.jsx` (mounted once).
2. Added a guard condition in `ProtectedRoute`:
   ```javascript
   // Only block with spinner if there is no authenticated user cached
   if (isCheckingAuth && !isAuthenticated) {
     return <Spinner />;
   }
   ```
3. Ensured background session revalidations never unmount the active workspace.
