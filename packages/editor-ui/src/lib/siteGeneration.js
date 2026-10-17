// The change generation of the content this window loaded. Writes carry it so the
// server can refuse one based on content the assistant has since changed.
let baseline = null;

export function setSiteGeneration(generation) {
  baseline = generation == null ? null : String(generation);
}

export function getSiteGeneration() {
  return baseline;
}

export const SITE_GENERATION_HEADER = "X-Site-Generation";
