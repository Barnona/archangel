const { analyzeWithGemini, GEMINI_MODELS } = require('./providers/gemini');
const { analyzeWithBedrock, BEDROCK_MODEL_ID, BEDROCK_REGION } = require('./providers/bedrock');

const PROVIDER = String(process.env.AI_PROVIDER || 'gemini').toLowerCase();

async function analyzeAppRequest({ catalog, userRequest }) {
  if (PROVIDER === 'gemini') return analyzeWithGemini({ catalog, userRequest });
  if (PROVIDER === 'bedrock') return analyzeWithBedrock({ catalog, userRequest });
  throw new Error(`Unsupported AI_PROVIDER: ${PROVIDER}. Use gemini or bedrock.`);
}

function aiStatus() {
  return {
    provider: PROVIDER,
    gemini: { primaryModel: GEMINI_MODELS.primary, fallbackModel: GEMINI_MODELS.fallback },
    bedrock: { modelId: BEDROCK_MODEL_ID, region: BEDROCK_REGION },
  };
}

module.exports = { analyzeAppRequest, aiStatus, PROVIDER };
