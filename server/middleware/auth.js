/**
 * Auth middleware — always sets req.userId on every request.
 *
 * Open-source mode: req.userId = "local" (no auth check).
 * Hosted mode: delegates to the auth adapter (e.g. Clerk) to extract
 * the real user ID from the request.
 */
export default async function authMiddleware(req, res, next) {
  const authAdapter = req.app.locals.adapters?.auth;

  if (authAdapter?.verifyRequest) {
    try {
      const { userId, authenticated } = await authAdapter.verifyRequest(req);
      if (!authenticated) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      req.userId = userId;
    } catch (err) {
      console.error("Auth adapter error:", err);
      return res.status(401).json({ error: "Unauthorized" });
    }
  } else {
    // Open-source mode — single user, no auth
    req.userId = "local";
  }

  next();
}
