/**
 * Adapter interface for hosted limits.
 * Open-source: returns null (safety limits only from limits.js)
 * Hosted: returns tier-aware limits from control-plane
 */
export const defaultLimitsAdapter = {
  async getEffectiveLimits(_userId) {
    return null; // null = no hosted limits, only safety limits apply
  },
  async getUserTier(_userId) {
    return null; // null = no tier system
  },
};
