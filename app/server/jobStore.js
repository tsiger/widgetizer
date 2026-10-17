const OPEN_STATES = new Set([
  "preparing",
  "active",
  "awaiting_approval",
  "decision_needed",
  "finishing",
  "undoing",
  "stopping",
  "restoring",
  "recovery_needed",
]);
const GENERATION_KEY = "change_generation";
const REQUEST_RETENTION = 500;

const COLUMNS = {
  projectId: "project_id",
  sessionId: "session_id",
  client: "client",
  summary: "summary",
  languages: "languages",
  requestId: "request_id",
  state: "state",
  operation: "operation",
  snapshotId: "snapshot_id",
  endFingerprint: "end_fingerprint",
  normalised: "normalised",
  dirty: "dirty",
  intent: "intent",
  reason: "reason",
  error: "error",
  receipt: "receipt",
  impact: "impact",
  approval: "approval",
  ended: "ended",
};
const JSON_FIELDS = new Set(["client", "languages", "intent", "receipt", "impact", "approval"]);
const BOOLEAN_FIELDS = new Set(["normalised", "dirty"]);

function toRow(field, value) {
  if (JSON_FIELDS.has(field)) return value == null ? null : JSON.stringify(value);
  if (BOOLEAN_FIELDS.has(field)) return value ? 1 : 0;
  return value ?? null;
}

function fromRow(row) {
  if (!row) return null;
  const job = { id: row.id, gen: row.gen, created: row.created, updated: row.updated };
  for (const [field, column] of Object.entries(COLUMNS)) {
    const value = row[column];
    if (JSON_FIELDS.has(field)) job[field] = value == null ? null : JSON.parse(value);
    else if (BOOLEAN_FIELDS.has(field)) job[field] = value === 1;
    else job[field] = value;
  }
  return job;
}

/**
 * Assistant jobs in the data folder's database. One job or operation is open per app
 * at a time (the unique `slot`), and every transition is compare-and-set on `gen`.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ now?: () => number }} [options]
 */
export function createJobStore(db, { now = Date.now } = {}) {
  const stamp = () => new Date(now()).toISOString();
  const selectOpen = db.prepare("SELECT * FROM assistant_jobs WHERE slot = 'open'");
  const selectById = db.prepare("SELECT * FROM assistant_jobs WHERE id = ?");
  const selectLatestFinished = db.prepare(
    "SELECT * FROM assistant_jobs WHERE project_id = ? AND state = 'finished' ORDER BY ended DESC, rowid DESC LIMIT 1",
  );
  const readMeta = db.prepare("SELECT value FROM assistant_meta WHERE key = ?");
  const writeMeta = db.prepare(
    "INSERT INTO assistant_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  const insertRequest = db.prepare(
    "INSERT OR REPLACE INTO assistant_requests (request_id, tool, job_id, outcome, created) VALUES (?, ?, ?, ?, ?)",
  );
  const selectRequest = db.prepare("SELECT * FROM assistant_requests WHERE request_id = ?");
  const trimRequests = db.prepare(
    "DELETE FROM assistant_requests WHERE request_id NOT IN (SELECT request_id FROM assistant_requests ORDER BY created DESC LIMIT ?)",
  );

  const generation = () => Number(readMeta.get(GENERATION_KEY)?.value ?? 0);
  const bumpGeneration = () => {
    const next = generation() + 1;
    writeMeta.run(GENERATION_KEY, String(next));
    return next;
  };

  function update(id, gen, patch) {
    const fields = Object.keys(patch).filter((field) => field in COLUMNS);
    const sets = fields.map((field) => `${COLUMNS[field]} = @${field}`);
    const values = Object.fromEntries(fields.map((field) => [field, toRow(field, patch[field])]));
    if ("state" in patch) {
      sets.push("slot = @slot");
      values.slot = OPEN_STATES.has(patch.state) ? "open" : null;
    }
    let result;
    try {
      result = db
        .prepare(`UPDATE assistant_jobs SET ${[...sets, "gen = gen + 1", "updated = @updated"].join(", ")} WHERE id = @id AND gen = @gen`)
        .run({ ...values, updated: stamp(), id, gen });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return null;
      throw error;
    }
    return result.changes === 1 ? fromRow(selectById.get(id)) : null;
  }

  return {
    openStates: OPEN_STATES,
    open: () => fromRow(selectOpen.get()),
    get: (id) => fromRow(selectById.get(id)),
    latestFinished: (projectId) => fromRow(selectLatestFinished.get(projectId)),
    generation,

    /** Null when another job or operation holds the slot. */
    insert(job) {
      const row = {
        id: job.id,
        project_id: job.projectId,
        session_id: job.sessionId ?? null,
        client: toRow("client", job.client),
        summary: job.summary,
        languages: toRow("languages", job.languages ?? []),
        request_id: job.requestId ?? null,
        state: job.state,
        operation: job.operation ?? null,
        slot: OPEN_STATES.has(job.state) ? "open" : null,
        created: stamp(),
      };
      try {
        db.prepare(
          `INSERT INTO assistant_jobs (id, project_id, session_id, client, summary, languages, request_id, state, operation, slot, created, updated)
           VALUES (@id, @project_id, @session_id, @client, @summary, @languages, @request_id, @state, @operation, @slot, @created, @created)`,
        ).run(row);
      } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return null;
        throw error;
      }
      return fromRow(selectById.get(job.id));
    },

    /** The updated job, or null when it moved on since `gen`. `bump` also advances the change generation in the same transaction. */
    transition(id, gen, patch, { bump = false } = {}) {
      return db.transaction(() => {
        const updated = update(id, gen, patch);
        if (updated && bump) bumpGeneration();
        return updated;
      }).immediate();
    },

    bumpGeneration: () => db.transaction(bumpGeneration).immediate(),

    recordOutcome(requestId, tool, jobId, outcome) {
      if (!requestId) return;
      insertRequest.run(requestId, tool, jobId ?? null, JSON.stringify(outcome), stamp());
      trimRequests.run(REQUEST_RETENTION);
    },
    outcome(requestId) {
      const row = selectRequest.get(requestId);
      return row ? { tool: row.tool, jobId: row.job_id, outcome: JSON.parse(row.outcome), at: row.created } : null;
    },
  };
}
