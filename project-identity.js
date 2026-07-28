const PLATFORM_PRIORITY = {
  github: 100,
  gitlab: 90,
  codeberg: 80,
  gitee: 70,
  huggingface: 60,
  modelscope: 50,
};

const REPOSITORY_HOSTS = new Set(['github.com', 'gitlab.com', 'codeberg.org', 'gitee.com']);
const PROJECT_HOSTS = new Set([...REPOSITORY_HOSTS, 'huggingface.co', 'modelscope.cn']);
const GENERIC_NAMES = new Set(['app', 'api', 'demo', 'test', 'model', 'project', 'repo', 'server', 'web', 'tool']);

function text(value, max = 2_000) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizedPart(value) {
  return text(value, 300)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\.git$/i, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function hashText(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function canonicalProjectUrl(value) {
  const raw = text(value, 2_000);
  if (!raw) return '';
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!PROJECT_HOSTS.has(host)) return '';
    const parts = url.pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
    if (host === 'modelscope.cn' && parts[0] === 'models') parts.shift();
    if (host === 'huggingface.co' && ['models', 'datasets', 'spaces'].includes(parts[0])) parts.shift();
    const stop = parts.findIndex((part) => ['-', 'tree', 'blob', 'issues', 'pulls', 'releases', 'commits'].includes(part));
    const cleanParts = (stop >= 0 ? parts.slice(0, stop) : parts).slice(0, host === 'gitlab.com' ? 8 : 2);
    if (cleanParts.length < 2) return '';
    const path = cleanParts.join('/').replace(/\.git$/i, '').toLowerCase();
    return `${host}/${path}`;
  } catch {
    return '';
  }
}

function URLsFromText(value) {
  const output = [];
  const content = text(value, 10_000);
  for (const match of content.matchAll(/https?:\/\/[^\s<>()"'，。；]+/gi)) {
    const canonical = canonicalProjectUrl(match[0].replace(/[),.;!?]+$/g, ''));
    if (canonical) output.push(canonical);
  }
  return output;
}

export function projectSources(project) {
  if (Array.isArray(project?.sourceProjects) && project.sourceProjects.length) {
    return project.sourceProjects.flatMap((source) => projectSources(source));
  }
  return project ? [project] : [];
}

export function projectIdentitySignals(project) {
  const owner = normalizedPart(project?.owner);
  const name = normalizedPart(project?.name);
  const slug = owner && name && !GENERIC_NAMES.has(name) ? `${owner}/${name}` : '';
  const explicitUrls = [
    project?.url,
    project?.homepage,
    project?.repositoryUrl,
    project?.sourceUrl,
    ...(Array.isArray(project?.relatedUrls) ? project.relatedUrls : []),
  ].map(canonicalProjectUrl).filter(Boolean);
  const referencedUrls = unique([
    ...URLsFromText(project?.description),
    ...URLsFromText((project?.topics || []).join(' ')),
    ...explicitUrls,
  ]);
  return {
    slug,
    primaryUrl: canonicalProjectUrl(project?.url),
    referencedUrls,
  };
}

function pairMatch(a, b) {
  if (!a || !b || a.id === b.id) return null;
  const left = projectIdentitySignals(a);
  const right = projectIdentitySignals(b);
  if (left.slug && left.slug === right.slug) return { reason: 'same-owner-name', anchor: `slug:${left.slug}` };
  if (left.primaryUrl && right.referencedUrls.includes(left.primaryUrl)) return { reason: 'cross-linked-url', anchor: `url:${left.primaryUrl}` };
  if (right.primaryUrl && left.referencedUrls.includes(right.primaryUrl)) return { reason: 'cross-linked-url', anchor: `url:${right.primaryUrl}` };
  const shared = left.referencedUrls.find((url) => right.referencedUrls.includes(url));
  if (shared && (left.primaryUrl !== shared || right.primaryUrl !== shared)) return { reason: 'shared-project-url', anchor: `url:${shared}` };
  return null;
}

function sourceQuality(project) {
  const priority = PLATFORM_PRIORITY[project?.platform] || 0;
  const description = text(project?.description, 2_000).length > 30 ? 8 : 0;
  const license = /待核查|unknown|other/i.test(text(project?.license)) || !project?.license ? 0 : 5;
  const updated = Number.isFinite(Date.parse(project?.updatedAt)) ? 3 : 0;
  return priority + description + license + updated;
}

function safeDate(values, mode) {
  const dates = values.map((value) => Date.parse(value)).filter(Number.isFinite);
  if (!dates.length) return '';
  return new Date(mode === 'min' ? Math.min(...dates) : Math.max(...dates)).toISOString();
}

function primaryForGroup(group) {
  return [...group].sort((a, b) => {
    const quality = sourceQuality(b) - sourceQuality(a);
    if (quality) return quality;
    return text(a.id).localeCompare(text(b.id));
  })[0];
}

function entityFromGroup(group, matches) {
  const sources = [...group].sort((a, b) => sourceQuality(b) - sourceQuality(a));
  const primary = primaryForGroup(sources);
  const signal = projectIdentitySignals(primary);
  const anchors = unique(matches.map((match) => match?.anchor));
  const identityAnchor = anchors[0] || (signal.slug ? `slug:${signal.slug}` : `id:${primary.id}`);
  const description = [...sources].map((project) => text(project.description, 2_000)).sort((a, b) => b.length - a.length)[0] || '';
  const licenses = unique(sources.map((project) => text(project.license, 200))).filter((license) => !/待核查|unknown/i.test(license));
  const languages = unique(sources.map((project) => text(project.language, 120)));
  const topics = unique(sources.flatMap((project) => Array.isArray(project.topics) ? project.topics : [])).slice(0, 40);
  const useTypes = unique(sources.flatMap((project) => Array.isArray(project.useTypes) ? project.useTypes : [])).slice(0, 8);
  const sourcePlatforms = unique(sources.map((project) => project.platform));
  return {
    ...primary,
    description: primary.description || description,
    license: primary.license || licenses[0] || '许可证待核查',
    language: primary.language || languages[0] || '',
    topics,
    useTypes,
    createdAt: safeDate(sources.map((project) => project.createdAt), 'min') || primary.createdAt,
    updatedAt: safeDate(sources.map((project) => project.updatedAt), 'max') || primary.updatedAt,
    entityId: `entity:${hashText(identityAnchor)}`,
    identityAnchor,
    identityConfidence: sources.length > 1 ? 'high' : 'single-source',
    aliases: unique(sources.map((project) => project.id)),
    sourceProjects: sources.map((project) => ({ ...project, sourceProjects: undefined })),
    sourcePlatforms,
    sourceCount: sources.length,
    licenseVariants: unique(sources.map((project) => text(project.license, 200))),
    languages,
    dedupReasons: unique(matches.map((match) => match?.reason)),
  };
}

export function mergeProjectEntities(projects = []) {
  const flat = projectSources({ sourceProjects: Array.isArray(projects) ? projects : [] })
    .filter((project) => project?.id && project?.name && project?.url);
  const byId = [...new Map(flat.map((project) => [project.id, { ...project }])).values()];
  const parent = byId.map((_, index) => index);
  const pairReasons = new Map();
  const find = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
  };

  for (let left = 0; left < byId.length; left += 1) {
    for (let right = left + 1; right < byId.length; right += 1) {
      const match = pairMatch(byId[left], byId[right]);
      if (!match) continue;
      union(left, right);
      pairReasons.set(`${left}:${right}`, match);
    }
  }

  const groups = new Map();
  byId.forEach((project, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push({ project, index });
  });

  return [...groups.values()].map((entries) => {
    const indexes = new Set(entries.map((entry) => entry.index));
    const matches = [...pairReasons.entries()]
      .filter(([key]) => key.split(':').every((value) => indexes.has(Number(value))))
      .map(([, match]) => match);
    return entityFromGroup(entries.map((entry) => entry.project), matches);
  });
}

export function entityLookupIds(project) {
  return unique([project?.entityId, project?.id, ...(project?.aliases || []), ...projectSources(project).map((source) => source.id)]);
}

export function entitiesOverlap(left, right) {
  const leftIds = new Set(entityLookupIds(left));
  return entityLookupIds(right).some((id) => leftIds.has(id));
}

export function findEntityById(entities = [], id = '') {
  return entities.find((entity) => entityLookupIds(entity).includes(id)) || null;
}

export function deduplicationStats(projects = [], entities = mergeProjectEntities(projects)) {
  const rawCount = projectSources({ sourceProjects: projects }).length;
  return {
    rawCount,
    entityCount: entities.length,
    mergedSourceCount: Math.max(0, rawCount - entities.length),
    multiSourceEntities: entities.filter((entity) => (entity.sourceCount || 1) > 1).length,
  };
}

export { PLATFORM_PRIORITY };
