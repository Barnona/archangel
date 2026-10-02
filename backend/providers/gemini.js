const { GoogleGenAI } = require('@google/genai');

const GEMINI_MODELS = {
  primary: process.env.GEMINI_MODEL || 'gemma-4-31b-it',
  fallback: process.env.GEMINI_FALLBACK_MODEL || 'gemma-4-26b-a4b-it',
};

function compactApp(app) {
  return { id: app.id, name: app.name, category: app.category, description: app.description, platforms: app.platforms, monetization: app.monetization, adLevel: app.adLevel, alternatives: app.alternatives, verified: app.verified, lastVerified: app.lastVerified };
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();
}

function findDirectAppMatch(catalog, userRequest) {
  const normalizedQuery = normalizeName(userRequest);
  if (!normalizedQuery) return null;

  const fireOsApps = catalog.filter(app => app.platforms?.fireOs);
  for (const app of fireOsApps) {
    const normalizedName = normalizeName(app.name);
    if (normalizedQuery === normalizedName || normalizedQuery.includes(normalizedName)) {
      return app;
    }
  }
  return null;
}

function searchCatalog(catalog, userRequest) {
  const query = String(userRequest || '').trim().toLowerCase();
  const terms = query.split(/[^a-z0-9+]+/).filter(Boolean);
  return catalog.filter(app => app.platforms?.fireOs).map(app => {
    const haystack = [app.name, app.category, app.description, ...(app.alternatives || [])].join(' ').toLowerCase();
    const normalizedName = normalizeName(app.name);
    const normalizedQuery = normalizeName(query);
    let score = app.verified ? 5 : 0;
    if (normalizedQuery === normalizedName) score += 100;
    else if (normalizedQuery.includes(normalizedName)) score += 60;
    else if (haystack.includes(query)) score += 40;
    for (const term of terms) if (term.length > 2 && haystack.includes(term)) score += 8;
    return { app: compactApp(app), score };
  }).sort((a,b) => b.score-a.score).slice(0,10);
}

function buildPrompt(userRequest, results, directMatch) {
  return [
    'You are ARCHANGEL Concierge, an application discovery intelligence layer for Fire TV.',
    'The supplied catalog results are authoritative for application existence. Never invent an app, app ID, or Fire OS availability.',
    'Interpret the user request, then recommend only applications present in the supplied catalog results.',
    'Classify the request as exactly one of: SPECIFIC_APP, CAPABILITY, CONTENT, MISSING_APP, AMBIGUOUS.',
    'requestedApp is ONLY a named application the user explicitly appears to be asking for. Never convert a generic content or capability phrase into an app name.',
    'Examples that MUST leave requestedApp empty: "some movies", "music", "live sports", "an app to watch movies", "something for gaming".',
    'If the user names an app that is not in the catalog, set intentType to MISSING_APP and requestedApp to that app name.',
    'If the user asks for a cataloged app, set intentType to SPECIFIC_APP and exactMatch to that app ID.',
    'If the request is about what to watch/do rather than a named app, use CONTENT or CAPABILITY and keep exactMatch null.',
    'Return ONLY valid JSON using this exact shape:',
    '{"intentType":"SPECIFIC_APP|CAPABILITY|CONTENT|MISSING_APP|AMBIGUOUS","requestedApp":string,"understoodIntent":string,"exactMatch":string|null,"alternatives":[{"appId":string,"reason":string,"confidence":number}],"message":string}',
    'exactMatch must be an app ID from the catalog results or null.',
    'confidence must be between 0 and 1. Keep the message concise.',
    directMatch ? `DIRECT CATALOG MATCH: ${directMatch.id} (${directMatch.name})` : 'DIRECT CATALOG MATCH: none',
    '', `USER REQUEST:\n${userRequest}`, '',
    `CATALOG RESULTS:\n${JSON.stringify(results)}`
  ].join('\n');
}

function extractResponseText(response) {
  if (typeof response?.text === 'string' && response.text.trim()) return response.text.trim();

  const parts = response?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter(part => typeof part?.text === 'string' && part.text.trim())
    .map(part => part.text.trim())
    .join('\n')
    .trim();
}

function extractJson(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/^\s*\`\`\`(?:json)?\s*/i, '')
    .replace(/\s*\`\`\`\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Model returned no valid JSON object.');
  }
}

function parseResult(raw, modelId) {
  const text = String(raw || '').trim();
  if (!text) throw new Error('Model returned an empty response.');
  const parsed = extractJson(text);

  if (!parsed || typeof parsed !== 'object') throw new Error('Model returned an invalid JSON object.');
  if (!Array.isArray(parsed.alternatives)) parsed.alternatives = [];
  if (!['SPECIFIC_APP', 'CAPABILITY', 'CONTENT', 'MISSING_APP', 'AMBIGUOUS'].includes(parsed.intentType)) parsed.intentType = 'AMBIGUOUS';
  if (typeof parsed.requestedApp !== 'string') parsed.requestedApp = '';
  if (typeof parsed.understoodIntent !== 'string') parsed.understoodIntent = '';
  if (parsed.exactMatch !== null && typeof parsed.exactMatch !== 'string') parsed.exactMatch = null;
  if (typeof parsed.message !== 'string') parsed.message = '';

  parsed.alternatives = parsed.alternatives
    .filter(item => item && typeof item.appId === 'string' && typeof item.reason === 'string')
    .map(item => ({
      appId: item.appId,
      reason: item.reason,
      confidence: Number.isFinite(Number(item.confidence))
        ? Math.max(0, Math.min(1, Number(item.confidence)))
        : 0,
    }));

  return { ...parsed, modelId, provider: 'gemini' };
}

function validateAgainstCatalog(result, catalog) {
  const fireOsApps = catalog.filter(app => app.platforms?.fireOs);
  const byId = new Map(fireOsApps.map(app => [app.id, app]));

  if (result.exactMatch && !byId.has(result.exactMatch)) {
    result.exactMatch = null;
  }

  const genericRequestTerms = new Set([
    'app', 'application', 'apps', 'applications', 'movie', 'movies', 'music',
    'video', 'videos', 'show', 'shows', 'streaming', 'stream', 'games', 'gaming',
    'sports', 'news', 'something', 'some', 'anything', 'content', 'tv'
  ]);
  const normalizedRequested = String(result.requestedApp || '').trim().toLowerCase();
  const requestedWords = normalizedRequested.split(/[^a-z0-9+]+/).filter(Boolean);
  const isGenericRequest =
    !normalizedRequested ||
    requestedWords.length > 4 ||
    requestedWords.some(word => genericRequestTerms.has(word));

  if (isGenericRequest) {
    result.requestedApp = '';
  }

  if (!result.requestedApp) {
    result.intentType = result.intentType === 'SPECIFIC_APP' ? 'AMBIGUOUS' : result.intentType;
  }

  result.alternatives = result.alternatives
    .filter(item => byId.has(item.appId))
    .filter((item, index, list) => list.findIndex(x => x.appId === item.appId) === index)
    .slice(0, 5);

  return result;
}

async function callModel(modelId, prompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      temperature: 0.1,
      maxOutputTokens: 900,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: 'minimal' },
    },
  });

  const rawText = extractResponseText(response);
  return parseResult(rawText, modelId);
}

async function analyzeWithGemini({ catalog, userRequest }) {
  const directMatch = findDirectAppMatch(catalog, userRequest);
  const prompt = buildPrompt(userRequest, searchCatalog(catalog, userRequest), directMatch);
  try {
    const result = validateAgainstCatalog(await callModel(GEMINI_MODELS.primary, prompt), catalog);
    if (directMatch) {
      result.intentType = 'SPECIFIC_APP';
      result.requestedApp = directMatch.name;
      result.exactMatch = directMatch.id;
    } else if (result.requestedApp && result.intentType !== 'SPECIFIC_APP') {
      result.intentType = 'MISSING_APP';
      result.exactMatch = null;
    }
    return result;
  } catch (primaryError) {
    console.warn(`Gemini primary failed (${GEMINI_MODELS.primary}); using fallback: ${primaryError.message}`);
    try {
      const fallback = validateAgainstCatalog(await callModel(GEMINI_MODELS.fallback, prompt), catalog);
      if (directMatch) {
        fallback.intentType = 'SPECIFIC_APP';
        fallback.requestedApp = directMatch.name;
        fallback.exactMatch = directMatch.id;
      } else if (fallback.requestedApp && fallback.intentType !== 'SPECIFIC_APP') {
        fallback.intentType = 'MISSING_APP';
        fallback.exactMatch = null;
      }
      return { ...fallback, fallbackUsed: true, fallbackReason: primaryError.message };
    } catch (fallbackError) {
      throw new Error(`Gemini primary and fallback failed: ${primaryError.message}; ${fallbackError.message}`);
    }
  }
}

module.exports = { analyzeWithGemini, GEMINI_MODELS };
