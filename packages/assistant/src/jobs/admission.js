const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Writes that change no site content, or that turning access off and Stop depend on.
const ALLOWED = [
  ["POST", /^\/api\/preview$/i],
  ["POST", /^\/api\/preview\/token$/i],
  ["POST", /^\/api\/preview\/collection$/i],
  ["POST", /^\/api\/preview\/widget$/i],
  ["POST", /^\/api\/projects\/[^/]+\/export$/i],
  ["PUT", /^\/api\/settings$/i],
];
const SWITCH_SITE = /^\/api\/projects\/active\/([^/]+)$/i;

/**
 * Refuses editor writes up front while a job or operation is open, so a request
 * doesn't do work only to be refused at the write. The gate inside the write
 * section stays the authority. Switching sites stops the job, puts the site back
 * and switches as one operation.
 *
 * @param {{ jobs: object, siteExists: (projectId: string) => boolean }} options
 */
export function createAdmission({ jobs, siteExists }) {
  const refuse = (res) => {
    const job = jobs.publicJob(jobs.openJob());
    res.status(423).json({
      message:
        job?.state === "recovery_needed"
          ? "Widgetizer couldn't undo the assistant's changes. Choose Try again, or keep the site as it is now."
          : "The assistant is working on this site. Wait for it to finish, or press Stop.",
      code: "SITE_LOCKED",
    });
  };

  return async (req, res, next) => {
    if (SAFE_METHODS.has(req.method) || !jobs.isBusy() || jobs.isJobRequest(req)) return next();
    const path = req.path.replace(/\/+$/, "");
    const encoded = req.method === "PUT" ? SWITCH_SITE.exec(path)?.[1] : null;
    if (encoded) {
      let switchTo = null;
      try {
        switchTo = decodeURIComponent(encoded);
      } catch {
        return refuse(res);
      }
      if (!siteExists(switchTo)) return refuse(res);
      try {
        await jobs.stop({ reason: "switch", switchTo });
      } catch (error) {
        console.error("Stopping the assistant to switch sites failed:", error);
        if (jobs.isBusy()) return refuse(res);
        return res.status(500).json({ message: "The assistant was stopped, but Widgetizer couldn't switch sites. Try again.", code: "SWITCH_FAILED" });
      }
      return jobs.isBusy() ? refuse(res) : res.json({ success: true });
    }
    if (ALLOWED.some(([method, pattern]) => method === req.method && pattern.test(path))) return next();
    refuse(res);
  };
}
