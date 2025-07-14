const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

app.use(express.json());

const urlStore = {};

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function isValidShortcode(code) {
    return /^[a-zA-Z0-9]{4,16}$/.test(code);
}

function generateShortcode() {
    return uuidv4().replace(/-/g, '').slice(0, 8);
}

app.post('/shorturls', (req, res) => {
    const { url, validity, shortcode } = req.body;
    if (!url || !isValidUrl(url)) {
        return res.status(400).json({ error: 'Invalid or missing URL.' });
    }
    let code = shortcode;
    if (code) {
        if (!isValidShortcode(code)) {
            return res.status(400).json({ error: 'Invalid shortcode format. Must be alphanumeric and 4-16 chars.' });
        }
        if (urlStore[code]) {
            return res.status(409).json({ error: 'Shortcode already in use.' });
        }
    } else {
        do {
            code = generateShortcode();
        } while (urlStore[code]);
    }
    const now = new Date();
    const validMinutes = Number.isInteger(validity) && validity > 0 ? validity : 30;
    const expiry = new Date(now.getTime() + validMinutes * 60000);
    urlStore[code] = {
        url,
        createdAt: now,
        expiry,
    };
    return res.status(201).json({
        shortLink: `http://localhost:${PORT}/${code}`,
        expiry: expiry.toISOString(),
    });
});

app.get('/:shortcode', (req, res) => {
    const { shortcode } = req.params;
    const entry = urlStore[shortcode];
    if (!entry) {
        return res.status(404).json({ error: 'Shortcode not found.' });
    }
    if (new Date() > entry.expiry) {
        return res.status(410).json({ error: 'Short link has expired.' });
    }
    
    res.redirect(entry.url);
});

app.get('/shorturls/:shortcode', (req, res) => {
    const { shortcode } = req.params;
    const entry = urlStore[shortcode];
    if (!entry) {
        return res.status(404).json({ error: 'Shortcode not found.' });
    }
    res.json({
        originalUrl: entry.url,
        createdAt: entry.createdAt.toISOString(),
        expiry: entry.expiry.toISOString(),
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
}); 