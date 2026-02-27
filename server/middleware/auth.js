/**
 * Auth middleware — always sets req.userId on every request.
 *
 * Open-source mode: req.userId = "local" (no auth check).
 * When adapters are configured (via createEditorApp), the platform's
 * control-plane replaces this middleware with its own auth logic.
 */
export default async function authMiddleware(req, res, next) {
  req.userId = "local";
  next();
}
