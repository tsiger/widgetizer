import { HOSTED_MODE } from "../hostedMode.js";

/**
 * Auth middleware — always sets req.userId on every request.
 *
 * Open-source mode (HOSTED_MODE=false): req.userId = "local" (no auth check)
 * Hosted mode (HOSTED_MODE=true): verifies Clerk JWT, sets req.userId to Clerk user ID
 */

let clerkMiddleware = null;

if (HOSTED_MODE) {
  try {
    const clerk = await import("@clerk/express");
    clerkMiddleware = clerk.clerkMiddleware();
  } catch {
    console.error("HOSTED_MODE is enabled but @clerk/express is not installed. Run: npm install @clerk/express");
    process.exit(1);
  }
}

export default async function authMiddleware(req, res, next) {
  if (!HOSTED_MODE) {
    req.userId = "local";
    return next();
  }

  // In hosted mode, run Clerk middleware first to populate req.auth
  clerkMiddleware(req, res, (err) => {
    if (err) return next(err);

    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    req.userId = userId;
    next();
  });
}
