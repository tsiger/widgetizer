/**
 * translationController — read a translation group's members.
 *
 * The language chips on the pages and items lists, and the language menu in the
 * editor, all ask the same question: which languages does this thing exist in,
 * and where. Membership lives in the content, so it is read per language.
 */
import { findGroupMembers } from "../services/translationService.js";

export async function getTranslationGroup(req, res) {
  try {
    const { scope, activeProject } = req;
    const { storage } = req.adapters;
    const members = await findGroupMembers({
      storage,
      scope,
      project: activeProject,
      groupId: req.params.groupId,
    });
    res.json({ groupId: req.params.groupId, members });
  } catch (error) {
    console.error("Error reading a translation group:", error);
    res.status(500).json({ error: "Failed to read the translation group" });
  }
}
