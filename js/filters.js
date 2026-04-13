// js/filters.js
// Handles filtering of the marker list by category and done/open status

// Returns only the markers that match both the selected category and status
// Empty string values mean "no filter applied" for that field
function applyFilters(markers, categoryId, status) {
  return markers.filter((m) => {
    if (categoryId && m.categoryId !== categoryId) return false;
    if (status === "open" &&  m.done) return false;
    if (status === "done" && !m.done) return false;
    return true;
  });
}

// Reads the current values from the two filter dropdowns in the DOM
// Falls back to "" if the element doesn't exist or .value is undefined-UXP quirk
function getFilterValues() {
  const catEl = document.getElementById("filter-category");
  const stEl  = document.getElementById("filter-status");
  return {
    categoryId: catEl ? (catEl.value || "") : "",
    status:     stEl  ? (stEl.value  || "") : "",
  };
}

// Attaches change listeners to both filter dropdowns
// Calls onFilterChange(categoryId, status) whenever either dropdown changes
function initFilters(onFilterChange) {
  const catEl = document.getElementById("filter-category");
  const stEl  = document.getElementById("filter-status");

  function changed() {
    const { categoryId, status } = getFilterValues();
    if (typeof onFilterChange === "function") {
      onFilterChange(categoryId, status);
    }
  }

  if (catEl) catEl.addEventListener("change", changed);
  if (stEl)  stEl.addEventListener("change", changed);
}

module.exports = { applyFilters, getFilterValues, initFilters };
