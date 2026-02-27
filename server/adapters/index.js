import { defaultPublishAdapter } from './publishAdapter.js';
import { defaultLimitsAdapter } from './limitsAdapter.js';
import { defaultAuthAdapter } from './authAdapter.js';
import { defaultEmailAdapter } from './emailAdapter.js';

export const defaultAdapters = {
  publish: defaultPublishAdapter,
  limits: defaultLimitsAdapter,
  auth: defaultAuthAdapter,
  email: defaultEmailAdapter,
};

/**
 * Merge user-provided adapters with defaults.
 * Partial overrides are supported — only override what you provide.
 */
export function resolveAdapters(overrides = {}) {
  return {
    publish: { ...defaultPublishAdapter, ...overrides.publish },
    limits: { ...defaultLimitsAdapter, ...overrides.limits },
    auth: { ...defaultAuthAdapter, ...overrides.auth },
    email: { ...defaultEmailAdapter, ...overrides.email },
  };
}
