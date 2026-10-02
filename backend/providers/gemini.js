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

function parseResult(raw, modelId) {
  const text = String(raw || '').trim();
  try { return { ...JSON.parse(text), modelId, provider: 'gemini' }; }
  catch { return { requestedApp: '', understoodIntent: 'AI response could not be parsed as structured JSON.', exactMatch: null, alternatives: [], message: text || 'No AI response was returned.', modelId, provider: 'gemini' }; }
}

async function callModel(modelId, prompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: { temperature: 0.1, maxOutputTokens: 700, responseMimeType: 'application/json' },
  });
  return parseResult(response.text, modelId);
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
