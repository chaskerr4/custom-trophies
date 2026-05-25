const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const { execSync } = require('child_process');
const { Resend } = require('resend');

const app  = express();
const PORT = process.env.PORT || 3500;

// ── Email client (optional — gracefully skipped if not configured) ─────────
const resend      = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const notifyEmail = process.env.NOTIFY_EMAIL || null;

// ── Multer — memory storage, images only, 5MB limit ───────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Images only'));
        }
        cb(null, true);
    }
});

// ── Load items catalog at startup ──────────────────────────────────────────
let items = [];
function loadItems() {
    try {
        items = JSON.parse(fs.readFileSync(path.join(__dirname, 'items.json'), 'utf8'));
    } catch (e) { console.error('Failed to load items.json', e); }
}
loadItems();

// ── Serve trophy images ────────────────────────────────────────────────────
app.use('/ITEMS', express.static(path.join(__dirname, 'ITEMS')));

// ── Serve assets (banner, graphics, etc.) ─────────────────────────────────
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ── Serve items catalog ────────────────────────────────────────────────────
app.get('/items.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'items.json'));
});

// ── Next available ID ──────────────────────────────────────────────────────
app.get('/next-id', (req, res) => {
    const maxId = items.reduce((m, i) => Math.max(m, i.id), 999);
    res.json({ id: maxId + 1 });
});

// ── Submit new trophy ──────────────────────────────────────────────────────
app.post('/submit-item', upload.single('image'), async (req, res) => {
    try {
        const { name, description, price } = req.body;
        if (!name || !description || !price || !req.file) {
            return res.status(400).json({ error: 'All fields and an image are required.' });
        }

        // Compute new ID
        const newId = items.reduce((m, i) => Math.max(m, i.id), 999) + 1;

        // Derive filename from ID + original extension
        const ext      = path.extname(req.file.originalname).toLowerCase() || '.jpg';
        const filename = `trophy-${newId}${ext}`;
        const imgPath  = path.join(__dirname, 'ITEMS', filename);

        // Write image to disk
        fs.writeFileSync(imgPath, req.file.buffer);

        // Append to items array + save items.json
        const newItem = { id: newId, name, file: filename, price, description };
        items.push(newItem);
        fs.writeFileSync(path.join(__dirname, 'items.json'), JSON.stringify(items, null, 2));

        // ── Git push to persist across deploys ────────────────────────────
        const ghPat  = process.env.GH_PAT;
        const ghRepo = process.env.GH_REPO;
        const ghUser = process.env.GH_USER || 'trophyshop-bot';
        const ghMail = process.env.GH_EMAIL || 'bot@trophyshop.com';

        if (ghPat && ghRepo) {
            try {
                const remote = `https://${ghPat}@github.com/${ghRepo}.git`;
                execSync(`git config user.name "${ghUser}"`,           { cwd: __dirname });
                execSync(`git config user.email "${ghMail}"`,          { cwd: __dirname });
                execSync(`git remote set-url origin ${remote}`,        { cwd: __dirname });
                execSync(`git add ITEMS/${filename} items.json`,       { cwd: __dirname });
                execSync(`git commit -m "Add trophy submission #${newId}: ${name}"`, { cwd: __dirname });
                execSync(`git push origin master`,                     { cwd: __dirname });
                console.log(`Pushed trophy #${newId} to GitHub`);
            } catch (gitErr) {
                console.error('Git push failed (item still live):', gitErr.message);
            }
        } else {
            console.warn('GH_PAT/GH_REPO not set — skipping git push');
        }

        // ── Send notification email ───────────────────────────────────────
        if (resend && notifyEmail) {
            try {
                await resend.emails.send({
                    from:    'TrophyShop <notifications@trophyshop.jinxpwa.com>',
                    to:      notifyEmail,
                    subject: `New Trophy Submission — #${newId}: ${name}`,
                    html:    `<h2>New Trophy: ${name}</h2>
                              <p><strong>ID:</strong> #${newId}</p>
                              <p><strong>Price:</strong> ${price}</p>
                              <p><strong>Description:</strong> ${description}</p>
                              <p><strong>Image:</strong> ${filename}</p>`,
                    attachments: [{
                        filename: filename,
                        content:  req.file.buffer.toString('base64'),
                    }]
                });
            } catch (emailErr) {
                console.error('Email failed:', emailErr.message);
            }
        }

        res.json({ id: newId, name, file: filename });

    } catch (err) {
        console.error('submit-item error:', err);
        res.status(500).json({ error: 'Server error. Try again.' });
    }
});

// ── Add form — ?function=add ───────────────────────────────────────────────
app.get('/', (req, res) => {
    if (req.query.function === 'add') {
        return res.sendFile(path.join(__dirname, 'public', 'add.html'));
    }

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

// ── Serve remaining static files (css, js, etc.) ──────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Trophy Shop running → http://localhost:${PORT}`);
});
