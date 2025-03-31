import { updateOriginalStatsNodesAndEdges } from './stats.js';
import { parseFloorPlanFilename } from './main.js'


function addCostToEdges(nodes, edges, scaleMetersPerPixel) {
  if (!nodes || !edges || !scaleMetersPerPixel) {
    throw new Error("Layout must contain nodes, edges, and scaleMetersPerPixel");
  }
  
  edges = edges.map(edge => {
    const nodeA = nodes.find(n => n.id === edge.from);
    const nodeB = nodes.find(n => n.id === edge.to);
    if (!nodeA || !nodeB) {
      console.warn(`Edge from ${edge.from} to ${edge.to} missing node(s).`);
      return { ...edge, cost: 0 };
    }
    
    const dx = nodeA.x - nodeB.x;
    const dy = nodeA.y - nodeB.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);
    
    const weight = pixelDistance / scaleMetersPerPixel;
    return { ...edge, cost: parseFloat(weight.toFixed(2)) };
  });
  
  return edges;
}

export function renderGraph(
  nodes,
  edges,
  containerSelector,
  isOptimized,
  backgroundImage,
  isEditable = false,
  layout
) {
  const container = document.querySelector(containerSelector);
  container.innerHTML = "";

  const width = layout.imageWidth || 1068;
  const height = layout.imageHeight || 500;
  const ratio = layout.scaleMetersPerPixel || 1;
  const localNodes = nodes.map(n => ({ ...n }));

  if (!isOptimized) {
    edges = addCostToEdges(nodes, edges, ratio);
  }

  const linkData = edges.map(e => {
    const sourceNode = localNodes.find(n => n.id === e.from);
    const targetNode = localNodes.find(n => n.id === e.to);
    return { source: sourceNode, target: targetNode, cost: e.cost, edgeData: e };
  });

  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  if (backgroundImage) {
    svg.append("image")
      .attr("xlink:href", backgroundImage)
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
        //const nodeId = (nodes.sort((a, b) => a.id - b.id)[nodes.length - 1]).id + 1;
        const nodeId = nodes && nodes.length > 0 ? (nodes.sort((a, b) => a.id - b.id)[nodes.length - 1]).id + 1 : 0;
        const nodeName = prompt("Enter a name for the new node:", "Node " + (nodeId + 1));
        if (nodeName === null) return;

        const newNodeType = window.currentSelectedNodeType || "terminal";
        const newNode = {
          id: nodeId,
          label: nodeName,
          x: x,
          y: y,
          type: newNodeType
        };
        nodes.push(newNode);
        layout.nodes = nodes;
        renderGraph(nodes, edges, containerSelector, isOptimized, backgroundImage, isEditable, layout);
      }
    });

  const animationTime = 300;
  const delayAnimation = 500;
  const lines = svg.append("g")
  .selectAll("line")
  .data(linkData.sort((a, b) => a.cost - b.cost))
  .enter()
  .append("line")
  .attr("x1", d => d.source.x)
  .attr("y1", d => d.source.y)
  .attr("stroke-width", 4)
  .attr("stroke", d => {
    if (isOptimized) {
      return "#4CAF50";
    } else if (d.edgeData.forced) {
      return "#30AAF0"; 
    } else {
      return "#FF674D";
    }
  });

if (isOptimized) {
  // Set initial zero-length line endpoints
  lines.attr("x2", d => d.source.x)
       .attr("y2", d => d.source.y)
       .transition()
       .duration(animationTime)
       .delay((d, i) => i * delayAnimation)
       .attr("x2", d => d.target.x)
       .attr("y2", d => d.target.y);
} else {
  // Draw lines immediately without animation
  lines.attr("x2", d => d.target.x)
       .attr("y2", d => d.target.y);
}

  const labels = svg.append("g")
  .selectAll("text.edge-label")
  .data(linkData.sort((a, b) => a.cost - b.cost))
  .enter()
  .append("text")
  .attr("class", "edge-label")
  // Start at the source coordinates and hidden when animated
  .attr("x", d => isOptimized ? d.source.x : (d.source.x + d.target.x) / 2)
  .attr("y", d => isOptimized ? d.source.y : ((d.source.y + d.target.y) / 2) - 5)
  .attr("opacity", isOptimized ? 0 : 1)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .text(d => parseFloat(d.cost).toFixed(2))
  .on("click", function(event, d) {
    event.stopPropagation();
    const newCost = prompt("Enter new cost for the edge:", d.cost);
    if (newCost !== null && !isNaN(newCost)) {
      d.edgeData.cost = +newCost;
      d3.select(this).text(newCost);
    }
  });

if (isOptimized) {
  labels.transition()
    .duration(animationTime)
    .delay((d, i) => i * delayAnimation)
    .attr("opacity", 1)
    .attr("x", d => (d.source.x + d.target.x) / 2)
    .attr("y", d => ((d.source.y + d.target.y) / 2) - 5);
}

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
        event.stopPropagation();
        edgeStart = d;
    })
    .on("mouseup", function(event, edgeEnd) {
      const allowedOutgoing = {
        powerSupply: ["mainDistribution"],
        mainDistribution: ["junction"],
        junction: ["terminal", "switch"],
        switch: ["light"],
        terminal: ["terminal"]
      };
    
      const allowedIncoming = {
        light: ["switch"],
        terminal: ["junction", "terminal"],
        switch: ["junction"],
        junction: ["mainDistribution"]
      };
      let forced = false;
      if (event.altKey) {
        forced = true;
      }

      if (edgeStart && edgeStart.id !== edgeEnd.id) {
        event.stopPropagation();
    
        const from = edgeStart.id;
        const to = edgeEnd.id;
        const fromType = edgeStart.type;
        const toType = edgeEnd.type;
    
        const outgoingOk = allowedOutgoing[fromType]?.includes(toType) ?? false;
        const incomingOk = (toType in allowedIncoming)
          ? allowedIncoming[toType].includes(fromType)
          : true;
    
        if (outgoingOk && incomingOk) {
          edges.push({ from, to, forced });
          layout.edges = edges;
          renderGraph(nodes, edges, containerSelector, isOptimized, backgroundImage, isEditable, layout);
        } else {
          alert(`⚠️ Invalid connection: ${edgeStart.type } → ${edgeEnd.type}`);
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
        layout.nodes = nodes;
        layout.edges = edges;
        renderGraph(nodes, edges, containerSelector, isOptimized, backgroundImage, isEditable,layout);
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
    console.log(edges)
    if (!isOptimized) {
      updateOriginalStatsNodesAndEdges(nodes, edges);
    }
}
