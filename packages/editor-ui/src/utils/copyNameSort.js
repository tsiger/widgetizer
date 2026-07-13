function parseCopyName(name = "") {
  const trimmedName = String(name).trim();
  const match = trimmedName.match(/^(.*?)(?:\s+\(Copy(?: (\d+))?\))?$/);

  if (!match) {
    return {
      baseName: trimmedName,
      copyNumber: 0,
    };
  }

  return {
    baseName: match[1].trim(),
    copyNumber: match[2] ? parseInt(match[2], 10) : trimmedName.endsWith("(Copy)") ? 1 : 0,
  };
}

export function compareNamesWithCopies(aName = "", bName = "") {
  const a = parseCopyName(aName);
  const b = parseCopyName(bName);

  const baseComparison = a.baseName.localeCompare(b.baseName, undefined, {
    numeric: true,
    sensitivity: "base",
  });

  if (baseComparison !== 0) {
    return baseComparison;
  }

  if (a.copyNumber !== b.copyNumber) {
    return a.copyNumber - b.copyNumber;
  }

  return String(aName).localeCompare(String(bName), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortItemsByCopyName(items, getName = (item) => item?.name || "") {
  return [...items].sort((a, b) => compareNamesWithCopies(getName(a), getName(b)));
}
