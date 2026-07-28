import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGiteeSearchService, createOpenRadarServer, parseGiteeSearchHtml } from '../server.mjs';
import { HistoryStore } from '../history-store.mjs';

const fixture = `<!doctype html><html><body>
<article class="repo-card">
  <h4><a href="https://gitee.com/dromara/sa-token">dromara/Sa-Token</a></h4>
  <p class="repo-desc">一站式 Java 权限认证框架</p>
  <div>Language: Java · Star 49173 · Fork 4487 · Last updated: 2026-07-04</div>
</article>
<article class="repo-card">
  <h4><a href="/armink/FlashDB">Armink/FlashDB</a></h4>
  <p class="repo-desc">超轻量级 KV 与时序数据库</p>
  <div>编程语言: C · 收藏 1230 · Fork 457 · 最近更新: 2026-03-23</div>
</article>
</body></html>`;

const parsed = parseGiteeSearchHtml(fixture, 10);
assert.equal(parsed.length, 2);
assert.equal(parsed[0].full_name, 'dromara/sa-token');
assert.equal(parsed[0].stargazers_count, 49173);
assert.equal(parsed[0].forks_count, 4487);
assert.equal(parsed[1].full_name, 'armink/FlashDB');

let fallbackCalls = 0;
const fallbackService = createGiteeSearchService({
  fetchImpl: async (url) => {
    fallbackCalls += 1;
    if (String(url).includes('/api/v5/search/repositories')) {
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(fixture, { status: 200, headers: { 'Content-Type': 'text/html' } });
  },
  now: () => 1000,
});
const fallback = await fallbackService('权限认证', 10);
assert.equal(fallback.source, 'gitee-official-search');
assert.equal(fallback.projects.length, 2);
assert.match(fallback.warning, /v5 API返回空结果/);
const cached = await fallbackService('权限认证', 10);
assert.equal(cached.cached, true);
assert.equal(fallbackCalls, 2);


const exploreService = createGiteeSearchService({
  fetchImpl: async (url) => {
    if (String(url).includes('/api/v5/search/repositories')) {
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(url).includes('so.gitee.com')) {
      return new Response('<html><body><div id="app"></div></body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    }
    return new Response(fixture, { status: 200, headers: { 'Content-Type': 'text/html' } });
  },
});
const explore = await exploreService('开源', 10, { allowExplore: true });
assert.equal(explore.source, 'gitee-explore');
assert.equal(explore.projects.length, 2);
assert.match(explore.warning, /探索页/);

const stopLossService = createGiteeSearchService({
  fetchImpl: async () => new Response('<html><body><div id="app"></div></body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
});
const stopLoss = await stopLossService('vue', 10, { allowExplore: true });
assert.equal(stopLoss.source, 'gitee-external-search');
assert.equal(stopLoss.degraded, true);
assert.equal(stopLoss.projects.length, 0);
assert.match(stopLoss.warning, /已触发止损/);
assert.match(stopLoss.externalUrl, /so\.gitee\.com/);

const apiService = createGiteeSearchService({
  fetchImpl: async () => new Response(JSON.stringify([{
    full_name: 'demo/radar',
    name: 'radar',
    owner: { login: 'demo' },
    html_url: 'https://gitee.com/demo/radar',
    description: 'Open-source radar',
    stargazers_count: 88,
    forks_count: 9,
  }]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
});
const api = await apiService('radar', 5);
assert.equal(api.source, 'gitee-v5-api');
assert.equal(api.projects[0].full_name, 'demo/radar');

const historyRoot = await mkdtemp(join(tmpdir(), 'openradar-server-history-'));
const historyStore = new HistoryStore(join(historyRoot, 'history.json'));
await historyStore.init();
const historyCollector = {
  getState: () => ({ running: false, lastProjectCount: 0 }),
  collect: async () => ({ running: false, lastProjectCount: 0, lastAddedSamples: 0 }),
};

const insightService = {
  status: async () => ({ enabled: true, available: true, model: 'qwen3:4b', store: { insightCount: 1 } }),
  getMany: async (ids) => Object.fromEntries(ids.map((id) => [id, { projectId: id, source: 'ollama', summary: '缓存中文解读' }])),
  generate: async (project, options) => ({ projectId: project.id, source: 'ollama', summary: '新生成中文解读', force: Boolean(options.force) }),
};

const server = createOpenRadarServer({
  historyStore,
  historyCollector,
  insightService,
  giteeSearch: async (query, limit) => ({
    projects: [{ full_name: 'mock/project', name: 'project', owner: { login: 'mock' }, html_url: 'https://gitee.com/mock/project' }],
    source: 'mock',
    query,
    limit: Number(limit),
  }),
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
const health = await fetch(`${base}/api/health`).then((response) => response.json());
assert.equal(health.giteeProxy, true);
assert.equal(health.history, true);
assert.equal(health.insights, true);
assert.equal(health.version, '0.3-B');
const proxied = await fetch(`${base}/api/gitee/search?q=AI&limit=3`).then((response) => response.json());
assert.equal(proxied.projects.length, 1);
assert.equal(proxied.query, 'AI');


const insightStatus = await fetch(`${base}/api/insights/status`).then((response) => response.json());
assert.equal(insightStatus.available, true);
assert.equal(insightStatus.model, 'qwen3:4b');
const cachedInsights = await fetch(`${base}/api/insights?ids=${encodeURIComponent('github:mock/project')}`).then((response) => response.json());
assert.equal(cachedInsights.insights['github:mock/project'].summary, '缓存中文解读');
const generatedInsight = await fetch(`${base}/api/insights/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project: { id: 'github:mock/project', platform: 'github', name: 'project' }, force: true }),
}).then((response) => response.json());
assert.equal(generatedInsight.summary, '新生成中文解读');
assert.equal(generatedInsight.force, true);

const captured = await fetch(`${base}/api/history/capture`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ projects: [{ id: 'github:mock/project', platform: 'github', name: 'project', owner: 'mock', url: 'https://github.com/mock/project', stars: 12, forks: 2 }] }),
}).then((response) => response.json());
assert.equal(captured.added, 1);
const historyStatus = await fetch(`${base}/api/history/status`).then((response) => response.json());
assert.equal(historyStatus.projectCount, 1);
const historyGrowth = await fetch(`${base}/api/history/growth?ids=${encodeURIComponent('github:mock/project')}`).then((response) => response.json());
assert.equal(historyGrowth.projects['github:mock/project'].sampleCount, 1);
const manualCollect = await fetch(`${base}/api/history/collect`, { method: 'POST' }).then((response) => response.json());
assert.equal(manualCollect.lastProjectCount, 0);

const index = await fetch(`${base}/index.html`);
assert.equal(index.status, 200);
assert.match(index.headers.get('content-type'), /text\/html/);
server.close();
await once(server, 'close');
await rm(historyRoot, { recursive: true, force: true });

console.log(JSON.stringify({ parsed: parsed.length, fallbackSource: fallback.source, exploreSource: explore.source, stopLossSource: stopLoss.source, health, proxied: proxied.projects.length, historyProjects: historyStatus.projectCount, insightModel: insightStatus.model }, null, 2));
