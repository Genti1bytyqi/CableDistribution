import { renderGraph } from './graph.js';
import { updateOriginalStats, updateOptimizedStats } from './stats.js';

// Global references
let selectedLayout = null;
let optimizedEdges = null;
let currentSelectedNodeType = "terminal";

export function selectLayout(layoutFile) {
  const isEditable = layoutFile === "layouts/custom.json";
  
  const nodeTypeButtonsDiv = document.getElementById("nodeTypeButtons");
  if (nodeTypeButtonsDiv) {
    nodeTypeButtonsDiv.style.display = isEditable ? "flex" : "none";
  }

  if (layoutFile === "layouts/custom.json") {
    document.getElementById("customLayoutControls").style.display = "block";
  } else {
    document.getElementById("customLayoutControls").style.display = "none";
  }

  fetch(layoutFile)
    .then(res => res.json())
    .then(data => {
      selectedLayout = data;
      optimizedEdges = null;

      if (!selectedLayout.name && layoutFile === "layouts/custom.json") {
        selectedLayout.name = "Custom Layout";
      }

      renderGraph(
        selectedLayout.nodes,
        selectedLayout.edges,
        "#originalGraphContainer",
        false,
        true,  // center if desired
        selectedLayout.backgroundImage,
        isEditable
      );
      updateOriginalStats(selectedLayout);

      // Clear the optimized container
      document.getElementById("optimizedGraphContainer").innerHTML = "";
      document.getElementById("optimizedStats").innerHTML = "";
    })
    .catch(err => console.error("Error loading layout:", err));
}

function optimizeSelectedLayout() {
  if (!selectedLayout) return;
  let allEdges = selectedLayout.edges || [];

  if (selectedLayout.name === "Custom Layout") {
    // generate new edges from the node positions
    const scale = selectedLayout.scaleMetersPerPixel || 1;
    const autoEdges = createNearestNeighborEdges(selectedLayout.nodes, scale);
    allEdges = autoEdges;
  }

  // 2) Build a temporary layout object for MST
  const layoutForMST = {
    ...selectedLayout,
    edges: allEdges
  };

  // 3) Call your MST API
  fetch('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(layoutForMST)
  })
    .then(response => response.json())
    .then(data => {
      optimizedEdges = data.mstEdges;

    
      renderGraph(
        selectedLayout.nodes,
        optimizedEdges,
        "#optimizedGraphContainer",
        true,
        true,
        selectedLayout.backgroundImage,
        false 
      );
      updateOptimizedStats(optimizedEdges);
    })
    .catch(err => console.error("Error optimizing layout:", err));
}

document.addEventListener("DOMContentLoaded", function () {
  // 1) Layout Dropdown
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

  const saveSVGBtn = document.getElementById("saveSVGBtn");
  if (saveSVGBtn) {
    saveSVGBtn.addEventListener("click", function () {
      const svgElement = document.querySelector("#optimizedGraphContainer svg");
      if (!svgElement) {
        alert("No optimized layout available to save!");
        return;
      }
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);

      if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgString = svgString.replace(
          "<svg",
          '<svg xmlns="http://www.w3.org/2000/svg"'
        );
      }
      if (!svgString.includes('xmlns:xlink="http://www.w3.org/1999/xlink"')) {
        svgString = svgString.replace(
          "<svg",
          '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'
        );
      }
      svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;

      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "optimized-layout.svg";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    });
  }

  const floorPlanInput = document.getElementById("floorPlanInput");
  if (floorPlanInput) {
    floorPlanInput.addEventListener("change", function (event) {
      const file = event.target.files[0];
      if (file && selectedLayout && selectedLayout.name === "Custom Layout") {

        // Attempt to parse (pixels, meters) from filename
        let ratio = parseFloorPlanFilename(file.name);

        // If no ratio found, prompt user
        if (!ratio) {
          const px = parseFloat(prompt("Enter the pixel measurement (e.g. 252.5):", "200"));
          const m = parseFloat(prompt("Enter the real distance in meters (e.g. 3.35):", "3"));
          if (!isNaN(px) && !isNaN(m) && px > 0 && m > 0) {
            ratio = m / px;
          } else {
            ratio = 1; // fallback if user cancels or inputs invalid data
          }
        }

        // Store the ratio in layout
        selectedLayout.scaleMetersPerPixel = ratio;
        console.log("scaleMetersPerPixel:", ratio);

        // Read the image as data URL
        const reader = new FileReader();
        reader.onload = function (e) {
          selectedLayout.backgroundImage = e.target.result;

          // Render the original container with no edges
          renderGraph(
            selectedLayout.nodes,
            selectedLayout.edges,
            "#originalGraphContainer",
            false,
            true,
            selectedLayout.backgroundImage,
            true 
          );

          // If there's an existing MST, re-render it
          if (optimizedEdges) {
            renderGraph(
              selectedLayout.nodes,
              optimizedEdges,
              "#optimizedGraphContainer",
              true,
              false,
              selectedLayout.backgroundImage,
              false
            );
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
  const nodeTypeButtons = document.querySelectorAll('.node-type-button');
  nodeTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // 1) Update the global variable
      window.currentSelectedNodeType = btn.dataset.nodetype;
      console.log("Selected node type:", window.currentSelectedNodeType);

      // 2) (Optional) Highlight the chosen button
      nodeTypeButtons.forEach(b => b.style.border = "none");
      btn.style.border = "2px solid #007bff"; // highlight in blue
    });
  });
});

function parseFloorPlanFilename(fileName) {
  const pattern = /\(([\d.]+)\s*,\s*([\d.]+)\)/;
  const match = fileName.match(pattern);
  if (match) {
    const pixels = parseFloat(match[1]);
    const meters = parseFloat(match[2]);
    if (!isNaN(pixels) && !isNaN(meters) && pixels > 0 && meters > 0) {
      return meters / pixels; // ratio: meters per pixel
    }
  }
  return null;
}

function createNearestNeighborEdges(nodes, scale = 1) {
  const newEdges = [];
  const usedPairs = new Set();

  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    let minDist = Infinity;
    let nearestNode = null;

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const nodeB = nodes[j];
      const dx = nodeA.x - nodeB.x;
      const dy = nodeA.y - nodeB.y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);
      if (pixelDistance < minDist) {
        minDist = pixelDistance;
        nearestNode = nodeB;
      }
    }

    if (nearestNode) {
      // Avoid duplicates (A->B, B->A)
      const key = [Math.min(nodeA.id, nearestNode.id), Math.max(nodeA.id, nearestNode.id)].join("-");
      if (!usedPairs.has(key)) {
        usedPairs.add(key);

        // Convert pixel distance to meters using scale
        const realDistance = minDist * scale;
        // Round or keep decimals as needed
        const cost = parseFloat(realDistance.toFixed(2));

        newEdges.push({
          from: nodeA.id,
          to: nearestNode.id,
          cost
        });
      }
    }
  }
  return newEdges;
}
