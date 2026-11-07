export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

export const FILE_MIME_TYPES = ["application/pdf"];

export const AUDIO_MIME_TYPES = ["audio/mpeg", "audio/mp3"];

export const VIDEO_MIME_TYPES = ["video/mp4"];

export const ZIP_MIME_TYPES = ["application/zip", "application/x-zip-compressed"];

export const IMAGE_ACCEPT = {
  "image/jpeg": [".jpeg", ".jpg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
};

export const FILE_ACCEPT = {
  "application/pdf": [".pdf"],
};

export const AUDIO_ACCEPT = {
  "audio/mpeg": [".mp3"],
};

export const VIDEO_ACCEPT = {
  "video/mp4": [".mp4"],
};

/** Any non-image asset (documents + audio + video) — i.e. what the `file` category covers. Shared
 *  by every `filterType="file"` surface (the media drawer uploader and `FileInput`). */
export const NON_IMAGE_ACCEPT = {
  ...FILE_ACCEPT,
  ...AUDIO_ACCEPT,
  ...VIDEO_ACCEPT,
};

/** Combined accept object for the main Media Library uploader (images + audio + video + files). */
export const MEDIA_ACCEPT = {
  ...IMAGE_ACCEPT,
  ...AUDIO_ACCEPT,
  ...VIDEO_ACCEPT,
  ...FILE_ACCEPT,
};

export const ZIP_ACCEPT = {
  "application/zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
};

function toMegabytes(sizeInBytes) {
  return (sizeInBytes / 1024 / 1024).toFixed(1);
}

export function createRejectedFile(originalName, reason) {
  return { originalName, reason };
}

export function validateFileSizes(files, { maxSizeMB }) {
  const valid = [];
  const rejected = [];

  for (const file of files) {
    if (maxSizeMB != null && file.size > maxSizeMB * 1024 * 1024) {
      rejected.push(
        createRejectedFile(file.name, tooLargeReason(file, maxSizeMB)),
      );
    } else {
      valid.push(file);
    }
  }

  return { valid, rejected };
}

export function isZipFile(file) {
  return file?.name?.toLowerCase().endsWith(".zip") || ZIP_MIME_TYPES.includes(file?.type);
}

export function validateZipFiles(files, { maxSizeMB, multiple = false } = {}) {
  const valid = [];
  const rejected = [];

  if (!multiple && files.length > 1) {
    return {
      valid: [],
      rejected: files.map((file) => createRejectedFile(file.name, "Please upload a single zip file.")),
    };
  }

  for (const file of files) {
    if (!isZipFile(file)) {
      rejected.push(createRejectedFile(file.name, "Only ZIP files are allowed."));
      continue;
    }

    if (maxSizeMB != null && file.size > maxSizeMB * 1024 * 1024) {
      rejected.push(
        createRejectedFile(file.name, tooLargeReason(file, maxSizeMB)),
      );
      continue;
    }

    valid.push(file);
  }

  return { valid, rejected };
}

function tooLargeReason(file, maxSizeMB) {
  const size = `File is too large (${toMegabytes(file.size)}MB).`;
  return maxSizeMB != null ? `${size} Maximum allowed size is ${maxSizeMB}MB.` : size;
}

function formatDropzoneError(error, file, maxSizeMB) {
  if (error.code === "too-many-files") {
    return "Please upload only one file.";
  }

  if (error.code === "file-invalid-type") {
    return "File type not supported.";
  }

  if (error.code === "file-too-large") {
    return tooLargeReason(file, maxSizeMB);
  }

  return error.message || "File was rejected.";
}

/**
 * @param {Array<{ file: File, errors: Array<{ code: string, message?: string }> }>} fileRejections - react-dropzone's rejections
 * @param {{ maxSizeMB?: number }} [options] - the limit the drop zone enforced, so a too-large refusal names it
 */
export function mapDropzoneRejections(fileRejections, { maxSizeMB } = {}) {
  return fileRejections.map(({ file, errors }) =>
    createRejectedFile(file.name, errors.map((error) => formatDropzoneError(error, file, maxSizeMB)).join(" ")),
  );
}
