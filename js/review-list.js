// js/review-list.js
const { getMarkers, goToMarker } = require("./marker-manager");
const { applyStatuses, setStatus } = require("./storage");
const { applyFilters, getFilterValues } = require("./filters");

// Cached marker array and panel state
let allMarkers = [];
let _root = null;          // DOM root node of the panel
let _onStatsUpdate = null; // callback to update stats in index.js

// Shorthand for querySelector — avoids needing document.getElementById in UXP
function $(id) {
  return _root ? _root.querySelector("#" + id) : null;
}

// ── Render ────────────────────────────────────────────────

// Builds and displays the marker rows from a given markers array.
// Uses createElement instead of innerHTML because UXP doesn't render innerHTML as DOM.
function renderList(markers) {
  const list = $("comments-list");
  if (!list) return;

  // Clear existing rows
  while (list.firstChild) list.removeChild(list.firstChild);

  // Show placeholder if no markers match the current filter
  if (markers.length === 0) {
    const empty = document.createElement("div");
    empty.id = "empty-state";
    empty.textContent = "No comments. Add the first marker above.";
    list.appendChild(empty);
    if (_onStatsUpdate) _onStatsUpdate(allMarkers);
    return;
  }

  // Build one row per marker
  markers.forEach((m, i) => {
    const row = document.createElement("div");
    row.className = `comment-row${m.done ? " done" : ""}`;
    row.setAttribute("data-index", String(i));
    row.setAttribute("data-ticks", String(m.ticks)); // used for navigation on click

    // Column 1: timecode
    const timeSpan = document.createElement("span");
    timeSpan.className = "comment-time";
    timeSpan.textContent = m.timeDisplay;
    row.appendChild(timeSpan);

    // Column 2: category label
    const catSpan = document.createElement("span");
    catSpan.className = "comment-cat";
    const catLabel = document.createElement("span");
    catLabel.className = "cat-label";
    catLabel.textContent = m.categoryLabel;
    catSpan.appendChild(catLabel);
    row.appendChild(catSpan);

    // Column 3: comment text (full text shown on hover via title)
    const textSpan = document.createElement("span");
    textSpan.className = "comment-text";
    textSpan.title = m.text;
    textSpan.textContent = m.text || "—";
    row.appendChild(textSpan);

    // Column 4: done checkbox
    const checkSpan = document.createElement("span");
    checkSpan.className = "comment-check";
    const cb = document.createElement("sp-checkbox");
    cb.setAttribute("data-ticks", String(m.ticks));
    cb.setAttribute("data-name", m.categoryLabel);
    if (m.done) cb.setAttribute("checked", "");
    checkSpan.appendChild(cb);
    row.appendChild(checkSpan);

    list.appendChild(row);
  });

  attachRowHandlers(list);
  attachCheckboxHandlers(list);

  if (_onStatsUpdate) _onStatsUpdate(allMarkers);
}

// Clicking a row moves the Premiere Pro playhead to that marker's position
function attachRowHandlers(list) {
  list.querySelectorAll(".comment-row").forEach((row) => {
    row.addEventListener("click", async (e) => {
      if (e.target.closest("sp-checkbox")) return; // ignore clicks on the checkbox
      const ticks = row.getAttribute("data-ticks");
      try {
        await goToMarker(ticks);
      } catch (err) {
        console.error("Navigation to marker failed:", err);
      }
    });
  });
}

// Toggling a checkbox saves the done state and updates the row styling + stats
function attachCheckboxHandlers(list) {
  list.querySelectorAll("sp-checkbox[data-ticks]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const ticks = cb.getAttribute("data-ticks");
      const name  = cb.getAttribute("data-name") || "";
      const done  = cb.checked;

      // Persist the new status to localStorage
      setStatus(ticks, name, done);

      // Update the in-memory marker so stats stay correct
      const m = allMarkers.find((x) => String(x.ticks) === String(ticks));
      if (m) m.done = done;

      // Toggle the visual "done" style on the row
      const row = cb.closest(".comment-row");
      if (row) row.classList.toggle("done", done);

      // If a status filter is active, re-render so the row moves in/out of view
      const { categoryId, status } = getFilterValues();
      if (status) {
        renderList(applyFilters(allMarkers, categoryId, status));
      } else if (_onStatsUpdate) {
        _onStatsUpdate(allMarkers);
      }
    });
  });
}

// ── Refresh ───────────────────────────────────────────────

// Fetches fresh markers from Premiere Pro, merges saved statuses, and re-renders
async function refreshList() {
  const list = $("comments-list");
  const btn  = $("refresh-btn");

  if (btn) btn.setAttribute("disabled", "true");

  try {
    const markers = await getMarkers();
    allMarkers = applyStatuses(markers); // attach done flags from localStorage
    const { categoryId, status } = getFilterValues();
    renderList(applyFilters(allMarkers, categoryId, status));
  } catch (err) {
    console.error("Error reading markers:", err);
    if (list) {
      list.innerHTML = `<div id="empty-state">Error: ${err && err.message ? err.message : String(err)}</div>`;
    }
  } finally {
    if (btn) btn.removeAttribute("disabled");
  }
}

// ── Init ──────────────────────────────────────────────────

// Called once when the panel is first shown; wires up the refresh button and loads markers
function init(rootNode, onStatsUpdate) {
  _root = rootNode;
  _onStatsUpdate = onStatsUpdate || null;
  const refreshBtn = $("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshList);
  }
  // Defer initial load so UXP has time to compute panel layout first
  setTimeout(refreshList, 100);
}

// Returns the full unfiltered marker array (used by index.js for filter callbacks)
function getAllMarkers() {
  return allMarkers;
}

module.exports = { init, refreshList, renderList, getAllMarkers };
