const { analyzeWithGemini, GEMINI_MODELS } = require('./providers/gemini');
const { analyzeWithBedrock, analyzeDemandOpportunity: analyzeDemandWithBedrock, BEDROCK_MODEL_ID, BEDROCK_REGION } = require('./providers/bedrock');

const PROVIDER = String(process.env.AI_PROVIDER || 'gemini').toLowerCase();

async function analyzeAppRequest({ catalog, userRequest }) {
  if (PROVIDER === 'gemini') return analyzeWithGemini({ catalog, userRequest });
  if (PROVIDER === 'bedrock') return analyzeWithBedrock({ catalog, userRequest });
  throw new Error(`Unsupported AI_PROVIDER: ${PROVIDER}. Use gemini or bedrock.`);
}

async function analyzeDemandOpportunity({ opportunity }) {
  if (PROVIDER === 'bedrock') return analyzeDemandWithBedrock({ opportunity });
  return {
    opportunity: opportunity.recentRequests > 0 ? 'emerging' : 'emerging',
    summary: 'Deterministic demand signals are available; AI reasoning is currently configured for Bedrock.',
    reasons: [],
    recommendation: 'Configure AI_PROVIDER=bedrock to enable model-based opportunity interpretation.',
    confidence: 0,
    provider: 'deterministic',
  };
}

function aiStatus() {
  return {
    provider: PROVIDER,
    gemini: { primaryModel: GEMINI_MODELS.primary, fallbackModel: GEMINI_MODELS.fallback },
    bedrock: { modelId: BEDROCK_MODEL_ID, region: BEDROCK_REGION },
  };
}

module.exports = { analyzeAppRequest, analyzeDemandOpportunity, aiStatus, PROVIDER };
