const { GoogleGenAI } = require('@google/genai');

const GEMINI_MODELS = {
  primary: process.env.GEMINI_MODEL || 'gemma-4-31b-it',
  fallback: process.env.GEMINI_FALLBACK_MODEL || 'gemma-4-26b-a4b-it',
};

function compactApp(app) {
  return { id: app.id, name: app.name, category: app.category, description: app.description, platforms: app.platforms, monetization: app.monetization, adLevel: app.adLevel, alternatives: app.alternatives, verified: app.verified, lastVerified: app.lastVerified };
}

function searchCatalog(catalog, userRequest) {
  const query = String(userRequest || '').trim().toLowerCase();
  const terms = query.split(/[^a-z0-9+]+/).filter(Boolean);
  return catalog.filter(app => app.platforms?.fireOs).map(app => {
    const haystack = [app.name, app.category, app.description, ...(app.alternatives || [])].join(' ').toLowerCase();
    let score = app.verified ? 5 : 0;
    if (haystack.includes(query)) score += 40;
    for (const term of terms) if (term.length > 2 && haystack.includes(term)) score += 8;
    return { app: compactApp(app), score };
  }).sort((a,b) => b.score-a.score).slice(0,8);
}

function buildPrompt(userRequest, results) {
  return [
    'You are ARCHANGEL Concierge, an application discovery intelligence layer for Fire TV.',
    'The supplied catalog results are authoritative for application existence. Never invent an app, app ID, or Fire OS availability.',
    'Interpret the user request, then recommend only applications present in the supplied catalog results.',
    'Return ONLY valid JSON using this exact shape:',
    '{"requestedApp":string,"understoodIntent":string,"exactMatch":string|null,"alternatives":[{"appId":string,"reason":string,"confidence":number}],"message":string}',
    'exactMatch must be an app ID from the catalog results or null.',
    'confidence must be between 0 and 1. Keep the message concise.',
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
  if (typeof parsed.requestedApp !== 'string') parsed.requestedApp = '';
  if (typeof parsed.understoodIntent !== 'string') parsed.understoodIntent = '';
  if (parsed.exactMatch !== null && typeof parsed.exactMatch !== 'string') parsed.exactMatch = null;
  if (typeof parsed.message !== 'string') parsed.message = '';

  return { ...parsed, modelId, provider: 'gemini' };
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
  const prompt = buildPrompt(userRequest, searchCatalog(catalog, userRequest));
  try {
    return await callModel(GEMINI_MODELS.primary, prompt);
  } catch (primaryError) {
    console.warn(`Gemini primary failed (${GEMINI_MODELS.primary}); using fallback: ${primaryError.message}`);
    try {
      const fallback = await callModel(GEMINI_MODELS.fallback, prompt);
      return { ...fallback, fallbackUsed: true, fallbackReason: primaryError.message };
    } catch (fallbackError) {
      throw new Error(`Gemini primary and fallback failed: ${primaryError.message}; ${fallbackError.message}`);
    }
  }
}

module.exports = { analyzeWithGemini, GEMINI_MODELS };
