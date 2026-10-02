const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const BEDROCK_REGION = process.env.AWS_REGION || 'us-east-1';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0';
const client = new BedrockRuntimeClient({ region: BEDROCK_REGION });

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

function extractText(response) {
  return (response.output?.message?.content || []).filter(block => block.text).map(block => block.text).join('');
}

function parseResult(raw) {
  const text = String(raw || '').trim();
  try { return { ...JSON.parse(text), modelId: BEDROCK_MODEL_ID, provider: 'bedrock' }; }
  catch { return { requestedApp: '', understoodIntent: 'AI response could not be parsed as structured JSON.', exactMatch: null, alternatives: [], message: text || 'No AI response was returned.', modelId: BEDROCK_MODEL_ID, provider: 'bedrock' }; }
}

async function analyzeWithBedrock({ catalog, userRequest }) {
  if (!process.env.AWS_BEARER_TOKEN_BEDROCK && !process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE && !process.env.AWS_ROLE_ARN) {
    throw new Error('AWS Bedrock credentials are not configured');
  }
  const prompt = buildPrompt(userRequest, searchCatalog(catalog, userRequest));
  const response = await client.send(new ConverseCommand({
    modelId: BEDROCK_MODEL_ID,
    system: [{ text: 'You are ARCHANGEL Concierge. Follow the requested JSON schema exactly.' }],
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { temperature: 0.1, maxTokens: 700 },
  }));
  return parseResult(extractText(response));
}

module.exports = { analyzeWithBedrock, BEDROCK_MODEL_ID, BEDROCK_REGION };
