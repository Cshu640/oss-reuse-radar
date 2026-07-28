import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('.', import.meta.url));
const DEFAULT_PORT = Number(process.env.PORT || 8080);
const REQUEST_TIMEOUT = 12_000;
const CACHE_TTL = 15 * 60 * 1000;

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

  return async function searchGitee(query, limit = 20) {
    const safeQuery = String(query || '').trim().slice(0, 200);
    const safeLimit = Math.min(30, Math.max(1, Number(limit) || 20));
    if (!safeQuery) throw new Error('缺少Gitee搜索关键词');
    const cacheKey = `${safeQuery}\u0000${safeLimit}`;
    const cached = cache.get(cacheKey);
    if (cached && now() - cached.savedAt < CACHE_TTL) return { ...cached.value, cached: true };

    const warnings = [];
    const apiUrl = `https://gitee.com/api/v5/search/repositories?q=${encodeURIComponent(safeQuery)}&sort=stars_count&order=desc&per_page=${safeLimit}`;
    try {
      const response = await fetchWithTimeout(fetchImpl, apiUrl, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const projects = Array.isArray(data) ? data.map(repositoryFromObject).filter(Boolean) : [];
      if (projects.length) {
        const value = { projects: projects.slice(0, safeLimit), source: 'gitee-v5-api', warning: '' };
        cache.set(cacheKey, { savedAt: now(), value });
        return value;
      }
      warnings.push('Gitee v5 API返回空结果');
    } catch (error) {
      warnings.push(`Gitee v5 API失败：${error?.message || error}`);
    }

    const webUrl = `https://so.gitee.com/?q=${encodeURIComponent(safeQuery)}&type=repository&sort=watches_count`;
    try {
      const response = await fetchWithTimeout(fetchImpl, webUrl, { headers: { ...headers, Accept: 'text/html' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const projects = parseGiteeSearchHtml(await response.text(), safeLimit);
      const value = {
        projects,
        source: 'gitee-official-search',
        warning: warnings.join('；'),
      };
      cache.set(cacheKey, { savedAt: now(), value });
      return value;
    } catch (error) {
      warnings.push(`Gitee官方搜索回退失败：${error?.message || error}`);
      throw new Error(warnings.join('；'));
    }
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

export function createOpenRadarServer({ rootDir = ROOT_DIR, giteeSearch = createGiteeSearchService() } = {}) {
  return createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      if (req.method === 'GET' && requestUrl.pathname === '/api/health') {
        json(res, 200, { status: 'ok', version: '0.2-B.1', giteeProxy: true });
        return;
      }
      if (req.method === 'GET' && requestUrl.pathname === '/api/gitee/search') {
        const query = requestUrl.searchParams.get('q') || '';
        const limit = requestUrl.searchParams.get('limit') || 20;
        try {
          json(res, 200, await giteeSearch(query, limit));
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
  const server = createOpenRadarServer();
  server.listen(DEFAULT_PORT, '127.0.0.1', () => {
    console.log('');
    console.log('  OpenRadar Phase 0.2-B.1');
    console.log(`  Local: http://localhost:${DEFAULT_PORT}`);
    console.log('  Gitee: 同源兼容通道已启用（官方API优先，官方搜索回退）');
    console.log('  按 Ctrl + C 停止服务器。');
    console.log('');
  });
}
