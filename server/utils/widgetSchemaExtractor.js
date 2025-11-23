import * as cheerio from "cheerio";

/**
 * Extract widget schema from HTML content using proper HTML parsing
 * @param {string} htmlContent - The HTML content containing the widget schema
 * @returns {Object|null} - The parsed widget schema or null if not found/invalid
 */
export function extractWidgetSchema(htmlContent) {
  try {
    // Load HTML content with cheerio
    const $ = cheerio.load(htmlContent);

    // Find script tag with data-widget-schema attribute
    // This handles any attribute order, extra whitespace, or additional attributes
    const schemaScript = $('script[type="application/json"][data-widget-schema]');

    if (schemaScript.length === 0) {
      return null;
    }

    // Get the JSON content from the first matching script tag
    const jsonContent = schemaScript.first().html();

    if (!jsonContent || !jsonContent.trim()) {
      return null;
    }

    // Parse and return the JSON schema
    return JSON.parse(jsonContent.trim());
  } catch (error) {
    console.error("Error extracting widget schema:", error.message);
    return null;
  }
}
