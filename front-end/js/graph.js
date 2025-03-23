import { updateOriginalStatsNodesAndEdges } from './stats.js';

export function renderGraph(
  nodes,
  edges,
  containerSelector,
  isOptimized,
  shouldCenter = true,
  backgroundImage = null,
  isEditable = false
) {
  const container = document.querySelector(containerSelector);
  container.innerHTML = "";

  const width = 1068;
  const height = 500;

  // Clone nodes to avoid mutating original data
  const localNodes = nodes.map(n => ({ ...n }));
  if (shouldCenter) {
    centerNodes(localNodes, width, height);
  }

  // Prepare link data
  const linkData = edges.map(e => {
    const sourceNode = localNodes.find(n => n.id === e.from);
    const targetNode = localNodes.find(n => n.id === e.to);
    return { source: sourceNode, target: targetNode, cost: e.cost, edgeData: e };
  });

  // Create the main SVG
  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Background image if provided
  if (backgroundImage) {
    svg.append("image")
      .attr("xlink:href", backgroundImage)
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("preserveAspectRatio", "xMidYMid meet");
  }

  // If editable, allow adding new nodes by clicking on empty space
  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .on("click", function(event) {
      if (!isEditable) return;
      if (event.target.tagName === "rect") {
        const [x, y] = d3.pointer(event);
        const nodeName = prompt("Enter a name for the new node:", "Node " + (nodes.length + 1));
        if (nodeName === null) return;

        // Use the global node type
        const newNodeType = window.currentSelectedNodeType || "terminal";


        const newNode = {
          id: nodes.length,
          label: nodeName,
          x: x,
          y: y,
          type: newNodeType
        };
        nodes.push(newNode);

        renderGraph(nodes, edges, containerSelector, isOptimized, false, backgroundImage, isEditable,currentSelectedNodeType);
        updateOriginalStatsNodesAndEdges(edges);
      }
    });

  // Draw edges as lines
  svg.append("g")
    .selectAll("line")
    .data(linkData)
    .enter()
    .append("line")
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y)
    .attr("stroke-width", 4)
    .attr("stroke", isOptimized ? "#4CAF50" : "#FF674D");

  // Draw edge labels (click to edit)
  svg.append("g")
    .selectAll("text.edge-label")
    .data(linkData)
    .enter()
    .append("text")
    .attr("class", "edge-label")
    .attr("x", d => (d.source.x + d.target.x) / 2)
    .attr("y", d => ((d.source.y + d.target.y) / 2) - 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text(d => d.cost)
    .on("click", function(event, d) {
      event.stopPropagation();
      const newCost = prompt("Enter new cost for the edge:", d.cost);
      if (newCost !== null && !isNaN(newCost)) {
        d.edgeData.cost = +newCost;
        d3.select(this).text(newCost);
      }
    });

  let edgeStart = null;

  // Draw nodes (circle + icon)
  const nodeGroups = svg.append("g")
    .selectAll("g.node")
    .data(localNodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x}, ${d.y})`)
    .on("mousedown", function(event, d) {
      if (!event.altKey) {
        event.stopPropagation();
        edgeStart = d;
      }
    })
    .on("mouseup", function(event, d) {
      if (!event.altKey && edgeStart && edgeStart.id !== d.id) {
        event.stopPropagation();
        const weight = prompt("Enter weight for the new edge:");
        if (weight !== null && !isNaN(weight)) {
          edges.push({ from: edgeStart.id, to: d.id, cost: +weight });
          renderGraph(nodes, edges, containerSelector, isOptimized, false, backgroundImage, isEditable);
        }
      }
      edgeStart = null;
    })
    .on("click", function(event, d) {
      // Alt-click to remove node
      if (event.altKey) {
        event.stopPropagation();
        const nodeIndex = nodes.findIndex(n => n.id === d.id);
        if (nodeIndex > -1) {
          nodes.splice(nodeIndex, 1);
        }
        // Remove edges connected to that node
        for (let i = edges.length - 1; i >= 0; i--) {
          if (edges[i].from === d.id || edges[i].to === d.id) {
            edges.splice(i, 1);
          }
        }
        renderGraph(nodes, edges, containerSelector, isOptimized, false, backgroundImage, isEditable);
      }
    })
    .on("mouseover", function() {
      d3.select(this).select("circle").attr("fill", "#e0e0e0");
    })
    .on("mouseout", function() {
      d3.select(this).select("circle").attr("fill", "#ffffff");
    });

  // Circle background
  nodeGroups.append("circle")
    .attr("r", 12)
    .attr("fill", "#ffffff")
    .attr("stroke", "#2b6cb0")
    .attr("stroke-width", 1 );

  // Icon in center
  nodeGroups.append("image")
    .attr("xlink:href", d => {
      switch (d.type) {
        case "powerSupply":
          return "assets/main_power.png";
        case "mainDistribution":
          return "assets/distribution_panel.png";
        case "junction":
          return "assets/junction_symbol.png";
        case "terminal":
          return "assets/outlet_symbol.png";
        case "light":
          return "assets/light_symbol.webp";
        case "switch":
          return "assets/switch_symbol.png";
        default:
          return "assets/outlet_symbol.png";
      }
    })
    .attr("width", 18)
    .attr("height", 18)
    .attr("x", -9)
    .attr("y", -9);

  // Node labels below the circle
  svg.append("g")
    .selectAll("text.node-label")
    .data(localNodes)
    .enter()
    .append("text")
    .attr("class", "node-label")
    .attr("x", d => d.x)
    .attr("y", d => d.y + 30)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text(d => d.label);
}

function centerNodes(localNodes, svgWidth, svgHeight) {
  const minX = d3.min(localNodes, d => d.x);
  const maxX = d3.max(localNodes, d => d.x);
  const minY = d3.min(localNodes, d => d.y);
  const maxY = d3.max(localNodes, d => d.y);

  const graphWidth = maxX - minX;
  const graphHeight = maxY - minY;

  if (graphWidth === 0 || graphHeight === 0) return;

  const offsetX = (svgWidth - graphWidth) / 2 - minX;
  const offsetY = (svgHeight - graphHeight) / 2 - minY;

  localNodes.forEach(n => {
    n.x += offsetX;
    n.y += offsetY;
  });
}
