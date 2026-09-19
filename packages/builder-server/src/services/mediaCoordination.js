/**
 * mediaCoordination — what keeps deleting an image from losing it out from under
 * content that still needs it.
 *
 * Media deletion used to trust the recorded `usedIn` rows. Those rows are derived
 * data kept up to date by a best-effort sync after each content write, and a sync
 * that fails is only logged (the save still succeeds, by design — the content IS
 * saved). So a row can be missing while saved content references the file, and the
 * file then reads as unused and deletes cleanly. Staleness has a direction and only
 * one direction is dangerous:
 *
 *   - over-reporting (a row outlives its reference) blocks a delete. Harmless.
 *   - under-reporting (no row, but content references it) loses the image.
 *
 * `languageService.removeLanguage` already gets this right for its own deletes: it
 * clears the usage row BEFORE deleting the file and rebuilds survivors' rows on
 * failure, so "nothing is ever reported unused while it is still on disk". This
 * module applies the same rule to the media library.
 *
 * Three parts, and all three are needed — none of them is sufficient alone:
 *
 *   1. VERIFY (verifyFileUnused). Deletion stops trusting the stored rows and
 *      re-derives them from content. An incomplete scan is NOT "no usage found":
 *      it returns `verified: false` and deletion refuses.
 *   2. EXCLUDE (withMediaLock). Verification and the delete run in one section that
 *      content writes cannot interleave with, so a save cannot land a reference in
 *      the window between the two.
 *   3. VALIDATE (assertIntroducedMediaExists). Locking alone does not help the save
 *      that was QUEUED BEHIND the delete: it acquires the lock afterwards and would
 *      happily introduce a reference to a file that is now gone. So a write section
 *      also checks that the references it is introducing still exist.
 *
 * ## Lock ordering
 *
 * The media lock is ALWAYS INNERMOST. Never acquire another per-project lock
 * (serializeTranslationOps, serializeLanguageOps, serializeExportOps) while holding
 * it. Those may be held while taking this one — a translation or language op that
 * writes content does exactly that — which is why the order has to run one way only.
 * Separate serializer instances do not rule out a cycle; a consistent order does.
 * `createKeyedSerializer` is also not reentrant, so a media-locked section must not
 * call another media-locked helper: take the lock at the controller edge and pass the
 * unlocked helpers inward.
 *
 * ## What a write is allowed to reference
 *
 * Only ONE case is refused: a path this process deleted, newly introduced by a write,
 * while the asset is still absent. Everything else a content file may point at keeps
 * saving, deliberately:
 *
 *   - **Unregistered but present** (bytes on disk, no media row) — permitted. Usage
 *     tracking already ignores paths it cannot match to a record, and preset and
 *     theme content carries such paths.
 *   - **Genuinely missing, not deleted here** (an imported project whose binaries did
 *     not come with it, hand-edited JSON, a file deleted before this process started)
 *     — permitted. A save is the wrong moment to reject history the user may be
 *     editing their way out of, and refusing would strand that content uneditable.
 *
 * So a dangling reference is a tolerated state, not an error. What this prevents is
 * narrower: a save CREATING one out of a file the library still showed a moment ago.
 *
 * ## Scope of the guarantee
 *
 * **An image is not deleted while saved content references it — for PARTICIPATING
 * OPERATIONS, WITHIN ONE BACKEND PROCESS.** Both qualifiers are load-bearing.
 *
 * *Participating* means the operation takes the section above. Today that is media
 * delete and bulk delete, and these writes: page content save, page delete, global
 * widget save, collection item create and update, theme settings save, site identity
 * save — the paths where someone picks a file from the library.
 *
 * These do NOT participate, and can introduce a media reference without the section:
 * collection item duplicate / discard-archived / language version, language seeding,
 * link enrichment, and the structural flows (project create, duplicate, import, theme
 * update) that rebuild usage wholesale afterwards. Each of them COPIES content that
 * already exists in the project, so the reference it introduces is normally also held
 * by the source a verification scan reads — but that is a reason to expect no harm,
 * not a proof of exclusion. Wiring them in is the obvious extension if that stops
 * being good enough.
 *
 * *Within one process* is not softened by verification reading shared storage. Two
 * backend processes against one project can BOTH scan concurrently and both conclude
 * a file is unused, and one can write a reference between the other's scan and its
 * delete. Re-reading shared content does not order anything; only the section does,
 * and the section is in-process. **Cross-process deletion safety is not established
 * here.** An embedding host that runs more than one backend process against a project
 * must coordinate in the database instead, and should not read this module as cover.
 *
 * ## The restart case
 *
 * The tombstones are memory: not shared between processes, and gone on restart. The
 * race they close cannot outlive its process either — an in-flight or queued save
 * dies with it — so within one process the cover is complete.
 *
 * What escapes: an editor still holding PENDING EDITS across a backend restart, saved
 * afterwards, can write a reference to an image deleted before the restart. The save
 * succeeds and the result is a broken reference in that content — the tolerated state
 * described above, visible in the editor and fixable there, rather than a lost image.
 *
 * Persisting the tombstones would close it at the cost of exactly the durable repair
 * state this design set out to avoid. Deliberately not done; revisit only with
 * evidence that it bites someone.
 */

import { ConflictError } from "@widgetizer/core/errors";
import { createKeyedSerializer } from "../utils/serializeByKey.js";
import { refreshAllMediaUsageFromDir } from "./mediaUsageService.js";
import * as mediaRepo from "../db/repositories/mediaRepository.js";

const serializeMediaOps = createKeyedSerializer();

/**
 * Run `fn` in this project's media section. Content writes that can introduce a
 * media reference and media deletion both take it, so they never interleave.
 * @param {string} projectId
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export function withMediaLock(projectId, fn) {
  return serializeMediaOps(projectId, fn);
}

/** The adapter key for a tracked upload path: `/uploads/images/a.jpg` -> `images/a.jpg`. */
const assetKeyOf = (mediaPath) => String(mediaPath).replace(/^\/uploads\//, "");

/**
 * Paths this process has deleted from the media library, per project.
 *
 * This is what makes the check on a write EXACT instead of a guess. An upload path
 * with nothing behind it is legitimate here — usage tracking ignores what it cannot
 * match, and imported or hand-edited content carries such paths — so "the asset is
 * missing" is far too broad a reason to refuse a save. "We deleted this, and a save
 * that started before it is now trying to reference it" is the actual hazard, and
 * only deletion itself knows that.
 *
 * In-process and bounded, for the same reason the lock is: it only has to outlive
 * the saves that were in flight or queued around the delete.
 */
/**
 * Kept for the LIFETIME OF THE PROCESS. Never expired, never capped.
 *
 * Two bounded versions were tried and both were wrong in the same way — they ended
 * by letting a write through:
 *
 *   - A count cap dropped the oldest entries once enough files had been deleted,
 *     which silently removed the protection from edits still pending against them
 *     (and generated image sizes spent several slots per file).
 *   - A time window only postponed that. An editor can hold unsaved work overnight;
 *     time passing is not evidence that a pending edit is gone. Advancing the clock
 *     past the window let a pending save restore a reference to a deleted image.
 *
 * The only thing that genuinely ends the race is the process ending, because a save
 * that was in flight or queued dies with it. So that is the retention period. Any
 * bound reintroduced here must fail CLOSED at its limit — refusing writes it cannot
 * vouch for — never by quietly accepting a missing reference.
 *
 * Cost is a set of path strings per project, added to only by deletion. A session
 * that deletes a thousand files holds a few thousand short strings; this is not a
 * growth risk worth trading correctness for.
 */
const deletedPaths = new Map();

/**
 * Record what a delete just removed, so a write queued behind it can be refused.
 * Call inside the media section, after the assets are gone.
 * @param {string} projectId
 * @param {string[]} paths - every path the file was referenced by (original + sizes)
 */
export function recordDeletedMediaPaths(projectId, paths) {
  let entries = deletedPaths.get(projectId);
  if (!entries) {
    entries = new Set();
    deletedPaths.set(projectId, entries);
  }
  for (const mediaPath of paths) {
    if (typeof mediaPath === "string" && mediaPath) entries.add(mediaPath);
  }
}

/** Test seam: forget this project's deleted-path records (or all of them). */
export function clearDeletedMediaPaths(projectId = null) {
  if (projectId) deletedPaths.delete(projectId);
  else deletedPaths.clear();
}

/**
 * Re-derive usage from content and report whether the given files are unused.
 *
 * Call inside withMediaLock. The rebuild is the same traversal the Refresh Usage
 * button runs, so there is one description of where a reference can live (pages in
 * every language, headers/footers, collection items, theme settings, the identity
 * logo) rather than a second one that drifts from it. It also repairs the stored
 * rows as a side effect, which is what makes a refused delete recoverable.
 *
 * @param {{ projectId: string, projectDir: string, fileIds: string[] }} args
 * @returns {Promise<{ verified: boolean, reason?: string, skipped?: Array<{source: string, reason: string}>,
 *   usedInByFileId?: Map<string, string[]> }>}
 *   `verified: false` means we could not establish that anything is unused — the
 *   caller must not delete. It never means "unused".
 */
export async function verifyFileUnused({ projectId, projectDir, fileIds }) {
  // The rows AS RECORDED, read before the rescan overwrites them. The rescan exists
  // to catch a row that is missing, not to overrule one that is present: a row with
  // no matching content is the harmless direction of staleness (it blocks a delete),
  // and honouring it keeps this change from turning a delete that used to be refused
  // into one that goes through. A file is deletable only if BOTH agree it is unused.
  const recorded = new Map();
  for (const fileId of fileIds) {
    const file = mediaRepo.getMediaFileById(projectId, fileId);
    recorded.set(fileId, file ? file.usedIn || [] : []);
  }

  let result;
  try {
    result = await refreshAllMediaUsageFromDir({ projectId, projectDir });
  } catch (error) {
    // The scan could not run at all (unreadable project dir, DB failure). Refuse.
    return { verified: false, reason: error.message };
  }

  // A page we could not read contributes no references, which is indistinguishable
  // from a page that has none. Either could be the one holding this image.
  if (result.skipped?.length) {
    return { verified: false, reason: "some content could not be read", skipped: result.skipped };
  }

  const usedInByFileId = new Map();
  for (const fileId of fileIds) {
    const file = mediaRepo.getMediaFileById(projectId, fileId);
    // Already gone: nothing to delete, and nothing that can be referenced.
    const rescanned = file ? file.usedIn || [] : [];
    usedInByFileId.set(fileId, [...new Set([...(recorded.get(fileId) || []), ...rescanned])]);
  }
  return { verified: true, usedInByFileId };
}

/**
 * Refuse a write that would introduce a reference to a media file this process just
 * deleted — the save that was queued behind the delete. The lock orders those two;
 * it cannot make the second one safe, because by the time it runs the image is gone.
 *
 * Deliberately narrow, in two ways:
 *  - Only NEWLY introduced paths count. Content that already carried the reference
 *    keeps saving; a save is the wrong moment to reject history someone may be
 *    editing their way out of.
 *  - Only paths this process actually deleted count. An upload path with nothing
 *    behind it is legitimate — usage tracking ignores what it cannot match, and
 *    imported content carries such paths — so a missing asset alone is not a reason.
 *
 * The asset is then re-checked, so re-uploading the same filename clears the
 * tombstone's effect rather than blocking the save forever.
 *
 * @param {{ assetStorage: object, scope: {projectId: string}, previousPaths?: string[], nextPaths: string[] }} args
 * @throws {ConflictError} code MEDIA_REFERENCE_MISSING, listing the missing paths
 */
export async function assertIntroducedMediaExists({ assetStorage, scope, previousPaths = [], nextPaths }) {
  const tombstones = deletedPaths.get(scope.projectId);
  if (!tombstones || tombstones.size === 0) return;

  const had = new Set(previousPaths);
  const introduced = [...new Set(nextPaths)].filter(
    (mediaPath) => !had.has(mediaPath) && tombstones.has(mediaPath),
  );
  if (introduced.length === 0) return;

  const missing = [];
  for (const mediaPath of introduced) {
    let stat = null;
    try {
      stat = await assetStorage.stat(scope, assetKeyOf(mediaPath));
    } catch {
      // Treat an unreadable asset store the same as an absent file: this runs to
      // stop a reference to something that is gone, and we cannot tell that it is not.
      stat = null;
    }
    // Present again (re-uploaded under the same name): no longer the hazard.
    if (stat) tombstones.delete(mediaPath);
    else missing.push(mediaPath);
  }

  if (missing.length > 0) {
    throw new ConflictError(
      `This content refers to ${missing.length === 1 ? "a file that is" : "files that are"} no longer in the media library: ${missing.join(", ")}`,
      { code: "MEDIA_REFERENCE_MISSING" },
    );
  }
}
