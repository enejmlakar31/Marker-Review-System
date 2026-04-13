// js/marker-manager.js
// Handles all direct communication with the Premiere Pro API:
// adding markers to the timeline, reading them back, and moving the playhead.

const ppro = require("premierepro");
const { getCategoryById, getCategoryByColorIndex } = require("./categories");

// Premiere Pro "ticks"
const TICKS_PER_SECOND = 254016000000n;

// ── Helpers ───────────────────────────────────────────────

// Returns the active project and sequence, trying both API variants for compatibility
async function getProjectAndSequence() {
  let project = null;

  if (ppro.Project && typeof ppro.Project.getActiveProject === "function") {
    project = await ppro.Project.getActiveProject();
  } else if (ppro.app && ppro.app.project) {
    project = ppro.app.project;
  }

  if (!project) throw new Error("No active project in Premiere Pro.");

  let sequence = null;
  if (typeof project.getActiveSequence === "function") {
    sequence = await project.getActiveSequence();
  } else if (project.activeSequence) {
    sequence = project.activeSequence;
  }

  if (!sequence) throw new Error("No open sequence. Open a sequence in Premiere Pro.");
  return { project, sequence };
}

// Converts a ticks BigInt string to a plain number of seconds
function ticksToSeconds(ticksStr) {
  return Number(BigInt(ticksStr) / TICKS_PER_SECOND);
}

// Converts seconds to a timecode string (HH:MM:SS:FF).
// Reads the real FPS from the sequence settings; defaults to 25
async function secondsToTimecode(seconds, sequence) {
  let fps = 25;
  try {
    const settings = await sequence.getSettings();
    if (settings && settings.videoFrameRate) {
      fps = settings.videoFrameRate.value /
            (settings.videoFrameRate.denominator || 1);
    }
  } catch (_) {}

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * fps);
  const pad = (n) => String(Math.floor(n)).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

// ── addMarker ─────────────────────────────────────────────

// Creates a new marker at the current playhead position with the given category and text
// Uses two separate transactions: one to add the marker, one to set its color.
async function addMarker(text, categoryId) {
  const category = getCategoryById(categoryId);
  const { project, sequence } = await getProjectAndSequence();

  // Current playhead position — returns TickTime
  const position = await sequence.getPlayerPosition();

  // Marker collection for the sequence (async)
  const markersObj = await ppro.Markers.getMarkers(sequence);

  // Add marker in a transaction
  await project.lockedAccess(() => {
    project.executeTransaction((compoundAction) => {
      const addAction = markersObj.createAddMarkerAction(
        category.label,                  // name
        ppro.Marker.MARKER_TYPE_COMMENT, // type
        position,                        // startTime (TickTime)
        ppro.TickTime.TIME_ZERO,         // duration
        text                             // comment
      );
      compoundAction.addAction(addAction);
    }, "Add marker");
  });

  // Set color — find the newly added marker and update its color in a second transaction.
  // A second fetch is needed because the marker object from the first transaction
  // doesn't expose a color setter directly.
  try {
    const updatedMarkersObj = await ppro.Markers.getMarkers(sequence);
    const allM = updatedMarkersObj.getMarkers(); // synchronous
    const newMarker = allM.find(
      (m) => String(m.getStart().ticks) === String(position.ticks)
    );
    if (newMarker) {
      await project.lockedAccess(() => {
        project.executeTransaction((compoundAction) => {
          const colorAction = newMarker.createSetColorByIndexAction(
            category.colorIndex
          );
          compoundAction.addAction(colorAction);
        }, "Set marker color");
      });
    }
  } catch (colorErr) {
    // color setting is best-effort; continue without it
  }

  // Build and return a plain marker object for use in the UI
  const ticks = position.ticks;
  const seconds = ticksToSeconds(ticks);
  const timeDisplay = await secondsToTimecode(seconds, sequence);

  return {
    id: ticks,
    ticks,
    timeDisplay,
    categoryId: category.id,
    categoryLabel: category.label,
    colorIndex: category.colorIndex,
    color: category.color,
    text,
    done: false,
  };
}

// ── getMarkers ────────────────────────────────────────────

// Reads all markers from the active sequence and returns them as plain objects,
// sorted by timecode. Skips any marker that throws an error when being read.
async function getMarkers() {
  const { sequence } = await getProjectAndSequence();

  // getMarkers() on ppro.Markers is async — returns a marker collection object
  const markersObj = await ppro.Markers.getMarkers(sequence);

  // .getMarkers() on the collection instance is synchronous
  const markerArray = markersObj.getMarkers();

  const results = [];

  for (const marker of markerArray) {
    try {
      const start       = marker.getStart();
      const ticks       = start.ticks;
      const seconds     = ticksToSeconds(ticks);
      const timeDisplay = await secondsToTimecode(seconds, sequence);

      const name       = marker.getName()       || "";
      const comment    = marker.getComments()   || "";
      // Fall back to colorIndex 3 (White) if the marker has no color set
      const colorIndex = marker.getColorIndex() != null ? marker.getColorIndex() : 3;
      const category   = getCategoryByColorIndex(colorIndex);
      const color      = category.color;

      results.push({
        id:            ticks,
        ticks,
        timeDisplay,
        categoryId:    category.id,
        categoryLabel: name || category.label, // prefer the marker's own name if set
        colorIndex,
        color,
        text:          comment,
        done:          false, // done status is loaded from localStorage later by applyStatuses
      });
    } catch (markerErr) {
      // skip markers that throw when being read
    }
  }

  // Sort by timecode so the list always appears in timeline order
  results.sort((a, b) =>
    BigInt(a.ticks) < BigInt(b.ticks) ? -1 :
    BigInt(a.ticks) > BigInt(b.ticks) ?  1 : 0
  );

  return results;
}

// ── goToMarker ────────────────────────────────────────────

// Moves the Premiere Pro playhead to the given marker position (in ticks)
async function goToMarker(ticks) {
  const { sequence } = await getProjectAndSequence();
  const tickTime = ppro.TickTime.createWithTicks(String(ticks));
  await sequence.setPlayerPosition(tickTime);
}

module.exports = { addMarker, getMarkers, goToMarker };
