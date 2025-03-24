export function updateOriginalStats(layout) {
  const statsDiv = document.getElementById("originalStats");
  if (!layout) {
    statsDiv.innerHTML = "";
    return;
  }
  const totalEdges = layout.edges.length;
  const totalWeight = layout.edges.reduce((sum, e) => sum + e.cost, 0);
  statsDiv.innerHTML = `
    <h3>Original Configuration</h3>
    <p>Total Edges: ${totalEdges}</p>
    <p>Total Weight: ${totalWeight}</p>
  `;
}

export function updateOriginalStatsNodesAndEdges(totalNodes, totalEdges) {
  const statsDiv = document.getElementById("originalStats");
  
  // Basic counts
  const totalNodeCount = totalNodes.length;
  const totalEdgeCount = totalEdges.length;
  const totalWeight = totalEdges.reduce((sum, e) => sum + e.cost, 0);

  // Count how many nodes per type
  const typeCounts = {};
  totalNodes.forEach(node => {
    const t = node.type || "Unknown";
    if (!typeCounts[t]) {
      typeCounts[t] = 0;
    }
    typeCounts[t]++;
  });

  // Build an HTML snippet listing each type count
  let typeCountsHtml = "";
  for (const [type, count] of Object.entries(typeCounts)) {
    typeCountsHtml += `${type}: ${count}&emsp; `;
  }
  // Render the final stats
  statsDiv.innerHTML = `
    <h3>Original Configuration</h3>
    <p>Total Nodes: ${totalNodeCount}&emsp; ${typeCountsHtml}</p>
    <p>Total Edges: ${totalEdgeCount}</p>
    <p>Total Weight: ${totalWeight}</p>
  `;
}

export function updateOptimizedStats(optimizedEdges) {
  const statsDiv = document.getElementById("optimizedStats");
  if (!optimizedEdges) {
    statsDiv.innerHTML = "";
    return;
  }
  const totalEdges = optimizedEdges.length;
  const totalWeight = optimizedEdges.reduce((sum, e) => sum + e.cost, 0);
  statsDiv.innerHTML = `
    <h3>Optimized Configuration</h3>
    <p>Total Edges: ${totalEdges}</p>
    <p>Total Weight: ${totalWeight}</p>
  `;
}
