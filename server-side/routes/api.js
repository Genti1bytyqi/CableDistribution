const express = require('express');
const router = express.Router();
const { kruskalMST } = require('../optimizer');

router.post('/optimize', (req, res) => {
  const layout = req.body;
  if (!layout || !layout.nodes || !layout.edges) {
    return res.status(400).json({ error: 'Invalid layout data' });
  }

  const constraints = layout.constraints || {};
  const mstEdges = kruskalMST(layout.nodes, layout.edges, constraints);
  res.json({ mstEdges });
});

module.exports = router;
