import { createElement } from "react";
import { icons, Database } from "lucide-react";

// Icon names themes could use before Lucide 1.x renamed them, mapped to the
// current names (the keys of `icons`). `icons` holds current names only, and a
// lookup across all of lucide-react's named exports would keep every alias in
// the bundle.
const RENAMED_ICONS = {
  Album: "SquareBookmark",
  Angry: "FaceAngry",
  Annoyed: "FaceExpressionless",
  ArchiveRestore: "ArchiveArrowUp",
  Bold: "LetterB",
  BookMarked: "BookBookmark",
  Building2: "BuildingComplex",
  CircleParking: "CircleLetterP",
  CircleParkingOff: "CircleLetterPOff",
  Copyright: "CircleLetterC",
  FlipHorizontal: "SquareCenterlineDashedHorizontal",
  FlipHorizontal2: "TrianglesCenterlineDashedHorizontal",
  FlipVertical: "SquareCenterlineDashedVertical",
  FlipVertical2: "TrianglesCenterlineDashedVertical",
  Frown: "FaceSlightlyFrowning",
  Heading: "LetterH",
  History: "RotateCcwClock",
  Laugh: "FaceGrinning",
  Meh: "FaceNeutral",
  Music: "EighthNotes",
  Music2: "EighthNote",
  Music3: "HalfNote",
  Music4: "SixteenthNotes",
  Podcast: "MicSignal",
  Smile: "FaceSlightlySmiling",
  SmilePlus: "FaceSlightlySmilingPlus",
  SquareM: "SquareLetterM",
  SquareParking: "SquareLetterP",
  SquareParkingOff: "SquareLetterPOff",
  TextSelect: "SquareDashedText",
  Trash2: "Trash",
  Waves: "WavesHorizontal",
};

/**
 * Resolve a Lucide icon component from a theme-provided PascalCase name string
 * (e.g. "Briefcase", "Users"). Theme schemas declare icons by name, so this is
 * a runtime lookup rather than a static import.
 *
 * @param {string} name - PascalCase Lucide icon name (current, or one in RENAMED_ICONS).
 * @param {React.ComponentType} [fallback=Database] - Component to use when the
 *   name is missing or unknown.
 * @returns {React.ComponentType}
 */
export function resolveLucideIcon(name, fallback = Database) {
  if (typeof name !== "string" || !name) return fallback;
  const current = Object.hasOwn(RENAMED_ICONS, name) ? RENAMED_ICONS[name] : name;
  return Object.hasOwn(icons, current) ? icons[current] : fallback;
}

/**
 * Render the Lucide icon a theme names (see resolveLucideIcon), passing the
 * other props to it. A looked-up icon rendered directly reads, to the React
 * Compiler, like a component created during render; this module-level wrapper
 * keeps the lookup out of the caller's render.
 *
 * @param {{ name: string, fallback?: React.ComponentType }} props - plus any Lucide icon props
 */
export function LucideIcon({ name, fallback, ...props }) {
  return createElement(resolveLucideIcon(name, fallback), props);
}
