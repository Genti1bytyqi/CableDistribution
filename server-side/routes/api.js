const express = require('express');
const router = express.Router();
const { kruskalMST } = require('../optimizer');

router.post('/optimize', (req, res) => {
  const layout = req.body;
  if (!layout || !layout.nodes) {
    return res.status(400).json({ error: 'Invalid layout data' });
  }
  const nodes = layout.nodes;
  const userEdges = (layout.edges || []).map(edge => {
    const { cost, ...rest } = edge;
    return rest;
  });
  const constraints = layout.constraints || {};
  constraints.scaleMetersPerPixel = layout.scaleMetersPerPixel || 1;

  const mstEdges = kruskalMST(nodes, userEdges, constraints);
  res.json({ mstEdges });
});

module.exports = router;
