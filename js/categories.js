// js/categories.js
// Defines the fixed list of marker categories used throughout the plugin.
// Each category maps to a Premiere Pro marker color via colorIndex (0–7).
// colorIndex values: 0=Red, 1=Orange, 2=Yellow, 3=White, 4=Blue, 5=Cyan, 6=Green, 7=Magenta

const CATEGORIES = [
  {
    id: "color-correction",
    label: "Color Correction",
    color: "#d22c36", // color shown in the plugin UI
    colorIndex: 1,    // Orange marker in Premiere Pro
  },
  {
    id: "audio",
    label: "Audio",
    color: "#D0A12F",
    colorIndex: 4,    // Blue marker in Premiere Pro
  },
  {
    id: "content",
    label: "Content",
    color: "#af8bb1",
    colorIndex: 2,    // Yellow marker in Premiere Pro
  },
  {
    id: "graphics",
    label: "Graphics",
    color: "#428dfc",
    colorIndex: 6,    // Green marker in Premiere Pro
  },
  {
    id: "general",
    label: "General",
    color: "#FFFFFF",
    colorIndex: 5,    // Cyan marker in Premiere Pro
  },
];

// Looks up a category by its string id. Falls back to "General" if not found.
function getCategoryById(id) {
  return CATEGORIES.find((cat) => cat.id === id) || CATEGORIES[4];
}

// Looks up a category by Premiere Pro's colorIndex. Falls back to "General" if not found.
// Used when reading existing markers from the timeline.
function getCategoryByColorIndex(colorIndex) {
  return CATEGORIES.find((cat) => cat.colorIndex === colorIndex) || CATEGORIES[4];
}

module.exports = { CATEGORIES, getCategoryById, getCategoryByColorIndex };
