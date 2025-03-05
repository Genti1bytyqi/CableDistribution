
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
  