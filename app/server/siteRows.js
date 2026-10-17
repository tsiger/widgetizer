const PROJECT_FIELDS = [
  "name",
  "description",
  "site_title",
  "theme",
  "theme_version",
  "preset",
  "site_url",
  "clean_urls",
  "site_identity",
  "default_language",
  "languages",
];
const MEDIA_FIELDS = ["id", "filename", "original_name", "type", "size", "uploaded", "path", "alt", "title", "width", "height", "caption", "source"];
const SIZE_FIELDS = ["size_name", "path", "width", "height"];
const TRANSLATION_FIELDS = ["language", "alt", "title", "caption"];

const pick = (row, fields) => Object.fromEntries(fields.map((field) => [field, row[field] ?? null]));

/** A site's database rows as one value, for snapshots: its site fields and media library (usage is derived, so left out). */
export function createSiteRows(db) {
  const project = db.prepare(`SELECT ${PROJECT_FIELDS.join(", ")} FROM projects WHERE id = ?`);
  const media = db.prepare(`SELECT ${MEDIA_FIELDS.join(", ")} FROM media_files WHERE project_id = ? ORDER BY id`);
  const sizes = db.prepare(
    `SELECT s.media_file_id, ${SIZE_FIELDS.map((field) => `s.${field}`).join(", ")} FROM media_sizes s
     JOIN media_files f ON f.id = s.media_file_id WHERE f.project_id = ? ORDER BY s.media_file_id, s.size_name`,
  );
  const translations = db.prepare(
    `SELECT t.media_file_id, ${TRANSLATION_FIELDS.map((field) => `t.${field}`).join(", ")} FROM media_file_translations t
     JOIN media_files f ON f.id = t.media_file_id WHERE f.project_id = ? ORDER BY t.media_file_id, t.language`,
  );

  const updateProject = db.prepare(`UPDATE projects SET ${PROJECT_FIELDS.map((field) => `${field} = @${field}`).join(", ")} WHERE id = @id`);
  const listMediaIds = db.prepare("SELECT id FROM media_files WHERE project_id = ?");
  const deleteMedia = db.prepare("DELETE FROM media_files WHERE id = ? AND project_id = ?");
  const upsertMedia = db.prepare(
    `INSERT INTO media_files (project_id, ${MEDIA_FIELDS.join(", ")}) VALUES (@project_id, ${MEDIA_FIELDS.map((field) => `@${field}`).join(", ")})
     ON CONFLICT(id) DO UPDATE SET ${MEDIA_FIELDS.filter((field) => field !== "id").map((field) => `${field} = excluded.${field}`).join(", ")}
     WHERE media_files.project_id = excluded.project_id`,
  );
  const ownedMedia = db.prepare("SELECT 1 FROM media_files WHERE id = ? AND project_id = ?");
  const clearSizes = db.prepare("DELETE FROM media_sizes WHERE media_file_id = ?");
  const clearTranslations = db.prepare("DELETE FROM media_file_translations WHERE media_file_id = ?");
  const insertSize = db.prepare(
    `INSERT INTO media_sizes (media_file_id, ${SIZE_FIELDS.join(", ")}) VALUES (@media_file_id, ${SIZE_FIELDS.map((field) => `@${field}`).join(", ")})`,
  );
  const insertTranslation = db.prepare(
    `INSERT INTO media_file_translations (media_file_id, ${TRANSLATION_FIELDS.join(", ")}) VALUES (@media_file_id, ${TRANSLATION_FIELDS.map((field) => `@${field}`).join(", ")})`,
  );

  const replace = db.transaction((projectId, rows) => {
    if (updateProject.run({ ...pick(rows.project, PROJECT_FIELDS), id: projectId }).changes !== 1) {
      throw new Error("The site no longer exists.");
    }
    const keep = new Set(rows.media.map((file) => file.id));
    for (const { id } of listMediaIds.all(projectId)) if (!keep.has(id)) deleteMedia.run(id, projectId);
    for (const file of rows.media) {
      upsertMedia.run({ ...pick(file, MEDIA_FIELDS), project_id: projectId });
      if (!ownedMedia.get(file.id, projectId)) throw new Error("A media file id in this copy belongs to another site.");
      clearSizes.run(file.id);
      clearTranslations.run(file.id);
      for (const size of file.sizes) insertSize.run({ ...pick(size, SIZE_FIELDS), media_file_id: file.id });
      for (const translation of file.translations) {
        insertTranslation.run({ ...pick(translation, TRANSLATION_FIELDS), media_file_id: file.id });
      }
    }
  });

  return {
    read(scope) {
      const row = project.get(scope.projectId);
      if (!row) return { project: null, media: [] };
      const files = media.all(scope.projectId).map((file) => ({ ...pick(file, MEDIA_FIELDS), sizes: [], translations: [] }));
      const byId = new Map(files.map((file) => [file.id, file]));
      for (const size of sizes.all(scope.projectId)) byId.get(size.media_file_id)?.sizes.push(pick(size, SIZE_FIELDS));
      for (const translation of translations.all(scope.projectId)) {
        byId.get(translation.media_file_id)?.translations.push(pick(translation, TRANSLATION_FIELDS));
      }
      return { project: pick(row, PROJECT_FIELDS), media: files };
    },
    replace(scope, rows) {
      replace.immediate(scope.projectId, rows);
    },
  };
}
