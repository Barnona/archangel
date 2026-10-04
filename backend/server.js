// ARCHANGEL API: catalog, discovery intelligence, app requests, demand aggregation.
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');\nrequire('dotenv').config();
const { analyzeAppRequest, aiStatus } = require('./ai');

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';
const CATALOG_PATH = path.join(__dirname, '..', 'shared', 'src', 'catalog.seed.json');
const REQUESTS_PATH = path.join(__dirname, 'data', 'requests.json');

const CATALOG_SOURCE = 'curated-verified-cache';
const CATALOG_VERSION = '1.0';
const CATALOG_LAST_UPDATED = '2026-10-01';

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

const tokenize = (value) => String(value || '').toLowerCase().split(/[^a-z0-9+]+/).filter(Boolean);

const INTENT_RULES = [
  { terms: ['cheap', 'free', 'budget', 'no cost'], reason: 'Matches a low-cost intent', weight: 18, test: a => a.monetization.includes('free') || a.monetization.includes('freemium') },
  { terms: ['music', 'songs', 'audio'], reason: 'Matches a music intent', weight: 25, test: a => a.category === 'Music' || /music|audio|song/i.test(a.description) },
  { terms: ['game', 'gaming', 'games'], reason: 'Matches a gaming intent', weight: 25, test: a => a.category === 'Games' },
  { terms: ['watch', 'movie', 'movies', 'film', 'films', 'stream', 'streaming', 'series', 'show'], reason: 'Matches a viewing intent', weight: 18, test: a => a.category === 'Streaming' },
  { terms: ['ad-free', 'fewer ads', 'less ads', 'without ads'], reason: 'Matches an ad-reduction intent', weight: 15, test: a => a.adLevel === 'none' },
];

function rankDiscovery(catalog, query, category) {
  const q = String(query || '').trim().toLowerCase();
  const tokens = tokenize(q);
  const cat = String(category || '').trim().toLowerCase();
  return catalog.filter(a => !cat || a.category.toLowerCase() === cat).map(app => {
    const name = app.name.toLowerCase();
    const description = app.description.toLowerCase();
    const haystack = `${name} ${description} ${app.category.toLowerCase()}`;
    let score = 0; const reasons = [];
    if (!q) {
      score += app.verified ? 25 : 0; score += app.platforms.fireOs ? 20 : 0;
      if (app.platforms.vega) score += 5;
      reasons.push(app.platforms.fireOs ? 'Available on Fire OS' : 'Catalogued for another platform');
      if (app.verified) reasons.push('Source checked');
    } else {
      if (name === q) { score += 100; reasons.push('Exact name match'); }
      else if (name.includes(q)) { score += 75; reasons.push('Name matches your search'); }
      const matched = tokens.filter(t => haystack.includes(t));
      if (matched.length) { score += matched.length * 15; reasons.push(`Matches ${matched.length === 1 ? 'your search term' : 'your search terms'}`); }
      if (description.includes(q)) { score += 25; reasons.push('Description matches'); }
      if (app.category.toLowerCase().includes(q)) { score += 20; reasons.push('Category matches'); }
      for (const rule of INTENT_RULES) if (rule.terms.some(term => q.includes(term)) && rule.test(app)) { score += rule.weight; reasons.push(rule.reason); }
    }
    if (app.platforms.fireOs) { score += 10; if (q) reasons.push('Fire OS compatible'); }
    if (app.verified) { score += 8; if (q) reasons.push('Source checked'); }
    if (cat) reasons.push(`Category: ${app.category}`);
    return { app, score: Math.min(100, score), reasons: [...new Set(reasons)].slice(0, 5) };
  }).filter(r => !q || r.score > 0).sort((x, y) => y.score - x.score || x.app.name.localeCompare(y.app.name));
}

function rankAlternatives(catalog, target) {
  if (!target) return [];
  return catalog.filter(a => a.id !== target.id && a.platforms.fireOs).map(app => {
    let score = 0; const reasons = [];
    if (target.alternatives.includes(app.id)) { score += 70; reasons.push('Listed as an alternative'); }
    if (app.category === target.category) { score += 20; reasons.push('Same category'); }
    if (app.monetization.some(x => target.monetization.includes(x))) { score += 8; reasons.push('Similar monetization'); }
    if (app.verified) { score += 5; reasons.push('Source checked'); }
    return { app, score: Math.min(100, score), reasons: [...new Set(reasons)].slice(0, 4) };
  }).filter(r => r.score > 0).sort((a,b) => b.score-a.score || a.app.name.localeCompare(b.app.name)).slice(0,5);
}

function catalogStats(catalog) {
  const categories = [...new Set(catalog.map(a => a.category))].sort();
  const verifiedCount = catalog.filter(a => a.verified).length;
  const fireOsCount = catalog.filter(a => a.platforms?.fireOs).length;
  const vegaCount = catalog.filter(a => a.platforms?.vega).length;
  return {
    total: catalog.length,
    verified: verifiedCount,
    fireOs: fireOsCount,
    vega: vegaCount,
    categories,
    coverage: catalog.length ? Math.round((verifiedCount / catalog.length) * 100) : 0,
  };
}

app.get('/health', (_req, res) => {
  const catalog = readJson(CATALOG_PATH, []);
  const requests = readJson(REQUESTS_PATH, []);
  res.json({
    ok: true,
    service: 'archangel-api',
    version: '0.3.0',
    catalogCount: catalog.length,
    requestCount: requests.length,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/ai/status', (_req, res) => {
  res.json(aiStatus());
});

app.get('/catalog/status', (_req, res) => {
  const catalog = readJson(CATALOG_PATH, []);
  const stats = catalogStats(catalog);
  res.json({
    catalogVersion: CATALOG_VERSION,
    source: CATALOG_SOURCE,
    lastUpdated: CATALOG_LAST_UPDATED,
    ...stats,
    amazonAppstoreApi: {
      status: 'not_available',
      mode: 'feature-request-ready',
      note: 'ARCHANGEL does not currently claim access to an Amazon Appstore-wide application catalog API.',
    },
  });
});

app.get('/apps/categories', (_req, res) => {
  const catalog = readJson(CATALOG_PATH, []);
  res.json(catalogStats(catalog).categories);
});

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

app.get('/apps/discover', (req, res) => {
  const catalog = readJson(CATALOG_PATH, []);
  const results = rankDiscovery(catalog, req.query.q, req.query.category);
  const stats = catalogStats(catalog);
  res.json({
    query: String(req.query.q || '').trim(),
    category: String(req.query.category || '').trim(),
    results,
    catalogCount: stats.total,
    catalogSource: CATALOG_SOURCE,
    generatedAt: new Date().toISOString(),
  });
});


app.post('/ai/app-discovery', async (req, res) => {
  const userRequest = String(req.body?.request || '').trim();
  if (userRequest.length < 2 || userRequest.length > 500) {
    return res.status(400).json({ error: 'request must be 2-500 characters' });
  }

  const catalog = readJson(CATALOG_PATH, []);
  try {
    const result = await analyzeAppRequest({ catalog, userRequest });
    res.json({
      ...result,
      catalogCount: catalog.length,
      catalogSource: CATALOG_SOURCE,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI discovery error:', error);
    res.status(503).json({
      error: 'AI discovery unavailable',
      detail: error.message,
      catalogCount: catalog.length,
      catalogSource: CATALOG_SOURCE,
    });
  }
});

app.get('/adlens', (_req, res) => {
  const catalog = readJson(CATALOG_PATH, []);
  const profiles = catalog
    .filter(a => a.platforms?.fireOs)
    .map(a => {
      const known = a.adLevel !== 'unknown';
      const adSupported = a.monetization.includes('ad-supported');
      return {
        appId: a.id,
        appName: a.name,
        monetization: a.monetization,
        adLevel: a.adLevel,
        adSignal: known ? 'known' : 'unknown',
        transparency: a.verified && known ? 'verified' : 'limited',
        explanation: known
          ? (a.adLevel === 'none'
            ? 'The catalog records no known in-app advertising signal for this profile.'
            : adSupported
              ? 'The catalog identifies this app as ad-supported.'
              : 'The catalog records an advertising level for this profile, but monetization may include other models.')
          : 'The current verified catalog does not contain a reliable ad-level signal for this app.',
        systemAds: {
          controllable: false,
          note: 'ARCHANGEL cannot disable or modify Fire TV system-level Sponsored-row advertising.'
        },
        verified: Boolean(a.verified),
        lastVerified: a.lastVerified ?? null,
        evidence: {
          source: CATALOG_SOURCE,
          catalogVersion: CATALOG_VERSION,
          lastVerified: a.lastVerified ?? null,
          verificationMethod: 'curated-catalog',
        },
        subscription: a.subscription || {
          model: a.monetization.includes('subscription') ? 'subscription' : 'unknown',
          adFreeTierKnown: false,
          adFreeTierName: null,
          adFreeTierVerified: false,
          offerStatus: 'unknown',
          explanation: 'The current ARCHANGEL catalog does not contain authoritative subscription-offer information for this profile.',
          evidence: {
            source: CATALOG_SOURCE,
            catalogVersion: CATALOG_VERSION,
            lastVerified: a.lastVerified ?? null,
            verificationMethod: 'curated-catalog',
          },
        },
      };
    });

  res.json({
    totalApps: profiles.length,
    adSupported: profiles.filter(p => p.monetization.includes('ad-supported')).length,
    knownAdLevels: profiles.filter(p => p.adSignal === 'known').length,
    unknownAdLevels: profiles.filter(p => p.adSignal === 'unknown').length,
    verifiedProfiles: profiles.filter(p => p.transparency === 'verified').length,
    profiles,
    systemAdControl: {
      controllable: false,
      note: 'ARCHANGEL provides ad transparency and experience intelligence; it does not claim system-wide Fire TV ad-control privileges.'
    },
    generatedAt: new Date().toISOString(),
  });
});

app.get('/adlens/:appId', (req, res) => {
  const catalog = readJson(CATALOG_PATH, []);
  const app = catalog.find(a => a.id === req.params.appId && a.platforms?.fireOs);
  if (!app) return res.status(404).json({ error: 'AdLens profile not found' });

  const known = app.adLevel !== 'unknown';
  const adSupported = app.monetization.includes('ad-supported');
  res.json({
    appId: app.id,
    appName: app.name,
    category: app.category,
    description: app.description,
    monetization: app.monetization,
    adLevel: app.adLevel,
    adSignal: known ? 'known' : 'unknown',
    transparency: app.verified && known ? 'verified' : 'limited',
    explanation: known
      ? (app.adLevel === 'none'
        ? 'The catalog records no known in-app advertising signal for this profile.'
        : adSupported
          ? 'The catalog identifies this app as ad-supported.'
          : 'The catalog records an advertising level for this profile, but monetization may include other models.')
      : 'The current verified catalog does not contain a reliable ad-level signal for this app.',
    systemAds: {
      controllable: false,
      note: 'ARCHANGEL cannot disable or modify Fire TV system-level Sponsored-row advertising.'
    },
    verified: Boolean(app.verified),
    lastVerified: app.lastVerified ?? null,
    evidence: {
      source: CATALOG_SOURCE,
      catalogVersion: CATALOG_VERSION,
      lastVerified: app.lastVerified ?? null,
      verificationMethod: 'curated-catalog',
    },
    subscription: app.subscription || {
      model: app.monetization.includes('subscription') ? 'subscription' : 'unknown',
      adFreeTierKnown: false,
      adFreeTierName: null,
      adFreeTierVerified: false,
      offerStatus: 'unknown',
      explanation: 'The current ARCHANGEL catalog does not contain authoritative subscription-offer information for this profile.',
      evidence: {
        source: CATALOG_SOURCE,
        catalogVersion: CATALOG_VERSION,
        lastVerified: app.lastVerified ?? null,
        verificationMethod: 'curated-catalog',
      },
    },
  });
});

app.get('/apps/:id', (req, res) => {
  const catalog = readJson(CATALOG_PATH, []);
  const found = catalog.find((a) => a.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'not found' });
  const alternativeProfiles = rankAlternatives(catalog, found);
  res.json({ ...found, alternativeProfiles });
});

app.post('/requests', (req, res) => {
  const appName = String(req.body.appName || '').trim();
  const note = String(req.body.note || '').trim();
  if (appName.length < 2 || appName.length > 80) {
    return res.status(400).json({ error: 'appName must be 2-80 characters' });
  }
  if (note.length > 300) return res.status(400).json({ error: 'note too long' });
  const requests = readJson(REQUESTS_PATH, []);
  const entry = { id: crypto.randomUUID(), appName, note: note || undefined, createdAt: new Date().toISOString() };
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
  res.json([...map.values()].sort((a, b) => b.count - a.count));
});

app.listen(PORT, HOST, () => {
  console.log(`ARCHANGEL API listening on http://${HOST}:4000`);
  console.log('LAN clients can reach this service using the Windows PC LAN IP.');
});
