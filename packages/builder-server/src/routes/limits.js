import express from "express";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";
import { getMaxUploadBytes } from "../utils/uploadLimits.js";

const router = express.Router();
router.use(resolveActiveProject);

// The active project's limits the editor checks before sending anything:
// `maxUploadBytes` is the per-file media upload limit, `null` when there is none.
router.get("/", async (req, res, next) => {
  try {
    const maxUploadBytes = await getMaxUploadBytes(req.adapters, req.scope);
    res.json({ maxUploadBytes: Number.isFinite(maxUploadBytes) ? maxUploadBytes : null });
  } catch (err) {
    next(err);
  }
});

export default router;
