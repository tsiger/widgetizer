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
import { addLanguage } from "../services/languageService.js";
import { createKeyedSerializer } from "../utils/serializeByKey.js";

// Check, seed and record are one operation per project: two adds in flight would
// otherwise both read the pre-seed list and the second would drop the first's
// language, and two adds of the SAME code would seed over each other's files.
const serializeLanguageOps = createKeyedSerializer();

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
    if (error?.name === "LanguageError") {
      return res.status(error.status).json({ error: "Language not added", message: error.message });
    }
    console.error("Error adding language:", error);
    res.status(500).json({ error: "Failed to add language" });
  }
}
