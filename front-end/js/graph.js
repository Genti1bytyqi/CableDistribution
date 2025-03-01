// front-end/js/graph.js

export function renderGraph(nodes, edges, containerSelector, isOptimized) {
    const container = document.querySelector(containerSelector);
    container.innerHTML = "";
  
    const width = 400;
    const height = 300;
  
    // Copy and center nodes.
    const localNodes = nodes.map(n => ({ ...n }));
    centerNodes(localNodes, width, height);
  
    // Build link data.
    const linkData = edges.map(e => {
      const sourceNode = localNodes.find(n => n.id === e.from);
      const targetNode = localNodes.find(n => n.id === e.to);
      return { source: sourceNode, target: targetNode, cost: e.cost };
    });
  
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);
  
    // Draw edges.
    svg.append("g")
      .selectAll("line")
      .data(linkData)
      .enter()
      .append("line")
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y)
      .attr("stroke-width", isOptimized ? 3 : 2)
      .attr("stroke", isOptimized ? "#4CAF50" : "#999");
  
    // Edge labels.
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
      .text(d => d.cost);
  
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
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill", "#FFD700");
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("fill", "#69b3a2");
      });
  
    // Node labels.
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
  