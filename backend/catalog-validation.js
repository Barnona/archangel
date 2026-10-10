const fs = require('node:fs');
const path = require('node:path');

const CATALOG_PATH = path.join(__dirname, '..', 'shared', 'src', 'catalog.seed.json');
const VALID_MONETIZATION = new Set(['free', 'ad-supported', 'subscription', 'freemium', 'one-time', 'unknown']);
const VALID_AD_LEVELS = new Set(['none', 'light', 'moderate', 'heavy', 'unknown']);
const MAX_VERIFICATION_AGE_DAYS = 30;

function daysSince(dateValue, nowMs) {
  if (typeof dateValue !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const timestamp = Date.parse(`${dateValue}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== dateValue) return null;
  return Math.max(0, Math.floor((nowMs - timestamp) / 86400000));
}

function validateCatalog(catalog, options = {}) {
  const nowMs = options.now instanceof Date ? options.now.getTime() : Date.now();
  const errors = [];
  const warnings = [];
  const records = Array.isArray(catalog) ? catalog : [];
  const idCounts = new Map();

  for (const app of records) {
    if (app && typeof app.id === 'string' && app.id.trim()) {
      idCounts.set(app.id, (idCounts.get(app.id) || 0) + 1);
    }
  }

  if (!Array.isArray(catalog)) {
    errors.push({ code: 'CATALOG_NOT_ARRAY', recordId: null, message: 'Catalog root must be an array.' });
  }
  if (records.length === 0) {
    errors.push({ code: 'CATALOG_EMPTY', recordId: null, message: 'Catalog contains no records.' });
  }

  const ids = new Set(records.filter(app => app && typeof app.id === 'string').map(app => app.id));

  records.forEach((app, index) => {
    const recordId = typeof app?.id === 'string' && app.id ? app.id : `index:${index}`;
    const addError = (code, message) => errors.push({ code, recordId, message });
    const addWarning = (code, message) => warnings.push({ code, recordId, message });

    if (!app || typeof app !== 'object' || Array.isArray(app)) {
      addError('INVALID_RECORD', 'Record must be an object.');
      return;
    }

    for (const field of ['id', 'name', 'category', 'description', 'source']) {
      if (typeof app[field] !== 'string' || !app[field].trim()) {
        addError('MISSING_REQUIRED_FIELD', `Field "${field}" must be a non-empty string.`);
      }
    }

    if (typeof app.id === 'string' && app.id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(app.id)) {
      addError('INVALID_ID_FORMAT', 'ID must be lowercase kebab-case.');
    }
    if (idCounts.get(app.id) > 1) {
      addError('DUPLICATE_ID', 'Catalog IDs must be unique.');
    }

    if (!app.platforms || typeof app.platforms.fireOs !== 'boolean' || typeof app.platforms.vega !== 'boolean') {
      addError('INVALID_PLATFORMS', 'Both platforms.fireOs and platforms.vega must be booleans.');
    }
    if (!Array.isArray(app.monetization) || app.monetization.length === 0 ||
      app.monetization.some(value => !VALID_MONETIZATION.has(value))) {
      addError('INVALID_MONETIZATION', 'Monetization must be a non-empty array of supported values.');
    }
    if (!VALID_AD_LEVELS.has(app.adLevel)) {
      addError('INVALID_AD_LEVEL', 'adLevel must be a supported value.');
    }
    if (typeof app.verified !== 'boolean') {
      addError('INVALID_VERIFIED_FLAG', 'verified must be a boolean.');
    }

    const verifiedAge = daysSince(app.lastVerified, nowMs);
    if (app.lastVerified != null && verifiedAge === null) {
      addError('INVALID_VERIFICATION_DATE', 'lastVerified must be a real YYYY-MM-DD date or null.');
    } else if (app.verified === true && app.lastVerified == null) {
      addWarning('VERIFIED_WITHOUT_DATE', 'Record is marked verified but has no lastVerified date.');
    } else if (app.verified === true && verifiedAge > MAX_VERIFICATION_AGE_DAYS) {
      addWarning('VERIFICATION_STALE', `Verification date is ${verifiedAge} days old; review it before describing this record as current.`);
    }

    if (!Array.isArray(app.alternatives)) {
      addError('INVALID_ALTERNATIVES', 'alternatives must be an array of catalog IDs.');
    } else {
      const seenAlternatives = new Set();
      for (const alternativeId of app.alternatives) {
        if (typeof alternativeId !== 'string' || !ids.has(alternativeId)) {
          addError('BROKEN_ALTERNATIVE_REFERENCE', `Alternative "${String(alternativeId)}" does not exist in the catalog.`);
        } else if (alternativeId === app.id) {
          addError('SELF_ALTERNATIVE_REFERENCE', 'A record cannot list itself as an alternative.');
        } else if (seenAlternatives.has(alternativeId)) {
          addError('DUPLICATE_ALTERNATIVE_REFERENCE', `Alternative "${alternativeId}" is listed more than once.`);
        }
        seenAlternatives.add(alternativeId);
      }
    }
  });

  const staleRecords = warnings.filter(item => item.code === 'VERIFICATION_STALE').length;
  return {
    valid: errors.length === 0,
    checkedAt: new Date(nowMs).toISOString(),
    totalRecords: records.length,
    errorCount: errors.length,
    warningCount: warnings.length,
    summary: {
      fireOsRecords: records.filter(app => app?.platforms?.fireOs === true).length,
      vegaRecords: records.filter(app => app?.platforms?.vega === true).length,
      verifiedRecords: records.filter(app => app?.verified === true).length,
      staleVerifiedRecords: staleRecords,
      categories: [...new Set(records.map(app => app?.category).filter(value => typeof value === 'string' && value.trim()))].sort(),
    },
    errors,
    warnings,
  };
}

function validateCatalogFile() {
  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  } catch (error) {
    return {
      valid: false,
      checkedAt: new Date().toISOString(),
      totalRecords: 0,
      errorCount: 1,
      warningCount: 0,
      summary: { fireOsRecords: 0, vegaRecords: 0, verifiedRecords: 0, staleVerifiedRecords: 0, categories: [] },
      errors: [{ code: 'CATALOG_READ_FAILED', recordId: null, message: `Could not read catalog JSON: ${error.message}` }],
      warnings: [],
    };
  }
  return validateCatalog(catalog);
}

if (require.main === module) {
  const result = validateCatalogFile();
  console.log(`Catalog validation: ${result.valid ? 'PASS' : 'FAIL'}`);
  console.log(`Records: ${result.totalRecords} | Errors: ${result.errorCount} | Warnings: ${result.warningCount}`);
  console.log(`Fire OS: ${result.summary.fireOsRecords} | Vega: ${result.summary.vegaRecords} | Verified: ${result.summary.verifiedRecords} | Stale verified: ${result.summary.staleVerifiedRecords}`);
  for (const issue of result.errors) console.error(`ERROR [${issue.code}] ${issue.recordId || 'catalog'}: ${issue.message}`);
  for (const issue of result.warnings) console.warn(`WARN  [${issue.code}] ${issue.recordId || 'catalog'}: ${issue.message}`);
  if (!result.valid) process.exitCode = 1;
}

module.exports = { validateCatalog, validateCatalogFile };
