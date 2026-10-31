/**
 * Writes the vocabulary table in skills/widgetizer-theme/references/widget-editing-model.md
 * from widget-vocabulary.json, between the vocabulary markers.
 *
 *   node scripts/build-widget-vocabulary.js           write the table
 *   node scripts/build-widget-vocabulary.js --check   exit 1 if the table is stale
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REFERENCES = path.join(ROOT, "skills", "widgetizer-theme", "references");
const VOCABULARY_PATH = path.join(REFERENCES, "widget-vocabulary.json");
const GUIDE_PATH = path.join(REFERENCES, "widget-editing-model.md");
const START = "<!-- vocabulary:start -->";
const END = "<!-- vocabulary:end -->";

const cell = (value) => String(value).replaceAll("|", "\\|");

export function renderVocabularyTable(vocabulary) {
  const lines = ["| Context | Id | Type | Label | Values | Group |", "| --- | --- | --- | --- | --- | --- |"];
  for (const entry of vocabulary.entries) {
    const type = Array.isArray(entry.type) ? entry.type.join(" or ") : entry.type;
    const values = entry.values ? entry.values.map((v) => (entry.labels?.[v] ? `\`${v}\` (${cell(entry.labels[v])})` : `\`${v}\``)).join(", ") : entry.default !== undefined ? `default \`${entry.default}\`` : "";
    lines.push(`| ${entry.context} | \`${entry.id}\` | ${type} | ${cell(entry.label)} | ${values} | ${entry.group} |`);
  }
  lines.push("", "Replaced ids, never to be used again:", "");
  for (const [old, current] of Object.entries(vocabulary.replaced)) lines.push(`- \`${old}\` → \`${current}\``);
  return lines.join("\n");
}

export function buildGuide(guide, vocabulary) {
  const start = guide.indexOf(START);
  const end = guide.indexOf(END);
  if (start < 0 || end < start) throw new Error(`widget-editing-model.md needs ${START} and ${END}`);
  return `${guide.slice(0, start + START.length)}\n${renderVocabularyTable(vocabulary)}\n${guide.slice(end)}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const vocabulary = JSON.parse(fs.readFileSync(VOCABULARY_PATH, "utf8"));
  const guide = fs.readFileSync(GUIDE_PATH, "utf8");
  const next = buildGuide(guide, vocabulary);
  if (process.argv.includes("--check")) {
    if (next !== guide) {
      console.error("The vocabulary table is stale. Run: node scripts/build-widget-vocabulary.js");
      process.exit(1);
    }
    console.log("The vocabulary table is up to date.");
  } else {
    fs.writeFileSync(GUIDE_PATH, next);
    console.log("Wrote the vocabulary table.");
  }
}
