const REQUEST_TIMEOUT = 12000;

export const platformCatalog = {
  github: {
    label: 'GitHub',
    shortLabel: 'GitHub',
    primaryField: 'stars',
    primaryLabel: 'Stars',
    secondaryField: 'forks',
    secondaryLabel: 'Forks',
    searchQueries: 3,
    searchLimit: 12,
    fallbackUrl: (query) => `https://github.com/search?q=${encodeURIComponent(query)}&type=repositories`,
  },
  huggingface: {
    label: 'Hugging Face',
    shortLabel: 'Hugging Face',
    primaryField: 'likes',
    primaryLabel: 'Likes',
    secondaryField: 'downloads',
    secondaryLabel: 'Downloads',
    searchQueries: 2,
    searchLimit: 12,
    fallbackUrl: (query) => `https://huggingface.co/models?search=${encodeURIComponent(query)}`,
  },
  gitlab: {
    label: 'GitLab',
    shortLabel: 'GitLab',
    primaryField: 'stars',
    primaryLabel: 'Stars',
    secondaryField: 'forks',
    secondaryLabel: 'Forks',
    searchQueries: 2,
    searchLimit: 12,
    fallbackUrl: (query) => `https://gitlab.com/search?search=${encodeURIComponent(query)}&scope=projects`,
  },
  codeberg: {
    label: 'Codeberg',
    shortLabel: 'Codeberg',
    primaryField: 'stars',
    primaryLabel: 'Stars',
    secondaryField: 'forks',
    secondaryLabel: 'Forks',
    searchQueries: 2,
    searchLimit: 12,
    fallbackUrl: (query) => `https://codeberg.org/explore/repos?q=${encodeURIComponent(query)}&sort=recentupdate`,
  },
  gitee: {
    label: 'Gitee',
    shortLabel: 'Gitee',
    primaryField: 'stars',
    primaryLabel: 'Stars',
    secondaryField: 'forks',
    secondaryLabel: 'Forks',
    searchQueries: 1,
    searchLimit: 12,
    limited: true,
    fallbackUrl: (query) => `https://so.gitee.com/?q=${encodeURIComponent(query)}&type=repository&sort=watches_count`,
  },
  modelscope: {
    label: 'ModelScope',
    shortLabel: 'ModelScope',
    primaryField: 'likes',
    primaryLabel: 'Likes',
    secondaryField: 'downloads',
    secondaryLabel: 'Downloads',
    searchQueries: 2,
    searchLimit: 12,
    fallbackUrl: (query) => `https://modelscope.cn/models?name=${encodeURIComponent(query)}`,
  },
  npm: {
    label: 'npm',
    shortLabel: 'npm',
    primaryField: 'downloads',
    primaryLabel: '月下载',
    secondaryField: 'dependentRepositories',
    secondaryLabel: '下游仓库',
    searchQueries: 2,
    searchLimit: 12,
    packagePlatform: true,
    fallbackUrl: (query) => `https://www.npmjs.com/search?q=${encodeURIComponent(query)}`,
  },
  pypi: {
    label: 'PyPI',
    shortLabel: 'PyPI',
    primaryField: 'downloads',
    primaryLabel: '月下载',
    secondaryField: 'dependentRepositories',
    secondaryLabel: '下游仓库',
    searchQueries: 2,
    searchLimit: 12,
    packagePlatform: true,
    fallbackUrl: (query) => `https://pypi.org/search/?q=${encodeURIComponent(query)}`,
  },
  crates: {
    label: 'crates.io',
    shortLabel: 'crates',
    primaryField: 'downloads',
    primaryLabel: '累计下载',
    secondaryField: 'recentDownloads',
    secondaryLabel: '近期下载',
    searchQueries: 2,
    searchLimit: 12,
    packagePlatform: true,
    fallbackUrl: (query) => `https://crates.io/search?q=${encodeURIComponent(query)}`,
  },
};

export const platformIds = Object.keys(platformCatalog);

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('请求超时');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function array(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function mapProjects(value, mapper) {
  return array(value).map(mapper).filter((project) => project?.id && project?.name && project?.url);
}

function splitId(id = '') {
  const [owner = '', ...name] = String(id).split('/');
  return { owner, name: name.join('/') || String(id) };
}

function licenseName(value) {
  if (!value) return '许可证待核查';
  if (typeof value === 'string') return value;
  return value.spdx_id || value.key || value.name || value.title || '许可证待核查';
}

export function fromGitHub(repository) {
  return {
    id: `github:${repository.full_name}`,
    platform: 'github',
    name: repository.name,
    owner: repository.owner?.login || '',
    description: repository.description || '',
    url: repository.html_url,
    homepage: repository.homepage || '',
    repositoryUrl: repository.html_url,
    avatar: repository.owner?.avatar_url || '',
    stars: number(repository.stargazers_count),
    forks: number(repository.forks_count),
    language: repository.language || '',
    license: licenseName(repository.license),
    updatedAt: repository.pushed_at || repository.updated_at,
    createdAt: repository.created_at,
    topics: array(repository.topics),
  };
}

export function fromHuggingFace(model) {
  const identity = splitId(model.id);
  return {
    id: `huggingface:${model.id}`,
    platform: 'huggingface',
    name: identity.name,
    owner: identity.owner,
    description: `${model.pipeline_tag ? `任务：${model.pipeline_tag}。` : ''}${array(model.tags).slice(0, 4).join(' · ')}`,
    url: `https://huggingface.co/${model.id}`,
    homepage: model.homepage || '',
    repositoryUrl: model.repositoryUrl || model.repository_url || model.github_url || model.github || '',
    relatedUrls: array(model.relatedUrls || model.related_urls),
    likes: number(model.likes),
    downloads: number(model.downloads),
    language: model.library_name || model.pipeline_tag || '',
    license: array(model.tags).find((tag) => tag.startsWith('license:'))?.replace('license:', '') || '许可证待核查',
    updatedAt: model.lastModified || model.last_modified || new Date().toISOString(),
    createdAt: model.createdAt || model.created_at || model.lastModified,
    topics: array(model.tags),
  };
}

export function fromGitLab(project) {
  const fullName = project.path_with_namespace || project.name_with_namespace || project.path || project.name;
  const identity = splitId(fullName);
  return {
    id: `gitlab:${fullName}`,
    platform: 'gitlab',
    name: project.name || identity.name,
    owner: project.namespace?.full_path || identity.owner,
    description: project.description || '',
    url: project.web_url || `https://gitlab.com/${fullName}`,
    homepage: project.web_url || '',
    repositoryUrl: project.web_url || '',
    avatar: project.avatar_url || '',
    stars: number(project.star_count),
    forks: number(project.forks_count),
    language: '',
    license: licenseName(project.license),
    updatedAt: project.last_activity_at || project.updated_at,
    createdAt: project.created_at,
    topics: array(project.topics || project.tag_list),
  };
}

export function fromCodeberg(repository) {
  const fullName = repository.full_name || `${repository.owner?.login || ''}/${repository.name || ''}`.replace(/^\//, '');
  const identity = splitId(fullName);
  return {
    id: `codeberg:${fullName}`,
    platform: 'codeberg',
    name: repository.name || identity.name,
    owner: repository.owner?.login || identity.owner,
    description: repository.description || '',
    url: repository.html_url || `https://codeberg.org/${fullName}`,
    homepage: repository.website || '',
    repositoryUrl: repository.html_url || `https://codeberg.org/${fullName}`,
    avatar: repository.owner?.avatar_url || '',
    stars: number(repository.stars_count ?? repository.stargazers_count),
    forks: number(repository.forks_count),
    language: repository.language || '',
    license: licenseName(repository.license),
    updatedAt: repository.updated_at,
    createdAt: repository.created_at,
    topics: array(repository.topics),
  };
}

export function fromGitee(repository) {
  const fullName = repository.full_name || repository.human_name || `${repository.owner?.login || ''}/${repository.path || repository.name || ''}`.replace(/^\//, '');
  const identity = splitId(fullName);
  return {
    id: `gitee:${fullName}`,
    platform: 'gitee',
    name: repository.name || repository.path || identity.name,
    owner: repository.owner?.login || identity.owner,
    description: repository.description || '',
    url: repository.html_url || `https://gitee.com/${fullName}`,
    homepage: repository.homepage || '',
    repositoryUrl: repository.html_url || `https://gitee.com/${fullName}`,
    avatar: repository.owner?.avatar_url || '',
    stars: number(repository.stargazers_count ?? repository.stars_count),
    forks: number(repository.forks_count),
    language: repository.language || '',
    license: licenseName(repository.license),
    updatedAt: repository.pushed_at || repository.updated_at || repository.last_push_at,
    createdAt: repository.created_at,
    topics: array(repository.topics || repository.tag_list || repository.project_labels),
  };
}

export function fromModelScope(model) {
  const modelId = model.id || model.model_id || model.path || model.Path || model.name;
  const identity = splitId(modelId);
  const tasks = array(model.tasks || model.Tasks || model.pipeline_tags);
  const tags = array(model.tags || model.Tags);
  return {
    id: `modelscope:${modelId}`,
    platform: 'modelscope',
    name: identity.name,
    owner: identity.owner,
    description: model.description || model.summary || (tasks.length ? `任务：${tasks.slice(0, 3).join(' · ')}` : ''),
    url: `https://modelscope.cn/models/${modelId}`,
    homepage: model.homepage || model.Homepage || '',
    repositoryUrl: model.repository_url || model.repositoryUrl || model.github_url || model.GitHubUrl || '',
    relatedUrls: array(model.related_urls || model.RelatedUrls),
    avatar: model.avatar_url || model.owner?.avatar_url || '',
    likes: number(model.likes ?? model.Likes),
    downloads: number(model.downloads ?? model.Downloads),
    language: model.library || model.library_name || model.framework || tasks[0] || '',
    license: licenseName(model.license || model.License),
    updatedAt: model.last_modified || model.lastModified || model.updated_at || model.UpdatedAt || new Date().toISOString(),
    createdAt: model.created_at || model.createdAt || model.CreatedAt || model.last_modified || new Date().toISOString(),
    topics: [...tasks, ...tags, model.model_type].filter(Boolean),
  };
}

function platformDegraded(message, badge = '外部搜索') {
  const error = new Error(message);
  error.degraded = true;
  error.badge = badge;
  return error;
}

async function searchGitee(query, limit, mode = 'search') {
  const proxyUrl = `/api/gitee/search?q=${encodeURIComponent(query)}&limit=${limit}${mode === 'radar' ? '&mode=radar' : ''}`;
  try {
    const data = await fetchJson(proxyUrl, { headers: { Accept: 'application/json' } });
    const projects = mapProjects(data?.projects, fromGitee).map((project) => ({
      ...project,
      sourceMode: data?.source || 'local-proxy',
      sourceWarning: data?.warning || '',
    }));
    if (projects.length) return projects;
    if (data?.degraded) throw platformDegraded(data.warning || 'Gitee已降级为外部搜索入口');
    if (Array.isArray(data?.projects)) return projects;
  } catch (error) {
    if (error?.degraded) throw error;
    throw new Error(`Gitee兼容通道不可用：${error?.message || error}。请使用 node server.mjs 启动OpenRadar`);
  }
}

async function searchUpstream(provider, query, limit) {
  const data = await fetchJson(`/api/upstream/search?provider=${encodeURIComponent(provider)}&q=${encodeURIComponent(query)}&limit=${limit}`, { headers: { Accept: 'application/json' } });
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  if (!data?.ok && !projects.length) throw platformDegraded(data?.degradedReason || '上游暂不可用', data?.cacheStatus === 'stale' ? '过期缓存' : '上游不可用');
  return annotateUpstreamProjects(projects, data);
}

function annotateUpstreamProjects(projects, envelope) {
  const cacheStatus = envelope?.cacheStatus || 'miss';
  const sourceWarning = envelope?.degraded
    ? '上游当前不可用，显示有限缓存（非实时）'
    : cacheStatus === 'fresh'
      ? '服务端缓存结果（非实时）'
      : cacheStatus === 'revalidated'
        ? '已使用条件请求重新验证'
        : '';
  return projects.map((project) => ({
    ...project,
    sourceCacheStatus: cacheStatus,
    sourceDegraded: Boolean(envelope?.degraded),
    sourceWarning: [project.sourceWarning, sourceWarning].filter(Boolean).join('；'),
  }));
}

async function searchPackageEcosystem(ecosystem, query, limit) {
  const data = await fetchJson(`/api/packages/search?ecosystem=${encodeURIComponent(ecosystem)}&q=${encodeURIComponent(query)}&limit=${limit}`, { headers: { Accept: 'application/json' } });
  return mapProjects(data?.projects, (project) => ({ ...project, platform: ecosystem }));
}

const searchers = {
  github: (query, limit) => searchUpstream('github', query, limit),
  huggingface: (query, limit) => searchUpstream('huggingface', query, limit),
  gitlab: (query, limit) => searchUpstream('gitlab', query, limit),
  codeberg: (query, limit) => searchUpstream('codeberg', query, limit),
  gitee: searchGitee,
  modelscope: (query, limit) => searchUpstream('modelscope', query, limit),
  npm: (query, limit) => searchPackageEcosystem('npm', query, limit),
  pypi: (query, limit) => searchPackageEcosystem('pypi', query, limit),
  crates: (query, limit) => searchPackageEcosystem('crates', query, limit),
};

export async function searchPlatform(platformId, query, limit) {
  const searcher = searchers[platformId];
  if (!searcher) throw new Error(`未知平台：${platformId}`);
  return searcher(query, limit || platformCatalog[platformId].searchLimit);
}

export async function radarPlatform(platformId) {
  if (platformId === 'gitee') {
    return searchGitee('开源', 18, 'radar');
  }

  if (['github', 'huggingface', 'gitlab', 'codeberg', 'modelscope'].includes(platformId)) {
    const data = await fetchJson(`/api/upstream/radar?provider=${encodeURIComponent(platformId)}&limit=18`, { headers: { Accept: 'application/json' } });
    const projects = Array.isArray(data?.projects) ? data.projects : [];
    if (!data?.ok && !projects.length) throw platformDegraded(data?.degradedReason || '上游暂不可用', data?.cacheStatus === 'stale' ? '过期缓存' : '上游不可用');
    return annotateUpstreamProjects(projects, data);
  }

  if (['npm', 'pypi', 'crates'].includes(platformId)) {
    const data = await fetchJson(`/api/packages/radar?ecosystem=${encodeURIComponent(platformId)}&limit=18`, { headers: { Accept: 'application/json' } });
    return mapProjects(data?.projects, (project) => ({ ...project, platform: platformId }));
  }

  throw new Error(`未知平台：${platformId}`);
}
