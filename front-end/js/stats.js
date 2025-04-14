export function updateOriginalStats(layout) {
  console.log("updateOriginalStats called");
  const statsDiv = document.getElementById("originalStats");
  if (!layout) {
    statsDiv.innerHTML = "";
    return;
  }
  const totalNodes = layout.nodes.length;
  const totalEdges = layout.edges.length;
  const totalWeight = layout.edges.reduce((sum, e) => sum + e.cost, 0).toFixed(2);

 
  statsDiv.innerHTML = `
    <h3>Original Configuration</h3>
    <p>Total Nodes: ${totalNodes}</p>
    <p>Total Edges: ${totalEdges}</p>
    <p>Total Cables in (m): ${totalWeight}</p>
  `;
  console.log(layout.edges);
}

export function updateOriginalStatsNodesAndEdges(totalNodes, totalEdges) {
  console.log("updateOriginalStatsNodesAndEdges called");
  const statsDiv = document.getElementById("originalStats");
  
  // Basic counts
  const totalNodeCount = totalNodes.length;
  const totalEdgeCount = totalEdges.length;
  const totalWeight = totalEdges.reduce((sum, e) => sum + e.cost, 0).toFixed(2);

  // Count how many nodes per type
  const typeCounts = {};
  totalNodes.forEach(node => {
    const t = node.type || "Unknown";
    if (!typeCounts[t]) {
      typeCounts[t] = 0;
    }
    typeCounts[t]++;
  });

  let typeCountsHtml = "";
  for (const [type, count] of Object.entries(typeCounts)) {
    typeCountsHtml += `${type}: ${count}&emsp; `;
  }
 //statistikat
  statsDiv.innerHTML = `
    <h3>Original Configuration</h3>
    <p>Total Nodes: ${totalNodeCount}&emsp; ${typeCountsHtml}</p>
    <p>Total Edges: ${totalEdgeCount}</p>
    <p>Total Cables in (m): ${totalWeight}</p>
  `;
}

export function updateOptimizedStats(totalNodes,optimizedEdges) {
  const statsDiv = document.getElementById("optimizedStats");
  if (!optimizedEdges) {
    statsDiv.innerHTML = "";
    return;
  }
  const totalNodeCount = totalNodes.length;
  const totalEdges = optimizedEdges.length;
  const totalWeight = optimizedEdges.reduce((sum, e) => sum + e.cost, 0).toFixed(2);

  const typeCounts = {};
  totalNodes.forEach(node => {
    const t = node.type || "Unknown";
    if (!typeCounts[t]) {
      typeCounts[t] = 0;
    }
    typeCounts[t]++;
  });
  let typeCountsHtml = "";
  for (const [type, count] of Object.entries(typeCounts)) {
    typeCountsHtml += `${type}: ${count}&emsp; `;
  }
  statsDiv.innerHTML = `
    <h3>Optimized Configuration</h3>
    <p>Total Nodes: ${totalNodeCount}&emsp; ${typeCountsHtml}</p>
    <p>Total Edges: ${totalEdges}</p>
    <p>Total Cables in (m): ${totalWeight}</p>
  `;
}
