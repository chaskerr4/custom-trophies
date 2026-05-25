const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3500;

// Serve trophy images
app.use('/ITEMS', express.static(path.join(__dirname, 'ITEMS')));

// Serve assets (banner, graphics, etc.)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve items catalog
app.get('/items.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'items.json'));
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Trophy Shop running → http://localhost:${PORT}`);
});
