import { renderGraph } from './graph.js';
import { updateOriginalStats, updateOptimizedStats } from './stats.js';

let selectedLayout = null;
let optimizedEdges = null;

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
        true,
        selectedLayout
      );
      updateOriginalStats(selectedLayout);r
      document.getElementById("optimizedGraphContainer").innerHTML = "";
      document.getElementById("optimizedStats").innerHTML = "";
    })
    .catch(err => console.error("Error loading layout:", err));
}

function optimizeSelectedLayout() {
  if (!selectedLayout) return;
  let allEdges = selectedLayout.edges || [];

  const layoutForMST = {
    nodes: selectedLayout.nodes,
    edges: allEdges,
    scaleMetersPerPixel: selectedLayout.scaleMetersPerPixel || 1
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
      const statsHeight = 190; // extra height for stats
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
        foreignObject.setAttribute("x", "5");
        foreignObject.setAttribute("y", originalHeight.toString());
        foreignObject.setAttribute("width", "100%");
        foreignObject.setAttribute("height", statsHeight.toString());

        const statsDiv = document.createElement("div");
        statsDiv.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
        statsDiv.classList.add("svg-stats");
        statsDiv.innerHTML = statsElement.innerHTML;
        foreignObject.appendChild(statsDiv);
        svgClone.appendChild(foreignObject);
      }

      inlineImages(svgClone).then(() => {
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
    });
  }

  function inlineImages(svgElement) {
    const images = svgElement.querySelectorAll("image");
    const promises = [];
    const XLINK_NS = "http://www.w3.org/1999/xlink";

    images.forEach(img => {
      let href = img.getAttributeNS(XLINK_NS, "href") || img.getAttribute("href");

      if (href && !href.startsWith("data:")) {
        // Fetch the image file and convert it to a base64 data URI
        const promise = fetch(href)
          .then(response => response.blob())
          .then(blob => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = function () {
              if (img.hasAttributeNS(XLINK_NS, "href")) {
                img.setAttributeNS(XLINK_NS, "xlink:href", reader.result);
              } else {
                img.setAttribute("href", reader.result);
              }
              resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }));
        promises.push(promise);
      }
    });
    return Promise.all(promises);
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
        if (!ratio) {
          const px = parseFloat(prompt("Enter the pixel measurement (e.g. 252.5):", "200"));
          const m = parseFloat(prompt("Enter the real distance in meters (e.g. 3.35):", "3"));
          if (!isNaN(px) && !isNaN(m) && px > 0 && m > 0) {
            ratio = m / px;
          } else {
            ratio = 1;
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
      window.currentSelectedNodeType = btn.dataset.nodetype;
      console.log("Selected node type:", window.currentSelectedNodeType);

      nodeTypeButtons.forEach(b => b.style.border = "none");
      btn.style.border = "2px solid #007bff"; // highlight in blue
    });
  });
});

export function parseFloorPlanFilename(fileName) {

  const dimensionPattern = /\[([\d.]+)\s*,\s*([\d.]+)\]/;

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