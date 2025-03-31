function kruskalMST(nodes, edges, constraints = {}) {
  const scale = constraints.scaleMetersPerPixel || 1;

  const nodeMap = {};
  nodes.forEach(node => {
    nodeMap[node.id] = node;
  });

  const distributionRules = {
    "powerSupply": ["mainDistribution"],
    "mainDistribution": ["junction"],
    "junction": ["terminal", "switch"],
    "switch": ["light"],
    "terminal": ["terminal"]
  };

  let mainDistribution = null;
  for (const node of nodes) {
    if (node.type === "mainDistribution") {
      mainDistribution = node;
      break;
    }
  }

  if (!mainDistribution) {
    throw new Error("No mainDistribution node found");
  }

  const validEdges = [];

  for (const source of nodes) {
    const sourceType = source.type;
    const sourceId = source.id;

    if (!distributionRules[sourceType]) {
      continue;
    }

    const allowedTargetTypes = distributionRules[sourceType];

    for (const target of nodes) {
      const targetType = target.type;
      const targetId = target.id;

      // Skip self–connections
      if (sourceId === targetId) {
        continue;
      }

      // Check if this connection follows distribution rules
      if (allowedTargetTypes.includes(targetType)) {
        // Calculate Euclidean distance for edge weight
        const distance = Math.sqrt(
          Math.pow(source.x - target.x, 2) +
          Math.pow(source.y - target.y, 2)
        );
        const cost = parseFloat((distance / scale).toFixed(2));

        validEdges.push({
          from: sourceId,
          to: targetId,
          from_label: nodeMap[sourceId].label || `Node ${sourceId}`,
          to_label: nodeMap[targetId].label || `Node ${targetId}`,
          cost: cost,
          from_type: sourceType,
          to_type: targetType
        });
      }
    }
  }

  const junctionNodes = nodes.filter(node => node.type === "junction");
  const mainId = mainDistribution.id;

  for (const junction of junctionNodes) {
    const junctionId = junction.id;
    const distance = Math.sqrt(
      Math.pow(junction.x - mainDistribution.x, 2) +
      Math.pow(junction.y - mainDistribution.y, 2)
    );

    validEdges.push({
      from: mainId,
      to: junctionId,
      from_label: mainDistribution.label || `Node ${mainId}`,
      to_label: junction.label || `Node ${junctionId}`,
      cost: parseFloat((distance / scale).toFixed(2)),
      from_type: "mainDistribution",
      to_type: "junction",
      note: "Required junction-mainDistribution connection"
    });
  }

  validEdges.sort((a, b) => a.cost - b.cost);

  const mst = [];
  const hasPowerSource = new Set();

  const parent = {};
  const rank = {};

  function makeSet(nodeId) {
    parent[nodeId] = nodeId;
    rank[nodeId] = 0;
  }

  function find(nodeId) {
    if (parent[nodeId] !== nodeId) {
      parent[nodeId] = find(parent[nodeId]);
    }
    return parent[nodeId];
  }

  function union(node1Id, node2Id) {
    const root1 = find(node1Id);
    const root2 = find(node2Id);

    if (root1 !== root2) {
      if (rank[root1] > rank[root2]) {
        parent[root2] = root1;
      } else {
        parent[node1Id] = root2;
        if (rank[root1] === rank[root2]) {
          rank[root2]++;
        }
      }
    }
  }

  nodes.forEach(node => {
    makeSet(node.id);
  });

  userEdges = edges.filter(edge => edge.forced == true);
  console.log(userEdges);
  for (const userEdge of userEdges) {
    let cost;
    if (userEdge.cost === undefined) {
      const fromNode = nodeMap[userEdge.from];
      const toNode = nodeMap[userEdge.to];
      const distance = Math.sqrt(
        Math.pow(fromNode.x - toNode.x, 2) + Math.pow(fromNode.y - toNode.y, 2)
      );
      cost = parseFloat((distance / scale).toFixed(2));
    } else {
      cost = userEdge.cost;
    }
  

    const forcedEdge = {
      from: userEdge.from,
      to: userEdge.to,
      from_label: nodeMap[userEdge.from].label || `Node ${userEdge.from}`,
      to_label: nodeMap[userEdge.to].label || `Node ${userEdge.to}`,
      cost: cost,
      from_type: nodeMap[userEdge.from].type,
      to_type: nodeMap[userEdge.to].type,
      note: "User provided edge"
    };

    // Add the forced edge if it does not create a cycle.
    if (find(forcedEdge.from) !== find(forcedEdge.to)) {
      mst.push(forcedEdge);
      hasPowerSource.add(forcedEdge.to);
      union(forcedEdge.from, forcedEdge.to);
    }
  }

  const powerSupplyNodes = nodes.filter(node => node.type === "powerSupply");
  if (powerSupplyNodes.length > 0) {
    const alreadyConnected = mst.some(edge =>
      (edge.from_type === "powerSupply" && edge.to_type === "mainDistribution") ||
      (edge.from_type === "mainDistribution" && edge.to_type === "powerSupply")
    );
    if (!alreadyConnected) {
      const mainToPowerEdges = validEdges.filter(
        edge => edge.from_type === "powerSupply" && edge.to_type === "mainDistribution"
      );
      if (mainToPowerEdges.length > 0) {
        const closestEdge = mainToPowerEdges.reduce((min, edge) =>
          edge.cost < min.cost ? edge : min, mainToPowerEdges[0]);
        mst.push(closestEdge);
        hasPowerSource.add(closestEdge.to);
        union(closestEdge.from, closestEdge.to);
      }
    }
  }

  for (const junction of junctionNodes) {
    const junctionId = junction.id;
    if (!hasPowerSource.has(junctionId)) {
      const junctionEdges = validEdges.filter(
        edge => edge.from === mainId && edge.to === junctionId
      );
      if (junctionEdges.length > 0) {
        const minEdge = junctionEdges.reduce((min, edge) =>
          edge.cost < min.cost ? edge : min, junctionEdges[0]);
        mst.push(minEdge);
        hasPowerSource.add(junctionId);
        union(minEdge.from, minEdge.to);
      }
    }
  }

  for (const edge of validEdges) {
    const fromId = edge.from;
    const toId = edge.to;

    if (hasPowerSource.has(toId)) continue;

    if (find(fromId) === find(toId)) continue;

    mst.push(edge);
    hasPowerSource.add(toId);
    union(fromId, toId);
  }

  return mst;
}

module.exports = { kruskalMST };