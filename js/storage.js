// js/storage.js
// Persists marker done/undone status in localStorage between sessions.
// Each entry is keyed by ticks + category name so markers with the same
// timecode but different categories don't overwrite each other.
// Status key format: "mr_<ticks>_<categoryName>"

const PREFIX = "mr_";

// Builds the localStorage key for a given marker
function makeKey(ticks, name) {
  return PREFIX + String(ticks) + "_" + (name || "");
}

// ── Status ────────────────────────────────────────────────

// Returns true if the marker is saved as done, false otherwise
function getStatus(ticks, name) {
  try {
    return localStorage.getItem(makeKey(ticks, name)) === "1";
  } catch (_) {
    return false;
  }
}

// Saves or removes the done flag for a marker
function setStatus(ticks, name, done) {
  try {
    const key = makeKey(ticks, name);
    if (done) {
      localStorage.setItem(key, "1");
    } else {
      localStorage.removeItem(key); // remove instead of storing "0" to keep storage clean
    }
  } catch (err) {
    console.error("storage.js: error saving status:", err);
  }
}

// Attaches a "done" flag to each marker object by reading localStorage
function applyStatuses(markers) {
  return markers.map((m) => ({
    ...m,
    done: getStatus(m.ticks, m.categoryLabel),
  }));
}

module.exports = { getStatus, setStatus, applyStatuses };
