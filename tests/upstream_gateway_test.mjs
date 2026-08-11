import assert from 'node:assert/strict';
import test from 'node:test';
import { createUpstreamGateway } from '../upstream-gateway.mjs';
import { normalizeUpstreamRequestKey, createUpstreamCacheStore } from '../upstream-cache-store.mjs';

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json', ...headers },
});

function makeClock() {
  let current = 1_000_000;
  return {
    now: () => current,
    advance(ms) { current += ms; },
    iso() { return new Date(current).toISOString(); },
  };
}

test('fresh cache hit avoids a second upstream request', async () => {
  let calls = 0;
  const gateway = createUpstreamGateway({ fetchImpl: async () => { calls += 1; return json({ items: [{ id: 1 }] }); } });
  const first = await gateway.requestJson({ provider: 'github', url: 'https://api.github.com/search/repositories?q=cache' });
  const second = await gateway.requestJson({ provider: 'github', url: 'https://api.github.com/search/repositories?q=cache' });
  assert.equal(first.cacheStatus, 'miss');
  assert.equal(second.cacheStatus, 'fresh');
  assert.equal(calls, 1);
});

test('request keys normalize query order and method case', () => {
  assert.equal(
    normalizeUpstreamRequestKey('GitHub', 'https://api.github.com/search?q=one&limit=2', 'get'),
    normalizeUpstreamRequestKey('github', 'https://api.github.com/search?limit=2&q=one', 'GET'),
  );
});

test('TTL expiry revalidates with ETag and reuses a 304 body', async () => {
  const clock = makeClock();
  let calls = 0;
  let conditional = '';
  const gateway = createUpstreamGateway({
    now: clock.now,
    fetchImpl: async (_url, options) => {
      calls += 1;
      conditional = options.headers['If-None-Match'] || '';
      return calls === 1 ? json({ items: ['old'] }, 200, { ETag: 'W/"one"' }) : new Response(null, { status: 304, headers: { 'x-ratelimit-remaining': '9' } });
    },
  });
  const first = await gateway.requestJson({ provider: 'github', url: 'https://api.github.com/search?q=etag', cacheTtlMs: 10 });
  clock.advance(11);
  const second = await gateway.requestJson({ provider: 'github', url: 'https://api.github.com/search?q=etag', cacheTtlMs: 10 });
  assert.equal(first.data.items[0], 'old');
  assert.equal(second.cacheStatus, 'revalidated');
  assert.deepEqual(second.data, { items: ['old'] });
  assert.equal(conditional, 'W/"one"');
  assert.equal(calls, 2);
});

test('in-flight dedupe shares one request for concurrent callers', async () => {
  let calls = 0;
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const gateway = createUpstreamGateway({
    fetchImpl: async () => {
      calls += 1;
      await pending;
      return json({ data: true });
    },
  });
  const first = gateway.requestJson({ provider: 'huggingface', url: 'https://huggingface.co/api/models?q=dedupe' });
  const second = gateway.requestJson({ provider: 'huggingface', url: 'https://huggingface.co/api/models?q=dedupe' });
  release();
  const [left, right] = await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.deepEqual(left.data, right.data);
});

test('5xx responses retry at most the configured bound', async () => {
  let calls = 0;
  const sleeps = [];
  const gateway = createUpstreamGateway({
    fetchImpl: async () => {
      calls += 1;
      return calls < 3 ? json({ error: true }, 503) : json({ ok: true });
    },
    sleepImpl: async (ms) => sleeps.push(ms),
    random: () => 0,
  });
  const result = await gateway.requestJson({ provider: 'gitlab', url: 'https://gitlab.com/api/v4/projects?q=retry' });
  assert.equal(result.ok, true);
  assert.equal(calls, 3);
  assert.equal(sleeps.length, 2);
});

test('429 obeys Retry-After before retrying', async () => {
  let calls = 0;
  const sleeps = [];
  const gateway = createUpstreamGateway({
    fetchImpl: async () => {
      calls += 1;
      return calls === 1 ? json({ error: 'busy' }, 429, { 'Retry-After': '3' }) : json({ ok: true });
    },
    sleepImpl: async (ms) => sleeps.push(ms),
  });
  const result = await gateway.requestJson({ provider: 'codeberg', url: 'https://codeberg.org/api/v1/repos/search?q=retry-after' });
  assert.equal(result.ok, true);
  assert.deepEqual(sleeps, [3000]);
});

test('GitHub primary exhaustion does not hammer or retry', async () => {
  let calls = 0;
  const sleeps = [];
  const clock = makeClock();
  const reset = Math.floor((clock.now() + 60_000) / 1000);
  const gateway = createUpstreamGateway({
    now: clock.now,
    fetchImpl: async () => { calls += 1; return json({ message: 'rate limit' }, 403, { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(reset), 'X-RateLimit-Limit': '60', 'X-RateLimit-Used': '60', 'X-RateLimit-Resource': 'search' }); },
    sleepImpl: async (ms) => sleeps.push(ms),
  });
  const first = await gateway.requestJson({ provider: 'github', url: 'https://api.github.com/search/repositories?q=limited' });
  const second = await gateway.requestJson({ provider: 'github', url: 'https://api.github.com/search/repositories?q=limited-2' });
  assert.equal(first.degradedReason, 'primary-rate-limit-exhausted');
  assert.equal(second.degradedReason, 'rate-limited-cooldown');
  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
});

test('stale-if-error serves bounded stale data and marks it degraded', async () => {
  const clock = makeClock();
  let calls = 0;
  const gateway = createUpstreamGateway({
    now: clock.now,
    maxRetries: 0,
    fetchImpl: async () => {
      calls += 1;
      return calls === 1 ? json({ items: ['cached'] }, 200, { ETag: 'cached' }) : json({ error: true }, 503);
    },
  });
  const first = await gateway.requestJson({ provider: 'npm', url: 'https://registry.npmjs.org/-/v1/search?text=stale', cacheTtlMs: 10, maxStaleMs: 100 });
  clock.advance(20);
  const stale = await gateway.requestJson({ provider: 'npm', url: 'https://registry.npmjs.org/-/v1/search?text=stale', cacheTtlMs: 10, maxStaleMs: 100 });
  assert.equal(first.ok, true);
  assert.equal(stale.ok, true);
  assert.equal(stale.cacheStatus, 'stale');
  assert.equal(stale.degraded, true);
  assert.equal(stale.data.items[0], 'cached');
});

test('stale max age refusal does not return expired data', async () => {
  const clock = makeClock();
  let calls = 0;
  const gateway = createUpstreamGateway({
    now: clock.now,
    maxRetries: 0,
    fetchImpl: async () => {
      calls += 1;
      return calls === 1 ? json({ items: ['too-old'] }) : json({ error: true }, 503);
    },
  });
  await gateway.requestJson({ provider: 'pypi', url: 'https://pypi.org/pypi/demo/json', cacheTtlMs: 10, maxStaleMs: 20 });
  clock.advance(31);
  const result = await gateway.requestJson({ provider: 'pypi', url: 'https://pypi.org/pypi/demo/json', cacheTtlMs: 10, maxStaleMs: 20 });
  assert.equal(result.ok, false);
  assert.equal(result.data, null);
  assert.equal(result.degraded, true);
  assert.equal(result.degradedReason, 'upstream-http-503');
});

test('ordinary 404 is not retried', async () => {
  let calls = 0;
  const gateway = createUpstreamGateway({ fetchImpl: async () => { calls += 1; return json({ error: true }, 404); } });
  const result = await gateway.requestJson({ provider: 'crates', url: 'https://crates.io/api/v1/crates/not-found' });
  assert.equal(result.ok, false);
  assert.equal(result.degradedReason, 'upstream-http-404');
  assert.equal(calls, 1);
});

test('provider rate-limit and degraded state are isolated', async () => {
  const gateway = createUpstreamGateway({
    maxRetries: 0,
    fetchImpl: async (url) => String(url).includes('github') ? json({}, 503) : json([{ id: 'hf' }]),
  });
  const github = await gateway.requestJson({ provider: 'github', url: 'https://api.github.com/search/repositories?q=isolation' });
  const huggingface = await gateway.requestJson({ provider: 'huggingface', url: 'https://huggingface.co/api/models?search=isolation' });
  const status = gateway.status();
  assert.equal(github.degraded, true);
  assert.equal(huggingface.ok, true);
  assert.equal(status.providers.github.degraded, true);
  assert.equal(status.providers.huggingface.degraded, false);
});

test('GitHub token stays server-side and is absent from response/status', async () => {
  let authorization = '';
  const secret = 'ghp_fake_server_only_1234567890';
  const gateway = createUpstreamGateway({
    githubToken: secret,
    fetchImpl: async (_url, options) => { authorization = options.headers.Authorization; return json({ ok: true }); },
  });
  const result = await gateway.requestJson({ provider: 'github', url: 'https://api.github.com/search/repositories?q=secret' });
  assert.equal(authorization, `Bearer ${secret}`);
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(JSON.stringify(gateway.status()).includes(secret), false);
  assert.equal(result.authMode, 'authenticated');
});

test('cache excludes Authorization header from stored entry', async () => {
  const store = createUpstreamCacheStore({ maxEntries: 2 });
  store.set('secret-key', { data: { safe: true }, headers: { ETag: 'safe' }, authorization: 'must-not-be-stored' });
  const entry = store.get('secret-key', { ttlMs: 1000, maxStaleMs: 2000 });
  assert.equal(JSON.stringify(entry).includes('must-not-be-stored'), false);
  assert.equal(JSON.stringify(entry).includes('Authorization'), false);
});

test('bounded cache evicts oldest entries', async () => {
  let calls = 0;
  const gateway = createUpstreamGateway({ maxEntries: 1, fetchImpl: async () => { calls += 1; return json({ calls }); } });
  await gateway.requestJson({ provider: 'npm', url: 'https://registry.npmjs.org/-/v1/search?text=one' });
  await gateway.requestJson({ provider: 'npm', url: 'https://registry.npmjs.org/-/v1/search?text=two' });
  await gateway.requestJson({ provider: 'npm', url: 'https://registry.npmjs.org/-/v1/search?text=one' });
  assert.equal(calls, 3);
  assert.equal(gateway.status().cache.evictions, 2);
});

test('timeout abort is bounded and sanitized', async () => {
  let aborted = false;
  const gateway = createUpstreamGateway({
    timeoutMs: 10,
    maxRetries: 0,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => { aborted = true; reject(Object.assign(new Error('aborted'), { name: 'AbortError' })); }, { once: true });
    }),
  });
  const result = await gateway.requestJson({ provider: 'gitlab', url: 'https://gitlab.com/api/v4/projects?q=timeout' });
  assert.equal(result.ok, false);
  assert.equal(result.degradedReason, 'timeout');
  assert.equal(aborted, true);
});

test('valid empty result is not confused with upstream failure', async () => {
  const emptyGateway = createUpstreamGateway({ fetchImpl: async () => json([]) });
  const failureGateway = createUpstreamGateway({ maxRetries: 0, fetchImpl: async () => json({ error: true }, 502) });
  const empty = await emptyGateway.requestJson({ provider: 'modelscope', url: 'https://modelscope.cn/openapi/v1/models?search=none' });
  const failure = await failureGateway.requestJson({ provider: 'modelscope', url: 'https://modelscope.cn/openapi/v1/models?search=down' });
  assert.equal(empty.ok, true);
  assert.deepEqual(empty.data, []);
  assert.equal(empty.degraded, false);
  assert.equal(failure.ok, false);
  assert.equal(failure.degraded, true);
});

test('provider concurrency is bounded to one for GitHub', async () => {
  let active = 0;
  let peak = 0;
  const gateway = createUpstreamGateway({
    fetchImpl: async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return json({ items: [] });
    },
  });
  await Promise.all([
    gateway.requestJson({ provider: 'github', url: 'https://api.github.com/search/repositories?q=one' }),
    gateway.requestJson({ provider: 'github', url: 'https://api.github.com/search/repositories?q=two' }),
  ]);
  assert.equal(peak, 1);
});

test('GitHub secondary limit obeys Retry-After when primary quota remains', async () => {
  let calls = 0;
  const sleeps = [];
  const gateway = createUpstreamGateway({
    fetchImpl: async () => {
      calls += 1;
      return calls === 1 ? json({ message: 'secondary limit' }, 429, { 'X-RateLimit-Remaining': '10', 'Retry-After': '2' }) : json({ items: [] });
    },
    sleepImpl: async (ms) => sleeps.push(ms),
  });
  const result = await gateway.requestJson({ provider: 'github', url: 'https://api.github.com/search/repositories?q=secondary' });
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [2000]);
});

test('public upstream response exposes only the sanitized contract', async () => {
  const gateway = createUpstreamGateway({ fetchImpl: async () => json([{ id: 'safe' }], 200, { 'X-RateLimit-Remaining': '7', 'X-RateLimit-Limit': '10', 'X-RateLimit-Used': '3', 'X-RateLimit-Resource': 'search' }) });
  const result = await gateway.requestJson({ provider: 'codeberg', url: 'https://codeberg.org/api/v1/repos/search?q=contract' });
  assert.deepEqual(Object.keys(result).sort(), ['ageMs', 'authMode', 'cacheStatus', 'data', 'degraded', 'degradedReason', 'fetchedAt', 'ok', 'provider', 'rateLimit', 'revalidatedAt']);
  assert.equal(result.rateLimit.remaining, 7);
  assert.equal(result.authMode, 'anonymous');
});

test('400, 401 and 422 are ordinary client errors without retries', async () => {
  for (const status of [400, 401, 422]) {
    let calls = 0;
    const gateway = createUpstreamGateway({ fetchImpl: async () => { calls += 1; return json({ error: true }, status); } });
    const result = await gateway.requestJson({ provider: 'npm', url: `https://registry.npmjs.org/-/v1/search?text=client-${status}` });
    assert.equal(result.ok, false);
    assert.equal(calls, 1);
  }
});
