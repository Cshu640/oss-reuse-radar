import { createUpstreamCacheStore, normalizeUpstreamRequestKey } from './upstream-cache-store.mjs';

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_STALE_MS = 6 * 60 * 60 * 1000;
const USER_AGENT = 'OpenRadar/0.4-B (local-first OSS radar)';

export const UPSTREAM_PROVIDERS = {
  github: { cacheTtlMs: 10 * 60 * 1000, maxStaleMs: DEFAULT_MAX_STALE_MS, concurrency: 1 },
  huggingface: { cacheTtlMs: 15 * 60 * 1000, maxStaleMs: DEFAULT_MAX_STALE_MS, concurrency: 2 },
  gitlab: { cacheTtlMs: 10 * 60 * 1000, maxStaleMs: DEFAULT_MAX_STALE_MS, concurrency: 2 },
  codeberg: { cacheTtlMs: 15 * 60 * 1000, maxStaleMs: DEFAULT_MAX_STALE_MS, concurrency: 2 },
  modelscope: { cacheTtlMs: 15 * 60 * 1000, maxStaleMs: DEFAULT_MAX_STALE_MS, concurrency: 2 },
  npm: { cacheTtlMs: 10 * 60 * 1000, maxStaleMs: DEFAULT_MAX_STALE_MS, concurrency: 2 },
  pypi: { cacheTtlMs: 15 * 60 * 1000, maxStaleMs: DEFAULT_MAX_STALE_MS, concurrency: 2 },
  crates: { cacheTtlMs: 15 * 60 * 1000, maxStaleMs: DEFAULT_MAX_STALE_MS, concurrency: 2 },
  'pypistats': { cacheTtlMs: 15 * 60 * 1000, maxStaleMs: DEFAULT_MAX_STALE_MS, concurrency: 2 },
  'ecosyste.ms': { cacheTtlMs: 15 * 60 * 1000, maxStaleMs: DEFAULT_MAX_STALE_MS, concurrency: 2 },
  gitee: { cacheTtlMs: 10 * 60 * 1000, maxStaleMs: DEFAULT_MAX_STALE_MS, concurrency: 1 },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeErrorReason(error) {
  if (error?.kind === 'timeout' || error?.name === 'AbortError') return 'timeout';
  if (error?.kind === 'network') return 'network-error';
  if (error?.kind === 'cooldown') return 'rate-limited-cooldown';
  if (error?.kind === 'primary-rate-limit') return 'primary-rate-limit-exhausted';
  if (error?.kind === 'secondary-rate-limit') return 'secondary-rate-limit';
  if (error?.kind === 'http') return `upstream-http-${error.status}`;
  return 'upstream-unavailable';
}

function sanitizedError(kind, status = 0) {
  const error = new Error(kind);
  error.kind = kind;
  if (status) error.status = status;
  return error;
}

function parseRetryAfter(value, nowMs) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - nowMs) : null;
}

function parseRateLimit(headers, nowMs) {
  const resetSeconds = numberOrNull(headers.get('x-ratelimit-reset'));
  const retryAfterMs = parseRetryAfter(headers.get('retry-after'), nowMs);
  return {
    resource: headers.get('x-ratelimit-resource') || '',
    remaining: numberOrNull(headers.get('x-ratelimit-remaining')),
    limit: numberOrNull(headers.get('x-ratelimit-limit')),
    used: numberOrNull(headers.get('x-ratelimit-used')),
    resetAt: resetSeconds === null ? '' : new Date(resetSeconds * 1000).toISOString(),
    retryAfterMs,
  };
}

function createLimiter(concurrency) {
  const limit = Math.max(1, Number(concurrency) || 1);
  let active = 0;
  const queue = [];

  const pump = () => {
    while (active < limit && queue.length) {
      const job = queue.shift();
      active += 1;
      Promise.resolve()
        .then(job.task)
        .then(job.resolve, job.reject)
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  };

  return Object.assign((task) => new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    pump();
  }), {
    active: () => active,
    pending: () => queue.length,
    concurrency: limit,
  });
}

function safeHeaders(input = {}) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (!value || /^authorization$/i.test(key)) continue;
    output[key] = String(value);
  }
  return output;
}

function buildProjectUrl(provider, mode, query, limit, date) {
  const params = new URLSearchParams();
  const safeLimit = Math.min(30, Math.max(1, Number(limit) || 12));
  if (provider === 'github') {
    params.set('q', mode === 'radar' ? query : `${query} archived:false`);
    params.set('sort', 'stars');
    params.set('order', 'desc');
    params.set('per_page', String(safeLimit));
    return `https://api.github.com/search/repositories?${params}`;
  }
  if (provider === 'huggingface') {
    if (mode === 'search') params.set('search', query);
    params.set('sort', mode === 'radar' ? 'trendingScore' : 'downloads');
    params.set('direction', '-1');
    params.set('limit', String(safeLimit));
    params.set('full', 'false');
    return `https://huggingface.co/api/models?${params}`;
  }
  if (provider === 'gitlab') {
    if (mode === 'search') params.set('search', query);
    params.set('visibility', 'public');
    params.set('order_by', 'star_count');
    params.set('sort', 'desc');
    if (mode === 'radar') params.set('last_activity_after', `${date}T00:00:00Z`);
    params.set('per_page', String(safeLimit));
    params.set('simple', 'false');
    return `https://gitlab.com/api/v4/projects?${params}`;
  }
  if (provider === 'codeberg') {
    if (mode === 'search') params.set('q', query);
    params.set('sort', 'updated');
    params.set('order', 'desc');
    params.set('limit', String(safeLimit));
    return `https://codeberg.org/api/v1/repos/search?${params}`;
  }
  if (provider === 'modelscope') {
    if (mode === 'search') params.set('search', query);
    params.set('sort', 'downloads');
    params.set('page_size', String(safeLimit));
    return `https://modelscope.cn/openapi/v1/models?${params}`;
  }
  throw new Error(`unsupported-upstream-provider:${provider}`);
}

export function createUpstreamGateway({
  fetchImpl = fetch,
  now = () => Date.now(),
  sleepImpl = sleep,
  random = Math.random,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
  maxEntries = 160,
  maxStaleMs = DEFAULT_MAX_STALE_MS,
  githubToken = process.env.GITHUB_TOKEN || '',
  cache = createUpstreamCacheStore({ maxEntries, now }),
  globalConcurrency = 4,
} = {}) {
  const inFlight = new Map();
  const cooldowns = new Map();
  const rateLimits = new Map();
  const providerStates = new Map();
  const globalLimiter = createLimiter(globalConcurrency);
  const providerLimiters = new Map();

  function configFor(provider) {
    return UPSTREAM_PROVIDERS[provider] || { cacheTtlMs: 10 * 60 * 1000, maxStaleMs, concurrency: 2 };
  }

  function limiterFor(provider) {
    if (!providerLimiters.has(provider)) providerLimiters.set(provider, createLimiter(configFor(provider).concurrency));
    return providerLimiters.get(provider);
  }

  function authModeFor(provider) {
    return provider === 'github' && githubToken ? 'authenticated' : 'anonymous';
  }

  function stateFor(provider) {
    if (!providerStates.has(provider)) {
      providerStates.set(provider, { lastRequestAt: '', lastSuccessAt: '', lastError: '', degraded: false, degradedReason: null });
    }
    return providerStates.get(provider);
  }

  function rateLimitFor(provider) {
    return rateLimits.get(provider) || {
      resource: '', remaining: null, limit: null, used: null, resetAt: '', retryAfterMs: null,
    };
  }

  function cooldownFor(provider) {
    return cooldowns.get(provider) || 0;
  }

  function baseEnvelope(provider, patch = {}) {
    return {
      ok: false,
      provider,
      data: null,
      cacheStatus: 'miss',
      degraded: false,
      degradedReason: null,
      fetchedAt: '',
      revalidatedAt: '',
      ageMs: 0,
      rateLimit: rateLimitFor(provider),
      authMode: authModeFor(provider),
      ...patch,
    };
  }

  function responseFromCache(provider, cached, cacheStatus, patch = {}) {
    return baseEnvelope(provider, {
      ok: true,
      data: cached.data,
      cacheStatus,
      fetchedAt: cached.fetchedAt || new Date(cached.savedAt).toISOString(),
      revalidatedAt: cached.revalidatedAt || '',
      ageMs: cached.ageMs || 0,
      ...patch,
    });
  }

  function setProviderState(provider, patch) {
    const current = stateFor(provider);
    Object.assign(current, patch);
  }

  function headersFor(provider, inputHeaders, validators = {}) {
    const headers = {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      ...safeHeaders(inputHeaders),
    };
    if (validators.etag) headers['If-None-Match'] = validators.etag;
    if (validators.lastModified) headers['If-Modified-Since'] = validators.lastModified;
    if (provider === 'github') {
      headers.Accept = inputHeaders?.Accept || 'application/vnd.github+json';
      headers['X-GitHub-Api-Version'] = '2022-11-28';
      if (githubToken) headers.Authorization = `Bearer ${githubToken}`;
    }
    return headers;
  }

  function shouldRetry(provider, response, attempt, rateLimit) {
    if (attempt >= maxRetries) return false;
    if (response) {
      if (response.status >= 500) return true;
      if (response.status === 429) {
        if (provider === 'github' && rateLimit.remaining === 0) return false;
        return true;
      }
      if (response.status === 403 && provider === 'github' && rateLimit.remaining === 0) return false;
      return false;
    }
    return true;
  }

  function retryDelay(provider, attempt, rateLimit, response) {
    if (rateLimit.retryAfterMs !== null && rateLimit.retryAfterMs !== undefined) return rateLimit.retryAfterMs;
    if (provider === 'github' && response && (response.status === 403 || response.status === 429)) return null;
    const jitter = Math.floor(Math.max(0, Number(random()) || 0) * 250);
    return Math.min(30_000, 500 * (2 ** attempt) + jitter);
  }

  async function perform(provider, url, options, cacheKey, cached) {
    const state = stateFor(provider);
    const config = configFor(provider);
    const requestTimeout = Math.min(60_000, Math.max(100, Number(options.timeoutMs) || timeoutMs));
    let attempt = 0;
    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeout);
      const startedAt = now();
      const validators = cached && cached.state !== 'expired' ? cached : cached;
      const headers = headersFor(provider, options.headers, validators || {});
      try {
        state.lastRequestAt = new Date(startedAt).toISOString();
        const response = await fetchImpl(url, { method: options.method || 'GET', redirect: 'follow', ...options, headers, signal: controller.signal });
        const rateLimit = parseRateLimit(response.headers, now());
        rateLimits.set(provider, rateLimit);
        if (provider === 'github' && (response.status === 403 || response.status === 429) && rateLimit.remaining === 0) {
          const resetAt = Date.parse(rateLimit.resetAt || '') || now() + 60_000;
          cooldowns.set(provider, resetAt);
          throw sanitizedError('primary-rate-limit', response.status);
        }
        if (provider === 'github' && (response.status === 403 || response.status === 429) && rateLimit.retryAfterMs === null) {
          throw sanitizedError('secondary-rate-limit', response.status);
        }
        if (response.status === 304 && cached) {
          const revalidatedAt = new Date(now()).toISOString();
          const entry = cache.revalidate(cacheKey, { revalidatedAt, savedAt: now() });
          setProviderState(provider, { degraded: false, degradedReason: null, lastSuccessAt: revalidatedAt, lastError: '' });
          return responseFromCache(provider, { ...entry, ageMs: 0 }, 'revalidated', { rateLimit });
        }
        if (!response.ok) {
          const error = sanitizedError('http', response.status);
          error.status = response.status;
          error.rateLimit = rateLimit;
          if (shouldRetry(provider, response, attempt, rateLimit)) {
            const delay = retryDelay(provider, attempt, rateLimit, response);
            if (delay !== null) {
              attempt += 1;
              await sleepImpl(delay);
              continue;
            }
          }
          throw error;
        }
        const contentType = response.headers.get('content-type') || '';
        const data = options.parse === 'text' || contentType.includes('text/html') || contentType.includes('xml')
          ? await response.text()
          : await response.json();
        const fetchedAt = new Date(now()).toISOString();
        const entry = cache.set(cacheKey, {
          data,
          fetchedAt,
          revalidatedAt: '',
          status: response.status,
          etag: response.headers.get('etag') || '',
          lastModified: response.headers.get('last-modified') || '',
          contentType,
        });
        setProviderState(provider, { degraded: false, degradedReason: null, lastSuccessAt: fetchedAt, lastError: '' });
        return responseFromCache(provider, { ...entry, ageMs: 0 }, 'miss', { rateLimit });
      } catch (error) {
        const isAbort = error?.name === 'AbortError';
        const normalized = isAbort ? sanitizedError('timeout') : error?.kind ? error : sanitizedError('network');
        if (isAbort) normalized.status = 0;
        if (!error?.kind && !isAbort && error?.status) normalized.status = error.status;
        if (shouldRetry(provider, null, attempt, rateLimitFor(provider)) && normalized.kind === 'network') {
          attempt += 1;
          await sleepImpl(retryDelay(provider, attempt - 1, rateLimitFor(provider), null));
          continue;
        }
        normalized.rateLimit = error?.rateLimit || rateLimitFor(provider);
        throw normalized;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  async function request({ provider: rawProvider, url, method = 'GET', headers = {}, parse = 'json', timeoutMs: requestTimeout, cacheTtlMs, maxStaleMs: requestMaxStale, cacheKey: suppliedCacheKey, ...rest } = {}) {
    const provider = String(rawProvider || 'unknown').toLowerCase();
    const config = configFor(provider);
    const key = suppliedCacheKey || normalizeUpstreamRequestKey(provider, url, method);
    const ttl = Number.isFinite(Number(cacheTtlMs)) ? Number(cacheTtlMs) : config.cacheTtlMs;
    const staleWindow = Number.isFinite(Number(requestMaxStale)) ? Number(requestMaxStale) : (config.maxStaleMs || maxStaleMs);
    const cached = cache.get(key, { ttlMs: ttl, maxStaleMs: staleWindow });
    if (cached?.state === 'fresh') return responseFromCache(provider, cached, 'fresh');
    const cooldownUntil = cooldownFor(provider);
    if (cooldownUntil > now()) {
      if (cached && cached.state === 'stale') {
        return responseFromCache(provider, cached, 'stale', { degraded: true, degradedReason: 'rate-limited-cooldown' });
      }
      return baseEnvelope(provider, { degraded: true, degradedReason: 'rate-limited-cooldown', rateLimit: rateLimitFor(provider) });
    }
    if (inFlight.has(key)) return inFlight.get(key);

    const task = limiterFor(provider)(() => globalLimiter(() => perform(provider, url, { method, headers, parse, timeoutMs: requestTimeout, ...rest }, key, cached?.state === 'expired' ? cached : cached)))
      .then((result) => ({ ...result, cacheStatus: result.cacheStatus === 'miss' && cached ? 'revalidated' : result.cacheStatus }))
      .catch((error) => {
        const stale = cached && cached.state === 'stale' ? responseFromCache(provider, cached, 'stale', {
          degraded: true,
          degradedReason: safeErrorReason(error),
          rateLimit: error?.rateLimit || rateLimitFor(provider),
        }) : baseEnvelope(provider, {
          degraded: true,
          degradedReason: safeErrorReason(error),
          status: error?.status || 0,
          rateLimit: error?.rateLimit || rateLimitFor(provider),
        });
        setProviderState(provider, { degraded: true, degradedReason: stale.degradedReason, lastError: stale.degradedReason });
        return stale;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, task);
    return task;
  }

  async function requestJson(options) {
    return request({ ...options, parse: 'json' });
  }

  async function requestText(options) {
    return request({ ...options, parse: 'text' });
  }

  async function searchProjects(provider, query, limit = 12) {
    const safeQuery = String(query || '').trim().slice(0, 200);
    if (!safeQuery) return baseEnvelope(provider, { ok: true, data: [] });
    const url = buildProjectUrl(provider, 'search', safeQuery, limit, '');
    return requestJson({ provider, url });
  }

  async function radarProjects(provider, limit = 18) {
    const date = new Date(now() - 30 * 864e5).toISOString().slice(0, 10);
    const query = provider === 'github' ? 'created:>2000-01-01 stars:>0' : '';
    const url = buildProjectUrl(provider, 'radar', query, limit, date);
    return requestJson({ provider, url, cacheTtlMs: 20 * 60 * 1000 });
  }

  function status() {
    const providers = {};
    const names = new Set([...Object.keys(UPSTREAM_PROVIDERS), ...providerStates.keys()]);
    for (const provider of names) {
      const state = stateFor(provider);
      providers[provider] = {
        authMode: authModeFor(provider),
        degraded: Boolean(state.degraded),
        degradedReason: state.degradedReason,
        lastRequestAt: state.lastRequestAt,
        lastSuccessAt: state.lastSuccessAt,
        rateLimit: rateLimitFor(provider),
        cooldownUntil: cooldownFor(provider) > now() ? new Date(cooldownFor(provider)).toISOString() : '',
        concurrency: limiterFor(provider).concurrency,
        active: limiterFor(provider).active(),
        pending: limiterFor(provider).pending(),
      };
    }
    return {
      enabled: true,
      storage: 'memory-only',
      restartInvalidatesCache: true,
      cache: cache.metrics(),
      inFlight: inFlight.size,
      globalConcurrency: globalLimiter.concurrency,
      providers,
    };
  }

  return { request, requestJson, requestText, searchProjects, radarProjects, status, cache };
}

export function projectProviderForUrl(url) {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes('github.com') || host === 'api.github.com') return 'github';
  if (host.includes('huggingface.co')) return 'huggingface';
  if (host.includes('gitlab.com')) return 'gitlab';
  if (host.includes('codeberg.org')) return 'codeberg';
  if (host.includes('modelscope.cn')) return 'modelscope';
  if (host.includes('registry.npmjs.org') || host.includes('api.npmjs.org')) return 'npm';
  if (host.includes('pypi.org')) return 'pypi';
  if (host.includes('pypistats.org')) return 'pypistats';
  if (host.includes('crates.io')) return 'crates';
  if (host.includes('ecosyste.ms')) return 'ecosyste.ms';
  if (host.includes('gitee.com')) return 'gitee';
  return 'unknown';
}
