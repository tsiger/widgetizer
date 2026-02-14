import crypto from "crypto";

const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TOKENS = 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

const store = new Map();

/**
 * Generate a preview token and store the associated HTML.
 * @param {string} html - Rendered HTML to store
 * @returns {string} Token UUID
 */
export function generateToken(html) {
  // Evict oldest entries if at capacity
  if (store.size >= MAX_TOKENS) {
    let oldest = null;
    let oldestTime = Infinity;
    for (const [token, entry] of store) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldest = token;
      }
    }
    if (oldest) store.delete(oldest);
  }

  const token = crypto.randomUUID();
  store.set(token, { html, createdAt: Date.now() });
  return token;
}

/**
 * Retrieve the HTML for a given token.
 * Returns null if the token is expired or does not exist.
 * @param {string} token - Preview token
 * @returns {string|null} Stored HTML or null
 */
export function getToken(token) {
  const entry = store.get(token);
  if (!entry) return null;

  if (Date.now() - entry.createdAt > TOKEN_TTL_MS) {
    store.delete(token);
    return null;
  }

  return entry.html;
}

// Periodic cleanup of expired tokens
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of store) {
    if (now - entry.createdAt > TOKEN_TTL_MS) {
      store.delete(token);
    }
  }
}, CLEANUP_INTERVAL_MS);
