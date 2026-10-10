const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

function readProviderConfig(extraEnv = {}) {
  const script = "const p = require('./providers/bedrock'); process.stdout.write(JSON.stringify({ modelId: p.BEDROCK_MODEL_ID, region: p.BEDROCK_REGION }));";
  const env = { ...process.env };
  delete env.BEDROCK_MODEL_ID;
  delete env.AWS_REGION;
  Object.assign(env, extraEnv);
  return JSON.parse(execFileSync(process.execPath, ['-e', script], { cwd: __dirname, env, encoding: 'utf8' }));
}

test('defaults to Nova 2 Lite for text-based Bedrock Concierge', () => {
  const config = readProviderConfig();
  assert.equal(config.modelId, 'amazon.nova-2-lite-v1:0');
  assert.equal(config.region, 'us-east-1');
});

test('allows model and region overrides without making a Bedrock request', () => {
  const config = readProviderConfig({ BEDROCK_MODEL_ID: 'amazon.nova-lite-v1:0', AWS_REGION: 'ap-south-1' });
  assert.equal(config.modelId, 'amazon.nova-lite-v1:0');
  assert.equal(config.region, 'ap-south-1');
});
