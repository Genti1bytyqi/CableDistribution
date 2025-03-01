// front-end/js/main.js
import { renderGraph } from './graph.js';
import { updateOriginalStats, updateOptimizedStats } from './stats.js';

let selectedLayout = null;
let optimizedEdges = null;

export function selectLayout(layoutFile) {
  fetch(layoutFile)
    .then(res => res.json())
    .then(data => {
      selectedLayout = data;
      optimizedEdges = null;

      renderGraph(selectedLayout.nodes, selectedLayout.edges, "#originalGraphContainer", false);
      updateOriginalStats(selectedLayout);

      document.getElementById("optimizedGraphContainer").innerHTML = "";
      document.getElementById("optimizedStats").innerHTML = "";
    })
    .catch(err => console.error("Error loading layout:", err));
}

function optimizeSelectedLayout() {
  if (!selectedLayout) return;

  fetch('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selectedLayout)
  })
    .then(response => response.json())
    .then(data => {
      optimizedEdges = data.mstEdges;
      renderGraph(selectedLayout.nodes, optimizedEdges, "#optimizedGraphContainer", true);
      updateOptimizedStats(optimizedEdges);
    })
    .catch(err => console.error("Error optimizing layout:", err));
}

document.addEventListener("DOMContentLoaded", function () {
  const dropdown = document.getElementById("layoutDropdown");
  if (dropdown) {
    dropdown.addEventListener("change", function () {
      selectLayout(this.value);
    });
    if (dropdown.value) {
      selectLayout(dropdown.value);
    }
  }
  const optimizeBtn = document.getElementById("optimizeBtn");
  if (optimizeBtn) {
    optimizeBtn.addEventListener("click", optimizeSelectedLayout);
  }
});
