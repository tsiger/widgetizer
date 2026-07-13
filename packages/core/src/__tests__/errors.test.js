import { describe, it, expect } from "vitest";
import {
  WidgetizerError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  LimitExceededError,
  UpstreamError,
  ConflictError,
} from "../errors.js";
import { LIMIT_KEYS } from "../adapters.js";

describe("error types", () => {
  const cases = [
    [AuthenticationError, 401],
    [AuthorizationError, 403],
    [NotFoundError, 404],
    [LimitExceededError, 402],
    [UpstreamError, 503],
    [ConflictError, 409],
  ];

  for (const [Err, status] of cases) {
    it(`${Err.name} carries statusCode ${status} and is a WidgetizerError`, () => {
      const e = new Err();
      expect(e).toBeInstanceOf(WidgetizerError);
      expect(e).toBeInstanceOf(Error);
      expect(e.statusCode).toBe(status);
      expect(e.name).toBe(Err.name);
    });
  }

  it("preserves a custom message and optional code/cause", () => {
    const cause = new Error("root");
    const e = new ConflictError("project mismatch", { code: "PROJECT_MISMATCH", cause });
    expect(e.message).toBe("project mismatch");
    expect(e.code).toBe("PROJECT_MISMATCH");
    expect(e.cause).toBe(cause);
  });

  it("omits code when not provided", () => {
    const e = new NotFoundError();
    expect("code" in e).toBe(false);
  });
});

describe("LIMIT_KEYS", () => {
  it("is frozen and exposes the canonical keys", () => {
    expect(Object.isFrozen(LIMIT_KEYS)).toBe(true);
    expect(LIMIT_KEYS.MAX_UPLOAD_SIZE_BYTES).toBe("MAX_UPLOAD_SIZE_BYTES");
    expect(Object.keys(LIMIT_KEYS)).toContain("FORM_SUBMISSIONS_PER_MONTH");
  });
});
