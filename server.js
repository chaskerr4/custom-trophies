const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3500;

// Load items catalog at startup
let items = [];
try {
    items = JSON.parse(fs.readFileSync(path.join(__dirname, 'items.json'), 'utf8'));
} catch (e) { console.error('Failed to load items.json', e); }

// Serve trophy images
app.use('/ITEMS', express.static(path.join(__dirname, 'ITEMS')));

// Serve assets (banner, graphics, etc.)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve items catalog
app.get('/items.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'items.json'));
});

// Dynamic root — inject OG tags for iMessage/SMS previews
app.get('/', (req, res) => {
    const reqId = parseInt(req.query.ID, 10);
    const item  = isNaN(reqId) ? items[0] : items.find(i => i.id === reqId);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host     = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl  = `${protocol}://${host}`;

    let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

    if (item) {
        const ogTags = [
            `    <meta property="og:title" content="${item.name} | USA Custom Trophies">`,
            `    <meta property="og:description" content="${item.description}">`,
            `    <meta property="og:image" content="${baseUrl}/ITEMS/${item.file}">`,
            `    <meta property="og:url" content="${baseUrl}/?ID=${item.id}">`,
            `    <meta property="og:type" content="product">`,
            `    <meta name="twitter:card" content="summary_large_image">`,
        ].join('\n');
        html = html.replace('</head>', `${ogTags}\n</head>`);
    }

    res.send(html);
});

// Serve remaining static files (css, js, etc.)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Trophy Shop running → http://localhost:${PORT}`);
});
