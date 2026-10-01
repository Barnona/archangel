// Minimal ARCHANGEL API: catalog, app requests, demand aggregation.
// Storage is a JSON file - fine for a hackathon demo, swap for a real DB later.
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';
const CATALOG_PATH = path.join(__dirname, '..', 'shared', 'src', 'catalog.seed.json');
const REQUESTS_PATH = path.join(__dirname, 'data', 'requests.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10kb' }));

const readJson = (p, fallback) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
};
const writeJson = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
};

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/apps', (req, res) => {
  const catalog = readJson(CATALOG_PATH, []);
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim().toLowerCase();
  const result = catalog.filter((a) =>
    (!q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)) &&
    (!category || a.category.toLowerCase() === category)
  );
  res.json(result);
});

app.get('/apps/:id', (req, res) => {
  const catalog = readJson(CATALOG_PATH, []);
  const found = catalog.find((a) => a.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'not found' });
  const alternatives = catalog.filter((a) => found.alternatives.includes(a.id));
  res.json({ ...found, alternativeProfiles: alternatives });
});

app.post('/requests', (req, res) => {
  const appName = String(req.body.appName || '').trim();
  const note = String(req.body.note || '').trim();
  if (appName.length < 2 || appName.length > 80) {
    return res.status(400).json({ error: 'appName must be 2-80 characters' });
  }
  if (note.length > 300) return res.status(400).json({ error: 'note too long' });
  const requests = readJson(REQUESTS_PATH, []);
  const entry = {
    id: crypto.randomUUID(),
    appName,
    note: note || undefined,
    createdAt: new Date().toISOString(),
  };
  requests.push(entry);
  writeJson(REQUESTS_PATH, requests);
  res.status(201).json(entry);
});

app.get('/requests/demand', (_req, res) => {
  const requests = readJson(REQUESTS_PATH, []);
  const map = new Map();
  for (const r of requests) {
    const key = r.appName.trim().toLowerCase();
    const cur = map.get(key) || { appName: r.appName.trim(), count: 0, lastRequestedAt: r.createdAt };
    cur.count += 1;
    if (r.createdAt > cur.lastRequestedAt) cur.lastRequestedAt = r.createdAt;
    map.set(key, cur);
  }
  const demand = [...map.values()].sort((a, b) => b.count - a.count);
  res.json(demand);
});

app.listen(PORT, HOST, () => {
  console.log(`ARCHANGEL API listening on http://${HOST}:${PORT}`);
  console.log('LAN clients can reach this service using the Windows PC LAN IP.');
});
