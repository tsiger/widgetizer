const OWNER_KEY = "assistant:owner";

/**
 * Which Widgetizer process owns assistant access for this data folder, kept in the
 * folder's own database. Its IMMEDIATE transactions take SQLite's write lock, so
 * every process sharing the folder sees ownership change one at a time.
 *
 * @param {import('better-sqlite3').Database} db
 */
export function createAssistantOwnerStore(db) {
  const read = db.prepare("SELECT value FROM app_settings WHERE key = ?");
  const write = db.prepare(
    "INSERT INTO app_settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = @value",
  );
  const remove = db.prepare("DELETE FROM app_settings WHERE key = ?");

  return {
    transaction: (fn) => db.transaction(fn).immediate(),
    get() {
      const row = read.get(OWNER_KEY);
      try {
        return row?.value ? JSON.parse(row.value) : null;
      } catch {
        return null;
      }
    },
    set: (owner) => write.run({ key: OWNER_KEY, value: JSON.stringify(owner) }),
    clear: () => remove.run(OWNER_KEY),
  };
}
