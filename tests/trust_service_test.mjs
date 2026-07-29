import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TrustStore } from '../trust-store.mjs';
import { createTrustService } from '../trust-service.mjs';

const root = await mkdtemp(join(tmpdir(), 'openradar-trust-'));
const store = new TrustStore(join(root, 'trust.json'));
await store.init();
let calls = 0;
const responses = (url, options = {}) => {
  calls += 1;
  const value = String(url);
  if (value.includes('api.scorecard.dev')) return new Response(JSON.stringify({ score: 7.8, date: '2026-07-29', checks: [
    { name: 'Maintained', score: 10, reason: 'recent activity' },
    { name: 'Security-Policy', score: 2, reason: 'missing policy' },
  ] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (value.endsWith(':packageversions')) return new Response(JSON.stringify({ versions: [{ versionKey: { system: 'NPM', name: '@demo/tool', version: '1.2.3' }, relationType: 'RELATION_SELF' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (value.includes('/v3/projects/')) return new Response(JSON.stringify({ projectKey: { id: 'github.com/demo/tool' }, starsCount: 50, license: 'MIT' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (value.includes('/v3/systems/NPM/packages/')) return new Response(JSON.stringify({ versions: [{ versionKey: { system: 'NPM', name: '@demo/tool', version: '1.2.3' }, isDefault: true }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (value.includes('api.osv.dev/v1/querybatch')) {
    assert.equal(options.method, 'POST');
    return new Response(JSON.stringify({ results: [{ vulns: [{ id: 'OSV-TEST-1', modified: '2026-07-20T00:00:00Z' }] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
};
let now = Date.parse('2026-07-29T05:00:00Z');
const service = createTrustService({ store, fetchImpl: responses, now: () => now });
const project = { id: 'github:demo/tool', entityId: 'entity:tool', platform: 'github', owner: 'demo', name: 'tool', url: 'https://github.com/demo/tool', license: 'MIT', updatedAt: '2026-07-29' };
const report = await service.analyze(project);
assert.equal(report.projectId, 'entity:tool');
assert.equal(report.facts.scorecard.overallScore, 7.8);
assert.equal(report.facts.osv.vulnerabilityCount, 1);
assert.equal(report.assessment.level, 'high');
assert.ok(report.assessment.warnings.some((item) => item.includes('OSV')));
const firstCalls = calls;
const cached = await service.analyze(project);
assert.equal(cached.cached, true);
assert.equal(calls, firstCalls);
const many = await service.getMany(['entity:tool']);
assert.equal(many['entity:tool'].assessment.level, 'high');
await rm(root, { recursive: true, force: true });
console.log(JSON.stringify({ calls, assessment: report.assessment, provenance: report.provenance }, null, 2));
