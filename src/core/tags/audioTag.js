import path from "path";
import { Hash } from "liquidjs";

export const AudioTag = {
  parse(tagToken) {
    this.hash = new Hash(tagToken.args);
  },

  *render(context) {
    const options = yield this.hash.render(context);
    const { src, output = "url" } = options;

    if (!src) return "";

    const filename = path.basename(src);
    const mediaFile = context.get(["mediaFiles", filename]);

    if (!mediaFile) {
      return `<!-- Audio tag error: media file "${filename}" not found -->`;
    }

    if (!mediaFile.type?.startsWith("audio/")) {
      return `<!-- Audio tag error: "${filename}" is not an audio file -->`;
    }

    const audioBasePath = context.get(["audioPath"]);
    return `${audioBasePath}/${filename}`;
  },
};
