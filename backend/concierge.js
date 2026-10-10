const INTENT_TYPES = new Set(['SPECIFIC_APP', 'CAPABILITY', 'CONTENT', 'MISSING_APP', 'AMBIGUOUS']);
const GENERIC_REQUEST_TERMS = new Set([
  'app', 'application', 'apps', 'applications', 'movie', 'movies', 'music',
  'video', 'videos', 'show', 'shows', 'streaming', 'stream', 'games', 'gaming',
  'sports', 'news', 'something', 'some', 'anything', 'content', 'tv'
]);

function isGenericAppRequest(value) {
  const words = String(value || '').toLowerCase().split(/[^a-z0-9+]+/).filter(Boolean);
  return words.length === 0 || words.length > 4 || words.some(word => GENERIC_REQUEST_TERMS.has(word));
}

function normalizeConciergeResult(result, catalog, userRequest) {
  const fireOsApps = catalog.filter(app => app.platforms?.fireOs);
  const byId = new Map(fireOsApps.map(app => [app.id, app]));
  const normalized = result && typeof result === 'object' ? { ...result } : {};

  normalized.requestedApp = typeof normalized.requestedApp === 'string' ? normalized.requestedApp.trim() : '';
  normalized.understoodIntent = typeof normalized.understoodIntent === 'string' ? normalized.understoodIntent.trim() : '';
  normalized.message = typeof normalized.message === 'string' ? normalized.message.trim() : '';
  normalized.exactMatch = typeof normalized.exactMatch === 'string' && byId.has(normalized.exactMatch)
    ? normalized.exactMatch
    : null;

  if (isGenericAppRequest(normalized.requestedApp)) normalized.requestedApp = '';

  if (normalized.exactMatch) {
    normalized.requestedApp = byId.get(normalized.exactMatch).name;
    normalized.intentType = 'SPECIFIC_APP';
  } else if (normalized.requestedApp) {
    normalized.intentType = 'MISSING_APP';
  } else if (!INTENT_TYPES.has(normalized.intentType) || normalized.intentType === 'SPECIFIC_APP') {
    const intentText = `${userRequest || ''} ${normalized.understoodIntent}`.toLowerCase();
    normalized.intentType = /\b(ambiguous|unclear|which app)\b/.test(intentText)
      ? 'AMBIGUOUS'
      : /\b(watch|listen|play|find|show|stream|content|movie|music|game|sport)\b/.test(intentText)
        ? 'CONTENT'
        : 'CAPABILITY';
  }

  const alternatives = Array.isArray(normalized.alternatives) ? normalized.alternatives : [];
  normalized.alternatives = alternatives
    .filter(item => item && typeof item.appId === 'string' && byId.has(item.appId))
    .filter((item, index, items) => items.findIndex(other => other.appId === item.appId) === index)
    .slice(0, 5)
    .map(item => ({
      appId: item.appId,
      reason: typeof item.reason === 'string' ? item.reason : 'Catalog alternative',
      confidence: Number.isFinite(Number(item.confidence))
        ? Math.max(0, Math.min(1, Number(item.confidence)))
        : 0,
    }));

  if (normalized.intentType === 'MISSING_APP') normalized.exactMatch = null;
  if (normalized.intentType !== 'MISSING_APP' && !normalized.exactMatch) normalized.requestedApp = '';
  return normalized;
}

module.exports = { normalizeConciergeResult, isGenericAppRequest };
