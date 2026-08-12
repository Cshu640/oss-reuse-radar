const DEFAULT_WEIGHTS = {
  fit: 24,
  trust: 20,
  adoption: 18,
  maintenance: 16,
  license: 12,
  simplicity: 10,
};

const DEFAULT_LOCALE = 'zh-CN';

function t(key, locale = DEFAULT_LOCALE, params = {}) {
  const resources = {
    en: {
      'compare.recommendWinner': 'Currently recommended: {name}. It ranks highest on license, maintenance, real adoption, trust signals, integration simplicity, and use-case fit. Read the README, license, and dependency audit before adoption.',
      'compare.recommendEmpty': 'Choose 2 to 5 projects to compare.',
    },
    'zh-CN': {
      'compare.recommendWinner': '当前更推荐 {name}：综合许可证、维护、真实采用、可信度信号、接入简易度和对用户的适配度得分最高。正式采用前仍需阅读README、许可证和依赖审计。',
      'compare.recommendEmpty': '请先选择2至5个项目。',
    },
  };
  const table = resources[locale] || resources[DEFAULT_LOCALE];
  const template = table[key] || table[key] || key;
  return String(template).replace(/\{(\w+)\}/g, (match, name) => (Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match));
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function daysSince(value) {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return 9999;
  return Math.max(0, (Date.now() - time) / 864e5);
}

function sourceList(project) {
  return Array.isArray(project?.sourceProjects) && project.sourceProjects.length ? project.sourceProjects : [project];
}

function metricMax(project, fields) {
  return Math.max(0, ...sourceList(project).flatMap((source) => fields.map((field) => number(source?.[field]))));
}

function licenseScore(project) {
  const values = sourceList(project).map((source) => String(source?.license || '').toLowerCase());
  if (values.some((value) => /mit|apache|bsd|isc|mpl-2/.test(value))) return 92;
  if (values.some((value) => /lgpl/.test(value))) return 66;
  if (values.some((value) => /agpl|gpl/.test(value))) return 45;
  if (values.some((value) => /待核查|unknown|other|noassertion/.test(value))) return 28;
  return values.some(Boolean) ? 58 : 25;
}

function maintenanceScore(project) {
  const days = daysSince(project?.updatedAt);
  if (days <= 14) return 96;
  if (days <= 45) return 86;
  if (days <= 120) return 72;
  if (days <= 365) return 52;
  if (days <= 730) return 32;
  return 15;
}

function adoptionScore(project) {
  const stars = metricMax(project, ['stars']);
  const downloads = metricMax(project, ['downloads', 'recentDownloads']);
  const dependents = metricMax(project, ['dependentPackages', 'dependentRepositories']);
  const raw = Math.log10(1 + stars) * 16 + Math.log10(1 + downloads) * 13 + Math.log10(1 + dependents) * 15;
  return clamp(raw);
}

function trustScore(report) {
  const score = number(report?.assessment?.score);
  return score > 0 ? clamp(score) : 50;
}

function fitScore(project) {
  const value = number(project?.score);
  if (value > 0) return clamp(value);
  const uses = Array.isArray(project?.useTypes) ? project.useTypes : [];
  return clamp(50 + (uses.includes('codex') ? 15 : 0) + (uses.includes('component') ? 10 : 0) + (uses.includes('direct') ? 5 : 0));
}

function simplicityScore(project) {
  const sources = sourceList(project);
  const isPackage = sources.some((source) => source?.packageSystem);
  const selfhost = (project?.useTypes || []).includes('selfhost');
  const heavy = /docker|kubernetes|cuda|gpu|distributed/i.test(`${project?.description || ''} ${(project?.topics || []).join(' ')}`);
  return clamp(68 + (isPackage ? 18 : 0) - (selfhost ? 6 : 0) - (heavy ? 24 : 0));
}

export function comparisonFacts(project, trustReport = null) {
  const sources = sourceList(project);
  return {
    id: project?.entityId || project?.id,
    name: project?.name || '',
    owner: project?.owner || '',
    platforms: [...new Set(sources.map((source) => source?.platform).filter(Boolean))],
    sourceCount: sources.length,
    license: project?.license || '许可证待核查',
    language: project?.language || '',
    updatedAt: project?.updatedAt || '',
    stars: metricMax(project, ['stars']),
    downloads: metricMax(project, ['downloads', 'recentDownloads']),
    dependents: metricMax(project, ['dependentPackages', 'dependentRepositories']),
    version: sources.find((source) => source?.version)?.version || '',
    scores: {
      fit: fitScore(project),
      trust: trustScore(trustReport),
      adoption: adoptionScore(project),
      maintenance: maintenanceScore(project),
      license: licenseScore(project),
      simplicity: simplicityScore(project),
    },
  };
}

export function compareProjects(items = [], trustReports = {}, weights = DEFAULT_WEIGHTS, locale = DEFAULT_LOCALE) {
  const rows = items.slice(0, 5).map((project) => {
    const ids = [project?.entityId, project?.id, ...(project?.aliases || [])].filter(Boolean);
    const trust = ids.map((id) => trustReports[id]).find(Boolean) || null;
    const facts = comparisonFacts(project, trust);
    const totalWeight = Object.values(weights).reduce((sum, value) => sum + number(value), 0) || 1;
    const weighted = Object.entries(weights).reduce((sum, [key, weight]) => sum + number(facts.scores[key]) * number(weight), 0) / totalWeight;
    return { project, facts, score: Math.round(weighted) };
  }).sort((a, b) => b.score - a.score || a.facts.name.localeCompare(b.facts.name));
  const winner = rows[0] || null;
  return {
    rows,
    winner,
    recommendation: winner
      ? t('compare.recommendWinner', locale, { name: `${winner.facts.owner ? `${winner.facts.owner}/` : ''}${winner.facts.name}` })
      : t('compare.recommendEmpty', locale),
    weights: { ...weights },
  };
}

export { DEFAULT_WEIGHTS };
