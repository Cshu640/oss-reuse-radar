import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InsightStore } from '../insight-store.mjs';
import { createInsightService, projectFingerprint, ruleBasedInsight } from '../insight-service.mjs';

const root = await mkdtemp(join(tmpdir(), 'openradar-insights-'));
const file = join(root, 'insights.json');
const store = new InsightStore(file, { now: () => Date.parse('2026-07-29T00:00:00Z') });
await store.init();

const project = {
  id: 'github:demo/openradar',
  platform: 'github',
  name: 'openradar',
  owner: 'demo',
  description: 'A self-hosted open-source project discovery dashboard.',
  url: 'https://github.com/demo/openradar',
  language: 'TypeScript',
  license: 'MIT',
  updatedAt: '2026-07-28T23:00:00Z',
  createdAt: '2026-07-01T00:00:00Z',
  category: '办公效率',
  topics: ['open-source', 'dashboard'],
  useTypes: ['direct', 'selfhost', 'codex'],
  stars: 100,
  forks: 12,
};

let tagsCalls = 0;
let readmeCalls = 0;
let chatCalls = 0;
const fetchImpl = async (url, options = {}) => {
  const target = String(url);
  if (target.endsWith('/api/tags')) {
    tagsCalls += 1;
    return new Response(JSON.stringify({ models: [{ name: 'qwen3:4b', size: 2500000000 }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (target.includes('api.github.com/repos/demo/openradar/readme')) {
    readmeCalls += 1;
    return new Response('# OpenRadar\nDiscover open-source projects. Install with Node.js. MIT licensed.', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  if (target.endsWith('/api/chat')) {
    chatCalls += 1;
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'qwen3:4b');
    assert.equal(body.stream, false);
    assert.equal(body.think, false);
    assert.equal(body.keep_alive, 0);
    assert.equal(body.options.temperature, 0);
    assert.equal(body.format.type, 'object');
    assert.match(body.messages[1].content, /Windows电脑/);
    assert.match(body.messages[1].content, /README节选/);
    return new Response(JSON.stringify({
      message: {
        role: 'assistant',
        content: JSON.stringify({
          summary: '这是一个帮你发现和收藏开源项目的自托管雷达。',
          whatItDoes: '聚合项目并帮助用户筛选。',
          bestFor: '个人开发者和小团队。',
          useMode: '先直接运行，也能交给Codex继续开发。',
          commercial: 'MIT通常允许商用，但仍需复核第三方依赖。',
          requirements: '需要Node.js；其他要求需核查。',
          codexValue: '可复用项目卡片、搜索和收藏结构。',
          fitForUser: '与用户的开源复用和Codex工作方式高度匹配。',
          risks: ['仍需核对依赖许可证。'],
          recommendation: '立即测试并收藏。',
          confidence: 'high',
        }),
      },
      done: true,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  throw new Error(`Unexpected URL: ${target}`);
};

const service = createInsightService({ store, fetchImpl, now: () => Date.parse('2026-07-29T00:00:00Z') });
const status = await service.status(true);
assert.equal(status.available, true);
assert.equal(status.modelInstalled, true);
assert.equal(status.model, 'qwen3:4b');

const generated = await service.generate(project);
assert.equal(generated.source, 'ollama');
assert.equal(generated.readmeUsed, true);
assert.equal(generated.summary, '这是一个帮你发现和收藏开源项目的自托管雷达。');
assert.equal(generated.fingerprint, projectFingerprint(project));
assert.equal(chatCalls, 1);
assert.equal(readmeCalls, 1);

const cached = await service.generate(project);
assert.equal(cached.cached, true);
assert.equal(chatCalls, 1);
assert.equal(readmeCalls, 1);

const forced = await service.generate(project, { force: true });
assert.equal(forced.source, 'ollama');
assert.equal(chatCalls, 2);
assert.equal(readmeCalls, 2);

const stored = await store.getMany([project.id, 'missing']);
assert.equal(Object.keys(stored).length, 1);
assert.equal(stored[project.id].summary, generated.summary);
const storeStatus = await store.status();
assert.equal(storeStatus.insightCount, 1);
assert.match(await readFile(file, 'utf8'), /这是一个帮你发现和收藏开源项目/);

const offlineStore = new InsightStore(join(root, 'offline.json'));
const offlineService = createInsightService({
  store: offlineStore,
  fetchImpl: async () => { throw new Error('connection refused'); },
});
const offline = await offlineService.generate(project);
assert.equal(offline.source, 'rule-fallback');
assert.match(offline.warning, /无法连接本地Ollama/);
assert.match(offline.summary, /openradar/);

const rule = ruleBasedInsight(project);
assert.equal(rule.source, 'rule-fallback');
assert.match(rule.commercial, /MIT/);
assert.ok(rule.risks.length >= 1);

assert.ok(tagsCalls >= 2);
await rm(root, { recursive: true, force: true });
console.log(JSON.stringify({ status: status.message, chatCalls, readmeCalls, cached: cached.cached, offline: offline.source }, null, 2));
