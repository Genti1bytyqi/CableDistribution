import { renderGraph } from './graph.js';
import { updateOriginalStats, updateOptimizedStats, updateOriginalStatsNodesAndEdges } from './stats.js';

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
        selectedLayout.backgroundImage,
        isEditable,
        selectedLayout
      );
      //updateOriginalStatsNodesAndEdges(selectedLayout.nodes, selectedLayout.edges);
      updateOriginalStats(selectedLayout);
      // Clear the optimized container
      document.getElementById("optimizedGraphContainer").innerHTML = "";
      document.getElementById("optimizedStats").innerHTML = "";
    })
    .catch(err => console.error("Error loading layout:", err));
}

function optimizeSelectedLayout() {
  if (!selectedLayout) return;
  // For custom layout, the user might have drawn some edges.
  let allEdges = selectedLayout.edges || [];
  
  // Do not overwrite user-provided edges. (You can merge with generated edges on the backend if needed.)
  const layoutForMST = {
    ...selectedLayout,
    edges: allEdges
  };

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
        selectedLayout.backgroundImage,
        false,
        selectedLayout
      );
      updateOptimizedStats(selectedLayout.nodes, optimizedEdges);
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

      const originalSvg = document.querySelector("#optimizedGraphContainer svg");
      const statsElement = document.getElementById("optimizedStats");

      if (!originalSvg) {
        alert("No optimized layout available to save!");
        return;
      }
      // Clone the SVG so we don't modify the displayed one
      const svgClone = originalSvg.cloneNode(true);

      const originalHeight = parseInt(svgClone.getAttribute("height"), 10) || 500;
      const statsHeight = 130; // extra height for stats
      const newHeight = originalHeight + statsHeight;
      svgClone.setAttribute("height", newHeight);

      const viewBox = svgClone.getAttribute("viewBox");
      if (viewBox) {
        const vbParts = viewBox.split(" ");
        if (vbParts.length === 4) {
          vbParts[3] = newHeight;
          svgClone.setAttribute("viewBox", vbParts.join(" "));
        }
      }
      if (statsElement) {
        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        foreignObject.setAttribute("x", "300");
        foreignObject.setAttribute("y", originalHeight.toString());
        foreignObject.setAttribute("width", "100%");
        foreignObject.setAttribute("height", statsHeight.toString());
        
        fetch("/css/style.css")

        const statsDiv = document.createElement("div");
        statsDiv.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
        statsDiv.classList.add("svg-stats"); //need to fix the css is not taken!
        statsDiv.innerHTML = statsElement.innerHTML;
        foreignObject.appendChild(statsDiv);
        svgClone.appendChild(foreignObject);
      }
      //console.log("foreign_object_attr:",foreignObject)
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgClone);

      if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!svgString.includes('xmlns:xlink="http://www.w3.org/1999/xlink"')) {
        svgString = svgString.replace("<svg", '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
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

        const floorplanMetadata = parseFloorPlanFilename(file.name);
        let ratio = floorplanMetadata.ratio;
        let customWidth = floorplanMetadata.width;
        let customHeight = floorplanMetadata.height;
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

        selectedLayout.scaleMetersPerPixel = ratio || 1;
        selectedLayout.imageWidth = customWidth || 1068;  
        selectedLayout.imageHeight = customHeight || 500;
        console.log("scaleMetersPerPixel:", ratio);
        console.log("imageWidth:", customWidth);
        console.log("imageHeight:", customHeight);

        const reader = new FileReader();
        reader.onload = function (e) {
          selectedLayout.backgroundImage = e.target.result;

          renderGraph(
            selectedLayout.nodes,
            selectedLayout.edges,
            "#originalGraphContainer",
            false,
            selectedLayout.backgroundImage,
            true,
            selectedLayout
          );

          if (optimizedEdges) {
            renderGraph(
              selectedLayout.nodes,
              optimizedEdges,
              "#optimizedGraphContainer",
              true,
              selectedLayout.backgroundImage,
              false,
              selectedLayout
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

      nodeTypeButtons.forEach(b => b.style.border = "none");
      btn.style.border = "2px solid #007bff"; // highlight in blue
    });
  });
});

export function parseFloorPlanFilename(fileName) {
  // Pattern for [width, height]
  const dimensionPattern = /\[([\d.]+)\s*,\s*([\d.]+)\]/;

  // Pattern for (pixels, meters)
  const ratioPattern = /\(([\d.]+)\s*,\s*([\d.]+)\)/;

  let width = null;
  let height = null;
  let ratio = null;

  const dimMatch = fileName.match(dimensionPattern);
  if (dimMatch) {
    const w = parseFloat(dimMatch[1]);
    const h = parseFloat(dimMatch[2]);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      width = w;
      height = h;
    }
  }
  const ratioMatch = fileName.match(ratioPattern);
  if (ratioMatch) {
    const pixels = parseFloat(ratioMatch[1]);
    const meters = parseFloat(ratioMatch[2]);
    if (!isNaN(pixels) && !isNaN(meters) && pixels > 0 && meters > 0) {
      // pixels per meter
      ratio = pixels / meters;
    }
  }

  console.log("INSIDE PARSE")
  console.log("width:", width);
  console.log("height:", height);
  console.log("ratio:", ratio);
  return { width, height, ratio };
}

// function createNearestNeighborEdges(nodes, scale = 1) {
//   const newEdges = [];
//   const usedPairs = new Set();

//   for (let i = 0; i < nodes.length; i++) {
//     const nodeA = nodes[i];
//     let minDist = Infinity;
//     let nearestNode = null;

//     for (let j = 0; j < nodes.length; j++) {
//       if (i === j) continue;
//       const nodeB = nodes[j];
//       const dx = nodeA.x - nodeB.x;
//       const dy = nodeA.y - nodeB.y;
//       const pixelDistance = Math.sqrt(dx * dx + dy * dy);

//       console.log("pixelDistance:", pixelDistance)
//       if (pixelDistance < minDist) {
//         minDist = pixelDistance;
//         nearestNode = nodeB;
//       }
//     }

//     if (nearestNode) {
//       const key = [Math.min(nodeA.id, nearestNode.id), Math.max(nodeA.id, nearestNode.id)].join("-");
//       if (!usedPairs.has(key)) {
//         usedPairs.add(key);

//         const realDistance = minDist / scale;
//         const cost = parseFloat(realDistance.toFixed(2));

//         newEdges.push({
//           from: nodeA.id,
//           to: nearestNode.id,
//           cost
//         });
//       }
//     }
//   }
//   return newEdges;
// }

