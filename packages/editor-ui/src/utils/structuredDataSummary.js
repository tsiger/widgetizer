/**
 * Condense an export result's `structuredData` into what the export screen
 * reports: the readiness items still missing, and for each warning kind how
 * many pages it hit plus one example path.
 * @param {{ readiness?: Array<{ item: string, ok: boolean }>, warnings?: Array<{ path: string, code: string }> }} [structuredData]
 * @returns {{
 *   missing: string[],
 *   emptyArticleFields: { count: number, path: string } | null,
 *   noListingPage: { count: number, path: string } | null,
 *   ambiguousListingPage: { count: number, path: string } | null,
 *   hasProblems: boolean,
 * }}
 */
export function summarizeStructuredData(structuredData) {
  const missing = (structuredData?.readiness || []).filter((entry) => !entry.ok).map((entry) => entry.item);

  const byCode = (code) => {
    const paths = [
      ...new Set((structuredData?.warnings || []).filter((warning) => warning.code === code).map((warning) => warning.path)),
    ];
    return paths.length ? { count: paths.length, path: paths[0] } : null;
  };

  const emptyArticleFields = byCode("emptyArticleFields");
  const noListingPage = byCode("noListingPage");
  const ambiguousListingPage = byCode("ambiguousListingPage");
  return {
    missing,
    emptyArticleFields,
    noListingPage,
    ambiguousListingPage,
    hasProblems: missing.length > 0 || !!emptyArticleFields || !!noListingPage || !!ambiguousListingPage,
  };
}
