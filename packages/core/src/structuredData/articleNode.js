import { pageSelfUrl, publishedImageUrl } from "../utils/publishedUrls.js";
import { resolveSiteIdentity } from "../utils/siteIdentity.js";
import { htmlToText } from "./htmlText.js";
import { siteNodeId, urlNodeId } from "./ids.js";

function fieldText(source, fieldId) {
  const value = fieldId ? source.settings?.[fieldId] : undefined;
  if (typeof value !== "string") return undefined;
  const text = source.settingTypes?.[fieldId] === "richtext" ? htmlToText(value) : value.replace(/\s+/g, " ").trim();
  return text || undefined;
}

const ARTICLE_PROPERTIES = ["headline", "datePublished", "description", "image", "articleBody"];

/**
 * The article properties a collection item's schema maps but the item leaves
 * empty, for export reporting. An empty headline means no article is emitted.
 * @param {object} collectionItem - The item page's `collectionItem`
 * @returns {string[]}
 */
export function emptyArticleFields(collectionItem) {
  const block = collectionItem?.structuredData;
  if (block?.type !== "BlogPosting") return [];
  return ARTICLE_PROPERTIES.filter((property) => {
    const fieldId = block[property];
    if (!fieldId) return false;
    if (property === "image") {
      const path = collectionItem.settings?.[fieldId];
      return !(typeof path === "string" && path);
    }
    return !fieldText(collectionItem, fieldId);
  });
}

/**
 * The BlogPosting node of a collection item page whose schema declares one.
 * Every value comes from the visible fields the schema maps, never from the
 * SEO description or social image; core adds the address, dateModified, the
 * page it belongs to and the publisher. Omitted without a headline.
 */
export function articleNode(context) {
  const { page, project, siteUrl, mediaFiles } = context;
  const source = page?.collectionItem;
  const block = source?.structuredData;
  if (block?.type !== "BlogPosting") return null;

  const url = pageSelfUrl(page, project);
  const id = urlNodeId(url, "article");
  const headline = fieldText(source, block.headline);
  if (!id || !headline) return null;

  const imagePath = block.image ? source.settings?.[block.image] : undefined;
  const identity = resolveSiteIdentity(project?.siteIdentity, project);

  return {
    "@type": "BlogPosting",
    "@id": id,
    url,
    headline,
    datePublished: fieldText(source, block.datePublished),
    dateModified: typeof page.updated === "string" ? page.updated : undefined,
    description: fieldText(source, block.description),
    image: typeof imagePath === "string" && imagePath ? publishedImageUrl(imagePath, siteUrl, mediaFiles) : undefined,
    articleBody: fieldText(source, block.articleBody),
    isPartOf: { "@id": urlNodeId(url, "webpage") },
    publisher: identity.name ? { "@id": siteNodeId(siteUrl, "identity") } : undefined,
  };
}
