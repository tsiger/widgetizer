/**
 * What a theme setting may put into the page's `:root` rule as a CSS custom
 * property. A setting holds one value (a colour, a font, a size), and its value
 * is written into a declaration, so nothing in it may end that declaration or
 * leave the rule or the <style> tag.
 */

// `;` ends a declaration, `{` `}` open and close a rule, `<` `>` can close the
// <style> tag, and a control character (a newline included) has no place in a value.
// eslint-disable-next-line no-control-regex
const CSS_VALUE_BREAKERS = /[;{}<>\u0000-\u001f\u007f]/g;

/** True when a string value holds a character that could end its declaration. */
export function hasCssValueBreaker(value) {
  if (typeof value !== "string") return false;
  CSS_VALUE_BREAKERS.lastIndex = 0;
  return CSS_VALUE_BREAKERS.test(value);
}

/**
 * A value as it is written into a declaration: the breaking characters removed.
 * Stripped, not dropped, so a value saved before the stricter checks keeps its
 * look and loses only what could never have been part of it.
 * @param {*} value
 * @returns {string}
 */
export function cssVariableValue(value) {
  return String(value).replace(CSS_VALUE_BREAKERS, "");
}

const CSS_VARIABLE_NAME_PART = /^[A-Za-z0-9_-]+$/;

/** True when a settings group and a setting id can form the name `--<group>-<id>`. */
export function isCssVariableName(group, id) {
  return typeof group === "string" && typeof id === "string" && CSS_VARIABLE_NAME_PART.test(group) && CSS_VARIABLE_NAME_PART.test(id);
}
