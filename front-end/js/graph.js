import { updateOriginalStatsNodesAndEdges } from './stats.js';

export function renderGraph(nodes, edges, containerSelector, isOptimized, shouldCenter = true, backgroundImage = null) {
  updateOriginalStatsNodesAndEdges(edges);
  const container = document.querySelector(containerSelector);
  container.innerHTML = "";

  const width = 1068;
  const height = 500;

  const localNodes = nodes.map(n => ({ ...n }));
  if (shouldCenter) {
    centerNodes(localNodes, width, height);
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
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      // .attr("preserveAspectRatio", "xMidYMid slice");
      .attr("preserveAspectRatio", "xMidYMid meet");
  }


  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .on("click", function (event) {
      if (event.target.tagName === "rect") {
        const [x, y] = d3.pointer(event);
        const nodeName = prompt("Enter a name for the new node:", "Node " + (nodes.length + 1));
        if (nodeName === null) return;
        const newNode = {
          id: nodes.length,
          label: nodeName,
          x: x,
          y: y
        };
        nodes.push(newNode);
        renderGraph(nodes, edges, containerSelector, isOptimized, false, backgroundImage);
      }
    });

  // Draw edges
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

  // Edge labels with click-to-edit functionality.
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
    .on("click", function (event, d) {
      event.stopPropagation();
      const newCost = prompt("Enter new cost for the edge:", d.cost);
      if (newCost !== null && !isNaN(newCost)) {
        d.edgeData.cost = +newCost;
        d3.select(this).text(newCost);
      }
    });

  let edgeStart = null;

  // Draw nodes.
  svg.append("g")
    .selectAll("circle")
    .data(localNodes)
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 10)
    .attr("fill", "#69b3a2")
    .attr("stroke", "#2b6cb0")
    .attr("stroke-width", 2)
    .on("mousedown", function (event, d) {
      if (!event.altKey) {
        event.stopPropagation();
        edgeStart = d;
      }
    })
    .on("mouseup", function (event, d) {
      if (!event.altKey && edgeStart && edgeStart.id !== d.id) {
        event.stopPropagation();
        const weight = prompt("Enter weight for the new edge:");
        if (weight !== null && !isNaN(weight)) {
          edges.push({ from: edgeStart.id, to: d.id, cost: +weight });
          renderGraph(nodes, edges, containerSelector, isOptimized, false, backgroundImage);
        }
      }
      edgeStart = null;
    })
    .on("click", function (event, d) {
      if (event.altKey) {
        event.stopPropagation();
        const nodeIndex = nodes.findIndex(n => n.id === d.id);
        if (nodeIndex > -1) {
          nodes.splice(nodeIndex, 1);
        }
        for (let i = edges.length - 1; i >= 0; i--) {
          if (edges[i].from === d.id || edges[i].to === d.id) {
            edges.splice(i, 1);
          }
        }
        renderGraph(nodes, edges, containerSelector, isOptimized, false, backgroundImage);
      }
    })
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", "#FFD700");
    })
    .on("mouseout", function (event, d) {
      d3.select(this).attr("fill", "#69b3a2");
    });

  svg.append("g")
    .selectAll("text.node-label")
    .data(localNodes)
    .enter()
    .append("text")
    .attr("class", "node-label")
    .attr("x", d => d.x)
    .attr("y", d => d.y + 20)
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