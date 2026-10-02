const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const REGION = process.env.AWS_REGION || 'us-east-1';
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0';

const client = new BedrockRuntimeClient({ region: REGION });

function compactApp(app) {
  return {
    id: app.id,
    name: app.name,
    category: app.category,
    description: app.description,
    platforms: app.platforms,
    monetization: app.monetization,
    adLevel: app.adLevel,
    alternatives: app.alternatives,
    verified: app.verified,
    lastVerified: app.lastVerified,
  };
}

function buildCatalogTool(catalog) {
  return {
    toolSpec: {
      name: 'search_catalog',
      description: 'Search the ARCHANGEL application catalog. Use this tool to determine whether an app is actually present and to find relevant Fire TV alternatives. Never invent catalog entries.',
      strict: true,
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The app or user request to search for.' },
            category: { type: ['string', 'null'], description: 'Optional category such as Streaming, Music, Games.' },
            freeOnly: { type: 'boolean', description: 'Whether to prefer free or freemium apps.' },
            fireOsOnly: { type: 'boolean', description: 'Whether results must support Fire OS.' }
          },
          required: ['query', 'category', 'freeOnly', 'fireOsOnly'],
          additionalProperties: false
        }
      }
    }
  };
}

function searchCatalog(catalog, input) {
  const query = String(input.query || '').trim();
  const category = input.category ? String(input.category).toLowerCase() : '';
  const freeOnly = Boolean(input.freeOnly);
  const fireOsOnly = input.fireOsOnly !== false;

  const terms = query.toLowerCase().split(/[^a-z0-9+]+/).filter(Boolean);

  return catalog.map(app => {
    if (fireOsOnly && !app.platforms?.fireOs) return null;
    if (category && app.category.toLowerCase() !== category) return null;
    if (freeOnly && !app.monetization.some(x => x === 'free' || x === 'freemium' || x === 'ad-supported')) return null;

    const haystack = [app.name, app.category, app.description, ...(app.alternatives || [])].join(' ').toLowerCase();
    let score = 0;

    if (app.name.toLowerCase() === query.toLowerCase()) score += 100;
    if (app.name.toLowerCase().includes(query.toLowerCase())) score += 70;
    for (const term of terms) if (haystack.includes(term)) score += 15;
    if (app.verified) score += 5;

    return { app: compactApp(app), score };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 8);
}

function extractText(response) {
  return (response.output?.message?.content || [])
    .filter(block => block.text)
    .map(block => block.text)
    .join('');
}

async function analyzeAppRequest({ catalog, userRequest }) {
  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE && !process.env.AWS_ROLE_ARN) {
    throw new Error('AWS credentials are not configured for Bedrock');
  }

  const system = [
    'You are ARCHANGEL Concierge, an application discovery intelligence layer for Fire TV.',
    'The catalog is authoritative for app existence. Never claim an app exists unless search_catalog returned it.',
    'Understand natural-language requests such as "I want Netflix but free" or "something like Spotify".',
    'Use search_catalog when the request depends on catalog availability or alternatives.',
    'Return ONLY valid JSON with this shape:',
    '{"requestedApp":string,"understoodIntent":string,"exactMatch":string|null,"alternatives":[{"appId":string,"reason":string,"confidence":number}],"message":string}',
    'confidence must be between 0 and 1. Keep message concise.'
  ].join(' ');

  const messages = [{ role: 'user', content: [{ text: userRequest }] }];

  let response = await client.send(new ConverseCommand({
    modelId: MODEL_ID,
    system: [{ text: system }],
    messages,
    toolConfig: {
      tools: [buildCatalogTool(catalog)],
      toolChoice: { auto: {} }
    },
    inferenceConfig: { temperature: 0.1, maxTokens: 700 }
  }));

  const toolUses = (response.output?.message?.content || [])
    .filter(block => block.toolUse)
    .map(block => block.toolUse);

  if (toolUses.length) {
    messages.push(response.output.message);

    for (const toolUse of toolUses) {
      const results = searchCatalog(catalog, toolUse.input || {});
      messages.push({
        role: 'user',
        content: [{
          toolResult: {
            toolUseId: toolUse.toolUseId,
            content: [{ json: { results } }]
          }
        }]
      });
    }

    response = await client.send(new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: system }],
      messages,
      inferenceConfig: { temperature: 0.1, maxTokens: 700 }
    }));
  }

  const raw = extractText(response).trim();

  try {
    const parsed = JSON.parse(raw);
    return { ...parsed, modelId: MODEL_ID };
  } catch {
    return {
      requestedApp: userRequest,
      understoodIntent: 'AI response could not be parsed as structured JSON.',
      exactMatch: null,
      alternatives: [],
      message: raw || 'No AI response was returned.',
      modelId: MODEL_ID
    };
  }
}

module.exports = { analyzeAppRequest, MODEL_ID, REGION };
