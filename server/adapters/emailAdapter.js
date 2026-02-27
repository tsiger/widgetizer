/**
 * Adapter interface for email.
 * Open-source: logs to console
 * Hosted: sends via Brevo
 */
export const defaultEmailAdapter = {
  async send(template, params) {
    console.log(`[Email] Would send "${template}" with params:`, params);
    return { success: true, provider: 'console' };
  },
};
