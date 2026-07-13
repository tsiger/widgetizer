import { assertWithin as coreAssertWithin } from "@widgetizer/core/pathSecurity";

// Thin wrapper over @widgetizer/core/pathSecurity (the single implementation).
// Preserves this adapter's prior semantics, which PERMIT target === base
// (allowEqual: true) — e.g. listing/stat-ing the project root itself.
export function assertWithin(base, target) {
  coreAssertWithin(base, target, { allowEqual: true });
}
