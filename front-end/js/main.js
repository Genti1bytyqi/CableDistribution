import { renderGraph } from './graph.js';
import { updateOriginalStats, updateOptimizedStats } from './stats.js';

let selectedLayout = null;
let optimizedEdges = null;

export function selectLayout(layoutFile) {
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

 if (layoutFile === "layouts/custom.json") {
 selectedLayout.name = "Custom Layout";
 }
 
 renderGraph(
 selectedLayout.nodes,
 selectedLayout.edges,
 "#originalGraphContainer",
 false,
 false,
 selectedLayout.backgroundImage
 );
 updateOriginalStats(selectedLayout);

 document.getElementById("optimizedGraphContainer").innerHTML = "";
 document.getElementById("optimizedStats").innerHTML = "";
 })
 .catch(err => console.error("Error loading layout:", err));
}


function optimizeSelectedLayout() {
 if (!selectedLayout) return;

 console.log(selectLayout.backgroundImage)

 fetch('/api/optimize', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(selectedLayout)
 })
 .then(response => response.json())
 .then(data => {
 optimizedEdges = data.mstEdges;
 renderGraph(selectedLayout.nodes, optimizedEdges, "#optimizedGraphContainer", true, false, selectedLayout.backgroundImage);
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

document.addEventListener("DOMContentLoaded", function () {

 const saveSVGBtn = document.getElementById("saveSVGBtn");
 if (saveSVGBtn) {
 saveSVGBtn.addEventListener("click", function () {
 // Select the SVG element inside the optimized graph container.
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
 // Revoke the object URL to free up memory.
 URL.revokeObjectURL(url);
 });
 }
});

document.addEventListener("DOMContentLoaded", function () {

 const floorPlanInput = document.getElementById("floorPlanInput");
 if (floorPlanInput) {
 floorPlanInput.addEventListener("change", function (event) {
 const file = event.target.files[0];
 if (file && selectedLayout && selectedLayout.name === "Custom Layout") {
 const reader = new FileReader();
 reader.onload = function (e) {
 
 selectedLayout.backgroundImage = e.target.result;
 
 renderGraph(
 selectedLayout.nodes,
 selectedLayout.edges,
 "#originalGraphContainer",
 false,
 false,
 selectedLayout.backgroundImage
 );
 if (optimizedEdges) {
 renderGraph(
 selectedLayout.nodes,
 optimizedEdges,
 "#optimizedGraphContainer",
 true,
 false,
 selectedLayout.backgroundImage
 );
 }
 };
 reader.readAsDataURL(file);
 }
 });
 }
});