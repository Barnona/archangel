const assert = require('node:assert/strict');

const BASE_URL = (process.env.ARCHANGEL_API_URL || 'http://127.0.0.1:4000').replace(/\\/$/, '');

async function get(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  const body = await response.json().catch(() => null);
  assert.equal(response.ok, true, `${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  let passed = 0;
  const check = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  };

  const health = await get('/health');
  await check('health endpoint reports a running API', async () => {
    assert.equal(health.ok, true);
    assert.equal(health.service, 'archangel-api');
    assert.ok(Number.isFinite(health.catalogCount));
  });

  const catalog = await get('/catalog/status');
  await check('catalog status has records and source metadata', async () => {
    assert.ok(catalog.total > 0);
    assert.equal(typeof catalog.source, 'string');
    assert.ok(Array.isArray(catalog.categories));
    assert.ok(catalog.amazonAppstoreApi);
  });

  const categories = await get('/apps/categories');
  await check('categories endpoint returns an array', async () => assert.ok(Array.isArray(categories)));

  const apps = await get('/apps');
  await check('app catalog returns valid profiles', async () => {
    assert.ok(Array.isArray(apps) && apps.length > 0);
    assert.equal(typeof apps[0].id, 'string');
    assert.equal(typeof apps[0].name, 'string');
    assert.ok(apps[0].platforms && typeof apps[0].platforms.fireOs === 'boolean');
  });

  const discover = await get('/apps/discover?q=movies');
  await check('discovery returns a structured result list', async () => {
    assert.ok(Array.isArray(discover.results));
    assert.equal(typeof discover.catalogSource, 'string');
  });

  const adLens = await get('/adlens');
  await check('AdLens exposes profiles and system-ad boundary', async () => {
    assert.ok(Array.isArray(adLens.profiles));
    assert.equal(typeof adLens.totalApps, 'number');
    assert.equal(adLens.systemAdControl?.controllable, false);
  });

  await check('AdLens history returns consistent summary metadata', async () => {
    const profile = adLens.profiles.find(item => item.appId);
    assert.ok(profile, 'expected at least one AdLens profile');
    const history = await get(`/adlens/${encodeURIComponent(profile.appId)}/history`);
    assert.ok(Array.isArray(history.snapshots));
    assert.ok(Array.isArray(history.changes));
    assert.equal(history.summary?.snapshotCount, history.snapshots.length);
    assert.equal(typeof history.summary?.hasBaseline, 'boolean');
  });

  const pulse = await get('/pulse');
  await check('Pulse reports expected checks and metrics', async () => {
    assert.ok(['healthy', 'degraded', 'attention'].includes(pulse.overall));
    const ids = pulse.checks.map(item => item.id);
    for (const id of ['api', 'catalog', 'requests', 'adlens', 'ai']) assert.ok(ids.includes(id), `missing Pulse check: ${id}`);
    assert.ok(Number.isFinite(pulse.metrics.catalogRecords));
    assert.ok(Number.isFinite(pulse.metrics.requestCount));
  });

  const demand = await get('/requests/demand');
  await check('demand endpoint returns aggregate arrays', async () => {
    assert.ok(Array.isArray(demand.entries));
    assert.ok(Array.isArray(demand.topDemand));
    assert.ok(Array.isArray(demand.topOpportunities));
  });

  console.log(`\\n${passed} integration smoke checks passed.`);
}

main().catch(error => {
  console.error('\\nINTEGRATION SMOKE TEST FAILED');
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
