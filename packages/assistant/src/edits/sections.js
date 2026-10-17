import crypto from "node:crypto";
import { buildDefaultWidget, buildDefaultBlock } from "@widgetizer/core/widgetDefaults";
import { settingValueProblems } from "@widgetizer/core/settingValues";
import { canonicalJson } from "../snapshots/siteState.js";
import { toolError } from "../errors.js";

const GLOBAL_TYPES = new Set(["header", "footer"]);

const newWidgetId = () => `widget_${crypto.randomUUID()}`;
const newBlockId = () => `block_${crypto.randomUUID()}`;
const clone = (value) => JSON.parse(JSON.stringify(value));

/** Identifies a saved page, header or footer exactly as read; an edit based on another version is refused. */
export function documentVersion(doc) {
  return crypto.createHash("sha256").update(canonicalJson(doc)).digest("hex").slice(0, 16);
}

function fail(index, message) {
  return toolError("INVALID_EDIT", `Operation ${index + 1}: ${message}`);
}

function settingsById(list) {
  return new Map((Array.isArray(list) ? list : []).filter((setting) => setting?.id && setting.type !== "header").map((setting) => [setting.id, setting]));
}

/**
 * Apply one batch of section operations to a copy of a page or a header/footer. Only the
 * values an operation sets are checked; everything else is kept exactly as it was.
 *
 * @returns {{ next: object, changes: { added: string[], updated: string[], removed: string[], moved: string[] } }}
 */
export function applySectionOperations({ doc, kind, operations, schemas, context = {}, sanitizeRichText }) {
  const next = clone(doc);
  const changes = { added: [], updated: [], removed: [], moved: [] };
  if (kind === "page") {
    next.widgets ??= {};
    next.widgetsOrder = Array.isArray(next.widgetsOrder) ? next.widgetsOrder : Object.keys(next.widgets);
  }

  const schemaOf = (type, index) => {
    const schema = schemas.get(type);
    if (!schema) throw fail(index, `there's no section type "${type}" in this theme.`);
    return schema;
  };

  const sectionOf = (id, index) => {
    if (kind === "global") {
      if (id !== undefined && id !== next.type) throw fail(index, `the ${next.type} has no section "${id}"; leave "section" out.`);
      return { id: next.type, widget: next };
    }
    const widget = next.widgets[id];
    if (!widget) throw fail(index, `this page has no section "${id}".`);
    return { id, widget };
  };

  function writeSettings(target, definitions, settings, where, index) {
    for (const [key, value] of Object.entries(settings ?? {})) {
      const setting = definitions.get(key);
      if (!setting) throw fail(index, `${where} has no setting "${key}".`);
      if (value === null) {
        if (setting.default === undefined) delete target[key];
        else target[key] = clone(setting.resolvedDefault ?? setting.default);
        continue;
      }
      const problems = settingValueProblems(setting, value, context);
      if (problems.length) throw fail(index, `${where}, "${key}" ${problems.join("; ")}.`);
      target[key] = setting.type === "richtext" && sanitizeRichText
        ? sanitizeRichText(value, { allowHeadings: Boolean(setting.allow_headings), allowImages: Boolean(setting.allow_images) })
        : clone(value);
    }
  }

  // `after` names the entry to follow; otherwise `at` is "start" or "end" (the default).
  function place(order, id, { after, at } = {}, index, anchorName) {
    const without = order.filter((entry) => entry !== id);
    if (after !== undefined) {
      const found = without.indexOf(after);
      if (found < 0) throw fail(index, `there's no ${anchorName} "${after}" to place it after.`);
      return [...without.slice(0, found + 1), id, ...without.slice(found + 1)];
    }
    return at === "start" ? [id, ...without] : [...without, id];
  }

  function blockDefinitions(schema, type, index) {
    const block = (schema.blocks ?? []).find((entry) => entry.type === type);
    if (!block) throw fail(index, `a "${schema.type}" section has no block type "${type}".`);
    return settingsById(block.settings);
  }

  function addBlock(schema, widget, sectionId, { type, settings, after, at }, index) {
    const max = schema.maxBlocks;
    widget.blocks ??= {};
    widget.blocksOrder = Array.isArray(widget.blocksOrder) ? widget.blocksOrder : Object.keys(widget.blocks);
    if (typeof max === "number" && max > 0 && widget.blocksOrder.length >= max) {
      throw fail(index, `a "${schema.type}" section holds at most ${max} blocks.`);
    }
    const definitions = blockDefinitions(schema, type, index);
    const { id, data } = buildDefaultBlock(schema, { type }, newBlockId);
    writeSettings(data.settings, definitions, settings, `block "${type}"`, index);
    widget.blocks[id] = data;
    widget.blocksOrder = place(widget.blocksOrder, id, { after, at }, index, "block");
    changes.added.push(`${sectionId}/${id}`);
    return id;
  }

  operations.forEach((operation, index) => {
    const { op } = operation;
    if (kind === "global" && (op === "add" || op === "remove" || op === "move")) {
      throw fail(index, `a ${next.type} is one section; use update or the block operations.`);
    }
    switch (op) {
      case "add": {
        if (GLOBAL_TYPES.has(operation.type)) throw fail(index, `"${operation.type}" belongs to the site's ${operation.type}, not a page.`);
        const schema = schemaOf(operation.type, index);
        const id = newWidgetId();
        const widget = buildDefaultWidget(operation.blocks ? { ...schema, defaultBlocks: [] } : schema, operation.type, newBlockId);
        writeSettings(widget.settings, settingsById(schema.settings), operation.settings, `section "${operation.type}"`, index);
        next.widgets[id] = widget;
        next.widgetsOrder = place(next.widgetsOrder, id, operation, index, "section");
        changes.added.push(id);
        for (const block of operation.blocks ?? []) addBlock(schema, widget, id, block, index);
        break;
      }
      case "update": {
        const { id, widget } = sectionOf(operation.section, index);
        const schema = schemaOf(widget.type, index);
        widget.settings ??= {};
        writeSettings(widget.settings, settingsById(schema.settings), operation.settings, `section "${id}"`, index);
        changes.updated.push(id);
        break;
      }
      case "remove": {
        const { id } = sectionOf(operation.section, index);
        delete next.widgets[id];
        next.widgetsOrder = next.widgetsOrder.filter((entry) => entry !== id);
        changes.removed.push(id);
        break;
      }
      case "move": {
        const { id } = sectionOf(operation.section, index);
        next.widgetsOrder = place(next.widgetsOrder, id, operation, index, "section");
        changes.moved.push(id);
        break;
      }
      case "addBlock": {
        const { id, widget } = sectionOf(operation.section, index);
        addBlock(schemaOf(widget.type, index), widget, id, operation, index);
        break;
      }
      case "updateBlock": {
        const { id, widget } = sectionOf(operation.section, index);
        const block = widget.blocks?.[operation.block];
        if (!block) throw fail(index, `section "${id}" has no block "${operation.block}".`);
        block.settings ??= {};
        writeSettings(block.settings, blockDefinitions(schemaOf(widget.type, index), block.type, index), operation.settings, `block "${operation.block}"`, index);
        changes.updated.push(`${id}/${operation.block}`);
        break;
      }
      case "removeBlock": {
        const { id, widget } = sectionOf(operation.section, index);
        if (!widget.blocks?.[operation.block]) throw fail(index, `section "${id}" has no block "${operation.block}".`);
        delete widget.blocks[operation.block];
        widget.blocksOrder = (widget.blocksOrder ?? []).filter((entry) => entry !== operation.block);
        changes.removed.push(`${id}/${operation.block}`);
        break;
      }
      case "moveBlock": {
        const { id, widget } = sectionOf(operation.section, index);
        if (!widget.blocks?.[operation.block]) throw fail(index, `section "${id}" has no block "${operation.block}".`);
        widget.blocksOrder = place(widget.blocksOrder ?? Object.keys(widget.blocks), operation.block, operation, index, "block");
        changes.moved.push(`${id}/${operation.block}`);
        break;
      }
      default:
        throw fail(index, `unknown operation "${op}".`);
    }
  });

  return { next, changes };
}

/** The ids "removing a lot" is measured against: a page's sections, or a header/footer's blocks. */
export function measuredIds(doc, kind) {
  if (kind === "global") return Array.isArray(doc.blocksOrder) ? doc.blocksOrder : Object.keys(doc.blocks ?? {});
  return Array.isArray(doc.widgetsOrder) ? doc.widgetsOrder : Object.keys(doc.widgets ?? {});
}

const keysOf = (settings) => Object.keys(settings ?? {}).map((key) => `"${key}"`).join(", ");

/** What a batch of operations does, in words the user reads in the Allow/Cancel prompt. */
export function describeOperations(where, operations) {
  const parts = operations.map((operation) => {
    const section = operation.section ? ` ${operation.section}` : "";
    switch (operation.op) {
      case "add":
        return `add a "${operation.type}" section${operation.settings ? ` (setting ${keysOf(operation.settings)})` : ""}`;
      case "update":
        return operation.section ? `change ${keysOf(operation.settings)} of section${section}` : `change ${keysOf(operation.settings)}`;
      case "remove":
        return `remove section${section}`;
      case "move":
        return `move section${section}`;
      case "addBlock":
        return `add a "${operation.type}" block to section${section}`;
      case "updateBlock":
        return `change ${keysOf(operation.settings)} of block ${operation.block}`;
      case "removeBlock":
        return `remove block ${operation.block}`;
      case "moveBlock":
        return `move block ${operation.block}`;
      default:
        return operation.op;
    }
  });
  return `On ${where}: ${parts.join("; ")}`;
}
