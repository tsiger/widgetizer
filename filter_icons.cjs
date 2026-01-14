const fs = require("fs");
const FILE = "/Users/tsiger/Playground/widgetizer/themes/arch/assets/icons.json";

// Accumulating banned suffixes here.
// User can add more to this list.
const BANNED_SUFFIXES = [
  // Previously removed
  "-minus",
  "-cog",
  "-down",
  "-exclamation",
  "-bolt",
  "-check",
  "-pause",

  // New batch
  "-plus",
  "-search",
  "-star",
  "-cancel",

  // New batch 2
  "-share",
  "-ribbon",
  "-stats",

  // New batch 3
  "-spark",
  "-question",
  "-pin",
  "-code",
];

try {
  if (!fs.existsSync(FILE)) {
    console.error(`File not found: ${FILE}`);
    process.exit(1);
  }

  const data = fs.readFileSync(FILE, "utf8");
  const json = JSON.parse(data);
  let removedCount = 0;
  let totalCount = 0;

  for (const groupName in json.groups) {
    const group = json.groups[groupName];

    for (const iconName in group) {
      let remove = false;
      for (const suffix of BANNED_SUFFIXES) {
        if (iconName.endsWith(suffix)) {
          remove = true;
          break;
        }
      }

      if (remove) {
        delete group[iconName];
        removedCount++;
      } else {
        totalCount++;
      }
    }

    if (Object.keys(group).length === 0) {
      delete json.groups[groupName];
    }
  }

  fs.writeFileSync(FILE, JSON.stringify(json, null, 2));
  console.log(`Removed ${removedCount} icons. Remaining: ${totalCount}`);
} catch (e) {
  console.error("Error processing file:", e);
}
