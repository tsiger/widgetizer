export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

export const ZIP_MIME_TYPES = ["application/zip", "application/x-zip-compressed"];

export const IMAGE_ACCEPT = {
  "image/jpeg": [".jpeg", ".jpg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
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
        createRejectedFile(file.name, `File is too large (${toMegabytes(file.size)}MB). Maximum allowed size is ${maxSizeMB}MB.`),
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
        createRejectedFile(file.name, `File is too large (${toMegabytes(file.size)}MB). Maximum allowed size is ${maxSizeMB}MB.`),
      );
      continue;
    }

    valid.push(file);
  }

  return { valid, rejected };
}

function formatDropzoneError(error, file) {
  if (error.code === "too-many-files") {
    return "Please upload only one file.";
  }

  if (error.code === "file-invalid-type") {
    return "File type not supported.";
  }

  if (error.code === "file-too-large") {
    return `File is too large (${toMegabytes(file.size)}MB).`;
  }

  return error.message || "File was rejected.";
}

export function mapDropzoneRejections(fileRejections) {
  return fileRejections.map(({ file, errors }) =>
    createRejectedFile(file.name, errors.map((error) => formatDropzoneError(error, file)).join(" ")),
  );
}
