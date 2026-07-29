import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGiteeSearchService, createOpenRadarServer, parseGiteeSearchHtml } from '../server.mjs';
import { HistoryStore } from '../history-store.mjs';
import { createCodexExportService } from '../codex-export-service.mjs';
import { IdentityStore } from '../identity-store.mjs';
import { createBackupService } from '../backup-service.mjs';

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

const codexExportService = createCodexExportService({
  rootDir: historyRoot,
  now: () => new Date('2026-07-29T03:04:05.000Z'),
});
const identityStore = new IdentityStore(join(historyRoot, 'identity.json'), { now: () => Date.parse('2026-07-29T03:04:05Z') });
await identityStore.init();
const trustService = {
  status: async () => ({ enabled: true, providers: ['OpenSSF Scorecard', 'deps.dev', 'OSV'] }),
  getMany: async (ids) => Object.fromEntries(ids.map((id) => [id, { projectId: id, assessment: { level: 'medium', score: 62 } }])),
  analyze: async (project, options) => ({ projectId: project.entityId || project.id, assessment: { level: 'medium', score: 62 }, facts: { osv: { vulnerabilityCount: 0 } }, force: Boolean(options.force) }),
};
const backupService = createBackupService({ rootDir: historyRoot, now: () => Date.parse('2026-07-29T03:04:05Z') });
const packageService = {
  status: () => ({ enabled: true, ecosystems: ['npm', 'pypi', 'crates'], cacheEntries: 0 }),
  search: async (ecosystem, query, limit) => ({ ecosystem, query, limit: Number(limit), projects: [{ id: `${ecosystem}:demo-tool`, platform: ecosystem, packageSystem: ecosystem, packageName: 'demo-tool', name: 'demo-tool', owner: 'demo', url: `https://example.test/${ecosystem}/demo-tool`, license: 'MIT', downloads: 1234 }] }),
  radar: async (ecosystem, limit) => ({ ecosystem, limit: Number(limit), projects: [{ id: `${ecosystem}:radar-tool`, platform: ecosystem, packageSystem: ecosystem, packageName: 'radar-tool', name: 'radar-tool', owner: 'demo', url: `https://example.test/${ecosystem}/radar-tool`, license: 'MIT', downloads: 5678 }] }),
};

const server = createOpenRadarServer({
  historyStore,
  historyCollector,
  insightService,
  codexExportService,
  identityStore,
  trustService,
  backupService,
  packageService,
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
assert.equal(health.codexExport, true);
assert.equal(health.version, '0.4-B');
assert.equal(health.identityCorrections, true);
assert.equal(health.trust, true);
assert.equal(health.backup, true);
assert.equal(health.packages, true);


const originalIdentity = await fetch(`${base}/api/identity/overrides`).then((response) => response.json());
assert.equal(originalIdentity.mergeGroups.length, 0);
const savedIdentity = await fetch(`${base}/api/identity/overrides`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mergeGroups: [{ id: 'm1', sourceIds: ['a', 'b'] }] }),
}).then((response) => response.json());
assert.equal(savedIdentity.mergeGroups.length, 1);
const trustStatus = await fetch(`${base}/api/trust/status`).then((response) => response.json());
assert.equal(trustStatus.enabled, true);
const trustReport = await fetch(`${base}/api/trust/analyze`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project: { id: 'github:mock/project', entityId: 'entity:mock', platform: 'github', owner: 'mock', name: 'project', url: 'https://github.com/mock/project' }, force: true }),
}).then((response) => response.json());
assert.equal(trustReport.assessment.score, 62);
const backup = await fetch(`${base}/api/backup/export`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clientState: { favorites: [{ id: 'github:mock/project' }] } }),
}).then((response) => response.json());
assert.equal(backup.format, 'openradar-backup');
const importedBackup = await fetch(`${base}/api/backup/import`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ backup }),
}).then((response) => response.json());
assert.equal(importedBackup.requiresRestart, true);

const codexStatus = await fetch(`${base}/api/codex/status`).then((response) => response.json());
assert.equal(codexStatus.enabled, true);
assert.equal(codexStatus.autoLaunch, false);
const codexExport = await fetch(`${base}/api/codex/export`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    project: {
      id: 'github:mock/project',
      entityId: 'entity:mock-project',
      aliases: ['github:mock/project', 'huggingface:mock/project'],
      platform: 'github',
      owner: 'mock',
      name: 'project',
      url: 'https://github.com/mock/project',
      sourceCount: 2,
      sourceProjects: [
        { id: 'github:mock/project', platform: 'github', owner: 'mock', name: 'project', url: 'https://github.com/mock/project', license: 'MIT' },
        { id: 'huggingface:mock/project', platform: 'huggingface', owner: 'mock', name: 'project', url: 'https://huggingface.co/mock/project', license: 'MIT' },
      ],
    },
    insight: { source: 'ollama', summary: '中文项目摘要', risks: ['需核查依赖'] },
  }),
}).then((response) => response.json());
assert.equal(codexExport.ok, true);
assert.equal(codexExport.autoLaunch, false);
assert.equal(codexExport.files.length, 2);
assert.match(codexExport.task, /只研究，不集成/);
assert.match(codexExport.folder, /^exports\/codex\//);

const packageStatus = await fetch(`${base}/api/packages/status`).then((response) => response.json());
assert.deepEqual(packageStatus.ecosystems, ['npm', 'pypi', 'crates']);
const packageSearch = await fetch(`${base}/api/packages/search?ecosystem=npm&q=npc%20memory&limit=5`).then((response) => response.json());
assert.equal(packageSearch.projects[0].downloads, 1234);
const packageRadar = await fetch(`${base}/api/packages/radar?ecosystem=crates&limit=6`).then((response) => response.json());
assert.equal(packageRadar.projects[0].platform, 'crates');

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

console.log(JSON.stringify({ parsed: parsed.length, fallbackSource: fallback.source, exploreSource: explore.source, stopLossSource: stopLoss.source, health, codexFolder: codexExport.folder, proxied: proxied.projects.length, historyProjects: historyStatus.projectCount, insightModel: insightStatus.model, packageEcosystems: packageStatus.ecosystems }, null, 2));
