/**
 * Marks every JSON reply from a builder router `Cache-Control: no-store`,
 * unless its handler set its own caching.
 *
 * Editor API replies are per-request data, and without a directive the browser
 * may keep a copy (Express adds an ETag) and hand it back on a later request.
 * In one Firefox session such reused replies reached the editor with an empty
 * body although the server had sent a full one. Files sent with `res.send` or
 * `res.sendFile` (theme assets, export downloads) are untouched and cache as
 * before.
 *
 * `noStoreJson` goes first in a router and `endNoStoreJson` last: a request no
 * route answers leaves the router with `res.json` as it found it, so an
 * embedding app's own routes after it keep their caching.
 */
const ORIGINAL_JSON = Symbol("noStoreJson.original");

export function noStoreJson(_req, res, next) {
  const json = res.json;
  res[ORIGINAL_JSON] = json;
  res.json = function jsonNoStore(body) {
    if (!this.get("Cache-Control")) this.set("Cache-Control", "no-store");
    return json.call(this, body);
  };
  next();
}

export function endNoStoreJson(_req, res, next) {
  if (res[ORIGINAL_JSON]) {
    res.json = res[ORIGINAL_JSON];
    delete res[ORIGINAL_JSON];
  }
  next();
}
