const { analyzeWithGemini, GEMINI_MODELS } = require('./providers/gemini');
const { analyzeWithBedrock, analyzeDemandOpportunity: analyzeDemandWithBedrock, BEDROCK_MODEL_ID, BEDROCK_REGION } = require('./providers/bedrock');
const { normalizeConciergeResult } = require('./concierge');

const PROVIDER = String(process.env.AI_PROVIDER || 'gemini').toLowerCase();

async function analyzeAppRequest({ catalog, userRequest }) {
  let result;
  if (PROVIDER === 'bedrock') {
    try {
      result = await analyzeWithBedrock({ catalog, userRequest });
    } catch (bedrockError) {
      console.warn(`Bedrock App Discovery failed; falling back to Gemini: ${bedrockError.message}`);
      try {
        result = await analyzeWithGemini({ catalog, userRequest });
        result = {
          ...result,
          fallbackUsed: true,
          fallbackProvider: 'gemini',
          fallbackReason: bedrockError.message,
        };
      } catch (geminiError) {
        throw new Error(`Bedrock and Gemini App Discovery failed: ${bedrockError.message}; ${geminiError.message}`);
      }
    }
  } else if (PROVIDER === 'gemini') {
    result = await analyzeWithGemini({ catalog, userRequest });
  } else {
    throw new Error(`Unsupported AI_PROVIDER: ${PROVIDER}. Use gemini or bedrock.`);
  }

  return normalizeConciergeResult(result, catalog, userRequest);
}

async function analyzeDemandOpportunity({ opportunity }) {
  if (PROVIDER === 'bedrock') return analyzeDemandWithBedrock({ opportunity });
  return {
    opportunity: 'emerging',
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
    appDiscoveryFallback: PROVIDER === 'bedrock' ? 'gemini' : null,
  };
}

module.exports = { analyzeAppRequest, analyzeDemandOpportunity, aiStatus, PROVIDER };
