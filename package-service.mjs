import { projectProviderForUrl } from './upstream-gateway.mjs';

const DEFAULT_TIMEOUT = 12_000;
const DEFAULT_CACHE_TTL = 15 * 60 * 1000;

const ECOSYSTEMS = {
  npm: {
    label: 'npm',
    registry: 'npmjs.org',
    language: 'JavaScript / TypeScript',
    packageUrl: (name) => `https://www.npmjs.com/package/${encodeURIComponent(name)}`,
  },
  pypi: {
    label: 'PyPI',
    registry: 'pypi.org',
    language: 'Python',
    packageUrl: (name) => `https://pypi.org/project/${encodeURIComponent(name)}/`,
  },
  crates: {
    label: 'crates.io',
    registry: 'crates.io',
    language: 'Rust',
    packageUrl: (name) => `https://crates.io/crates/${encodeURIComponent(name)}`,
  },
};

const RADAR_QUERIES = {
  npm: ['keywords:agent', 'keywords:productivity', 'keywords:game', 'keywords:ai'],
  pypi: ['agent', 'productivity', 'game', 'ai'],
  crates: ['agent', 'game', 'web', 'ai'],
};

function text(value, max = 4_000) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function array(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeRepositoryUrl(value = '') {
  let raw = text(typeof value === 'object' ? (value.url || value.web || '') : value, 2_000);
  raw = raw.replace(/^git\+/, '').replace(/^git:\/\//, 'https://').replace(/^ssh:\/\/git@/, 'https://').replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/i, '');
  try {
    const url = new URL(raw);
    if (!['github.com', 'gitlab.com', 'codeberg.org', 'gitee.com'].includes(url.hostname.toLowerCase().replace(/^www\./, ''))) return '';
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return '';
    return `${url.protocol}//${url.host}/${parts.slice(0, 2).join('/')}`;
  } catch {
    return '';
  }
}

function ownerFromRepository(repositoryUrl = '', fallback = '') {
  try {
    const parts = new URL(repositoryUrl).pathname.split('/').filter(Boolean);
    return text(parts[0] || fallback, 200);
  } catch {
    return text(fallback, 200);
  }
}

function licenseName(value) {
  if (!value) return '许可证待核查';
  if (typeof value === 'string') return text(value, 200) || '许可证待核查';
  return text(value.type || value.name || value.spdx_id || value.id, 200) || '许可证待核查';
}

async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = DEFAULT_TIMEOUT) {
  if (fetchImpl?.__openradarGateway) return fetchImpl(url, options, timeoutMs);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      redirect: 'follow',
      ...options,
      headers: {
        Accept: 'application/json, text/html;q=0.8, application/xml;q=0.7',
        'User-Agent': 'OpenRadar/0.4-B (local zero-paid-api package radar)',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(fetchImpl, url, options = {}, timeoutMs) {
  const response = await fetchWithTimeout(fetchImpl, url, { ...options, __openradarParse: 'json' }, timeoutMs);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchText(fetchImpl, url, options = {}, timeoutMs) {
  const response = await fetchWithTimeout(fetchImpl, url, { ...options, __openradarParse: 'text' }, timeoutMs);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function packageProject(ecosystem, value = {}) {
  const config = ECOSYSTEMS[ecosystem];
  const name = text(value.name || value.packageName, 300);
  if (!config || !name) return null;
  const repositoryUrl = normalizeRepositoryUrl(value.repositoryUrl || value.repository || value.sourceUrl);
  return {
    id: `${ecosystem}:${name}`,
    platform: ecosystem,
    packageSystem: ecosystem,
    packageName: name,
    name,
    owner: ownerFromRepository(repositoryUrl, value.owner || value.publisher || value.author || config.label),
    description: text(value.description || value.summary, 2_000),
    url: text(value.url, 2_000) || config.packageUrl(name),
    homepage: text(value.homepage, 2_000),
    repositoryUrl,
    sourceUrl: repositoryUrl,
    avatar: text(value.avatar, 2_000),
    downloads: number(value.downloads),
    recentDownloads: number(value.recentDownloads || value.recent_downloads),
    dependentPackages: number(value.dependentPackages || value.dependent_packages_count),
    dependentRepositories: number(value.dependentRepositories || value.dependent_repositories_count),
    maintainers: number(value.maintainers),
    qualityScore: number(value.qualityScore),
    popularityScore: number(value.popularityScore),
    version: text(value.version || value.latestVersion, 160),
    language: text(value.language, 160) || config.language,
    license: licenseName(value.license),
    updatedAt: text(value.updatedAt || value.latestReleaseAt || value.date, 160),
    createdAt: text(value.createdAt || value.firstReleaseAt, 160),
    topics: unique(array(value.topics || value.keywords).map((item) => text(item, 100))).slice(0, 30),
    packageFacts: {
      ecosystem,
      version: text(value.version || value.latestVersion, 160),
      downloads: number(value.downloads),
      recentDownloads: number(value.recentDownloads || value.recent_downloads),
      dependentPackages: number(value.dependentPackages || value.dependent_packages_count),
      dependentRepositories: number(value.dependentRepositories || value.dependent_repositories_count),
      maintainers: number(value.maintainers),
    },
  };
}

function mapNpmSearchObject(item = {}) {
  const pkg = item.package || item;
  const repositoryUrl = normalizeRepositoryUrl(pkg.links?.repository || pkg.repository);
  return packageProject('npm', {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    date: pkg.date,
    repositoryUrl,
    homepage: pkg.links?.homepage,
    url: pkg.links?.npm,
    publisher: pkg.publisher?.username || pkg.publisher?.name,
    maintainers: array(pkg.maintainers).length,
    license: pkg.license,
    keywords: pkg.keywords,
    qualityScore: item.score?.detail?.quality,
    popularityScore: item.score?.detail?.popularity,
  });
}

async function npmDownloadCount(fetchImpl, packageName, timeoutMs) {
  try {
    const data = await fetchJson(fetchImpl, `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(packageName)}`, {}, timeoutMs);
    return number(data.downloads);
  } catch {
    return 0;
  }
}

async function searchNpm(fetchImpl, query, limit, timeoutMs) {
  const data = await fetchJson(fetchImpl, `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`, {}, timeoutMs);
  const projects = array(data.objects).map(mapNpmSearchObject).filter(Boolean);
  const counts = await Promise.all(projects.slice(0, 12).map((project) => npmDownloadCount(fetchImpl, project.packageName, timeoutMs)));
  counts.forEach((downloads, index) => {
    if (!projects[index]) return;
    projects[index].downloads = downloads;
    projects[index].packageFacts.downloads = downloads;
  });
  return projects;
}

function ecosystePackageToProject(ecosystem, pkg = {}) {
  return packageProject(ecosystem, {
    name: pkg.name,
    description: pkg.description,
    version: pkg.latest_release_number || pkg.latest_version || pkg.version,
    latestReleaseAt: pkg.latest_release_published_at,
    firstReleaseAt: pkg.first_release_published_at,
    repositoryUrl: pkg.repository_url || pkg.repository?.html_url || pkg.repository?.url,
    homepage: pkg.homepage,
    url: pkg.html_url || pkg.registry_url,
    license: pkg.license,
    keywords: pkg.keywords,
    downloads: pkg.downloads,
    dependentPackages: pkg.dependent_packages_count,
    dependentRepositories: pkg.dependent_repositories_count,
    maintainers: pkg.maintainers_count,
  });
}

function packageArray(data) {
  if (Array.isArray(data)) return data;
  return array(data?.packages || data?.data || data?.results);
}

async function searchEcosystemsPackages(fetchImpl, ecosystem, query, limit, timeoutMs) {
  const registry = ECOSYSTEMS[ecosystem]?.registry;
  if (!registry) return [];
  const endpoints = [
    `https://packages.ecosyste.ms/api/v1/registries/${encodeURIComponent(registry)}/packages?query=${encodeURIComponent(query)}&sort=downloads&order=desc&per_page=${limit}`,
    `https://packages.ecosyste.ms/api/v1/registries/${encodeURIComponent(registry)}/packages?search=${encodeURIComponent(query)}&sort=downloads&order=desc&per_page=${limit}`,
  ];
  for (const endpoint of endpoints) {
    try {
      const values = packageArray(await fetchJson(fetchImpl, endpoint, {}, timeoutMs));
      const projects = values.map((pkg) => ecosystePackageToProject(ecosystem, pkg)).filter(Boolean);
      const matched = projects.filter((project) => `${project.name} ${project.description} ${project.topics.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
      if (matched.length) return matched.slice(0, limit);
    } catch {
      // Try the next public route, then registry-native fallback.
    }
  }
  return [];
}

function pyPiNamesFromHtml(html = '', limit = 20) {
  const names = [];
  for (const match of String(html).matchAll(/href=["']\/project\/([^/"']+)\/?["']/gi)) {
    const name = decodeURIComponent(match[1]);
    if (name && !names.includes(name)) names.push(name);
    if (names.length >= limit) break;
  }
  return names;
}

function pyPiProject(data = {}, downloads = 0) {
  const info = data.info || {};
  const projectUrls = info.project_urls || {};
  const repositoryUrl = normalizeRepositoryUrl(projectUrls.Source || projectUrls.Repository || projectUrls.Code || projectUrls.Homepage || info.home_page);
  const releases = Object.entries(data.releases || {}).flatMap(([version, files]) => array(files).map((file) => ({ version, date: file.upload_time_iso_8601 || file.upload_time })));
  releases.sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0));
  return packageProject('pypi', {
    name: info.name,
    description: info.summary,
    version: info.version,
    repositoryUrl,
    homepage: info.project_url || info.home_page,
    url: info.package_url || info.project_url,
    license: info.license_expression || info.license,
    keywords: typeof info.keywords === 'string' ? info.keywords.split(/[\s,]+/) : info.keywords,
    downloads,
    maintainers: [info.author_email, info.maintainer_email].filter(Boolean).length,
    updatedAt: releases[0]?.date || '',
    createdAt: releases[releases.length - 1]?.date || '',
  });
}

async function pyPiDownloads(fetchImpl, packageName, timeoutMs) {
  try {
    const data = await fetchJson(fetchImpl, `https://pypistats.org/api/packages/${encodeURIComponent(packageName)}/recent`, {}, timeoutMs);
    return number(data?.data?.last_month);
  } catch {
    return 0;
  }
}

async function fetchPyPiProjects(fetchImpl, names, limit, timeoutMs) {
  const selected = unique(names).slice(0, limit);
  const values = await Promise.allSettled(selected.map(async (name) => {
    const [data, downloads] = await Promise.all([
      fetchJson(fetchImpl, `https://pypi.org/pypi/${encodeURIComponent(name)}/json`, {}, timeoutMs),
      pyPiDownloads(fetchImpl, name, timeoutMs),
    ]);
    return pyPiProject(data, downloads);
  }));
  return values.filter((result) => result.status === 'fulfilled' && result.value).map((result) => result.value);
}

function queryCandidates(query = '') {
  const normalized = text(query, 200).toLowerCase().replace(/[^a-z0-9._@/-]+/g, ' ').trim();
  const words = normalized.split(/\s+/).filter((word) => word.length >= 2).slice(0, 5);
  return unique([normalized.replace(/\s+/g, '-'), normalized.replace(/\s+/g, '_'), ...words]);
}

async function searchPyPi(fetchImpl, query, limit, timeoutMs) {
  const ecosystemResults = await searchEcosystemsPackages(fetchImpl, 'pypi', query, limit, timeoutMs);
  if (ecosystemResults.length) return ecosystemResults;
  let names = [];
  try {
    const html = await fetchText(fetchImpl, `https://pypi.org/search/?q=${encodeURIComponent(query)}`, { headers: { Accept: 'text/html' } }, timeoutMs);
    names = pyPiNamesFromHtml(html, limit);
  } catch {
    // PyPI search may apply anti-abuse controls; exact lookups remain available.
  }
  names.push(...queryCandidates(query));
  const projects = await fetchPyPiProjects(fetchImpl, names, limit, timeoutMs);
  return projects.filter((project) => `${project.name} ${project.description} ${project.topics.join(' ')}`.toLowerCase().includes(query.toLowerCase()) || names.slice(0, 3).some((name) => project.name.toLowerCase() === name.toLowerCase())).slice(0, limit);
}

function cratesProject(crate = {}) {
  return packageProject('crates', {
    name: crate.name,
    description: crate.description,
    version: crate.max_stable_version || crate.max_version || crate.newest_version,
    repositoryUrl: crate.repository,
    homepage: crate.homepage,
    url: `https://crates.io/crates/${encodeURIComponent(crate.name || '')}`,
    license: crate.license,
    downloads: crate.downloads,
    recentDownloads: crate.recent_downloads,
    updatedAt: crate.updated_at,
    createdAt: crate.created_at,
    topics: [...array(crate.keywords).map((item) => item.keyword || item), ...array(crate.categories).map((item) => item.category || item)],
  });
}

async function searchCrates(fetchImpl, query, limit, timeoutMs) {
  const data = await fetchJson(fetchImpl, `https://crates.io/api/v1/crates?q=${encodeURIComponent(query)}&per_page=${limit}`, {}, timeoutMs);
  return array(data.crates).map(cratesProject).filter(Boolean);
}

async function radarNpm(fetchImpl, limit, timeoutMs) {
  const settled = await Promise.allSettled(RADAR_QUERIES.npm.map((query) => searchNpm(fetchImpl, query, Math.max(6, Math.ceil(limit / 2)), timeoutMs)));
  return uniqueProjects(settled.filter((item) => item.status === 'fulfilled').flatMap((item) => item.value))
    .sort((a, b) => b.downloads - a.downloads || b.qualityScore - a.qualityScore)
    .slice(0, limit);
}

async function topEcosystemsPackages(fetchImpl, ecosystem, limit, timeoutMs) {
  const registry = ECOSYSTEMS[ecosystem]?.registry;
  if (!registry) return [];
  try {
    const data = await fetchJson(fetchImpl, `https://packages.ecosyste.ms/api/v1/registries/${encodeURIComponent(registry)}/packages?sort=downloads&order=desc&per_page=${limit}`, {}, timeoutMs);
    return packageArray(data).map((pkg) => ecosystePackageToProject(ecosystem, pkg)).filter(Boolean).slice(0, limit);
  } catch {
    return [];
  }
}

function rssPackageNames(xml = '', limit = 20) {
  const names = [];
  for (const match of String(xml).matchAll(/<title>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/title>/gi)) {
    const title = text(match[1], 300);
    if (!title || /PyPI recent packages/i.test(title)) continue;
    const name = title.split(/\s+/)[0];
    if (name && !names.includes(name)) names.push(name);
    if (names.length >= limit) break;
  }
  return names;
}

async function radarPyPi(fetchImpl, limit, timeoutMs) {
  const ecosystem = await topEcosystemsPackages(fetchImpl, 'pypi', limit, timeoutMs);
  if (ecosystem.length) return ecosystem;
  try {
    const xml = await fetchText(fetchImpl, 'https://pypi.org/rss/packages.xml', { headers: { Accept: 'application/rss+xml, application/xml' } }, timeoutMs);
    return fetchPyPiProjects(fetchImpl, rssPackageNames(xml, limit), limit, timeoutMs);
  } catch {
    return [];
  }
}

async function radarCrates(fetchImpl, limit, timeoutMs) {
  const variants = ['recent-downloads', 'downloads', 'new'];
  for (const sort of variants) {
    try {
      const data = await fetchJson(fetchImpl, `https://crates.io/api/v1/crates?sort=${sort}&per_page=${limit}`, {}, timeoutMs);
      const projects = array(data.crates).map(cratesProject).filter(Boolean);
      if (projects.length) return projects;
    } catch {
      // Try the next documented/common crates.io sort mode.
    }
  }
  return [];
}

function uniqueProjects(projects = []) {
  return [...new Map(projects.filter((project) => project?.id).map((project) => [project.id.toLowerCase(), project])).values()];
}

export function createPackageService({ fetchImpl = fetch, gateway = null, now = () => Date.now(), timeoutMs = DEFAULT_TIMEOUT, cacheTtlMs = DEFAULT_CACHE_TTL } = {}) {
  if (gateway) {
    const gatewayFetch = async (url, options = {}, requestTimeoutMs = timeoutMs) => {
      const { __openradarParse = 'json', signal: _signal, redirect: _redirect, ...requestOptions } = options;
      const result = await gateway.request({
        provider: projectProviderForUrl(url),
        url,
        method: requestOptions.method || 'GET',
        headers: requestOptions.headers || {},
        parse: __openradarParse,
        timeoutMs: requestTimeoutMs,
        cacheTtlMs,
      });
      const responseHeaders = {
        'Content-Type': __openradarParse === 'text' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
        'X-OpenRadar-Cache': result.cacheStatus,
        'X-OpenRadar-Degraded': String(Boolean(result.degraded)),
        'X-OpenRadar-Degraded-Reason': result.degradedReason || '',
      };
      const body = __openradarParse === 'text' ? String(result.data || '') : JSON.stringify(result.data ?? null);
      return new Response(body, { status: result.ok ? 200 : result.status || 502, headers: responseHeaders });
    };
    gatewayFetch.__openradarGateway = true;
    fetchImpl = gatewayFetch;
  }
  const cache = new Map();
  const stats = { searches: 0, radarRuns: 0, cacheHits: 0, lastError: '', lastSuccessAt: '' };

  async function cached(key, task) {
    const existing = cache.get(key);
    if (existing && now() - existing.savedAt < cacheTtlMs) {
      stats.cacheHits += 1;
      return { ...existing.value, cached: true };
    }
    try {
      const value = await task();
      stats.lastSuccessAt = new Date(now()).toISOString();
      stats.lastError = '';
      cache.set(key, { savedAt: now(), value });
      return value;
    } catch (error) {
      stats.lastError = error?.message || String(error);
      throw error;
    }
  }

  return {
    status() {
      return { enabled: true, ecosystems: Object.keys(ECOSYSTEMS), cacheEntries: cache.size, ...stats };
    },
    async search(ecosystem, query, limit = 20) {
      const safeEcosystem = text(ecosystem, 40).toLowerCase();
      const safeQuery = text(query, 200);
      const safeLimit = Math.min(30, Math.max(1, Number(limit) || 20));
      if (!ECOSYSTEMS[safeEcosystem]) throw new Error(`Unsupported package ecosystem: ${safeEcosystem}`);
      if (!safeQuery) throw new Error('Package search query is required');
      stats.searches += 1;
      return cached(`search\0${safeEcosystem}\0${safeQuery}\0${safeLimit}`, async () => {
        let projects = [];
        if (safeEcosystem === 'npm') projects = await searchNpm(fetchImpl, safeQuery, safeLimit, timeoutMs);
        if (safeEcosystem === 'pypi') projects = await searchPyPi(fetchImpl, safeQuery, safeLimit, timeoutMs);
        if (safeEcosystem === 'crates') projects = await searchCrates(fetchImpl, safeQuery, safeLimit, timeoutMs);
        return { ecosystem: safeEcosystem, projects: uniqueProjects(projects).slice(0, safeLimit), source: 'registry-and-open-metadata' };
      });
    },
    async radar(ecosystem, limit = 18) {
      const safeEcosystem = text(ecosystem, 40).toLowerCase();
      const safeLimit = Math.min(30, Math.max(1, Number(limit) || 18));
      if (!ECOSYSTEMS[safeEcosystem]) throw new Error(`Unsupported package ecosystem: ${safeEcosystem}`);
      stats.radarRuns += 1;
      return cached(`radar\0${safeEcosystem}\0${safeLimit}`, async () => {
        let projects = [];
        if (safeEcosystem === 'npm') projects = await radarNpm(fetchImpl, safeLimit, timeoutMs);
        if (safeEcosystem === 'pypi') projects = await radarPyPi(fetchImpl, safeLimit, timeoutMs);
        if (safeEcosystem === 'crates') projects = await radarCrates(fetchImpl, safeLimit, timeoutMs);
        return { ecosystem: safeEcosystem, projects: uniqueProjects(projects).slice(0, safeLimit), source: 'registry-and-open-metadata' };
      });
    },
  };
}

export { ECOSYSTEMS, packageProject, mapNpmSearchObject, pyPiProject, cratesProject, pyPiNamesFromHtml, rssPackageNames };
