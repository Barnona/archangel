const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const BEDROCK_REGION = process.env.AWS_REGION || 'us-east-1';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-2-lite-v1:0';
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
  // Let the AWS SDK resolve credentials through its standard provider chain
  // (environment variables, shared AWS config/credentials, IAM roles, etc.).
  const prompt = buildPrompt(userRequest, searchCatalog(catalog, userRequest));
  const response = await client.send(new ConverseCommand({
    modelId: BEDROCK_MODEL_ID,
    system: [{ text: 'You are ARCHANGEL Concierge. Follow the requested JSON schema exactly.' }],
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { temperature: 0.1, maxTokens: 700 },
  }));
  return parseResult(extractText(response));
}


function extractJson(raw) {
  const cleaned = String(raw || '').trim().replace(/^\uFEFF/, '').replace(/^\s*\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`\s*$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Model returned no valid JSON object.');
  }
}

function validateDemandResult(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid demand analysis response.');
  const allowed = ['high', 'medium', 'emerging'];
  parsed.opportunity = allowed.includes(parsed.opportunity) ? parsed.opportunity : 'emerging';
  parsed.summary = typeof parsed.summary === 'string' ? parsed.summary : '';
  parsed.recommendation = typeof parsed.recommendation === 'string' ? parsed.recommendation : '';
  parsed.reasons = Array.isArray(parsed.reasons) ? parsed.reasons.filter(x => typeof x === 'string').slice(0, 5) : [];
  parsed.confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
  return parsed;
}

async function analyzeDemandOpportunity({ opportunity }) {
  // Let the AWS SDK resolve credentials through its standard provider chain.
  const prompt = [
    'You are ARCHANGEL Developer Opportunity Intelligence.',
    'Interpret the supplied deterministic demand metrics. Do not change the numbers and do not invent demand.',
    'Use exactly one opportunity level: high, medium, emerging.',
    'Return ONLY valid JSON:',
    '{"opportunity":"high|medium|emerging","summary":string,"reasons":[string],"recommendation":string,"confidence":number}',
    'Keep the analysis concise and grounded only in the supplied data.',
    '',
    'DEMAND DATA:',
    JSON.stringify(opportunity),
  ].join('\\n');
  const response = await client.send(new ConverseCommand({
    modelId: BEDROCK_MODEL_ID,
    system: [{ text: 'You are ARCHANGEL Developer Opportunity Intelligence. Follow the JSON schema exactly.' }],
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { temperature: 0.1, maxTokens: 500 },
  }));
  const parsed = extractJson(extractText(response));
  return { ...validateDemandResult(parsed), modelId: BEDROCK_MODEL_ID, provider: 'bedrock' };
}

module.exports = { analyzeWithBedrock, analyzeDemandOpportunity, BEDROCK_MODEL_ID, BEDROCK_REGION };
