// index.js
// Entry point for the UXP panel. Builds the UI, wires up all event handlers,
// and registers the panel with the UXP entrypoints API.

const { entrypoints } = require("uxp");
const { CATEGORIES } = require("./js/categories");
const { addMarker } = require("./js/marker-manager");
const reviewList = require("./js/review-list");
const { initFilters, applyFilters } = require("./js/filters");

// ── HTML ──────────────────────────────────────────────────

// Returns the full panel HTML as a string.
// Injected into the root node via innerHTML once on first show.
function buildUI() {
  return `
    <div id="mr-panel">

      <!-- TOP: Add marker -->
      <div id="add-section">
        <div class="section-title">Add marker</div>
        <div id="add-row">
          <select id="category-select">
            <option value="" disabled selected>Category</option>
            ${CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}
          </select>
          <sp-textfield id="comment-input" placeholder="Comment (optional)..."></sp-textfield>
          <sp-button id="add-btn" variant="cta">Add</sp-button>
        </div>
      </div>

      <!-- MIDDLE: Filters + list -->
      <div id="list-section">

        <div id="filter-bar">
          <select id="filter-category">
            <option value="" selected>All categories</option>
            ${CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}
          </select>
          <select id="filter-status">
            <option value="" selected>All statuses</option>
            <option value="open">Open</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div id="list-toolbar">
          <span id="list-toolbar-title">Comments</span>
          <sp-action-button id="refresh-btn" quiet title="Refresh list">↺</sp-action-button>
        </div>

        <div id="list-header">
          <span>Time</span>
          <span>Category</span>
          <span>Comment</span>
          <span>✓</span>
        </div>

        <div id="comments-list">
          <div id="empty-state">No comments. Add the first marker above.</div>
        </div>

      </div>

      <!-- BOTTOM: Stats -->
      <div id="stats-section">
        <div class="stats-row">
          <span>Done</span>
          <span id="progress-text">0 / 0</span>
        </div>
        <div class="readiness-row">
          <span>Project readiness</span>
          <span class="readiness-value" id="readiness-value">—</span>
        </div>
      </div>

    </div>
  `;
}

// ── Stats ─────────────────────────────────────────────────

// Recalculates and displays the done count and readiness percentage in the stats bar.
// Called every time a marker's done state changes or the list is refreshed.
function updateStats(markers) {
  const total = markers.length;
  const done  = markers.filter((m) => m.done).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const textEl = document.getElementById("progress-text");
  if (textEl) textEl.textContent = `${done} / ${total}`;

  const readinessEl = document.getElementById("readiness-value");
  if (readinessEl) readinessEl.textContent = total > 0 ? pct + "%" : "—";
}

// ── Initialization ────────────────────────────────────────

// Wires up the Add button: validates input, calls addMarker, then refreshes the list
function initAddButton() {
  const addBtn       = document.getElementById("add-btn");
  const catPicker    = document.getElementById("category-select");
  const commentInput = document.getElementById("comment-input");

  addBtn.addEventListener("click", async () => {
    const categoryId = catPicker.value || "";
    const text = commentInput.value ? commentInput.value.trim() : "";

    if (!categoryId) { alert("Please select a category."); return; }

    // Disable the button while the async operation is in progress
    addBtn.setAttribute("disabled", "true");
    try {
      await addMarker(text, categoryId);
      commentInput.value = "";
      await reviewList.refreshList();
    } catch (err) {
      console.error("Error adding marker:", err);
      alert("Error: " + err.message);
    } finally {
      addBtn.removeAttribute("disabled");
    }
  });
}

// Tracks whether the panel DOM has been built yet
let _panelInitialized = false;

// Called by UXP each time the panel becomes visible.
// On first show: builds the UI and initialises all components.
// On subsequent shows: just refreshes the marker list.
function show(rootNode) {
  if (_panelInitialized) {
    reviewList.refreshList();
    return;
  }
  _panelInitialized = true;

  rootNode.innerHTML = buildUI();
  initAddButton();
  reviewList.init(rootNode, updateStats);

  // When either filter changes, re-render the list
  initFilters((categoryId, status) => {
    reviewList.renderList(applyFilters(reviewList.getAllMarkers(), categoryId, status));
  });
}

// Register the panel with UXP so Premiere Pro knows how to open it
entrypoints.setup({
  panels: {
    markerReviewPanel: { show },
  },
});
