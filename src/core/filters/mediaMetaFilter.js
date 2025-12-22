/**
 * media_meta filter
 *
 * Usage: {{ 'path/to/file.mp3' | media_meta }} -> returns metadata object { title, description, alt, ... }
 * Usage: {{ 'path/to/file.mp3' | media_meta: 'title' }} -> returns "Song Title"
 */

export function registerMediaMetaFilter(engine) {
  engine.registerFilter("media_meta", function (path, property) {
    if (!path || typeof path !== "string") return "";

    // Access context to get mediaFiles map
    // The context structure in LiquidJS depends on how it's passed.
    // In our renderingService.js, we pass `mediaFiles` at the top level of the context.
    const context = this.context;

    // In LiquidJS, context variables are accessed via context.get(['variableName'])
    // or sometimes directly if we are lucky, but accessing the scope is safer.
    // Let's try to get mediaFiles from the context.

    // Note: LiquidJS usage of `this.context` allows access to the scope.
    // context.get(['mediaFiles']) should return the object.

    // We need to handle potential async nature if get is async, but usually it's synchronous for simple objects.
    // However, our renderingService calls parseAndRender which is async, but filters are sync unless they return a promise.
    // Since mediaFiles is a plain object passed in, it should be sync.

    let mediaFiles = null;
    try {
      // Try standard LiquidJS context access
      mediaFiles = context.get(["mediaFiles"]);
    } catch (e) {
      // Fallback or error logging
    }

    if (!mediaFiles) return "";

    // Extract filename from path
    const filename = path.split("/").pop();

    // Look up file in mediaFiles map
    const file = mediaFiles[filename];

    if (!file || !file.metadata) return "";

    if (property) {
      return file.metadata[property] || "";
    }

    return file.metadata;
  });
}
