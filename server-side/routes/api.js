const express = require('express');
const router = express.Router();
const { kruskalMST, createNearestNeighborEdges, isAllowedEdge } = require('../optimizer');

// router.post('/optimize', (req, res) => {
//   const layout = req.body;
//   if (!layout || !layout.nodes) {
//     return res.status(400).json({ error: 'Invalid layout data' });
//   }
//   const nodes = layout.nodes;
//   const userEdges = layout.edges || [];
//   const constraints = layout.constraints || {};
//   constraints.scaleMetersPerPixel = layout.scaleMetersPerPixel || 1;

//   // Compute additional edges from nodes.
//   const computedEdges = createNearestNeighborEdges(nodes, constraints.scaleMetersPerPixel)
//                             .filter(edge => {
//                               const nodeA = nodes.find(n => n.id === edge.from);
//                               const nodeB = nodes.find(n => n.id === edge.to);
//                               return isAllowed(nodeA, nodeB);
//                             });
//   const validComputedEdges = computedEdges.filter(edge => {
//     if (constraints.maxCableCost !== undefined && edge.cost > constraints.maxCableCost) {
//       return false;
//     }
//     return true;
//   });
//   validComputedEdges.sort((a, b) => a.cost - b.cost);

//   // Forced edges: filter user-specified edges with allowed rules.
//   const forcedEdges = userEdges.filter(edge => {
//     const nodeA = nodes.find(n => n.id === edge.from);
//     const nodeB = nodes.find(n => n.id === edge.to);
//     return isAllowed(nodeA, nodeB);
//   });

//   const mergedEdges = [...forcedEdges, ...validComputedEdges];

//   const mstEdges = kruskalMST(nodes, mergedEdges, constraints);
//   res.json({ mstEdges });
// });

router.post('/optimize', (req, res) => {
  const layout = req.body;
  if (!layout || !layout.nodes) {
    return res.status(400).json({ error: 'Invalid layout data' });
  }
  const nodes = layout.nodes;
  // const userEdges = layout.edges || [];
  const userEdges = (layout.edges || []).map(edge => {
    // Destructure and ignore the cost property
    const { cost, ...rest } = edge;
    return rest;
  });
  const constraints = layout.constraints || {};
  constraints.scaleMetersPerPixel = layout.scaleMetersPerPixel || 1;
  
  // Build a node lookup map.
  const nodeMap = {};
  nodes.forEach(n => {
    nodeMap[n.id] = n;
  });

  // For each user-specified edge, if cost is not provided, calculate it.
  const forcedEdges = userEdges.map(edge => {
    // Look up the nodes.
    const nodeA = nodeMap[edge.from];
    const nodeB = nodeMap[edge.to];
    // If cost is missing, calculate it.
    if (edge.cost === undefined || edge.cost === null) {
      const dx = nodeA.x - nodeB.x;
      const dy = nodeA.y - nodeB.y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);
      // Cost in real-life units: pixelDistance divided by scale.
      edge.cost = parseFloat((pixelDistance / constraints.scaleMetersPerPixel).toFixed(2));
    }
    return edge;
  }).filter(edge => isAllowedEdge(edge, nodeMap));  // Only keep allowed forced edges.

  // Compute additional edges.
  let computedEdges = createNearestNeighborEdges(nodes, constraints.scaleMetersPerPixel)
                        .filter(edge => isAllowedEdge(edge, nodeMap));
  // Apply maxCableCost constraint to computed edges.
  computedEdges = computedEdges.filter(edge => {
    if (constraints.maxCableCost !== undefined && edge.cost > constraints.maxCableCost) {
      return false;
    }
    return true;
  });
  computedEdges.sort((a, b) => a.cost - b.cost);

  // Merge forced and computed edges.
  const mergedEdges = [...forcedEdges, ...computedEdges];

  // Now call your MST function which will enforce your allowed conditions and fallback connectivity.
  const mstEdges = kruskalMST(nodes, mergedEdges, constraints);
  res.json({ mstEdges });
});

module.exports = router;
