const INTENT_TYPES = new Set(['SPECIFIC_APP', 'CAPABILITY', 'CONTENT', 'MISSING_APP', 'AMBIGUOUS']);

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

  if (normalized.exactMatch) {
    normalized.requestedApp = byId.get(normalized.exactMatch).name;
    normalized.intentType = 'SPECIFIC_APP';
  } else if (normalized.requestedApp) {
    normalized.intentType = 'MISSING_APP';
  } else if (!INTENT_TYPES.has(normalized.intentType)) {
    const intentText = `${userRequest || ''} ${normalized.understoodIntent}`.toLowerCase();
    normalized.intentType = /\b(ambiguous|unclear|which app)\b/.test(intentText)
      ? 'AMBIGUOUS'
      : /\b(watch|listen|play|find|show|stream|content|movie|music|game|sport)\b/.test(intentText)
        ? 'CONTENT'
        : 'CAPABILITY';
  } else if (normalized.intentType === 'SPECIFIC_APP') {
    normalized.intentType = 'AMBIGUOUS';
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

module.exports = { normalizeConciergeResult };
