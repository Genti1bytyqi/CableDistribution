// server/server.js
const express = require('express');
const path = require('path');
const apiRouter = require('./routes/api');
const app = express();

// Parse JSON bodies
app.use(express.json());

// Mount the API routes at /api
app.use('/api', apiRouter);

// Serve static files from the front-end directory.
app.use(express.static(path.join(__dirname, '../front-end')));

// Fallback: send index.html for all other requests.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../front-end/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
