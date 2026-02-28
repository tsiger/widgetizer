/**
 * Adapter interface for publishing.
 * Open-source: no-op (publishing not available)
 * Hosted: implemented by control-plane with D1/R2
 */
export const defaultPublishAdapter = {
  async deploy(_exportDir, _metadata, _userId) {
    throw new Error('Publishing is not available in open-source mode. Use Export instead.');
  },
  async getStatus(_projectId, _userId) {
    return { published: false, siteId: null, url: null, publishedAt: null };
  },
  async syncUrl(_siteId, _url, _userId) {
    // no-op in open-source
  },
  async deleteSite(_siteId, _userId) {
    // no-op in open-source
  },
  async createDraft(_projectName, _source, _userId) {
    // no-op in open-source — returns null (no D1 draft registration)
    return null;
  },
};
