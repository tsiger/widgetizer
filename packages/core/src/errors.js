// @widgetizer/core/errors — shared error types.
//
// Adapters and scoped handlers throw these (Result types are not used). Each
// carries an HTTP `statusCode` so a single error-handling middleware can map
// any of them to a response without per-error branching. An optional `code`
// gives a stable machine-readable string (e.g. "PROJECT_MISMATCH").

export class WidgetizerError extends Error {
  /**
   * @param {string} message
   * @param {{ statusCode: number, code?: string, cause?: unknown }} opts
   */
  constructor(message, { statusCode, code, cause } = {}) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    if (code) this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

export class AuthenticationError extends WidgetizerError {
  constructor(message = "Authentication required", { code, cause } = {}) {
    super(message, { statusCode: 401, code, cause });
  }
}

export class AuthorizationError extends WidgetizerError {
  constructor(message = "Not authorized", { code, cause } = {}) {
    super(message, { statusCode: 403, code, cause });
  }
}

export class NotFoundError extends WidgetizerError {
  constructor(message = "Not found", { code, cause } = {}) {
    super(message, { statusCode: 404, code, cause });
  }
}

export class LimitExceededError extends WidgetizerError {
  constructor(message = "Limit exceeded", { code, cause } = {}) {
    super(message, { statusCode: 402, code, cause });
  }
}

export class UpstreamError extends WidgetizerError {
  constructor(message = "Upstream service error", { code, cause } = {}) {
    super(message, { statusCode: 503, code, cause });
  }
}

export class ConflictError extends WidgetizerError {
  constructor(message = "Conflict", { code, cause } = {}) {
    super(message, { statusCode: 409, code, cause });
  }
}
