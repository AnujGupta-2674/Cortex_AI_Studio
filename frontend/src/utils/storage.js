/**
 * Client storage utility with TTL (Time-To-Live) cache invalidation.
 * Keeps local state synchronized with backend session cookie lifespan (7 days).
 */

const STORAGE_KEYS = {
  USER_SESSION: 'cortex_user_session',
};

const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const authStorage = {
  /**
   * Retrieves the cached user if session is within the 7-day TTL window.
   * Purges expired entries automatically.
   */
  getUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
      if (!raw) return null;

      const { data, expiresAt } = JSON.parse(raw);

      if (expiresAt && Date.now() > expiresAt) {
        this.clearUser();
        return null;
      }

      return data ?? null;
    } catch {
      this.clearUser();
      return null;
    }
  },

  /**
   * Persists user metadata alongside an absolute expiry timestamp.
   */
  setUser(data, ttlMs = DEFAULT_SESSION_TTL_MS) {
    try {
      const payload = {
        data,
        expiresAt: Date.now() + ttlMs,
      };
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(payload));
    } catch (err) {
      console.warn('[authStorage] Unable to persist user session:', err);
    }
  },

  /**
   * Flushes cached credentials.
   */
  clearUser() {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    } catch (err) {
      console.warn('[authStorage] Unable to remove user session:', err);
    }
  },
};
