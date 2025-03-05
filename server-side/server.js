const express = require('express');
const path = require('path');
const apiRouter = require('./routes/api');
const app = express();

app.use(express.json());

app.use('/api', apiRouter);

app.use(express.static(path.join(__dirname, '../front-end')));

app.get('*', (req, res) => {
 res.sendFile(path.join(__dirname, '../front-end/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
 console.log(`Server running on port ${PORT}`);
});