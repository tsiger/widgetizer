import { toolError } from "../errors.js";

/**
 * What a tool works with. The open site is resolved once per call and pinned, so
 * every read in the call is from the same site; `finish` then checks the user
 * didn't switch sites while the call ran, since the answer would describe a site
 * that is no longer open.
 *
 * @param {{ args: object, actor: object, appInfo: object, site: object }} options
 */
export function createToolContext({ args, actor, appInfo, site }) {
  let pinned = null;

  return {
    args,
    actor,
    appInfo,
    reader: site.reader,
    listSites: () => site.listSites(actor),

    /** The open site, or a NO_OPEN_SITE error the assistant can relay. */
    async openSite() {
      if (pinned) return pinned;
      const open = await site.openSite(actor);
      if (!open) throw toolError("NO_OPEN_SITE", "No site is open in Widgetizer. Ask the user to open one.");
      pinned = open;
      return pinned;
    },

    /** The site's language for `code` (its main language when omitted). */
    language(code) {
      if (!pinned) throw new Error("openSite() must be called before language()");
      return site.reader.contentLanguage(pinned.project, code);
    },

    async finish() {
      if (!pinned) return;
      const now = await site.openSite(actor);
      if (now?.project.id !== pinned.project.id) {
        throw toolError(
          "SITE_CHANGED",
          "The user switched to another site in Widgetizer while this was being read. Check which site is open and ask again.",
        );
      }
    },

    /** Which site and language a result describes. */
    about(lang) {
      return {
        site: { id: pinned.project.id, name: pinned.project.name },
        ...(lang ? { language: lang.language } : {}),
      };
    },
  };
}
