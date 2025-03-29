function isEdgeValid(edge, nodes, constraints) {
  // Check maxCableCost constraint.
  if (constraints.maxCableCost !== undefined && edge.cost > constraints.maxCableCost) {
    return false;
  }
  return true;
}

// function kruskalMST(nodes, edges, constraints = {}) {
//   const parent = {};
//   const rank = {};
//   nodes.forEach(n => {
//     parent[n.id] = n.id;
//     rank[n.id] = 0;
//   });

//   const validEdges = edges.filter(edge => isEdgeValid(edge, nodes, constraints));
//   const sortedEdges = [...validEdges].sort((a, b) => a.cost - b.cost);
//   const mstEdges = [];

//   function findSet(i) {
//     if (parent[i] !== i) {
//       parent[i] = findSet(parent[i]);
//     }
//     return parent[i];
//   }

//   function union(x, y) {
//     const rx = findSet(x);
//     const ry = findSet(y);
//     if (rx !== ry) {
//       if (rank[rx] < rank[ry]) {
//         parent[rx] = ry;
//       } else if (rank[rx] > rank[ry]) {
//         parent[ry] = rx;
//       } else {
//         parent[ry] = rx;
//         rank[rx]++;
//       }
//     }
//   }

//   for (let edge of sortedEdges) {
//     const rootSource = findSet(edge.from);
//     const rootTarget = findSet(edge.to);
//     if (rootSource !== rootTarget) {
//       mstEdges.push(edge);
//       union(rootSource, rootTarget);
//     }
//   }
//   return mstEdges;
// }

function kruskalMST(nodes, edges, constraints = {}) {
  // Build a lookup map for nodes by id.
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  // Allowed connection rules (unidirectional)
  function isAllowed(nodeA, nodeB) {
    switch (nodeA.type) {
      case "powerSupply":
        return nodeB.type === "mainDistribution";
      case "mainDistribution":
        return nodeB.type === "powerSupply" || nodeB.type === "junction";
      case "light":
        return nodeB.type === "switch";
      case "switch":
        return nodeB.type === "junction" || nodeB.type === "terminal" || nodeB.type === "light";
      case "terminal":
        return nodeB.type === "terminal" || nodeB.type === "switch" || nodeB.type === "junction";
      case "junction":
        return nodeB.type === "junction" || nodeB.type === "terminal" || nodeB.type === "switch" || nodeB.type === "mainDistribution";
      default:
        return false;
    }
  }
  
  // Given an edge, check if nodeA -> nodeB is allowed.
  function isAllowedEdge(edge) {
    const nodeA = nodeMap[edge.from];
    const nodeB = nodeMap[edge.to];
    return isAllowed(nodeA, nodeB);
  }
  
  // Helper: if the edge connects a light and a switch, return the id of the light; otherwise, return null.
  function getLightSwitchLightId(edge) {
    const nodeA = nodeMap[edge.from];
    const nodeB = nodeMap[edge.to];
    if (nodeA.type === "light" && nodeB.type === "switch") return nodeA.id;
    if (nodeA.type === "switch" && nodeB.type === "light") return nodeB.id;
    return null;
  }

  // Compute computed (nearest-neighbor) edges.
  const scale = constraints.scaleMetersPerPixel || 1;
  let computedEdges = createNearestNeighborEdges(nodes, scale)
                        .filter(edge => isAllowedEdge(edge));
  computedEdges = computedEdges.filter(edge => {
    if (constraints.maxCableCost !== undefined && edge.cost > constraints.maxCableCost) {
      return false;
    }
    return true;
  });
  computedEdges.sort((a, b) => a.cost - b.cost);
  
  // Filter user-specified (forced) edges.
  const forcedEdges = (edges || []).filter(edge => isAllowedEdge(edge));
  
  // Merge forced and computed edges.
  const mergedEdges = [...forcedEdges, ...computedEdges];
  
  // Initialize union-find.
  const parent = {};
  const rank = {};
  nodes.forEach(n => {
    parent[n.id] = n.id;
    rank[n.id] = 0;
  });
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
      if (rank[rx] < rank[ry]) parent[rx] = ry;
      else if (rank[rx] > rank[ry]) parent[ry] = rx;
      else { parent[ry] = rx; rank[rx]++; }
    }
  }
  
  const mstEdges = [];
  // Keep track of light nodes that already have a connection to a switch.
  const lightSwitchConnected = {};

  // Process forced edges first.
  forcedEdges.forEach(edge => {
    const lightId = getLightSwitchLightId(edge);
    if (lightId !== null && lightSwitchConnected[lightId]) return;
    if (findSet(edge.from) !== findSet(edge.to)) {
      mstEdges.push(edge);
      union(edge.from, edge.to);
      if (lightId !== null) {
        lightSwitchConnected[lightId] = true;
      }
    }
  });
  
  // Process computed edges.
  computedEdges.forEach(edge => {
    const lightId = getLightSwitchLightId(edge);
    if (lightId !== null && lightSwitchConnected[lightId]) return;
    if (findSet(edge.from) !== findSet(edge.to)) {
      mstEdges.push(edge);
      union(edge.from, edge.to);
      if (lightId !== null) {
        lightSwitchConnected[lightId] = true;
      }
    }
  });
  
  // Fallback: ensure all nodes are connected.
  let components = new Set(nodes.map(n => findSet(n.id)));
  while (components.size > 1) {
    let bestEdge = null;
    let bestCost = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (findSet(nodes[i].id) !== findSet(nodes[j].id)) {
          // Only consider candidate if allowed.
          if (!isAllowed(nodes[i], nodes[j])) continue;
          // Enforce one light-one switch: if this candidate is a light-switch edge and that light is already connected, skip.
          let lightId = null;
          if (nodes[i].type === "light" && nodes[j].type === "switch") {
            lightId = nodes[i].id;
          } else if (nodes[i].type === "switch" && nodes[j].type === "light") {
            lightId = nodes[j].id;
          }
          if (lightId !== null && lightSwitchConnected[lightId]) continue;
          
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const pixelDistance = Math.sqrt(dx * dx + dy * dy);
          const cost = parseFloat((pixelDistance / scale).toFixed(2));
          if (cost < bestCost) {
            bestCost = cost;
            bestEdge = { from: nodes[i].id, to: nodes[j].id, cost };
          }
        }
      }
    }
    if (bestEdge) {
      const lightId = getLightSwitchLightId(bestEdge);
      mstEdges.push(bestEdge);
      union(bestEdge.from, bestEdge.to);
      if (lightId !== null) {
        lightSwitchConnected[lightId] = true;
      }
    } else {
      break;
    }
    components = new Set(nodes.map(n => findSet(n.id)));
  }
  
  return mstEdges;
}

function createNearestNeighborEdges(nodes, scale = 1) {
  const newEdges = [];
  const usedPairs = new Set();

  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    let minDist = Infinity;
    let nearestNode = null;

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const nodeB = nodes[j];
      const dx = nodeA.x - nodeB.x;
      const dy = nodeA.y - nodeB.y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);

      if (pixelDistance < minDist) {
        minDist = pixelDistance;
        nearestNode = nodeB;
      }
    }

    if (nearestNode) {
      const key = [Math.min(nodeA.id, nearestNode.id), Math.max(nodeA.id, nearestNode.id)].join("-");
      if (!usedPairs.has(key)) {
        usedPairs.add(key);
        const realDistance = minDist / scale;
        const cost = parseFloat(realDistance.toFixed(2));
        newEdges.push({
          from: nodeA.id,
          to: nearestNode.id,
          cost
        });
      }
    }
  }
  return newEdges;
}


// Helper: Identify if an edge is mandatory based on node type pairs.
function isMandatoryEdge(edge, nodes) {
  const nodeA = nodes.find(n => n.id === edge.from);
  const nodeB = nodes.find(n => n.id === edge.to);
  if (!nodeA || !nodeB) return false;
  const typeA = nodeA.type;
  const typeB = nodeB.type;

  // Mandatory if:
  // - "switch" <-> "light"
  if ((typeA === "switch" && typeB === "light") || (typeA === "light" && typeB === "switch")) {
    return true;
  }
  // - "powerSupply" <-> "mainDistribution"
  if ((typeA === "powerSupply" && typeB === "mainDistribution") || (typeA === "mainDistribution" && typeB === "powerSupply")) {
    return true;
  }
  // - "junction" <-> "mainDistribution"
  if ((typeA === "junction" && typeB === "mainDistribution") || (typeA === "mainDistribution" && typeB === "junction")) {
    return true;
  }
  return false;
}

function isAllowed(nodeA, nodeB) {
  switch (nodeA.type) {
    case "powerSupply":
      return nodeB.type === "mainDistribution";
    case "mainDistribution":
      return nodeB.type === "powerSupply" || nodeB.type === "junction";
    case "light":
      return nodeB.type === "switch";
    case "switch":
      return nodeB.type === "junction" || nodeB.type === "terminal" || nodeB.type === "light";
    case "terminal":
      return nodeB.type === "terminal" || nodeB.type === "switch" || nodeB.type === "junction";
    case "junction":
      return nodeB.type === "junction" || nodeB.type === "terminal" || nodeB.type === "switch" || nodeB.type === "mainDistribution";
    default:
      return false;
  }
}

// Convenience: given an edge and a node lookup map, check if the edge is allowed.
function isAllowedEdge(edge, nodeMap) {
  const nodeA = nodeMap[edge.from];
  const nodeB = nodeMap[edge.to];
  return isAllowed(nodeA, nodeB);
}


module.exports = { kruskalMST, createNearestNeighborEdges, isAllowedEdge };
