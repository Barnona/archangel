// ARCHANGEL API: catalog, discovery intelligence, app requests, demand aggregation.
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
const { analyzeAppRequest, analyzeDemandOpportunity, aiStatus } = require('./ai');

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';
const CATALOG_PATH = path.join(__dirname, '..', 'shared', 'src', 'catalog.seed.json');
const REQUESTS_PATH = path.join(__dirname, 'data', 'requests.json');
const MONETIZATION_HISTORY_PATH = path.join(__dirname, 'data', 'monetization-history.json');

const CATALOG_SOURCE = 'curated-verified-cache';
const CATALOG_VERSION = '1.0';
const CATALOG_LAST_UPDATED = '2026-10-04';
const ADLENS_REFRESH_INTERVAL_MS = Math.max(0, Number(process.env.ADLENS_REFRESH_INTERVAL_MS || 86400000));

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

function evidenceFor({ app, known, changed = false }) {
  let status = 'UNKNOWN';
  let confidence = 0;
  if (changed) status = 'DATA_SIGNAL_CHANGED';
  else if (known && app.verified) { status = 'VERIFIED'; confidence = 1; }
  else if (known) { status = 'SUPPORTED'; confidence = 0.8; }
  return {
    source: CATALOG_SOURCE,
    catalogVersion: CATALOG_VERSION,
    lastVerified: app.lastVerified ?? null,
    verificationMethod: 'curated-catalog',
    status,
    confidence,
  };
}

function adLensEvidenceSummary(app, historyChanges = []) {
  const subscription = subscriptionFor(app);
  const signals = [
    { id: 'advertising', label: 'Advertising', known: app.adLevel !== 'unknown', field: 'adLevel' },
    { id: 'subscription', label: 'Subscription', known: subscription.model !== 'unknown', field: 'subscriptionModel' },
    { id: 'adFreeTier', label: 'Ad-free tier', known: Boolean(subscription.adFreeTierKnown), field: 'adFreeTier' },
    { id: 'monetization', label: 'Monetization', known: Array.isArray(app.monetization) && app.monetization.length > 0 && !app.monetization.includes('unknown'), field: 'monetization' },
  ].map(signal => {
    const changed = historyChanges.some(change => change.field === signal.field);
    return {
      id: signal.id,
      label: signal.label,
      evidence: evidenceFor({ app, known: signal.known, changed }),
    };
  });
  const supportedSignals = signals.filter(signal => signal.evidence.status !== 'UNKNOWN').length;
  return {
    completeness: Math.round((supportedSignals / signals.length) * 100),
    supportedSignals,
    totalSignals: signals.length,
    signals: signals.map(signal => ({
      id: signal.id,
      label: signal.label,
      status: signal.evidence.status,
      confidence: signal.evidence.confidence,
    })),
  };
}

function subscriptionFor(app) {
  return app.subscription || {
    model: app.monetization.includes('subscription') ? 'subscription' : 'unknown',
    adFreeTierKnown: false,
    adFreeTierName: null,
  };
}

function buildMonetizationSnapshot(app, capturedAt = new Date().toISOString()) {
  const subscription = subscriptionFor(app);
  return {
    id: crypto.randomUUID(),
    appId: app.id,
    appName: app.name,
    capturedAt,
    catalogVersion: CATALOG_VERSION,
    monetization: [...app.monetization],
    adSignal: app.adLevel !== 'unknown' ? 'known' : 'unknown',
    adLevel: app.adLevel,
    subscriptionModel: subscription.model,
    adFreeTierKnown: Boolean(subscription.adFreeTierKnown),
    adFreeTierName: subscription.adFreeTierName ?? null,
    evidence: evidenceFor({ app, known: true }),
  };
}

function snapshotChanges(previous, current) {
  const changes = [];
  const fields = [
    ['adSignal', previous.adSignal, current.adSignal],
    ['adLevel', previous.adLevel, current.adLevel],
    ['monetization', (previous.monetization || []).join('|'), (current.monetization || []).join('|')],
    ['subscriptionModel', previous.subscriptionModel, current.subscriptionModel],
    ['adFreeTier', previous.adFreeTierKnown ? (previous.adFreeTierName || 'KNOWN') : 'UNKNOWN', current.adFreeTierKnown ? (current.adFreeTierName || 'KNOWN') : 'UNKNOWN'],
  ];
  for (const [field, previousValue, currentValue] of fields) {
    if (String(previousValue) !== String(currentValue)) {
      changes.push({
        field,
        previous: String(previousValue),
        current: String(currentValue),
        kind: 'data-signal-changed',
      });
    }
  }
  return changes;
}

function snapshotState(app) {
  const subscription = subscriptionFor(app);
  return {
    monetization: [...app.monetization],
    adSignal: app.adLevel !== 'unknown' ? 'known' : 'unknown',
    adLevel: app.adLevel,
    subscriptionModel: subscription.model,
    adFreeTierKnown: Boolean(subscription.adFreeTierKnown),
    adFreeTierName: subscription.adFreeTierName ?? null,
  };
}

function updateHistoryForApp(app, history) {
  const snapshots = Array.isArray(history[app.id]) ? history[app.id] : [];
  const currentState = snapshotState(app);
  const previous = snapshots[snapshots.length - 1];
  const previousState = previous ? {
    monetization: previous.monetization,
    adSignal: previous.adSignal,
    adLevel: previous.adLevel,
    subscriptionModel: previous.subscriptionModel,
    adFreeTierKnown: previous.adFreeTierKnown,
    adFreeTierName: previous.adFreeTierName,
  } : null;
  const changed = !previous || JSON.stringify(previousState) !== JSON.stringify(currentState);
  if (changed) {
    snapshots.push(buildMonetizationSnapshot(app));
    history[app.id] = snapshots;
  }
  return { snapshots, added: changed, previous };
}

function refreshAdLensHistory() {
  const catalog = readJson(CATALOG_PATH, []);
  const history = readJson(MONETIZATION_HISTORY_PATH, {});
  let snapshotsAdded = 0;
  let unchanged = 0;
  let changesDetected = 0;

  for (const app of catalog.filter(a => a.platforms?.fireOs)) {
    const result = updateHistoryForApp(app, history);
    if (result.added) {
      snapshotsAdded += 1;
      if (result.previous) {
        const current = history[app.id][history[app.id].length - 1];
        changesDetected += snapshotChanges(result.previous, current).length;
      }
    } else {
      unchanged += 1;
    }
  }

  writeJson(MONETIZATION_HISTORY_PATH, history);
  return {
    catalogVersion: CATALOG_VERSION,
    catalogSource: CATALOG_SOURCE,
    refreshedAt: new Date().toISOString(),
    appsChecked: catalog.filter(a => a.platforms?.fireOs).length,
    snapshotsAdded,
    unchanged,
    changesDetected,
  };
}
function historyResponse(app) {
  const history = readJson(MONETIZATION_HISTORY_PATH, {});
  const storedSnapshots = Array.isArray(history[app.id]) ? history[app.id] : [];
  const chronological = [...storedSnapshots].sort((a, b) => {
    const aTime = Date.parse(a.capturedAt || '');
    const bTime = Date.parse(b.capturedAt || '');
    return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
  });
  const changes = [];
  for (let i = 1; i < chronological.length; i += 1) {
    changes.push(...snapshotChanges(chronological[i - 1], chronological[i]).map(change => ({
      ...change,
      previous: `${chronological[i - 1].capturedAt || 'Unknown date'}: ${change.previous}`,
      current: `${chronological[i].capturedAt || 'Unknown date'}: ${change.current}`,
    })));
  }
  const snapshots = [...chronological].reverse();
  const latest = chronological[chronological.length - 1] || null;
  const baseline = chronological[0] || null;
  const latestChanges = chronological.length > 1
    ? snapshotChanges(chronological[chronological.length - 2], latest)
    : [];
  return {
    appId: app.id,
    appName: app.name,
    snapshots,
    changes,
    summary: {
      snapshotCount: snapshots.length,
      baselineAt: baseline?.capturedAt || null,
      latestAt: latest?.capturedAt || null,
      latestChangedFields: latestChanges.map(change => change.field),
      hasBaseline: Boolean(baseline),
    },
    generatedAt: new Date().toISOString(),
  };
}

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


function pulseStatus() {
  const catalog = readJson(CATALOG_PATH, []);
  const requests = readJson(REQUESTS_PATH, []);
  const history = readJson(MONETIZATION_HISTORY_PATH, {});
  const fireOsApps = catalog.filter(a => a.platforms?.fireOs);
  const snapshots = Object.values(history).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0);
  const ai = aiStatus();

  const catalogAgeDays = Math.max(0, Math.floor((Date.now() - Date.parse(CATALOG_LAST_UPDATED)) / 86400000));
  const catalogStatus = catalog.length === 0
    ? 'attention'
    : catalogAgeDays > 30
      ? 'degraded'
      : 'healthy';

  const checks = [
    {
      id: 'api',
      label: 'API SERVICE',
      status: 'healthy',
      summary: 'ARCHANGEL API is running.',
      detail: `Uptime ${Math.floor(process.uptime())}s • local service health confirmed`,
    },
    {
      id: 'catalog',
      label: 'CATALOG INTEGRITY',
      status: catalogStatus,
      summary: catalog.length ? `${fireOsApps.length} Fire OS records available.` : 'Catalog is empty.',
      detail: `Source ${CATALOG_SOURCE} • last updated ${CATALOG_LAST_UPDATED} • ${catalogAgeDays} day(s) old • ${catalog.filter(a => a.verified).length} verified`,
    },
    {
      id: 'requests',
      label: 'REQUEST NETWORK',
      status: 'healthy',
      summary: `${requests.length} request signal(s) stored.`,
      detail: 'Demand data is available for aggregation and developer opportunity analysis.',
    },
    {
      id: 'adlens',
      label: 'ADLENS EVIDENCE',
      status: fireOsApps.length && snapshots ? 'healthy' : fireOsApps.length ? 'degraded' : 'attention',
      summary: snapshots ? `${snapshots} historical snapshot(s) stored.` : 'No historical snapshots are stored yet.',
      detail: snapshots ? 'Historical monetization evidence is persisted separately from read-only AdLens views.' : 'Run the AdLens evidence refresh to establish a baseline.',
    },
    {
      id: 'ai',
      label: 'AI INTELLIGENCE',
      status: ai.provider === 'bedrock' ? 'degraded' : 'healthy',
      summary: `Provider configured: ${ai.provider}.`,
      detail: ai.provider === 'bedrock'
        ? `Bedrock primary: ${ai.bedrock.modelId} • Gemini fallback retained`
        : `Gemini primary: ${ai.gemini.primaryModel} • fallback: ${ai.gemini.fallbackModel}`,
    },
  ];

  const rank = { healthy: 0, degraded: 1, attention: 2 };
  const overall = checks.reduce((worst, check) => rank[check.status] > rank[worst] ? check.status : worst, 'healthy');

  return {
    overall,
    generatedAt: new Date().toISOString(),
    checks,
    metrics: {
      apiUptimeSeconds: Math.floor(process.uptime()),
      catalogRecords: catalog.length,
      verifiedCatalogRecords: catalog.filter(a => a.verified).length,
      requestCount: requests.length,
      adLensSnapshots: snapshots,
      aiProvider: ai.provider,
    },
  };
}

app.get('/pulse', (_req, res) => {
  try {
    res.json(pulseStatus());
  } catch (error) {
    console.error('Pulse status error:', error);
    res.status(500).json({ error: 'Pulse status unavailable', detail: error.message });
  }
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

app.get('/adlens/refresh', (_req, res) => {
  res.status(405).json({ error: 'Use POST /adlens/refresh' });
});

app.post('/adlens/refresh', (_req, res) => {
  try {
    res.json(refreshAdLensHistory());
  } catch (error) {
    console.error('AdLens refresh error:', error);
    res.status(500).json({ error: 'AdLens refresh failed', detail: error.message });
  }
});

app.get('/adlens', (_req, res) => {
  const catalog = readJson(CATALOG_PATH, []);
  const history = readJson(MONETIZATION_HISTORY_PATH, {});
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
        evidence: evidenceFor({ app: a, known }),
        evidenceSummary: adLensEvidenceSummary(a),
        history: {
          status: Array.isArray(history[a.id]) && history[a.id].length > 1 ? 'changes-recorded' : 'baseline-recorded',
          snapshotCount: Array.isArray(history[a.id]) ? history[a.id].length : 0,
        },
        subscription: a.subscription || {
          model: a.monetization.includes('subscription') ? 'subscription' : 'unknown',
          adFreeTierKnown: false,
          adFreeTierName: null,
          adFreeTierVerified: false,
          offerStatus: 'unknown',
          explanation: 'The current ARCHANGEL catalog does not contain authoritative subscription-offer information for this profile.',
          evidence: evidenceFor({ app: a, known: Boolean(a.subscription?.model && a.subscription.model !== 'unknown') }),
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


app.get('/adlens/:appId/history', (req, res) => {
  const catalog = readJson(CATALOG_PATH, []);
  const app = catalog.find(a => a.id === req.params.appId && a.platforms?.fireOs);
  if (!app) return res.status(404).json({ error: 'AdLens history not found' });
  res.json(historyResponse(app));
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
    evidence: evidenceFor({ app, known }),
    evidenceSummary: adLensEvidenceSummary(app),
    subscription: app.subscription || {
      model: app.monetization.includes('subscription') ? 'subscription' : 'unknown',
      adFreeTierKnown: false,
      adFreeTierName: null,
      adFreeTierVerified: false,
      offerStatus: 'unknown',
      explanation: 'The current ARCHANGEL catalog does not contain authoritative subscription-offer information for this profile.',
      evidence: evidenceFor({ app, known: Boolean(app.subscription?.model && app.subscription.model !== 'unknown') }),
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

function normalizeRequestedAppName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\\bapp\\b/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();
}

function displayRequestedAppName(value) {
  return String(value || '')
    .trim()
    .replace(/\\s+/g, ' ');
}

app.post('/requests', (req, res) => {
  const appName = displayRequestedAppName(req.body.appName);
  const note = String(req.body.note || '').trim();
  const source = req.body.source === 'missing-app-discovery' ? 'missing-app-discovery' : 'manual';
  if (appName.length < 2 || appName.length > 80) {
    return res.status(400).json({ error: 'appName must be 2-80 characters' });
  }
  if (note.length > 300) return res.status(400).json({ error: 'note too long' });

  const requests = readJson(REQUESTS_PATH, []);
  const normalizedName = normalizeRequestedAppName(appName);
  const existing = requests.find(r => normalizeRequestedAppName(r.appName) === normalizedName);

  const entry = {
    id: crypto.randomUUID(),
    appName,
    normalizedName,
    note: note || undefined,
    source,
    createdAt: new Date().toISOString(),
  };
  requests.push(entry);
  writeJson(REQUESTS_PATH, requests);

  res.status(201).json({
    ...entry,
    duplicateOf: existing ? existing.id : null,
    demandCount: requests.filter(r => normalizeRequestedAppName(r.appName) === normalizedName).length,
  });
});

app.post('/ai/demand-opportunity', async (req, res) => {
  const requestedApp = String(req.body?.appName || '').trim();
  if (requestedApp.length < 2 || requestedApp.length > 100) {
    return res.status(400).json({ error: 'appName must be 2-100 characters' });
  }

  const requests = readJson(REQUESTS_PATH, []);
  const catalog = readJson(CATALOG_PATH, []);
  const windowDays = Math.max(1, Number(req.body?.days || 30));
  const windowMs = windowDays * 86400000;
  const normalized = normalizeRequestedAppName(requestedApp);
  const matching = requests.filter(r =>
    (r.normalizedName || normalizeRequestedAppName(r.appName)) === normalized
  );

  const now = Date.now();
  const recent = matching.filter(r => now - new Date(r.createdAt).getTime() <= windowMs);
  const last7 = matching.filter(r => now - new Date(r.createdAt).getTime() <= 7 * 86400000);
  const previous = matching.filter(r => {
    const age = now - new Date(r.createdAt).getTime();
    return age > windowMs && age <= windowMs * 2;
  });

  const opportunityInput = {
    appName: requestedApp,
    totalRequests: matching.length,
    recentRequests: recent.length,
    last7Days: last7.length,
    previousWindowRequests: previous.length,
    discoveryRequests: matching.filter(r => r.source === 'missing-app-discovery').length,
    manualRequests: matching.filter(r => r.source !== 'missing-app-discovery').length,
    catalogMatch: catalog.find(a => normalizeRequestedAppName(a.name) === normalized) || null,
  };

  try {
    const result = await analyzeDemandOpportunity({ opportunity: opportunityInput });
    res.json({ ...result, input: opportunityInput, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('AI demand opportunity error:', error);
    res.status(503).json({ error: 'AI demand opportunity unavailable', detail: error.message });
  }
});

app.get('/requests/demand', (req, res) => {
  const requests = readJson(REQUESTS_PATH, []);
  const map = new Map();
  const now = Date.now();
  const windowDays = Math.max(1, Number(req.query.days || 30));
  const windowMs = windowDays * 86400000;
  const weekMs = 7 * 86400000;

  for (const r of requests) {
    const key = r.normalizedName || normalizeRequestedAppName(r.appName);
    const cur = map.get(key) || {
      appName: r.appName.trim(),
      normalizedName: key,
      count: 0,
      discoveryRequests: 0,
      manualRequests: 0,
      recentRequests: 0,
      last7Days: 0,
      previousWindowRequests: 0,
      lastRequestedAt: r.createdAt,
    };
    const age = now - new Date(r.createdAt).getTime();
    cur.count += 1;
    if (r.source === 'missing-app-discovery') cur.discoveryRequests += 1;
    else cur.manualRequests += 1;
    if (age <= windowMs) cur.recentRequests += 1;
    if (age <= weekMs) cur.last7Days += 1;
    if (age > windowMs && age <= windowMs * 2) cur.previousWindowRequests += 1;
    if (r.createdAt > cur.lastRequestedAt) {
      cur.lastRequestedAt = r.createdAt;
      cur.appName = r.appName.trim();
    }
    map.set(key, cur);
  }

  const ranked = [...map.values()].map(item => {
    const currentWindow = item.recentRequests;
    const previousWindow = item.previousWindowRequests;
    const trendPercent = previousWindow === 0
      ? (currentWindow > 0 ? 100 : 0)
      : Math.round(((currentWindow - previousWindow) / previousWindow) * 100);
    const trend = currentWindow === 0
      ? 'inactive'
      : previousWindow === 0 || trendPercent >= 20
        ? 'rising'
        : trendPercent <= -20
          ? 'falling'
          : 'stable';
    const recencyBonus = item.last7Days * 8;
    const discoveryBonus = item.discoveryRequests * 4;
    const demandScore = Math.round(currentWindow * 10 + recencyBonus + discoveryBonus);
    const discoveryShare = item.count ? Math.round((item.discoveryRequests / item.count) * 100) : 0;
    const opportunityScore = Math.min(100, Math.round(
      Math.min(40, currentWindow * 4) +
      Math.min(25, item.last7Days * 5) +
      Math.min(20, discoveryShare * 0.2) +
      (trend === 'rising' ? 15 : trend === 'stable' ? 8 : 0)
    ));
    const opportunity = opportunityScore >= 70 ? 'high' : opportunityScore >= 40 ? 'medium' : 'emerging';
    const opportunityReasons = [];
    if (currentWindow > 0) opportunityReasons.push(`${currentWindow} requests in the last ${windowDays} days`);
    if (item.last7Days > 0) opportunityReasons.push(`${item.last7Days} requests in the last 7 days`);
    if (discoveryShare >= 60) opportunityReasons.push(`${discoveryShare}% discovery-driven demand`);
    if (trend === 'rising') opportunityReasons.push(`Demand is rising ${Math.abs(trendPercent)}%`);
    return { ...item, demandScore, trendPercent, trend, discoveryShare, opportunityScore, opportunity, opportunityReasons };
  }).sort((a, b) =>
    b.demandScore - a.demandScore ||
    b.recentRequests - a.recentRequests ||
    b.count - a.count ||
    b.lastRequestedAt.localeCompare(a.lastRequestedAt)
  );

  const recentTotal = ranked.reduce((sum, item) => sum + item.recentRequests, 0);
  const last7Total = ranked.reduce((sum, item) => sum + item.last7Days, 0);
  res.json({
    windowDays,
    totalRequestedApps: ranked.length,
    totalRequests: requests.length,
    recentRequests: recentTotal,
    last7DaysRequests: last7Total,
    topDemand: ranked.slice(0, 10),
    topOpportunities: ranked.filter(item => item.opportunityScore >= 40).sort((a,b) => b.opportunityScore - a.opportunityScore || b.demandScore - a.demandScore).slice(0, 5),
    items: ranked,
    generatedAt: new Date().toISOString(),
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`ARCHANGEL API listening on http://${HOST}:4000`);
  console.log('LAN clients can reach this service using the Windows PC LAN IP.');
  try {
    const result = refreshAdLensHistory();
    console.log(`AdLens startup refresh: ${result.appsChecked} apps checked, ${result.snapshotsAdded} snapshots added, ${result.changesDetected} changes detected.`);
  } catch (error) {
    console.error('AdLens startup refresh failed:', error.message);
  }
});

if (ADLENS_REFRESH_INTERVAL_MS > 0) {
  setInterval(() => {
    try {
      const result = refreshAdLensHistory();
      console.log(`AdLens scheduled refresh: ${result.appsChecked} apps checked, ${result.snapshotsAdded} snapshots added, ${result.changesDetected} changes detected.`);
    } catch (error) {
      console.error('AdLens scheduled refresh failed:', error.message);
    }
  }, ADLENS_REFRESH_INTERVAL_MS);
}
