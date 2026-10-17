const ACTION_SCHEME = "widgetizer-prompt:";
const ACTIONS = new Set(["allow", "cancel", "stop", "keep", "undo"]);

const escape = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

/** The prompt page: plain text and buttons, nothing from the site, no script. */
export function promptHtml(prompt) {
  const asking = prompt.kind === "approval";
  const title = asking ? "The assistant is asking for your OK" : "The assistant disconnected";
  const lead = asking
    ? `While working on “${escape(prompt.summary)}”, the assistant wants to:`
    : `It was asking for your OK while working on “${escape(prompt.summary)}”. Keep the changes it made so far, or undo them?`;
  const plan = asking ? `<ul>${(prompt.plan ?? []).map((line) => `<li>${escape(line)}</li>`).join("")}</ul>` : "";
  const button = (action, label, primary = false) =>
    `<a class="button${primary ? " primary" : ""}" href="${ACTION_SCHEME}${action}">${label}</a>`;
  const buttons = asking
    ? button("cancel", "Cancel") + button("stop", "Stop the job") + button("allow", "Allow", true)
    : button("undo", "Undo changes") + button("keep", "Keep changes", true);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>
body{font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;padding:20px;color:#1e293b;background:#fff}
h1{font-size:16px;margin:0 0 8px}ul{padding-left:20px;margin:8px 0 16px}
.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
.button{padding:7px 14px;border-radius:6px;border:1px solid #cbd5e1;color:#1e293b;text-decoration:none;font-weight:600}
.primary{background:#e0006d;border-color:#e0006d;color:#fff}
</style></head><body><h1>${title}</h1><p>${lead}</p>${plan}<div class="actions">${buttons}</div></body></html>`;
}

/** The action a click in the prompt asks for, or null for anything else. */
export function actionFromUrl(url) {
  if (typeof url !== "string" || !url.startsWith(ACTION_SCHEME)) return null;
  const action = url.slice(ACTION_SCHEME.length).replace(/\/+$/, "");
  return ACTIONS.has(action) ? action : null;
}

/** What answering an action means, as a call to the server's private channel. */
export function serverCallFor(action, prompt) {
  switch (action) {
    case "allow":
    case "cancel":
      return prompt.kind === "approval" ? ["answerApproval", { id: prompt.id, allow: action === "allow" }] : null;
    case "keep":
    case "undo":
      return prompt.kind === "decision" ? ["decideJob", { keep: action === "keep" }] : null;
    case "stop":
      return ["stopJob", {}];
    default:
      return null;
  }
}
