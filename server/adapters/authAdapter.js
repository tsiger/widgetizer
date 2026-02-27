/**
 * Adapter interface for authentication.
 * Open-source: always returns "local" userId
 * Hosted: platform-provided JWT verification
 */
export const defaultAuthAdapter = {
  async verifyRequest(_req) {
    return { userId: 'local', authenticated: true };
  },
  isHosted() {
    return false;
  },
};
