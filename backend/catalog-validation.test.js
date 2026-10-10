const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCatalog } = require('./catalog-validation');

const today = new Date('2026-10-10T12:00:00.000Z');
const validRecord = (overrides = {}) => ({
  id: 'sample-app',
  name: 'Sample App',
  category: 'Utility',
  description: 'A sample catalog record.',
  platforms: { fireOs: true, vega: false },
  monetization: ['free'],
  adLevel: 'unknown',
  alternatives: [],
  source: 'test-fixture',
  lastVerified: '2026-10-04',
  verified: true,
  ...overrides,
});

test('accepts a structurally valid catalog record', () => {
  const result = validateCatalog([validRecord()], { now: today });
  assert.equal(result.valid, true);
  assert.equal(result.errorCount, 0);
  assert.equal(result.summary.fireOsRecords, 1);
  assert.equal(result.summary.staleVerifiedRecords, 0);
});

test('rejects duplicate IDs and broken alternative references', () => {
  const first = validRecord({ alternatives: ['missing-app'] });
  const second = validRecord();
  const result = validateCatalog([first, second], { now: today });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(item => item.code === 'DUPLICATE_ID'));
  assert.ok(result.errors.some(item => item.code === 'BROKEN_ALTERNATIVE_REFERENCE'));
});

test('rejects invalid platform and monetization fields', () => {
  const result = validateCatalog([
    validRecord({ platforms: { fireOs: 'yes', vega: false }, monetization: ['free-ish'] }),
  ], { now: today });
  assert.ok(result.errors.some(item => item.code === 'INVALID_PLATFORMS'));
  assert.ok(result.errors.some(item => item.code === 'INVALID_MONETIZATION'));
});

test('flags old verification as a warning without invalidating schema', () => {
  const result = validateCatalog([validRecord({ lastVerified: '2026-09-01' })], { now: today });
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some(item => item.code === 'VERIFICATION_STALE'));
  assert.equal(result.summary.staleVerifiedRecords, 1);
});

test('rejects malformed verification dates', () => {
  const result = validateCatalog([validRecord({ lastVerified: '2026-02-31' })], { now: today });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(item => item.code === 'INVALID_VERIFICATION_DATE'));
});

test('rejects non-array and empty catalogs', () => {
  assert.equal(validateCatalog(null, { now: today }).errors[0].code, 'CATALOG_NOT_ARRAY');
  assert.equal(validateCatalog([], { now: today }).errors[0].code, 'CATALOG_EMPTY');
});

test('rejects self-references and repeated alternatives', () => {
  const a = validRecord({ alternatives: ['sample-app', 'other-app', 'other-app'] });
  const b = validRecord({ id: 'other-app', alternatives: [] });
  const result = validateCatalog([a, b], { now: today });
  assert.ok(result.errors.some(item => item.code === 'SELF_ALTERNATIVE_REFERENCE'));
  assert.ok(result.errors.some(item => item.code === 'DUPLICATE_ALTERNATIVE_REFERENCE'));
});
