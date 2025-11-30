const express = require('express');
const path = require('path');
const { nanoid } = require('nanoid');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));

// Simple in-memory rate limiters (MVP)
const createLimits = new Map(); // ip -> {count, reset}
const viewLimits = new Map(); // ip -> {count, reset}

function rateLimitCreate(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = createLimits.get(ip) || { count: 0, reset: now + 60 * 60 * 1000 };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 60 * 60 * 1000;
  }
  entry.count += 1;
  createLimits.set(ip, entry);
  if (entry.count > 10) return res.status(429).json({ success: false, error: 'Too many profile creations. Try again later.' });
  next();
}

function rateLimitView(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = viewLimits.get(ip) || { count: 0, reset: now + 60 * 1000 };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 60 * 1000;
  }
  entry.count += 1;
  viewLimits.set(ip, entry);
  if (entry.count > 100) return res.status(429).send('Too many requests. Try again later.');
  next();
}

// Create profile endpoint (MVP with Templates)
app.post('/api/create', rateLimitCreate, (req, res) => {
  try {
    const { 
      name = '', 
      bio = '', 
      links = [], 
      photo = null, 
      theme = 'dark', 
      bgColor = '#1a1a1a', 
      buttonColor = '#3b82f6', 
      template = 'minimal', 
      slug,
      customization = {} 
    } = req.body || {};
    
    const id = nanoid(8);
    const editToken = nanoid(24);
    const data = JSON.stringify({ links });
    const customizationStr = JSON.stringify(customization);
    const createdAt = Date.now();

    // If slug provided, ensure unique
    function insertProfile(finalSlug) {
      // Insert without slug first for compatibility, then set slug if provided
      db.run(
        'INSERT INTO profiles (id, edit_token, name, bio, photo, data, theme, bgColor, buttonColor, template, customization, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, editToken, name, bio, photo, data, theme, bgColor, buttonColor, template, customizationStr, createdAt],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ success: false, error: 'Internal error' });
          }
          if (finalSlug) {
            db.run('UPDATE profiles SET slug = ? WHERE id = ?', [finalSlug, id], (uErr) => {
              if (uErr) {
                console.error('Failed to set slug:', uErr.message);
              }
              // Respond with latest row to determine url
              db.get('SELECT slug FROM profiles WHERE id = ?', [id], (gErr, gRow) => {
                if (gErr || !gRow) return res.json({ success: true, id, url: `/p/${id}`, editToken });
                const url = gRow.slug ? `/@${gRow.slug}` : `/p/${id}`;
                return res.json({ success: true, id, url, editToken });
              });
            });
          } else {
            const url = `/p/${id}`;
            res.json({ success: true, id, url, editToken });
          }
        }
      );
    }

    if (slug) {
      // basic slug validation: alphanum and dashes/underscores
      const safe = String(slug).replace(/^@/, '').trim();
      if (!/^[a-zA-Z0-9_-]{2,30}$/.test(safe)) return res.status(400).json({ success: false, error: 'Invalid slug' });
      // check uniqueness
      db.get('SELECT id FROM profiles WHERE slug = ?', [safe], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: 'DB error' });
        if (row) return res.status(409).json({ success: false, error: 'Slug already taken' });
        insertProfile(safe);
      });
    } else {
      insertProfile(null);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// Fetch profile JSON (MVP with Templates)
// Fetch profile JSON (increments view count)
app.get('/api/profile/:id', rateLimitView, (req, res) => {
  const id = req.params.id;
  db.get(
    'SELECT id, name, bio, photo, data, theme, bgColor, buttonColor, template, views, customization, created_at FROM profiles WHERE id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Database error' });
      }
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });

      // increment views (best-effort)
      db.run('UPDATE profiles SET views = COALESCE(views,0) + 1 WHERE id = ?', [id]);

      let parsed = {};
      try { parsed = JSON.parse(row.data || '{}'); } catch (e) { parsed = {}; }

      let customization = {};
      try { customization = JSON.parse(row.customization || '{}'); } catch (e) { customization = {}; }

      res.json({
        success: true,
        id: row.id,
        name: row.name,
        bio: row.bio,
        photo: row.photo,
        links: parsed.links || [],
        theme: row.theme || 'dark',
        bgColor: row.bgColor || '#1a1a1a',
        buttonColor: row.buttonColor || '#3b82f6',
        template: row.template || 'minimal',
        customization,
        views: row.views || 0,
        created_at: row.created_at
      });
    }
  );
});

// Fetch profile by slug (increments views)
app.get('/api/profile/slug/:slug', rateLimitView, (req, res) => {
  const slug = req.params.slug;
  db.get(
    'SELECT id, name, bio, photo, data, theme, bgColor, buttonColor, template, views, customization, created_at FROM profiles WHERE slug = ?',
    [slug],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });

      db.run('UPDATE profiles SET views = COALESCE(views,0) + 1 WHERE id = ?', [row.id]);

      let parsed = {};
      try { parsed = JSON.parse(row.data || '{}'); } catch (e) { parsed = {}; }

      let customization = {};
      try { customization = JSON.parse(row.customization || '{}'); } catch (e) { customization = {}; }

      res.json({
        success: true,
        id: row.id,
        name: row.name,
        bio: row.bio,
        photo: row.photo,
        links: parsed.links || [],
        theme: row.theme || 'dark',
        bgColor: row.bgColor || '#1a1a1a',
        buttonColor: row.buttonColor || '#3b82f6',
        template: row.template || 'minimal',
        customization,
        views: row.views || 0,
        created_at: row.created_at
      });
    }
  );
});

// Redirect link clicks through a tracker endpoint to increment click counts
app.get('/r/:id/:idx', (req, res) => {
  const { id, idx } = req.params;
  db.get('SELECT data FROM profiles WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).send('Not found');
    let parsed = {};
    try { parsed = JSON.parse(row.data || '{}'); } catch (e) { parsed = {}; }
    const links = parsed.links || [];
    const i = parseInt(idx, 10);
    if (!links[i]) return res.status(404).send('Link not found');
    links[i].clicks = (links[i].clicks || 0) + 1;
    const newData = JSON.stringify({ links });
    db.run('UPDATE profiles SET data = ? WHERE id = ?', [newData, id], (e) => {
      // ignore errors for redirect
      res.redirect(links[i].url);
    });
  });
});

// Analytics endpoint (requires edit token)
app.get('/api/analytics/:id', (req, res) => {
  const { id } = req.params;
  const token = req.query.token;
  db.get('SELECT data, views, edit_token FROM profiles WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).json({ success: false, error: 'Not found' });
    if (!token || token !== row.edit_token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    let parsed = {};
    try { parsed = JSON.parse(row.data || '{}'); } catch (e) { parsed = {}; }
    const links = (parsed.links || []).map(l => ({ title: l.title, url: l.url, clicks: l.clicks || 0 }));
    res.json({ success: true, views: row.views || 0, links });
  });
});

// Edit profile (requires edit token)
app.put('/api/profile/:id', (req, res) => {
  const id = req.params.id;
  const { editToken } = req.body || {};
  if (!editToken) return res.status(401).json({ success: false, error: 'Missing token' });
  db.get('SELECT edit_token FROM profiles WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).json({ success: false, error: 'Not found' });
    if (row.edit_token !== editToken) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { name, bio, links, photo, theme, bgColor, buttonColor, template, slug, customization } = req.body || {};
    // sanitize slug
    const finalSlug = slug ? String(slug).replace(/^@/, '').trim() : undefined;

    // load current data to merge links object
    db.get('SELECT data FROM profiles WHERE id = ?', [id], (e, r) => {
      if (e || !r) return res.status(500).json({ success: false, error: 'DB error' });
      let parsed = {};
      try { parsed = JSON.parse(r.data || '{}'); } catch (ex) { parsed = {}; }
      const newLinks = (Array.isArray(links) ? links : parsed.links || []);
      const dataStr = JSON.stringify({ links: newLinks });
      const customizationStr = customization ? JSON.stringify(customization) : undefined;

      const params = [name || null, bio || null, photo || null, dataStr, theme || null, bgColor || null, buttonColor || null, template || null, finalSlug || null, customizationStr || null, id];
      db.run('UPDATE profiles SET name = COALESCE(?, name), bio = COALESCE(?, bio), photo = COALESCE(?, photo), data = COALESCE(?, data), theme = COALESCE(?, theme), bgColor = COALESCE(?, bgColor), buttonColor = COALESCE(?, buttonColor), template = COALESCE(?, template), slug = COALESCE(?, slug), customization = COALESCE(?, customization) WHERE id = ?', params, function(err2) {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ success: false, error: 'Failed to update' });
        }
        res.json({ success: true, id });
      });
    });
  });
});

// Serve profile page (client will fetch profile JSON)
// Serve profile page (by id)
app.get('/p/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Serve profile page by slug, URL like /@slug
app.get('/@:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Fallback to index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
