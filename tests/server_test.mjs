import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createGiteeSearchService, createOpenRadarServer, parseGiteeSearchHtml } from '../server.mjs';

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

const server = createOpenRadarServer({
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
const proxied = await fetch(`${base}/api/gitee/search?q=AI&limit=3`).then((response) => response.json());
assert.equal(proxied.projects.length, 1);
assert.equal(proxied.query, 'AI');
const index = await fetch(`${base}/index.html`);
assert.equal(index.status, 200);
assert.match(index.headers.get('content-type'), /text\/html/);
server.close();
await once(server, 'close');

console.log(JSON.stringify({ parsed: parsed.length, fallbackSource: fallback.source, health, proxied: proxied.projects.length }, null, 2));
