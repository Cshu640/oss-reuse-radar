import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import net from 'node:net';

const ROOT_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ARTIFACT_PATH = join(ROOT_DIR, 'artifacts', 'live-upstream-acceptance.json');
const PROJECT_QUERY = 'http client';
const PROJECT_PROVIDERS = ['github', 'huggingface', 'gitlab', 'codeberg', 'modelscope'];
const PACKAGE_PROBES = [
  { ecosystem: 'npm', query: 'axios' },
  { ecosystem: 'pypi', query: 'requests' },
  { ecosystem: 'crates', query: 'serde' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function unusedPort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

function digestProjects(body) {
  const projects = Array.isArray(body?.projects) ? body.projects : Array.isArray(body?.data) ? body.data : [];
  return createHash('sha256').update(JSON.stringify(projects)).digest('hex');
}

function countProjects(body) {
  if (Array.isArray(body?.projects)) return body.projects.length;
  if (Array.isArray(body?.data)) return body.data.length;
  return 0;
}

function usageSignal(body) {
  const projects = Array.isArray(body?.projects) ? body.projects : [];
  const fieldCounts = ['downloads', 'recentDownloads', 'dependentPackages', 'dependentRepositories']
    .map((field) => ({ field, count: projects.filter((project) => Number(project?.[field]) > 0).length }))
    .filter((item) => item.count > 0);
  return { fields: fieldCounts, projectCount: projects.length };
}

async function fetchLocal(baseUrl, path, timeoutMs = 45_000) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;
    let parseError = '';
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        parseError = 'invalid-json';
      }
    }
    return { httpStatus: response.status, body, parseError, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      httpStatus: 0,
      body: null,
      parseError: error?.name === 'AbortError' ? 'timeout' : 'network-error',
      latencyMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

function providerCategory(result, { packageRoute = false } = {}) {
  if (result.parseError === 'timeout' || result.parseError === 'network-error') return 'FAIL_NETWORK';
  if (result.parseError) return 'FAIL_PARSE';
  if (!result.body || typeof result.body !== 'object') return 'FAIL_PRODUCT_CONTRACT';
  if (packageRoute) {
    if (result.httpStatus >= 500) return 'FAIL_UPSTREAM_HTTP';
    if (!Array.isArray(result.body.projects)) return 'FAIL_PRODUCT_CONTRACT';
    return result.body.projects.length ? 'PASS_LIVE' : 'PASS_LIVE_EMPTY';
  }
  if (!Array.isArray(result.body.projects)) return 'FAIL_PRODUCT_CONTRACT';
  if (result.body.cacheStatus === 'stale' && result.body.degraded) return 'DEGRADED_WITH_STALE_CACHE';
  if (result.body.degraded) {
    if (/network|timeout/i.test(String(result.body.degradedReason || ''))) return 'FAIL_NETWORK';
    if (/fallback/i.test(String(result.body.degradedReason || ''))) return 'DEGRADED_FALLBACK';
    return 'FAIL_UPSTREAM_HTTP';
  }
  return result.body.ok === true
    ? (result.body.projects.length ? 'PASS_LIVE' : 'PASS_LIVE_EMPTY')
    : 'FAIL_PRODUCT_CONTRACT';
}

function projectRecord(provider, query, result) {
  const body = result.body || {};
  return {
    provider,
    query,
    httpStatus: result.httpStatus,
    ok: body.ok === true,
    resultCount: countProjects(body),
    cacheStatus: body.cacheStatus || 'unknown',
    degraded: Boolean(body.degraded),
    degradedReason: body.degradedReason || null,
    authMode: body.authMode || 'unknown',
    latencyMs: result.latencyMs,
    fetchedAt: body.fetchedAt || '',
    rateLimit: body.rateLimit || null,
    category: providerCategory(result),
    notes: [
      'Observed through local /api/upstream/search -> server gateway -> provider.',
      'httpStatus is the local route status; raw upstream status is intentionally omitted by the sanitized contract.',
      result.parseError ? `transport=${result.parseError}` : '',
    ].filter(Boolean),
  };
}

function packageRecord(probe, result) {
  const body = result.body || {};
  const category = providerCategory(result, { packageRoute: true });
  return {
    provider: probe.ecosystem,
    query: probe.query,
    httpStatus: result.httpStatus,
    ok: result.httpStatus >= 200 && result.httpStatus < 300 && Array.isArray(body.projects),
    resultCount: countProjects(body),
    cacheStatus: body.cached ? 'fresh' : 'miss',
    degraded: false,
    degradedReason: null,
    authMode: 'not-applicable',
    latencyMs: result.latencyMs,
    fetchedAt: '',
    rateLimit: null,
    category,
    parse: Array.isArray(body.projects) ? 'projects-array' : result.parseError || 'missing-projects-array',
    usageSignal: usageSignal(body),
    notes: [
      'Observed through local /api/packages/search -> package service -> gateway-backed registry calls.',
      'PyPI download values, when present, are auxiliary adoption signals and not official precise totals.',
      result.parseError ? `transport=${result.parseError}` : '',
    ].filter(Boolean),
  };
}

async function waitForHealth(baseUrl, child) {
  let last = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null || child.signalCode) break;
    last = await fetchLocal(baseUrl, '/api/health', 5_000);
    if (last.httpStatus === 200 && last.body?.status === 'ok') return last;
    await sleep(500);
  }
  return last || { httpStatus: 0, body: null, parseError: 'server-not-ready', latencyMs: 0 };
}

function stopChild(child) {
  if (!child || child.killed) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    child.once('exit', finish);
    child.kill();
    setTimeout(finish, 2_000).unref();
  });
}

async function rehit(baseUrl, label, path) {
  const first = await fetchLocal(baseUrl, path);
  const second = await fetchLocal(baseUrl, path);
  const firstBody = first.body || {};
  const secondBody = second.body || {};
  const firstCache = firstBody.cacheStatus || (firstBody.cached ? 'fresh' : 'miss');
  const secondCache = secondBody.cacheStatus || (secondBody.cached ? 'fresh' : 'miss');
  return {
    request: label,
    first: { httpStatus: first.httpStatus, cacheStatus: firstCache, fetchedAt: firstBody.fetchedAt || '', latencyMs: first.latencyMs },
    second: { httpStatus: second.httpStatus, cacheStatus: secondCache, fetchedAt: secondBody.fetchedAt || '', latencyMs: second.latencyMs },
    sameData: digestProjects(firstBody) === digestProjects(secondBody),
    secondFaster: second.latencyMs < first.latencyMs,
    verified: first.httpStatus === 200 && second.httpStatus === 200 && firstCache !== 'unknown' && secondCache === 'fresh' && digestProjects(firstBody) === digestProjects(secondBody),
  };
}

async function main() {
  const port = await unusedPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: ROOT_DIR,
    // The mandatory first GitHub check must be anonymous. An existing token is
    // deliberately not consumed by this harness; authenticated mode remains
    // an explicit optional follow-up, never a requirement for public beta.
    env: { ...process.env, GITHUB_TOKEN: '', OPENRADAR_AUTO_COLLECT: '0', PORT: String(port) },
    stdio: 'ignore',
    windowsHide: true,
  });
  const evidence = {
    schemaVersion: 'oss-0q1-live-upstream-acceptance-v1',
    generatedAt: new Date().toISOString(),
    environment: {
      os: `${process.platform}-${process.arch}`,
      node: process.versions.node,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      execution: 'node-native-windows-harness',
      networkBoundary: 'This run records the current Windows/Codex shell network as observed; rerun the same CMD from an ordinary Windows Terminal if needed.',
    },
    server: { started: false, port, localBase: '127.0.0.1:<ephemeral-port>', autoCollect: false, chain: 'local server -> /api/upstream/* or /api/packages/* -> gateway -> provider' },
    github: { anonymous: null, authenticated: 'authenticated_mode_not_tested' },
    projects: [],
    packages: [],
    gitee: null,
    cacheRehit: [],
    statusSnapshot: null,
    browser: { status: 'not-run-by-node-harness' },
    blockers: [],
  };
  try {
    const health = await waitForHealth(baseUrl, child);
    evidence.server.started = health.httpStatus === 200 && health.body?.status === 'ok';
    if (!evidence.server.started) {
      evidence.blockers.push({ category: 'FAIL_PRODUCT_CONTRACT', reason: health.parseError || 'server-not-ready' });
    } else {
      for (const provider of PROJECT_PROVIDERS) {
        const result = await fetchLocal(baseUrl, `/api/upstream/search?provider=${encodeURIComponent(provider)}&q=${encodeURIComponent(PROJECT_QUERY)}&limit=3`);
        const record = projectRecord(provider, PROJECT_QUERY, result);
        evidence.projects.push(record);
        if (provider === 'github') evidence.github.anonymous = record.authMode === 'anonymous' ? record : { ...record, notes: [...record.notes, 'GITHUB_TOKEN was present in the server environment; anonymous mode is not established by this run.'] };
      }
      for (const probe of PACKAGE_PROBES) {
        const result = await fetchLocal(baseUrl, `/api/packages/search?ecosystem=${encodeURIComponent(probe.ecosystem)}&q=${encodeURIComponent(probe.query)}&limit=3`);
        evidence.packages.push(packageRecord(probe, result));
      }
      const giteeResult = await fetchLocal(baseUrl, `/api/gitee/search?q=${encodeURIComponent(PROJECT_QUERY)}&limit=3`, 60_000);
      const giteeBody = giteeResult.body || {};
      evidence.gitee = {
        provider: 'gitee',
        query: PROJECT_QUERY,
        httpStatus: giteeResult.httpStatus,
        ok: giteeBody.ok === true,
        resultCount: countProjects(giteeBody),
        source: giteeBody.source || '',
        degraded: Boolean(giteeBody.degraded),
        degradedReason: giteeBody.degradedReason || null,
        category: giteeBody.degraded || /external-search/i.test(String(giteeBody.source || '')) ? 'DEGRADED_FALLBACK' : (giteeResult.httpStatus === 200 ? 'PASS_LIVE_EMPTY' : 'FAIL_PRODUCT_CONTRACT'),
        notes: ['Gitee is recorded as a fallback-only contract and is not counted as a live platform or growth signal.'].concat(giteeResult.parseError ? `transport=${giteeResult.parseError}` : []),
      };
      evidence.cacheRehit.push(await rehit(baseUrl, 'github:http client', `/api/upstream/search?provider=github&q=${encodeURIComponent(PROJECT_QUERY)}&limit=3`));
      evidence.cacheRehit.push(await rehit(baseUrl, 'huggingface:http client', `/api/upstream/search?provider=huggingface&q=${encodeURIComponent(PROJECT_QUERY)}&limit=3`));
      evidence.cacheRehit.push(await rehit(baseUrl, 'npm:axios', '/api/packages/search?ecosystem=npm&q=axios&limit=3'));
      const status = await fetchLocal(baseUrl, '/api/upstream/status', 10_000);
      if (status.httpStatus === 200 && status.body?.providers) {
        evidence.statusSnapshot = Object.fromEntries(Object.entries(status.body.providers).map(([provider, value]) => [provider, {
          authMode: value.authMode || 'unknown',
          degraded: Boolean(value.degraded),
          degradedReason: value.degradedReason || null,
          lastSuccessAt: value.lastSuccessAt || '',
          lastError: value.lastError || '',
          rateLimit: value.rateLimit || null,
          cooldownUntil: value.cooldownUntil || '',
        }]));
        const relatedProviders = {
          npm: ['npm', 'ecosyste.ms'],
          pypi: ['pypi', 'pypistats', 'ecosyste.ms'],
          crates: ['crates', 'ecosyste.ms'],
        };
        for (const record of evidence.packages) {
          if (record.category !== 'PASS_LIVE_EMPTY') continue;
          const states = (relatedProviders[record.provider] || []).map((name) => evidence.statusSnapshot[name]).filter(Boolean);
          const allFailed = states.length > 0 && states.every((state) => state.degraded && !state.lastSuccessAt);
          if (allFailed) {
            const hasNetworkFailure = states.some((state) => /network|timeout/i.test(String(state.degradedReason || state.lastError || '')));
            record.category = hasNetworkFailure ? 'FAIL_NETWORK' : 'FAIL_UPSTREAM_HTTP';
            record.notes.push('The local package route returned an empty array while all observed related gateway providers were degraded; recorded as provider failure, not a valid empty result.');
          }
        }
      }
    }
  } finally {
    await stopChild(child);
  }
  evidence.server.stopped = true;
  evidence.server.childOwnership = 'only the child spawned by this harness was stopped';
  await mkdir(dirname(ARTIFACT_PATH), { recursive: true });
  await writeFile(ARTIFACT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  const summary = {
    artifact: 'artifacts/live-upstream-acceptance.json',
    serverStarted: evidence.server.started,
    projectCategories: Object.fromEntries(evidence.projects.map((item) => [item.provider, item.category])),
    packageCategories: Object.fromEntries(evidence.packages.map((item) => [item.provider, item.category])),
    giteeCategory: evidence.gitee?.category || 'NOT_TESTED_ENVIRONMENT_BLOCKED',
    cacheVerified: evidence.cacheRehit.filter((item) => item.verified).map((item) => item.request),
    githubAuthMode: evidence.github.anonymous?.authMode || 'not-observed',
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!evidence.server.started) process.exitCode = 2;
}

main().catch((error) => {
  process.stderr.write(`live acceptance harness failed: ${error?.name || 'Error'}\n`);
  process.exitCode = 2;
});
