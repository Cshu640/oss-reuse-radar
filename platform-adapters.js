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

function fromGitHub(repository) {
  return {
    id: `github:${repository.full_name}`,
    platform: 'github',
    name: repository.name,
    owner: repository.owner?.login || '',
    description: repository.description || '',
    url: repository.html_url,
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

function fromHuggingFace(model) {
  const identity = splitId(model.id);
  return {
    id: `huggingface:${model.id}`,
    platform: 'huggingface',
    name: identity.name,
    owner: identity.owner,
    description: `${model.pipeline_tag ? `任务：${model.pipeline_tag}。` : ''}${array(model.tags).slice(0, 4).join(' · ')}`,
    url: `https://huggingface.co/${model.id}`,
    likes: number(model.likes),
    downloads: number(model.downloads),
    language: model.library_name || model.pipeline_tag || '',
    license: array(model.tags).find((tag) => tag.startsWith('license:'))?.replace('license:', '') || '许可证待核查',
    updatedAt: model.lastModified || model.last_modified || new Date().toISOString(),
    createdAt: model.createdAt || model.created_at || model.lastModified,
    topics: array(model.tags),
  };
}

function fromGitLab(project) {
  const fullName = project.path_with_namespace || project.name_with_namespace || project.path || project.name;
  const identity = splitId(fullName);
  return {
    id: `gitlab:${fullName}`,
    platform: 'gitlab',
    name: project.name || identity.name,
    owner: project.namespace?.full_path || identity.owner,
    description: project.description || '',
    url: project.web_url || `https://gitlab.com/${fullName}`,
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

function fromCodeberg(repository) {
  const fullName = repository.full_name || `${repository.owner?.login || ''}/${repository.name || ''}`.replace(/^\//, '');
  const identity = splitId(fullName);
  return {
    id: `codeberg:${fullName}`,
    platform: 'codeberg',
    name: repository.name || identity.name,
    owner: repository.owner?.login || identity.owner,
    description: repository.description || '',
    url: repository.html_url || `https://codeberg.org/${fullName}`,
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

function fromGitee(repository) {
  const fullName = repository.full_name || repository.human_name || `${repository.owner?.login || ''}/${repository.path || repository.name || ''}`.replace(/^\//, '');
  const identity = splitId(fullName);
  return {
    id: `gitee:${fullName}`,
    platform: 'gitee',
    name: repository.name || repository.path || identity.name,
    owner: repository.owner?.login || identity.owner,
    description: repository.description || '',
    url: repository.html_url || `https://gitee.com/${fullName}`,
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

function fromModelScope(model) {
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

async function searchGitHub(query, limit) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`${query} archived:false`)}&sort=stars&order=desc&per_page=${limit}`;
  const data = await fetchJson(url, { headers: { Accept: 'application/vnd.github+json' } });
  return mapProjects(data.items, fromGitHub);
}

async function searchHuggingFace(query, limit) {
  const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=${limit}&full=false`;
  const data = await fetchJson(url);
  return mapProjects(data, fromHuggingFace);
}

async function searchGitLab(query, limit) {
  const url = `https://gitlab.com/api/v4/projects?search=${encodeURIComponent(query)}&visibility=public&order_by=star_count&sort=desc&per_page=${limit}&simple=false`;
  const data = await fetchJson(url);
  return mapProjects(data, fromGitLab);
}

async function searchCodeberg(query, limit) {
  const url = `https://codeberg.org/api/v1/repos/search?q=${encodeURIComponent(query)}&sort=updated&order=desc&limit=${limit}`;
  const data = await fetchJson(url);
  return mapProjects(data.data || data, fromCodeberg);
}


function platformDegraded(message, badge = '外部搜索') {
  const error = new Error(message);
  error.degraded = true;
  error.badge = badge;
  return error;
}

async function searchGitee(query, limit, mode = 'search') {
  const proxyUrl = `/api/gitee/search?q=${encodeURIComponent(query)}&limit=${limit}${mode === 'radar' ? '&mode=radar' : ''}`;
  let proxyError;
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
    proxyError = error;
  }

  try {
    const directUrl = `https://gitee.com/api/v5/search/repositories?q=${encodeURIComponent(query)}&sort=stars_count&order=desc&per_page=${limit}`;
    const data = await fetchJson(directUrl, { headers: { Accept: 'application/json' } });
    return mapProjects(data, fromGitee);
  } catch (directError) {
    throw new Error(`Gitee兼容通道不可用：${proxyError?.message || '本地代理未启动'}；浏览器直连：${directError?.message || directError}。请使用 node server.mjs 启动OpenRadar`);
  }
}

async function searchModelScope(query, limit) {
  const url = `https://modelscope.cn/openapi/v1/models?search=${encodeURIComponent(query)}&sort=downloads&page_size=${limit}`;
  const data = await fetchJson(url, { headers: { Accept: 'application/json' } });
  return mapProjects(data?.data?.models || data?.models || data?.data, fromModelScope);
}

const searchers = {
  github: searchGitHub,
  huggingface: searchHuggingFace,
  gitlab: searchGitLab,
  codeberg: searchCodeberg,
  gitee: searchGitee,
  modelscope: searchModelScope,
};

export async function searchPlatform(platformId, query, limit) {
  const searcher = searchers[platformId];
  if (!searcher) throw new Error(`未知平台：${platformId}`);
  return searcher(query, limit || platformCatalog[platformId].searchLimit);
}

export async function radarPlatform(platformId) {
  const date = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

  if (platformId === 'github') {
    const queries = [
      `created:>${date} stars:>20`,
      'topic:productivity stars:>200',
      'topic:personal-finance stars:>100',
      'topic:home-automation stars:>100',
    ];
    const results = await Promise.allSettled(queries.map((query, index) => searchGitHub(query, index === 0 ? 18 : 10)));
    const projects = results.filter((result) => result.status === 'fulfilled').flatMap((result) => result.value);
    if (!projects.length) throw new Error('GitHub radar unavailable');
    return projects;
  }

  if (platformId === 'huggingface') {
    const data = await fetchJson('https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=18&full=false');
    return mapProjects(data, fromHuggingFace);
  }

  if (platformId === 'gitlab') {
    const data = await fetchJson(`https://gitlab.com/api/v4/projects?visibility=public&order_by=star_count&sort=desc&last_activity_after=${date}T00:00:00Z&per_page=18&simple=false`);
    return mapProjects(data, fromGitLab);
  }

  if (platformId === 'codeberg') {
    const data = await fetchJson('https://codeberg.org/api/v1/repos/search?sort=updated&order=desc&limit=18');
    return mapProjects(data.data || data, fromCodeberg);
  }

  if (platformId === 'gitee') {
    return searchGitee('开源', 18, 'radar');
  }

  if (platformId === 'modelscope') {
    const data = await fetchJson('https://modelscope.cn/openapi/v1/models?sort=downloads&page_size=18', { headers: { Accept: 'application/json' } });
    return mapProjects(data?.data?.models || data?.models || data?.data, fromModelScope);
  }

  throw new Error(`未知平台：${platformId}`);
}
