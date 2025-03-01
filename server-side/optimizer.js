// server/optimizer.js

function isEdgeValid(edge, nodes, constraints) {
  // Check maxCableCost constraint.
  if (constraints.maxCableCost !== undefined && edge.cost > constraints.maxCableCost) {
    return false;
  }
  return true;
}

function kruskalMST(nodes, edges, constraints = {}) {
  const parent = {};
  const rank = {};
  nodes.forEach(n => {
    parent[n.id] = n.id;
    rank[n.id] = 0;
  });

  const validEdges = edges.filter(edge => isEdgeValid(edge, nodes, constraints));
  const sortedEdges = [...validEdges].sort((a, b) => a.cost - b.cost);
  const mstEdges = [];

  function findSet(i) {
    if (parent[i] !== i) {
      parent[i] = findSet(parent[i]);
    }
    return parent[i];
  }

  function union(x, y) {
    const rx = findSet(x);
    const ry = findSet(y);
    if (rx !== ry) {
      if (rank[rx] < rank[ry]) {
        parent[rx] = ry;
      } else if (rank[rx] > rank[ry]) {
        parent[ry] = rx;
      } else {
        parent[ry] = rx;
        rank[rx]++;
      }
    }
  }

  for (let edge of sortedEdges) {
    const rootSource = findSet(edge.from);
    const rootTarget = findSet(edge.to);
    if (rootSource !== rootTarget) {
      mstEdges.push(edge);
      union(rootSource, rootTarget);
    }
  }
  return mstEdges;
}

module.exports = { kruskalMST };
