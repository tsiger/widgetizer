import path from "path";

function registerAudioFilter(engine) {
  engine.registerFilter("audio", function (input, ...args) {
    if (!input || typeof input !== "string") {
      return "";
    }

    const filename = path.basename(input);
    const mediaFile = this.context.get(["mediaFiles", filename]);
    if (!mediaFile) {
      return `<!-- Audio filter error: media file "${filename}" not found -->`;
    }
    if (!mediaFile.type?.startsWith("audio/")) {
      return `<!-- Audio filter error: "${filename}" is not an audio file -->`;
    }

    const firstArg = args[0];

    // Check if user wants just the path/url (like image/video filter)
    if (firstArg === "path" || firstArg === "url") {
      const audioBasePath = this.context.get(["audioPath"]);
      return `${audioBasePath}/${filename}`;
    }

    // Default behavior: return just the path (audio elements are typically more custom)
    const audioBasePath = this.context.get(["audioPath"]);
    return `${audioBasePath}/${filename}`;
  });
}

export { registerAudioFilter };
