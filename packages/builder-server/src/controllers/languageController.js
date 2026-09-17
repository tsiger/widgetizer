/**
 * languageController — the site's additional languages.
 *
 * Project-scoped on purpose: adding a language reads and writes the project's
 * content (menus, globals, and the names it already publishes), which needs the
 * resolved `req.scope`. The actor-scoped project routes have no scope for the
 * project being edited, so `updateProject` refuses a change to `languages` and
 * points here.
 */
import * as projectRepo from "../db/repositories/projectRepository.js";
import { addLanguage, removeLanguage, countLanguageContent } from "../services/languageService.js";
import { createKeyedSerializer } from "../utils/serializeByKey.js";

// Check, change and record are one operation per project: two calls in flight
// would otherwise both read the same list and the second would drop the first's
// change, and two adds of the SAME code would seed over each other's files.
// Adds and removes share the chain, so neither can run inside the other.
const serializeLanguageOps = createKeyedSerializer();

function respondError(res, error, fallback) {
  if (error?.name === "LanguageError") {
    return res.status(error.status).json({ error: fallback, message: error.message });
  }
  console.error(`${fallback}:`, error);
  return res.status(500).json({ error: fallback });
}

export async function createLanguage(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;

    const project = await serializeLanguageOps(scope.projectId, async () => {
      // Read inside the section: an add that finished while this one waited has
      // already changed the list this one must extend.
      const current = projectRepo.getProjectById(scope.projectId);
      const { languages } = await addLanguage({ storage, scope, project: current, code: req.body?.code });
      // Recorded only after the seed succeeds, so a failure never leaves a
      // language listed with no content behind it.
      return projectRepo.updateProject(scope.projectId, { languages });
    });

    res.status(201).json(project);
  } catch (error) {
    respondError(res, error, "Failed to add language");
  }
}

/** What removing this language would delete — the confirmation modal states it first. */
export async function getLanguageSummary(req, res) {
  try {
    const { scope, activeProject } = req;
    const { storage } = req.adapters;
    const counts = await countLanguageContent({
      storage,
      scope,
      project: activeProject,
      code: req.params.code,
    });
    res.json({ code: req.params.code, ...counts });
  } catch (error) {
    respondError(res, error, "Failed to read the language summary");
  }
}

export async function deleteLanguage(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;

    const result = await serializeLanguageOps(scope.projectId, async () => {
      const current = projectRepo.getProjectById(scope.projectId);
      const { languages, deleted } = await removeLanguage({
        storage,
        scope,
        project: current,
        code: req.params.code,
      });
      // Recorded only after the content is gone, so a failure never leaves a
      // language unlisted with its files still on disk.
      return { project: projectRepo.updateProject(scope.projectId, { languages }), deleted };
    });

    res.json({ ...result.project, deleted: result.deleted });
  } catch (error) {
    respondError(res, error, "Failed to remove language");
  }
}
