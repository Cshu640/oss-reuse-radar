import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HistoryStore } from './history-store.mjs';
import { InsightStore } from './insight-store.mjs';
import { createInsightService } from './insight-service.mjs';
import { platformIds, radarPlatform } from './platform-adapters.js';

const ROOT_DIR = fileURLToPath(new URL('.', import.meta.url));
const DEFAULT_PORT = Number(process.env.PORT || 8080);
const REQUEST_TIMEOUT = 12_000;
const CACHE_TTL = 15 * 60 * 1000;
const HISTORY_INTERVAL = 6 * 60 * 60 * 1000;
const HISTORY_PLATFORMS = platformIds.filter((platformId) => platformId !== 'gitee');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function number(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/,/g, '');
    const match = normalized.match(/^([\d.]+)\s*([kKmM万]?)$/);
    if (match) {
      const multiplier = { k: 1_000, K: 1_000, m: 1_000_000, M: 1_000_000, 万: 10_000 }[match[2]] || 1;
      return Math.round(Number(match[1]) * multiplier) || 0;
    }
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decodeEntities(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function textContent(value = '') {
  return decodeEntities(String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function isRepositoryPath(value = '') {
  const path = String(value).replace(/^\/+|\/+$/g, '');
  const parts = path.split('/');
  if (parts.length !== 2 || parts.some((part) => !part)) return false;
  const blocked = new Set(['help', 'search', 'explore', 'login', 'signup', 'organizations', 'enterprises', 'api', 'oauth', 'events', 'all-about-git']);
  return !blocked.has(parts[0].toLowerCase()) && !blocked.has(parts[1].toLowerCase());
}

function repositoryFromObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const fullName = value.full_name || value.path_with_namespace || value.repo_path || value.repository_path
    || (value.namespace?.path && value.path ? `${value.namespace.path}/${value.path}` : '')
    || (value.owner?.login && (value.path || value.name) ? `${value.owner.login}/${value.path || value.name}` : '');
  if (!isRepositoryPath(fullName)) return null;
  const [owner, name] = fullName.split('/');
  return {
    full_name: fullName,
    name: value.name || name,
    path: value.path || name,
    owner: { login: value.owner?.login || value.namespace?.path || owner, avatar_url: value.owner?.avatar_url || value.avatar_url || '' },
    description: value.description || value.summary || '',
    html_url: value.html_url || value.web_url || `https://gitee.com/${fullName}`,
    stargazers_count: number(value.stargazers_count ?? value.stars_count ?? value.watches_count ?? value.star_count),
    forks_count: number(value.forks_count ?? value.fork_count),
    language: value.language || value.primary_language || '',
    license: value.license || value.license_name || null,
    pushed_at: value.pushed_at || value.last_push_at || value.updated_at || '',
    updated_at: value.updated_at || value.last_activity_at || value.last_push_at || '',
    created_at: value.created_at || '',
    topics: Array.isArray(value.topics) ? value.topics : [],
  };
}

function collectRepositoryObjects(value, output, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  const project = repositoryFromObject(value);
  if (project) output.push(project);
  if (Array.isArray(value)) {
    value.forEach((item) => collectRepositoryObjects(item, output, seen));
    return;
  }
  Object.values(value).forEach((item) => collectRepositoryObjects(item, output, seen));
}

function parseEmbeddedJson(html) {
  const projects = [];
  const scripts = [...html.matchAll(/<script\b[^>]*(?:type=["']application\/json["']|id=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      collectRepositoryObjects(JSON.parse(decodeEntities(match[1])), projects);
    } catch {
      // Search pages can contain non-JSON script content; regex fallback handles it.
    }
  }
  return projects;
}

function nearbyMetric(context, names) {
  const nameGroup = names.join('|');
  const patterns = [
    new RegExp(`(?:${nameGroup})[^0-9]{0,100}([\\d,.]+(?:[kKmM万])?)`, 'i'),
    new RegExp(`([\\d,.]+(?:[kKmM万])?)[^0-9]{0,80}(?:${nameGroup})`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = context.match(pattern);
    if (match) return number(match[1]);
  }
  return 0;
}

function parseRepositoryAnchors(html) {
  const projects = [];
  const seen = new Set();
  const anchorPattern = /<a\b[^>]*href=["'](?:https?:\/\/(?:www\.)?gitee\.com)?\/([^"'?#]+\/[^"'?#/]+)(?:[?#][^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const fullName = decodeEntities(match[1]).replace(/^\/+|\/+$/g, '');
    if (!isRepositoryPath(fullName) || seen.has(fullName.toLowerCase())) continue;
    const label = textContent(match[2]);
    const [owner, name] = fullName.split('/');
    const start = Math.max(0, match.index - 350);
    const end = Math.min(html.length, (match.index || 0) + match[0].length + 1_500);
    const context = html.slice(start, end);
    const plain = textContent(context);
    const descriptionMatch = context.match(/<(?:p|div)\b[^>]*(?:description|project-desc|repo-desc)[^>]*>([\s\S]*?)<\/(?:p|div)>/i)
      || context.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    const languageMatch = plain.match(/(?:编程语言|Language)\s*[:：]?\s*([A-Za-z+#. -]{1,30})/i);
    const updatedMatch = plain.match(/(?:Last updated|最近更新)\s*[:：]?\s*([^|·]{3,30})/i);
    seen.add(fullName.toLowerCase());
    projects.push({
      full_name: fullName,
      name,
      path: name,
      owner: { login: owner, avatar_url: '' },
      description: descriptionMatch ? textContent(descriptionMatch[1]).slice(0, 500) : (label && label !== `${owner}/${name}` ? label : ''),
      html_url: `https://gitee.com/${fullName}`,
      stargazers_count: nearbyMetric(plain, ['Star', 'Stars', '收藏', 'Watch']),
      forks_count: nearbyMetric(plain, ['Fork', 'Forks']),
      language: languageMatch?.[1]?.trim() || '',
      license: null,
      pushed_at: updatedMatch?.[1]?.trim() || '',
      updated_at: updatedMatch?.[1]?.trim() || '',
      created_at: '',
      topics: [],
    });
  }
  return projects;
}

export function parseGiteeSearchHtml(html, limit = 20) {
  const combined = [...parseEmbeddedJson(html), ...parseRepositoryAnchors(html)];
  const deduped = new Map();
  for (const project of combined) {
    const normalized = repositoryFromObject(project);
    if (!normalized) continue;
    const key = normalized.full_name.toLowerCase();
    const existing = deduped.get(key);
    if (!existing || (normalized.description && !existing.description)) deduped.set(key, { ...existing, ...normalized });
  }
  return [...deduped.values()].slice(0, limit);
}

async function fetchWithTimeout(fetchImpl, url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    return await fetchImpl(url, { redirect: 'follow', ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function createGiteeSearchService({ fetchImpl = fetch, now = () => Date.now() } = {}) {
  const cache = new Map();
  const headers = {
    Accept: 'application/json, text/html;q=0.9',
    'User-Agent': 'OpenRadar/0.2-B.1 (+local personal open-source radar)',
  };

  return async function searchGitee(query, limit = 20, options = {}) {
    const safeQuery = String(query || '').trim().slice(0, 200);
    const safeLimit = Math.min(30, Math.max(1, Number(limit) || 20));
    const allowExplore = Boolean(options.allowExplore);
    if (!safeQuery) throw new Error('缺少Gitee搜索关键词');
    const cacheKey = `${allowExplore ? 'radar' : 'search'}\u0000${safeQuery}\u0000${safeLimit}`;
    const cached = cache.get(cacheKey);
    if (cached && now() - cached.savedAt < CACHE_TTL) return { ...cached.value, cached: true };

    const warnings = [];
    const diagnostics = { v5: 'not-run', officialSearch: 'not-run', explore: 'not-run' };
    const apiUrl = `https://gitee.com/api/v5/search/repositories?q=${encodeURIComponent(safeQuery)}&sort=stars_count&order=desc&per_page=${safeLimit}`;
    try {
      const response = await fetchWithTimeout(fetchImpl, apiUrl, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const projects = Array.isArray(data) ? data.map(repositoryFromObject).filter(Boolean) : [];
      diagnostics.v5 = `http-${response.status}:count-${projects.length}`;
      if (projects.length) {
        const value = { projects: projects.slice(0, safeLimit), source: 'gitee-v5-api', warning: '' };
        cache.set(cacheKey, { savedAt: now(), value });
        return value;
      }
      warnings.push('Gitee v5 API返回空结果');
    } catch (error) {
      diagnostics.v5 = `error:${error?.message || error}`;
      warnings.push(`Gitee v5 API失败：${error?.message || error}`);
    }

    const webUrl = `https://so.gitee.com/?q=${encodeURIComponent(safeQuery)}&type=repository&sort=watches_count`;
    try {
      const response = await fetchWithTimeout(fetchImpl, webUrl, { headers: { ...headers, Accept: 'text/html' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const projects = parseGiteeSearchHtml(await response.text(), safeLimit);
      diagnostics.officialSearch = `http-${response.status}:count-${projects.length}`;
      if (projects.length) {
        const value = {
          projects,
          source: 'gitee-official-search',
          warning: warnings.join('；'),
          diagnostics,
        };
        cache.set(cacheKey, { savedAt: now(), value });
        return value;
      }
      warnings.push('Gitee官方搜索动态页未返回可解析仓库');
    } catch (error) {
      diagnostics.officialSearch = `error:${error?.message || error}`;
      warnings.push(`Gitee官方搜索回退失败：${error?.message || error}`);
    }

    if (allowExplore) {
      const exploreUrl = 'https://gitee.com/explore/all?sort=starred';
      try {
        const response = await fetchWithTimeout(fetchImpl, exploreUrl, { headers: { ...headers, Accept: 'text/html' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const projects = parseGiteeSearchHtml(await response.text(), safeLimit);
        diagnostics.explore = `http-${response.status}:count-${projects.length}`;
        if (projects.length) {
          const value = {
            projects,
            source: 'gitee-explore',
            warning: [...warnings, '关键词搜索不可用，首页改用Gitee公开探索页'].join('；'),
            diagnostics,
          };
          cache.set(cacheKey, { savedAt: now(), value });
          return value;
        }
        warnings.push('Gitee公开探索页未返回可解析仓库');
      } catch (error) {
        diagnostics.explore = `error:${error?.message || error}`;
        warnings.push(`Gitee公开探索页失败：${error?.message || error}`);
      }
    }

    const value = {
      projects: [],
      source: 'gitee-external-search',
      warning: [...warnings, '已触发止损：Gitee降级为外部搜索入口，不参与实时榜单与增长统计'].join('；'),
      degraded: true,
      externalUrl: webUrl,
      diagnostics,
    };
    cache.set(cacheKey, { savedAt: now(), value });
    return value;
  };
}

async function readJsonBody(req, maxBytes = 2_000_000) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createHistoryCollector({
  historyStore,
  radarPlatformImpl = radarPlatform,
  platforms = HISTORY_PLATFORMS,
  now = () => Date.now(),
} = {}) {
  const state = {
    running: false,
    lastStartedAt: '',
    lastCompletedAt: '',
    lastReason: '',
    lastProjectCount: 0,
    lastAddedSamples: 0,
    platformResults: {},
    error: '',
  };

  return {
    getState() {
      return { ...state, platformResults: { ...state.platformResults } };
    },
    async collect(reason = 'manual') {
      if (!historyStore) throw new Error('History store is not configured');
      if (state.running) return this.getState();
      state.running = true;
      state.lastStartedAt = new Date(now()).toISOString();
      state.lastReason = String(reason).slice(0, 80);
      state.error = '';
      state.platformResults = Object.fromEntries(platforms.map((platformId) => [platformId, { state: 'loading', count: 0 }]));
      try {
        const responses = await Promise.allSettled(platforms.map((platformId) => radarPlatformImpl(platformId)));
        const projects = [];
        responses.forEach((response, index) => {
          const platformId = platforms[index];
          if (response.status === 'fulfilled') {
            const values = Array.isArray(response.value) ? response.value : [];
            projects.push(...values);
            state.platformResults[platformId] = { state: values.length ? 'live' : 'empty', count: values.length };
          } else {
            state.platformResults[platformId] = { state: 'error', count: 0, message: response.reason?.message || String(response.reason) };
          }
        });
        const deduped = [...new Map(projects.filter((project) => project?.id).map((project) => [project.id, project])).values()];
        const result = deduped.length
          ? await historyStore.capture(deduped, { source: `server-${state.lastReason}` })
          : { added: 0, received: 0 };
        state.lastProjectCount = deduped.length;
        state.lastAddedSamples = result.added || 0;
        state.lastCompletedAt = new Date(now()).toISOString();
      } catch (error) {
        state.error = error?.message || String(error);
        state.lastCompletedAt = new Date(now()).toISOString();
      } finally {
        state.running = false;
      }
      return this.getState();
    },
  };
}

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

async function serveStatic(req, res, rootDir) {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === '/') pathname = '/index.html';
  const target = resolve(rootDir, `.${pathname}`);
  const safeRoot = resolve(rootDir) + sep;
  if (target !== resolve(rootDir, 'index.html') && !target.startsWith(safeRoot)) {
    json(res, 403, { error: 'Forbidden' });
    return;
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error('Not a file');
    const content = await readFile(target);
    const extension = extname(target).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': extension === '.html' || extension === '.js' || extension === '.css' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      ...(pathname === '/sw.js' ? { 'Service-Worker-Allowed': '/' } : {}),
    });
    res.end(content);
  } catch {
    json(res, 404, { error: 'Not found' });
  }
}

export function createOpenRadarServer({ rootDir = ROOT_DIR, giteeSearch = createGiteeSearchService(), historyStore = null, historyCollector = null, insightService = null } = {}) {
  return createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      if (req.method === 'GET' && requestUrl.pathname === '/api/health') {
        json(res, 200, { status: 'ok', version: '0.3-B', giteeProxy: true, giteeMode: 'bounded-fallback', history: Boolean(historyStore), historyCollector: historyCollector?.getState?.() || null, insights: Boolean(insightService) });
        return;
      }
      if (req.method === 'GET' && requestUrl.pathname === '/api/history/status') {
        if (!historyStore) {
          json(res, 503, { enabled: false, error: 'History store is not configured' });
          return;
        }
        json(res, 200, { ...(await historyStore.status()), collector: historyCollector?.getState?.() || null });
        return;
      }
      if (req.method === 'GET' && requestUrl.pathname === '/api/history/growth') {
        if (!historyStore) {
          json(res, 503, { error: 'History store is not configured' });
          return;
        }
        const ids = (requestUrl.searchParams.get('ids') || '').split(',').map((value) => value.trim()).filter(Boolean);
        json(res, 200, await historyStore.growth(ids));
        return;
      }
      if (req.method === 'POST' && requestUrl.pathname === '/api/history/capture') {
        if (!historyStore) {
          json(res, 503, { error: 'History store is not configured' });
          return;
        }
        try {
          const body = await readJsonBody(req);
          json(res, 200, await historyStore.capture(body.projects, { source: body.source || 'browser-radar' }));
        } catch (error) {
          json(res, 400, { error: error?.message || 'Invalid history capture body' });
        }
        return;
      }
      if (req.method === 'POST' && requestUrl.pathname === '/api/history/collect') {
        if (!historyCollector) {
          json(res, 503, { error: 'History collector is not configured' });
          return;
        }
        json(res, 200, await historyCollector.collect('manual'));
        return;
      }
      if (req.method === 'GET' && requestUrl.pathname === '/api/insights/status') {
        if (!insightService) {
          json(res, 503, { enabled: false, error: 'Insight service is not configured' });
          return;
        }
        json(res, 200, await insightService.status(requestUrl.searchParams.get('refresh') === '1'));
        return;
      }
      if (req.method === 'GET' && requestUrl.pathname === '/api/insights') {
        if (!insightService) {
          json(res, 503, { error: 'Insight service is not configured' });
          return;
        }
        const ids = (requestUrl.searchParams.get('ids') || '').split(',').map((value) => value.trim()).filter(Boolean).slice(0, 250);
        json(res, 200, { insights: await insightService.getMany(ids) });
        return;
      }
      if (req.method === 'POST' && requestUrl.pathname === '/api/insights/generate') {
        if (!insightService) {
          json(res, 503, { error: 'Insight service is not configured' });
          return;
        }
        try {
          const body = await readJsonBody(req, 500_000);
          const insight = await insightService.generate(body.project, { force: Boolean(body.force) });
          console.log(`[Insights] project=${JSON.stringify(body.project?.id || '')} source=${insight.source} cached=${Boolean(insight.cached)}`);
          json(res, 200, insight);
        } catch (error) {
          json(res, 502, { error: error?.message || 'Local insight generation failed' });
        }
        return;
      }
      if (req.method === 'GET' && requestUrl.pathname === '/api/gitee/search') {
        const query = requestUrl.searchParams.get('q') || '';
        const limit = requestUrl.searchParams.get('limit') || 20;
        const allowExplore = requestUrl.searchParams.get('mode') === 'radar';
        try {
          const result = await giteeSearch(query, limit, { allowExplore });
          console.log(`[Gitee] q=${JSON.stringify(query)} source=${result.source} count=${result.projects?.length || 0} ${JSON.stringify(result.diagnostics || {})}`);
          json(res, 200, result);
        } catch (error) {
          json(res, 502, { error: error?.message || 'Gitee compatibility channel failed' });
        }
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        json(res, 405, { error: 'Method not allowed' });
        return;
      }
      await serveStatic(req, res, rootDir);
    } catch (error) {
      json(res, 500, { error: error?.message || 'Internal server error' });
    }
  });
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath && pathToFileURL(entryPath).href === import.meta.url) {
  const startOpenRadar = async () => {
    const historyStore = new HistoryStore(resolve(ROOT_DIR, 'data/history.json'));
    await historyStore.init();
    const historyCollector = createHistoryCollector({ historyStore });
    const insightStore = new InsightStore(resolve(ROOT_DIR, 'data/insights.json'));
    await insightStore.init();
    const insightService = createInsightService({ store: insightStore });
    const server = createOpenRadarServer({ historyStore, historyCollector, insightService });
    server.on('error', (error) => {
      console.error('');
      if (error?.code === 'EADDRINUSE') {
        console.error(`  无法启动：端口 ${DEFAULT_PORT} 已被占用。`);
        console.error('  请先关闭旧的OpenRadar终端，或在旧终端按 Ctrl + C，再重新运行。');
      } else {
        console.error(`  OpenRadar启动失败：${error?.message || error}`);
      }
      console.error('');
      process.exitCode = 1;
    });
    server.listen(DEFAULT_PORT, '127.0.0.1', () => {
      console.log('');
      console.log('  OpenRadar Phase 0.3-B');
      console.log(`  Local: http://localhost:${DEFAULT_PORT}`);
      console.log('  Gitee: 有止损兼容通道（v5 → 官方搜索 → 首页探索 → 外部搜索）');
      console.log('  History: 本地快照已启用（启动即采集，之后每6小时采集五个平台）');
      console.log('  Insights: 本地Ollama中文解读已启用（默认模型 qwen3:4b，按需生成并缓存）');
      console.log('  按 Ctrl + C 停止服务器。');
      console.log('');
      if (process.env.OPENRADAR_AUTO_COLLECT !== '0') {
        historyCollector.collect('startup').then((result) => {
          console.log(`[History] startup projects=${result.lastProjectCount} added=${result.lastAddedSamples}`);
        }).catch((error) => console.error(`[History] startup failed: ${error?.message || error}`));
        const timer = setInterval(() => {
          historyCollector.collect('scheduled').then((result) => {
            console.log(`[History] scheduled projects=${result.lastProjectCount} added=${result.lastAddedSamples}`);
          }).catch((error) => console.error(`[History] scheduled failed: ${error?.message || error}`));
        }, HISTORY_INTERVAL);
        timer.unref();
      } else {
        console.log('  History: 自动采集已通过 OPENRADAR_AUTO_COLLECT=0 暂停。');
      }
    });
  };
  startOpenRadar().catch((error) => {
    console.error(`OpenRadar启动失败：${error?.message || error}`);
    process.exitCode = 1;
  });
}
