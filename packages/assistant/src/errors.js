/** An error the assistant can act on: its message is shown to the model as-is. */
export class ToolError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const toolError = (code, message) => new ToolError(code, message);

// Errors raised by the shared readers whose messages are written for a person and
// safe to pass on. Anything else is reported generically and logged.
const PASS_THROUGH_CODES = new Set(["LANGUAGE_UNKNOWN", "ITEM_NOT_FOUND", "COLLECTION_NOT_FOUND", "NO_ITEM_TEMPLATE"]);

export function asToolError(error) {
  if (error instanceof ToolError) return error;
  if (PASS_THROUGH_CODES.has(error?.code)) return new ToolError(error.code, error.message);
  return null;
}
