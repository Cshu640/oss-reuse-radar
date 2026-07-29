import { createHash } from 'node:crypto';

const REQUEST_TIMEOUT = 15_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PACKAGES = 5;

const OSV_ECOSYSTEMS = {
  NPM: 'npm',
  PYPI: 'PyPI',
  GO: 'Go',
  MAVEN: 'Maven',
  CARGO: 'crates.io',
  NUGET: 'NuGet',
  RUBYGEMS: 'RubyGems',
};

const IMPORTANT_CHECKS = new Set([
  'Maintained',
  'Code-Review',
  'Security-Policy',
  'Pinned-Dependencies',
  'Token-Permissions',
  'Vulnerabilities',
  'Branch-Protection',
  'Signed-Releases',
]);

function cleanText(value, max = 2000) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

function finite(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function fingerprintProject(project = {}) {
  const sources = Array.isArray(project.sourceProjects) && project.sourceProjects.length ? project.sourceProjects : [project];
  const payload = sources.map((source) => [source.id, source.url, source.updatedAt, source.license]).sort();
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 32);
}

function repoIdentifier(source = {}) {
  const platformHost = {
    github: 'github.com',
    gitlab: 'gitlab.com',
    codeberg: 'codeberg.org',
    gitee: 'gitee.com',
  }[source.platform];
  if (!platformHost || !source.owner || !source.name) return '';
  return `${platformHost}/${source.owner}/${source.name}`;
}

function projectSources(project = {}) {
  return Array.isArray(project.sourceProjects) && project.sourceProjects.length ? project.sourceProjects : [project];
}

function selectRepository(project = {}) {
  const priority = { github: 100, gitlab: 90, codeberg: 80, gitee: 70 };
  return projectSources(project)
    .filter((source) => repoIdentifier(source))
    .sort((a, b) => (priority[b.platform] || 0) - (priority[a.platform] || 0))[0] || null;
}

async function fetchJson(fetchImpl, url, options = {}, { allow404 = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetchImpl(url, {
      redirect: 'follow',
      ...options,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'OpenRadar/0.4-A (+local personal open-source trust radar)',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status} · ${new URL(url).hostname}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeScorecard(raw, provider = 'OpenSSF Scorecard') {
  if (!raw || typeof raw !== 'object') return { available: false, provider };
  const scorecard = raw.scorecard && typeof raw.scorecard === 'object' ? raw.scorecard : raw;
  const score = finite(scorecard.overallScore ?? scorecard.score ?? raw.score);
  const checks = (Array.isArray(scorecard.checks) ? scorecard.checks : Array.isArray(raw.checks) ? raw.checks : [])
    .map((check) => ({
      name: cleanText(check.name, 100),
      score: finite(check.score, -1),
      reason: cleanText(check.reason, 500),
      documentation: cleanText(check.documentation?.url || check.documentation?.shortDescription, 500),
    }))
    .filter((check) => check.name)
    .sort((a, b) => a.score - b.score);
  if (score === null && !checks.length) return { available: false, provider };
  return {
    available: true,
    provider,
    overallScore: score,
    date: cleanText(raw.date || scorecard.date || raw.generatedAt, 80),
    checks,
    importantChecks: checks.filter((check) => IMPORTANT_CHECKS.has(check.name)),
  };
}

function uniquePackageMappings(values = []) {
  const seen = new Set();
  const output = [];
  for (const item of values) {
    const key = item?.versionKey || item?.version?.versionKey || item;
    const system = cleanText(key?.system, 30).toUpperCase();
    const name = cleanText(key?.name, 300);
    const version = cleanText(key?.version, 160);
    if (!OSV_ECOSYSTEMS[system] || !name) continue;
    const id = `${system}\u0000${name}`;
    if (seen.has(id)) continue;
    seen.add(id);
    output.push({ system, name, version, relationType: cleanText(item?.relationType, 80), relationProvenance: cleanText(item?.relationProvenance, 120) });
    if (output.length >= MAX_PACKAGES) break;
  }
  return output;
}

async function resolveDefaultPackageVersion(fetchImpl, mapping) {
  try {
    const packageUrl = `https://api.deps.dev/v3/systems/${encodeURIComponent(mapping.system)}/packages/${encodeURIComponent(mapping.name)}`;
    const data = await fetchJson(fetchImpl, packageUrl, {}, { allow404: true });
    const versions = Array.isArray(data?.versions) ? data.versions : [];
    const selected = versions.find((item) => item.isDefault) || versions[0];
    const version = cleanText(selected?.versionKey?.version || mapping.version, 160);
    return { ...mapping, version, isDefault: Boolean(selected?.isDefault) };
  } catch (error) {
    return { ...mapping, error: cleanText(error?.message, 300) };
  }
}

async function fetchDepsData(fetchImpl, repositoryId) {
  if (!repositoryId || !/^(github\.com|gitlab\.com)\//.test(repositoryId)) {
    return { available: false, reason: 'deps.dev当前仅对已关联的软件包项目提供GitHub/GitLab项目数据。', packages: [] };
  }
  const encoded = encodeURIComponent(repositoryId);
  const [projectData, packageData] = await Promise.all([
    fetchJson(fetchImpl, `https://api.deps.dev/v3/projects/${encoded}`, {}, { allow404: true }).catch((error) => ({ _error: error.message })),
    fetchJson(fetchImpl, `https://api.deps.dev/v3/projects/${encoded}:packageversions`, {}, { allow404: true }).catch((error) => ({ _error: error.message })),
  ]);
  const mappings = uniquePackageMappings(packageData?.versions || []);
  const packages = await Promise.all(mappings.map((mapping) => resolveDefaultPackageVersion(fetchImpl, mapping)));
  return {
    available: Boolean(projectData || packageData),
    project: projectData && !projectData._error ? {
      projectId: cleanText(projectData.projectKey?.id || repositoryId, 400),
      openIssuesCount: finite(projectData.openIssuesCount, 0),
      starsCount: finite(projectData.starsCount, 0),
      forksCount: finite(projectData.forksCount, 0),
      license: cleanText(projectData.license, 300),
      description: cleanText(projectData.description, 1000),
      scorecard: normalizeScorecard(projectData.scorecard, 'deps.dev / OpenSSF Scorecard'),
    } : null,
    packages,
    errors: [projectData?._error, packageData?._error].filter(Boolean),
  };
}

async function fetchDirectScorecard(fetchImpl, repositoryId) {
  if (!repositoryId?.startsWith('github.com/')) return { available: false, provider: 'OpenSSF Scorecard', reason: '当前直接REST查询只用于GitHub来源。' };
  const data = await fetchJson(fetchImpl, `https://api.scorecard.dev/projects/${repositoryId}`, {}, { allow404: true });
  return normalizeScorecard(data, 'OpenSSF Scorecard');
}

async function fetchOsvData(fetchImpl, packages) {
  const queryable = packages.filter((item) => item.version && OSV_ECOSYSTEMS[item.system]);
  if (!queryable.length) {
    return { available: false, reason: 'deps.dev没有提供可精确查询的软件包默认版本。', queriedPackages: [], advisories: [] };
  }
  const response = await fetchJson(fetchImpl, 'https://api.osv.dev/v1/querybatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queries: queryable.map((item) => ({
        version: item.version,
        package: { ecosystem: OSV_ECOSYSTEMS[item.system], name: item.name },
      })),
    }),
  });
  const advisories = [];
  (response?.results || []).forEach((result, index) => {
    for (const vuln of result?.vulns || []) {
      advisories.push({
        id: cleanText(vuln.id, 160),
        modified: cleanText(vuln.modified, 80),
        package: queryable[index],
      });
    }
  });
  const unique = [...new Map(advisories.map((item) => [`${item.id}\u0000${item.package.system}\u0000${item.package.name}`, item])).values()];
  return { available: true, queriedPackages: queryable, advisories: unique, vulnerabilityCount: unique.length };
}

function checkByName(scorecard, name) {
  return scorecard?.checks?.find((check) => check.name === name) || null;
}

function buildAssessment({ scorecard, deps, osv, project }) {
  let score = 50;
  const positives = [];
  const warnings = [];
  const overall = finite(scorecard?.overallScore);
  if (overall !== null) {
    score = Math.round(overall * 10);
    positives.push(`OpenSSF Scorecard已提供${overall.toFixed(1)}/10的自动化安全实践评分。`);
  } else {
    warnings.push('没有可用的OpenSSF综合评分；这不代表项目不安全，只表示公开数据不足。');
  }

  for (const [name, label] of [
    ['Maintained', '近期维护'],
    ['Code-Review', '代码审查'],
    ['Security-Policy', '安全报告渠道'],
    ['Pinned-Dependencies', '依赖固定'],
    ['Branch-Protection', '分支保护'],
    ['Signed-Releases', '发布签名'],
  ]) {
    const check = checkByName(scorecard, name);
    if (!check || check.score < 0) continue;
    if (check.score >= 7) positives.push(`${label}信号较好（${check.score}/10）。`);
    if (check.score <= 3) warnings.push(`${label}信号偏弱（${check.score}/10）：${check.reason || '需要进一步核验'}。`);
  }

  const vulnerabilityCount = finite(osv?.vulnerabilityCount, 0) || 0;
  if (osv?.available && vulnerabilityCount === 0) positives.push(`OSV对${osv.queriedPackages.length}个已映射软件包版本未返回已知漏洞。`);
  if (vulnerabilityCount > 0) {
    score -= Math.min(40, 12 + vulnerabilityCount * 6);
    warnings.push(`OSV返回${vulnerabilityCount}条已知漏洞关联；必须核对受影响版本和可利用性。`);
  }
  if (!osv?.available) warnings.push(osv?.reason || '没有足够的软件包版本信息进行OSV精确查询。');

  if (deps?.packages?.length) positives.push(`deps.dev识别到${deps.packages.length}个与源码仓库关联的软件包。`);
  else warnings.push('deps.dev未识别到明确的软件包映射，依赖与漏洞覆盖可能不完整。');

  const license = cleanText(deps?.project?.license || project?.license, 300);
  if (license && !/unknown|待核查|other/i.test(license)) positives.push(`公开元数据显示许可证为${license}，仍需核对仓库原文与第三方资产。`);
  else warnings.push('许可证信息不足或待核查，正式使用前不可只依赖自动判断。');

  score = Math.max(0, Math.min(100, score));
  const level = vulnerabilityCount > 0 || score < 45 ? 'high' : score >= 75 && overall !== null ? 'lower' : 'medium';
  const label = { lower: '较低风险信号', medium: '中等风险信号', high: '较高风险信号' }[level];
  const recommendation = level === 'lower'
    ? '可以进入本地试用或Codex代码审计，但仍不能把自动评分当成安全认证。'
    : level === 'high'
      ? '暂不直接用于正式产品；先让Codex核对漏洞版本、依赖链、许可证与低分检查项。'
      : '适合收藏并做小范围验证；正式接入前完成依赖、许可证和维护者风险审计。';
  return { score, level, label, positives: positives.slice(0, 8), warnings: warnings.slice(0, 10), recommendation };
}

export function createTrustService({ store, fetchImpl = fetch, now = Date.now } = {}) {
  if (!store) throw new Error('Trust store is required');
  let running = false;

  return {
    async status() {
      return { enabled: true, running, providers: ['OpenSSF Scorecard', 'deps.dev', 'OSV'], store: store.status() };
    },

    async getMany(ids) {
      return store.getMany(ids);
    },

    async analyze(project, { force = false } = {}) {
      if (running) throw new Error('已有可信度审计正在运行，请稍后再试');
      const projectId = cleanText(project?.entityId || project?.id, 320);
      if (!projectId) throw new Error('项目ID缺失');
      const fingerprint = fingerprintProject(project);
      const cached = await store.get(projectId);
      const nowMs = now();
      if (!force && cached && cached.fingerprint === fingerprint && Date.parse(cached.expiresAt) > nowMs) return cached;

      running = true;
      try {
        const repository = selectRepository(project);
        const repositoryId = repoIdentifier(repository);
        if (!repository || !repositoryId) throw new Error('没有可用于安全审计的代码仓库来源');

        const [directScorecardResult, depsResult] = await Promise.allSettled([
          fetchDirectScorecard(fetchImpl, repositoryId),
          fetchDepsData(fetchImpl, repositoryId),
        ]);
        const deps = depsResult.status === 'fulfilled'
          ? depsResult.value
          : { available: false, packages: [], errors: [cleanText(depsResult.reason?.message, 300)] };
        let scorecard = directScorecardResult.status === 'fulfilled'
          ? directScorecardResult.value
          : { available: false, provider: 'OpenSSF Scorecard', error: cleanText(directScorecardResult.reason?.message, 300) };
        if (!scorecard.available && deps?.project?.scorecard?.available) scorecard = deps.project.scorecard;

        let osv;
        try {
          osv = await fetchOsvData(fetchImpl, deps.packages || []);
        } catch (error) {
          osv = { available: false, reason: cleanText(error?.message, 300), queriedPackages: deps.packages || [], advisories: [] };
        }

        const generatedAt = new Date(nowMs).toISOString();
        const report = {
          projectId,
          fingerprint,
          generatedAt,
          expiresAt: new Date(nowMs + CACHE_TTL_MS).toISOString(),
          repository: { id: repositoryId, platform: repository.platform, url: repository.url, sourceId: repository.id },
          facts: { scorecard, deps, osv },
          assessment: buildAssessment({ scorecard, deps, osv, project: repository }),
          provenance: [
            { kind: 'fact', label: '事实数据', source: 'OpenSSF Scorecard', fetchedAt: generatedAt },
            { kind: 'fact', label: '事实数据', source: 'deps.dev', fetchedAt: generatedAt },
            { kind: 'fact', label: '事实数据', source: 'OSV', fetchedAt: generatedAt },
            { kind: 'rule', label: '规则判断', source: 'OpenRadar本地规则', fetchedAt: generatedAt },
          ],
        };
        return await store.set(report);
      } finally {
        running = false;
      }
    },
  };
}
