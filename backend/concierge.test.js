const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeConciergeResult, isGenericAppRequest } = require('./concierge');

const catalog = [
  { id: 'prime-video', name: 'Prime Video', platforms: { fireOs: true } },
  { id: 'spotify', name: 'Spotify', platforms: { fireOs: true } },
  { id: 'vega-only', name: 'Vega App', platforms: { fireOs: false, vega: true } },
];

test('normalizes a valid exact match and its display name', () => {
  const result = normalizeConciergeResult({ exactMatch: 'prime-video', requestedApp: '', alternatives: [] }, catalog, 'Prime Video');
  assert.equal(result.intentType, 'SPECIFIC_APP');
  assert.equal(result.requestedApp, 'Prime Video');
});

test('turns an unknown named app into a missing-app result', () => {
  const result = normalizeConciergeResult({ requestedApp: 'Crunchyroll', alternatives: [] }, catalog, 'Crunchyroll');
  assert.equal(result.intentType, 'MISSING_APP');
  assert.equal(result.exactMatch, null);
  assert.equal(result.requestedApp, 'Crunchyroll');
});

test('does not accept an unknown exact-match ID', () => {
  const result = normalizeConciergeResult({ intentType: 'SPECIFIC_APP', exactMatch: 'invented-id', alternatives: [] }, catalog, 'some app');
  assert.equal(result.exactMatch, null);
  assert.equal(result.intentType, 'CONTENT');
});

test('filters alternatives to unique Fire OS catalog IDs', () => {
  const result = normalizeConciergeResult({ alternatives: [
    { appId: 'spotify', reason: 'one', confidence: 1.4 },
    { appId: 'spotify', reason: 'duplicate', confidence: 0.5 },
    { appId: 'invented', reason: 'fake', confidence: 0.9 },
    { appId: 'vega-only', reason: 'wrong platform', confidence: 0.4 },
  ] }, catalog, 'music');
  assert.deepEqual(result.alternatives, [{ appId: 'spotify', reason: 'one', confidence: 1 }]);
});

test('supplies safe defaults for malformed model fields', () => {
  const result = normalizeConciergeResult({ alternatives: null, message: 4, understoodIntent: false }, catalog, 'music');
  assert.equal(result.intentType, 'CONTENT');
  assert.equal(result.message, '');
  assert.equal(result.understoodIntent, '');
  assert.deepEqual(result.alternatives, []);
});

test('preserves a valid model intent classification', () => {
  const result = normalizeConciergeResult({ intentType: 'CAPABILITY', alternatives: [] }, catalog, 'I need something for fitness');
  assert.equal(result.intentType, 'CAPABILITY');
});

test('generic content requests are not mislabeled as missing applications', () => {
  assert.equal(isGenericAppRequest('some movies'), true);
  assert.equal(isGenericAppRequest('something for gaming'), true);
  const result = normalizeConciergeResult({ requestedApp: 'some movies', alternatives: [] }, catalog, 'some movies');
  assert.equal(result.requestedApp, '');
  assert.notEqual(result.intentType, 'MISSING_APP');
});
