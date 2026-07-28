import { platformCatalog, platformIds, radarPlatform, searchPlatform } from './platform-adapters.js';

const FAVORITES_KEY = 'openradar:favorites:v1';
const RADAR_CACHE_KEY = 'openradar:radar-cache:v3';
const RADAR_CACHE_TTL = 15 * 60 * 1000;

const categories = [
  '全部',
  '游戏开发',
  '游戏AI与NPC',
  '3D与动画',
  'AI图片视频',
  'Agent与MCP',
  'Web与App',
  '微信生态',
  '教育产品',
  '内容创作',
  '办公效率',
  '生活工具',
  '商业应用底座',
];

const categoryRules = [
  ['游戏AI与NPC', ['npc', 'game ai', 'behavior tree', 'game agent', 'character memory', 'game memory', 'dialogue system']],
  ['3D与动画', ['3d', 'rigging', 'animation', 'motion capture', 'retargeting', 'blender', 'mesh', 'avatar']],
  ['AI图片视频', ['text-to-image', 'image generation', 'video generation', 'diffusion', 'computer vision', 'image edit', 'video edit']],
  ['Agent与MCP', ['agent', 'mcp', 'codex', 'claude code', 'multi-agent', 'tool calling', 'rag', 'llm workflow']],
  ['微信生态', ['wechat', 'mini program', 'miniprogram', '小程序', '小游戏']],
  ['教育产品', ['education', 'learning', 'tutor', 'children', 'school', 'quiz', 'course', 'flashcard']],
  ['内容创作', ['creator', 'content', 'newsletter', 'podcast', 'audio editor', 'social media', 'subtitle', 'transcription']],
  ['办公效率', ['office', 'productivity', 'document', 'pdf', 'ocr', 'spreadsheet', 'presentation', 'calendar', 'email', 'meeting', 'notes', 'knowledge base', 'kanban', 'project management', 'task management', 'collaboration', 'file manager', 'markdown editor']],
  ['生活工具', ['personal finance', 'budget', 'expense', 'health', 'fitness', 'sleep', 'recipe', 'meal planner', 'shopping list', 'travel', 'trip planner', 'itinerary', 'home automation', 'smart home', 'photo management', 'media server', 'password manager', 'habit', 'journal', 'family', 'parenting', 'pet', 'grocery']],
  ['商业应用底座', ['saas', 'crm', 'erp', 'ecommerce', 'e-commerce', 'billing', 'invoice', 'booking', 'marketplace', 'customer support', 'admin dashboard', 'multi-tenant', 'inventory management', 'point of sale']],
  ['游戏开发', ['game', 'godot', 'phaser', 'pixi', 'roguelike', 'rpg', 'game engine', 'level editor', 'procedural generation']],
  ['Web与App', ['typescript', 'javascript', 'react', 'next.js', 'web app', 'pwa', 'mobile app', 'desktop app', 'frontend', 'backend']],
];

const useTypeLabels = {
  direct: '直接安装使用',
  selfhost: '适合个人部署',
  codex: '适合Codex二次开发',
  component: '技术组件',
  reference: '适合模仿产品设计',
  business: '存在商业化机会',
};

const actionLabels = {
  later: '以后研究',
  test: '立即测试',
  codex: '交给 Codex 分析',
  reference: '只参考设计',
};

const searchRules = [
  { re: /网页游戏|web游戏|h5游戏|浏览器游戏/i, primary: ['web', 'game', 'typescript'], anchors: ['game'], alternate: ['browser', 'javascript', 'phaser'] },
  { re: /npc|非玩家角色/i, primary: ['npc'], anchors: ['npc'], alternate: ['agent', 'character'] },
  { re: /长期记忆|持久记忆|记忆系统|记忆/i, primary: ['memory'], anchors: ['memory'], alternate: ['persistent', 'long-term'] },
  { re: /程序化地图|程序化生成|随机地图|随机地牢/i, primary: ['procedural', 'generation'], anchors: ['procedural'], alternate: ['dungeon', 'level', 'map'] },
  { re: /图片转3d|图像转3d|image to 3d/i, primary: ['image', '3d'], anchors: ['3d'], alternate: ['mesh', 'reconstruction'] },
  { re: /骨骼绑定|自动绑定|rigging/i, primary: ['rigging'], anchors: ['rigging'], alternate: ['auto-rig', 'skeleton'] },
  { re: /动画重定向|动作重定向|retarget/i, primary: ['animation', 'retargeting'], anchors: ['retargeting'], alternate: ['motion', 'skeleton'] },
  { re: /办公|办公效率|生产力/i, primary: ['productivity'], anchors: ['productivity'], alternate: ['office', 'workflow'] },
  { re: /文档|知识库|笔记/i, primary: ['document'], anchors: ['document'], alternate: ['knowledge-base', 'notes', 'markdown'] },
  { re: /表格|电子表格|excel/i, primary: ['spreadsheet'], anchors: ['spreadsheet'], alternate: ['table', 'data'] },
  { re: /ppt|演示文稿|幻灯片/i, primary: ['presentation'], anchors: ['presentation'], alternate: ['slides', 'powerpoint'] },
  { re: /会议纪要|会议记录/i, primary: ['meeting', 'transcription'], anchors: ['meeting'], alternate: ['minutes', 'summary'] },
  { re: /项目管理|任务管理|看板/i, primary: ['project', 'management'], anchors: ['management'], alternate: ['kanban', 'tasks'] },
  { re: /记账|个人财务|预算/i, primary: ['personal-finance', 'budget'], anchors: ['budget'], alternate: ['expense', 'accounting'] },
  { re: /健康|运动|健身/i, primary: ['health', 'fitness'], anchors: ['health'], alternate: ['workout', 'wellness'] },
  { re: /菜谱|食谱|做饭/i, primary: ['recipe'], anchors: ['recipe'], alternate: ['meal', 'cooking'] },
  { re: /旅行|行程|旅游规划/i, primary: ['travel', 'planner'], anchors: ['travel'], alternate: ['trip', 'itinerary'] },
  { re: /智能家居/i, primary: ['home', 'automation'], anchors: ['automation'], alternate: ['smart-home', 'iot'] },
  { re: /相册|照片管理/i, primary: ['photo', 'management'], anchors: ['photo'], alternate: ['gallery', 'backup'] },
  { re: /密码|隐私/i, primary: ['privacy'], anchors: ['privacy'], alternate: ['password', 'security'] },
  { re: /crm|客户管理/i, primary: ['crm'], anchors: ['crm'], alternate: ['customer', 'sales'] },
  { re: /erp|进销存/i, primary: ['erp'], anchors: ['erp'], alternate: ['inventory', 'business'] },
  { re: /微信小程序|小程序/i, primary: ['wechat', 'miniprogram'], anchors: ['wechat'], alternate: ['mini-program'] },
  { re: /允许商用|可商用|商业使用/i, primary: [], anchors: [], alternate: [] },
  { re: /开源|开放源代码/i, primary: [], anchors: [], alternate: [] },
];

const suggestions = [
  '适合网页游戏的开源NPC记忆系统',
  '允许商用的图片转3D与自动绑定骨骼',
  '开源PDF、OCR与文档整理工作台',
  '适合个人部署的记账和家庭财务系统',
  '旅行规划、行程管理与地图工具',
  '适合Codex二次开发的CRM或SaaS底座',
];

const seed = [
  {
    id: 'github:ddfriday/repo-pulse',
    platform: 'github',
    name: 'repo-pulse',
    owner: 'ddfriday',
    description: '追踪公开仓库快照，比较日、周、月增长并发现新兴 GitHub 项目。',
    url: 'https://github.com/ddfriday/repo-pulse',
    stars: 0,
    forks: 0,
    language: 'TypeScript',
    license: 'MIT',
    createdAt: '2026-07-16',
    updatedAt: '2026-07-18',
    category: 'Agent与MCP',
    useTypes: ['codex', 'component'],
    score: 87,
    topics: ['trending', 'repository-discovery'],
  },
  {
    id: 'github:ecosyste-ms/repos',
    platform: 'github',
    name: 'repos',
    owner: 'ecosyste-ms',
    description: '跨代码托管平台的仓库元数据开放 API，是跨平台开源情报的重要底座。',
    url: 'https://github.com/ecosyste-ms/repos',
    stars: 0,
    forks: 0,
    language: 'Ruby',
    license: 'AGPL-3.0',
    createdAt: '2022-01-01',
    updatedAt: '2026-07-20',
    category: 'Web与App',
    useTypes: ['component', 'codex'],
    score: 94,
    topics: ['open-source', 'metadata'],
  },
  {
    id: 'github:X-lab2017/open-digger',
    platform: 'github',
    name: 'OpenDigger',
    owner: 'X-lab2017',
    description: '开源生态活跃度、贡献者网络与 OpenRank 指标平台，可补充项目健康度分析。',
    url: 'https://github.com/X-lab2017/open-digger',
    stars: 0,
    forks: 0,
    language: 'TypeScript',
    license: 'Apache-2.0',
    createdAt: '2021-01-01',
    updatedAt: '2026-07-20',
    category: 'Agent与MCP',
    useTypes: ['component', 'codex'],
    score: 90,
    topics: ['analytics', 'github'],
  },
];

const state = {
  projects: seed.map(normalizeProject),
  results: [],
  favorites: loadFavorites().map(normalizeProject),
  category: '全部',
  period: 'today',
  install: null,
  lastSearchPlan: null,
  sourceStatus: {},
  searchSourceStatus: {},
};

const $ = (id) => document.getElementById(id);
const els = Object.fromEntries([...document.querySelectorAll('[id]')].map((node) => [node.id, node]));

function loadFavorites() {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function persistFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
  updateCounters();
}

function loadRadarCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(RADAR_CACHE_KEY) || 'null');
    if (!cache || !Array.isArray(cache.projects) || Date.now() - cache.savedAt > RADAR_CACHE_TTL) return null;
    return {
      projects: cache.projects.map(normalizeProject),
      sourceStatus: cache.sourceStatus || {},
    };
  } catch {
    return null;
  }
}

function saveRadarCache(projects, sourceStatus) {
  try {
    localStorage.setItem(RADAR_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), projects, sourceStatus }));
  } catch {
    // 缓存失败不影响主流程。
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]));
}

function formatNumber(value = 0) {
  return new Intl.NumberFormat('zh-CN', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function projectAgeDays(project) {
  const createdAt = new Date(project.createdAt || Date.now()).getTime();
  return Math.max(1, (Date.now() - createdAt) / 864e5);
}

function timeAgo(value) {
  if (!value) return '未知';
  const days = Math.max(0, Math.floor((Date.now() - new Date(value)) / 864e5));
  if (days < 1) return '今天';
  if (days < 30) return `${days}天前`;
  if (days < 365) return `${Math.floor(days / 30)}个月前`;
  return `${Math.floor(days / 365)}年前`;
}

function projectText(project) {
  return [project.name, project.description, project.language, ...(project.topics || [])].join(' ').toLowerCase();
}

function classifyCategory(project) {
  const text = projectText(project);
  let bestCategory = 'Web与App';
  let bestScore = 0;

  for (const [name, terms] of categoryRules) {
    let categoryScore = 0;
    for (const term of terms) {
      if (!text.includes(term)) continue;
      categoryScore += term.includes(' ') || term.includes('-') ? 3 : 1;
    }
    if (categoryScore > bestScore) {
      bestCategory = name;
      bestScore = categoryScore;
    }
  }

  return bestCategory;
}

function inferUseTypes(project) {
  if (Array.isArray(project.useTypes) && project.useTypes.length) return [...new Set(project.useTypes)];
  const text = projectText(project);
  const types = [];
  const add = (type) => {
    if (!types.includes(type)) types.push(type);
  };

  if (/desktop|mobile app|web app|productivity|office|personal finance|budget|recipe|travel|photo management|password manager|home automation|notes|document|pdf|calendar|kanban|media server/.test(text)) add('direct');
  if (/self-hosted|selfhosted|docker compose|home server|private cloud|on-premise|local-first/.test(text)) add('selfhost');
  if (/library|sdk|framework|plugin|component|api|package|engine|toolkit|protocol/.test(text)) add('component');
  if (/starter|template|boilerplate|platform|dashboard|saas|crm|erp|ecommerce|booking|marketplace|app|server/.test(text)) add('codex');
  if (/clone|alternative|design system|ui kit|showcase|interface|theme/.test(text)) add('reference');
  if (/saas|crm|erp|ecommerce|billing|invoice|booking|marketplace|customer support|point of sale|business/.test(text)) add('business');

  if (!types.length) add('codex');
  if (types.length === 1 && types[0] === 'direct') add('codex');
  return types.slice(0, 3);
}

function normalizeProject(project) {
  const normalized = { ...project };
  normalized.topics = Array.isArray(normalized.topics) ? normalized.topics : [];
  normalized.category = normalized.category || classifyCategory(normalized);
  normalized.useTypes = inferUseTypes(normalized);
  return normalized;
}

function platformMeta(projectOrId) {
  const id = typeof projectOrId === 'string' ? projectOrId : projectOrId?.platform;
  return platformCatalog[id] || {
    label: id || '未知平台',
    primaryField: 'stars',
    primaryLabel: 'Stars',
    secondaryField: 'forks',
    secondaryLabel: 'Forks',
  };
}

function metricValue(project, field) {
  return Number(project?.[field] || 0);
}

function projectPopularity(project) {
  const meta = platformMeta(project);
  return metricValue(project, meta.primaryField);
}

function potentialScore(project) {
  if (project.score) return project.score;
  const meta = platformMeta(project);
  const primary = metricValue(project, meta.primaryField);
  const secondary = metricValue(project, meta.secondaryField);
  const popularity = primary + Math.log10(secondary + 1) * 18;
  const freshness = Math.max(0, 25 - Math.min(25, (Date.now() - new Date(project.updatedAt || 0)) / 864e5));
  return Math.min(99, Math.round(Math.log10(popularity + 1) * 22 / Math.pow(projectAgeDays(project), 0.15) + freshness + (project.description ? 10 : 2)));
}

function commercialFriendly(license = '') {
  return /MIT|Apache|BSD|ISC|MPL|Unlicense/i.test(license);
}

function favoriteById(id) {
  return state.favorites.find((item) => item.id === id);
}

function findProject(id) {
  return state.projects.find((item) => item.id === id)
    || state.results.find((item) => item.id === id)
    || favoriteById(id);
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function projectCard(project, saved = false) {
  const favorite = favoriteById(project.id);
  const meta = platformMeta(project);
  const popularity = metricValue(project, meta.primaryField);
  const secondary = metricValue(project, meta.secondaryField);
  const platformLabel = meta.label;
  const avatar = project.avatar
    ? `<img class="avatar" src="${escapeHtml(project.avatar)}" alt="">`
    : `<div class="avatar text">${escapeHtml(project.name.slice(0, 2).toUpperCase())}</div>`;
  const savedTags = saved && favorite?.tags?.length
    ? `<div class="saved-tags">${favorite.tags.map((tag) => `<span class="saved-tag">${escapeHtml(tag)}</span>`).join('')}</div>`
    : '';
  const savedNote = saved && favorite?.note ? `<div class="saved-note">${escapeHtml(favorite.note)}</div>` : '';
  const savedAction = saved && favorite?.action
    ? `<span class="saved-action">下一步：${escapeHtml(actionLabels[favorite.action] || favorite.action)}</span>`
    : '';
  const useBadges = inferUseTypes(project)
    .map((type) => `<span class="badge use-type">${escapeHtml(useTypeLabels[type] || type)}</span>`)
    .join('');

  return `<article class="card">
    <div class="card-top">
      ${avatar}
      <div class="title"><h3 title="${escapeHtml(`${project.owner}/${project.name}`)}">${escapeHtml(project.name)}</h3><p>${escapeHtml(project.owner)} · 更新于${timeAgo(project.updatedAt)}</p></div>
      <button class="star ${favorite ? 'saved' : ''}" data-favorite="${escapeHtml(project.id)}" aria-label="收藏项目">${favorite ? '★' : '☆'}</button>
    </div>
    <p class="desc">${escapeHtml(project.description || '暂无描述，需要进一步读取项目文档。')}</p>
    <div class="badges">
      <span class="badge platform">${escapeHtml(platformLabel)}</span>
      <span class="badge">${escapeHtml(project.category || classifyCategory(project))}</span>
      ${project.language ? `<span class="badge">${escapeHtml(project.language)}</span>` : ''}
      <span class="badge ${commercialFriendly(project.license) ? 'good' : 'warn'}">${escapeHtml(project.license || '许可证待核查')}</span>
    </div>
    <div class="use-types">${useBadges}</div>
    ${savedTags}${savedAction}${savedNote}
    <div class="stats">
      <div class="stat"><b>${formatNumber(popularity)}</b><span>${escapeHtml(meta.primaryLabel)}</span></div>
      <div class="stat"><b>${formatNumber(secondary)}</b><span>${escapeHtml(meta.secondaryLabel)}</span></div>
      <div class="stat"><b>${timeAgo(project.createdAt)}</b><span>项目年龄</span></div>
      <div class="score" style="--score:${potentialScore(project)}">${potentialScore(project)}</div>
    </div>
    <div class="actions">
      <a href="${escapeHtml(project.url)}" target="_blank" rel="noopener">打开项目</a>
      <button data-analyze="${escapeHtml(project.id)}">适配分析</button>
      ${saved ? `<button data-remove="${escapeHtml(project.id)}">移出收藏</button>` : ''}
    </div>
  </article>`;
}

function bindProjectActions(root) {
  root.querySelectorAll('[data-favorite]').forEach((button) => {
    button.onclick = () => openFavoriteDialog(button.dataset.favorite);
  });
  root.querySelectorAll('[data-remove]').forEach((button) => {
    button.onclick = () => {
      state.favorites = state.favorites.filter((item) => item.id !== button.dataset.remove);
      persistFavorites();
      toast('已移出收藏');
    };
  });
  root.querySelectorAll('[data-analyze]').forEach((button) => {
    button.onclick = () => toast(`${findProject(button.dataset.analyze)?.name || '该项目'}：深度适配分析将在后续阶段接入`);
  });
}

function renderCategories() {
  els.categories.innerHTML = categories
    .map((name) => `<button class="category ${name === state.category ? 'active' : ''}" data-category="${name}">${name}</button>`)
    .join('');
}

function filteredProjects() {
  let projects = [...state.projects];
  if (state.category !== '全部') projects = projects.filter((project) => (project.category || classifyCategory(project)) === state.category);
  if (els.platform.value !== 'all') projects = projects.filter((project) => project.platform === els.platform.value);
  if (els.license.value === 'commercial') projects = projects.filter((project) => commercialFriendly(project.license));
  if (els.license.value === 'unknown') projects = projects.filter((project) => !project.license || /待核查|unknown|other/i.test(project.license));
  if (els.useType.value !== 'all') projects = projects.filter((project) => inferUseTypes(project).includes(els.useType.value));

  const sorters = {
    today: (a, b) => potentialScore(b) - potentialScore(a),
    week: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    month: (a, b) => projectPopularity(b) - projectPopularity(a),
    rising: (a, b) => potentialScore(b) / Math.log10(projectPopularity(b) + 10) - potentialScore(a) / Math.log10(projectPopularity(a) + 10),
  };
  return projects.sort(sorters[state.period]);
}

function renderRadar() {
  const projects = filteredProjects();
  els.projectGrid.innerHTML = projects.length
    ? projects.map((project) => projectCard(project)).join('')
    : '<div class="empty"><h3>没有符合条件的项目</h3><p>可以切换分类、用途或许可证筛选。</p></div>';
  els.candidateMetric.textContent = state.projects.length;
  els.freshMetric.textContent = state.projects.filter((project) => projectAgeDays(project) <= 30).length;
  bindProjectActions(els.projectGrid);
}

function renderFavorites() {
  const query = els.favoriteSearch.value.toLowerCase();
  const selectedTag = els.tagFilter.value;
  let favorites = state.favorites
    .filter((favorite) => !query || [favorite.name, favorite.owner, favorite.note, favorite.category, ...inferUseTypes(favorite).map((type) => useTypeLabels[type]), ...(favorite.tags || [])].join(' ').toLowerCase().includes(query))
    .filter((favorite) => selectedTag === 'all' || favorite.tags?.includes(selectedTag));

  els.favoriteEmpty.hidden = Boolean(favorites.length);
  els.favoriteGrid.innerHTML = favorites.map((project) => projectCard(project, true)).join('');

  const tags = [...new Set(state.favorites.flatMap((favorite) => favorite.tags || []))].sort();
  const currentTag = els.tagFilter.value;
  els.tagFilter.innerHTML = '<option value="all">全部标签</option>' + tags.map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('');
  if (tags.includes(currentTag)) els.tagFilter.value = currentTag;
  bindProjectActions(els.favoriteGrid);
}

function updateCounters() {
  els.favoriteCount.textContent = state.favorites.length;
  els.savedMetric.textContent = state.favorites.length;
  renderFavorites();
  renderRadar();
  if (state.results.length) renderResults();
}

function navigate(view) {
  document.querySelectorAll('.view,.nav').forEach((node) => node.classList.remove('active'));
  $(`${view}View`).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  els.sidebar.classList.remove('open');
  if (view === 'favorites') renderFavorites();
}

function openFavoriteDialog(id) {
  const project = findProject(id);
  const favorite = favoriteById(id);
  if (!project) return;
  els.projectId.value = id;
  els.dialogTitle.textContent = favorite ? `编辑收藏 · ${project.name}` : `收藏 · ${project.name}`;
  els.tags.value = favorite?.tags?.join(', ') || '';
  els.note.value = favorite?.note || '';
  els.action.value = favorite?.action || 'later';
  els.dialog.showModal();
}

function sourceStatusEntry(stateName, count = 0, message = '') {
  return { state: stateName, count, message };
}

function readableError(error) {
  const message = error?.message || String(error || '未知错误');
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) return '网络或跨域限制';
  return message;
}

function renderSourceHealth(target, statuses) {
  if (!target) return;
  const visiblePlatforms = Object.keys(statuses || {}).length
    ? platformIds.filter((platformId) => Object.hasOwn(statuses, platformId))
    : platformIds;
  target.innerHTML = visiblePlatforms.map((platformId) => {
    const meta = platformCatalog[platformId];
    const status = statuses[platformId] || sourceStatusEntry('idle');
    const label = status.state === 'live'
      ? `${status.count}`
      : status.state === 'empty'
        ? '0'
        : status.state === 'error'
          ? '不可用'
          : status.state === 'loading'
            ? '查询中'
            : '待查询';
    const title = status.message ? ` title="${escapeHtml(status.message)}"` : '';
    return `<span class="source-chip ${status.state}"${title}><i></i>${escapeHtml(meta.shortLabel)} ${escapeHtml(label)}</span>`;
  }).join('');
}

async function radar(force = false) {
  if (!force) {
    const cached = loadRadarCache();
    if (cached?.projects?.length) {
      state.projects = dedupeProjects([...cached.projects, ...seed.map(normalizeProject)]);
      state.sourceStatus = cached.sourceStatus || {};
      els.status.textContent = '本地缓存 · 点击刷新可重新扫描';
      els.status.className = 'live';
      renderSourceHealth(els.sourceHealth, state.sourceStatus);
      renderRadar();
      return;
    }
  }

  els.status.textContent = `正在查询${platformIds.length}个平台的免费公开接口…`;
  els.status.className = '';
  els.projectGrid.innerHTML = '<div class="card skeleton"></div>'.repeat(6);
  state.sourceStatus = Object.fromEntries(platformIds.map((platformId) => [platformId, sourceStatusEntry('loading')]));
  renderSourceHealth(els.sourceHealth, state.sourceStatus);

  const responses = await Promise.allSettled(platformIds.map((platformId) => radarPlatform(platformId)));
  const liveProjects = [];
  responses.forEach((response, index) => {
    const platformId = platformIds[index];
    if (response.status === 'fulfilled') {
      const projects = dedupeProjects(response.value || []);
      liveProjects.push(...projects);
      state.sourceStatus[platformId] = sourceStatusEntry(projects.length ? 'live' : 'empty', projects.length);
    } else {
      state.sourceStatus[platformId] = sourceStatusEntry('error', 0, readableError(response.reason));
    }
  });

  state.projects = liveProjects.length
    ? dedupeProjects([...liveProjects, ...seed.map(normalizeProject)])
    : seed.map(normalizeProject);

  if (liveProjects.length) saveRadarCache(state.projects, state.sourceStatus);
  const liveCount = Object.values(state.sourceStatus).filter((status) => status.state === 'live').length;
  const failedCount = Object.values(state.sourceStatus).filter((status) => status.state === 'error').length;
  els.status.textContent = liveProjects.length
    ? `实时数据 · ${liveCount}/${platformIds.length} 平台${failedCount ? ` · ${failedCount}个降级` : ''}`
    : '公开接口暂不可用，显示种子数据';
  els.status.className = liveProjects.length ? (failedCount ? 'warn' : 'live') : 'warn';
  renderSourceHealth(els.sourceHealth, state.sourceStatus);
  renderRadar();
}

function dedupeProjects(projects) {
  return [...new Map(projects.map((project) => [project.id, normalizeProject(project)])).values()];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function expandSearchQuery(query) {
  const asciiTerms = (query.match(/[A-Za-z0-9.+#-]{2,}/g) || []).map((term) => term.toLowerCase());
  const primary = [...asciiTerms];
  const anchors = [];
  const alternate = [];
  let matchedRules = 0;

  for (const rule of searchRules) {
    if (!rule.re.test(query)) continue;
    matchedRules += 1;
    primary.push(...rule.primary);
    anchors.push(...rule.anchors);
    alternate.push(...rule.alternate);
  }

  const primaryTerms = unique(primary).slice(0, 7);
  const anchorTerms = unique(anchors).slice(0, 5);
  const alternateTerms = unique([...anchorTerms, ...alternate]).slice(0, 7);
  const queries = [];

  if (primaryTerms.length) queries.push(primaryTerms.join(' '));
  if (anchorTerms.length && anchorTerms.join(' ') !== primaryTerms.join(' ')) queries.push(anchorTerms.join(' '));
  if (alternateTerms.length && !queries.includes(alternateTerms.join(' '))) queries.push(alternateTerms.join(' '));
  if (!queries.length) queries.push(query);

  return {
    original: query,
    matchedRules,
    terms: unique([...primaryTerms, ...alternateTerms]),
    queries: unique(queries).slice(0, 3),
  };
}

async function searchProjects(query) {
  const plan = expandSearchQuery(query);
  state.lastSearchPlan = plan;
  const selectedPlatforms = [...document.querySelectorAll('[data-search-platform]:checked')]
    .map((input) => input.dataset.searchPlatform)
    .filter((platformId) => platformCatalog[platformId]);

  if (!selectedPlatforms.length) {
    toast('请至少选择一个数据源');
    return;
  }

  state.searchSourceStatus = Object.fromEntries(selectedPlatforms.map((platformId) => [platformId, sourceStatusEntry('loading')]));
  els.searchSummary.textContent = `正在理解需求并查询 ${selectedPlatforms.length} 个平台…`;
  els.searchGrid.innerHTML = '<div class="card skeleton"></div>'.repeat(4);
  els.searchFallbacks.innerHTML = '';
  renderSourceHealth(els.searchSources, state.searchSourceStatus);

  const jobs = selectedPlatforms.map(async (platformId) => {
    const meta = platformCatalog[platformId];
    const queryPool = ['gitee', 'modelscope'].includes(platformId)
      ? unique([plan.original, ...plan.queries])
      : plan.queries;
    const queries = queryPool.slice(0, meta.searchQueries || 1);
    const responses = await Promise.allSettled(queries.map((expandedQuery) => searchPlatform(platformId, expandedQuery, meta.searchLimit)));
    const projects = dedupeProjects(responses.filter((response) => response.status === 'fulfilled').flatMap((response) => response.value));
    const errors = responses.filter((response) => response.status === 'rejected');
    if (!projects.length && errors.length === responses.length) throw errors[0].reason;
    return { platformId, projects, partialError: errors[0]?.reason };
  });

  const responses = await Promise.allSettled(jobs);
  const projects = [];
  responses.forEach((response, index) => {
    const platformId = selectedPlatforms[index];
    if (response.status === 'fulfilled') {
      projects.push(...response.value.projects);
      state.searchSourceStatus[platformId] = sourceStatusEntry(
        response.value.projects.length ? 'live' : 'empty',
        response.value.projects.length,
        response.value.partialError ? `部分查询失败：${readableError(response.value.partialError)}` : '',
      );
    } else {
      state.searchSourceStatus[platformId] = sourceStatusEntry('error', 0, readableError(response.reason));
    }
  });

  state.results = dedupeProjects(projects);
  sortSearchResults();

  const expanded = plan.terms.length ? `已扩展关键词：${plan.terms.slice(0, 10).join(' · ')}。` : '';
  const failedPlatforms = selectedPlatforms.filter((platformId) => state.searchSourceStatus[platformId]?.state === 'error');
  const fallbackPlatforms = selectedPlatforms.filter((platformId) => ['error', 'empty'].includes(state.searchSourceStatus[platformId]?.state));
  els.searchSummary.textContent = `“${query}” 找到 ${state.results.length} 个候选。${expanded}${failedPlatforms.length ? `${failedPlatforms.map((platformId) => platformCatalog[platformId].label).join('、')} 当前已降级。` : ''}许可证需在正式采用前再次核查。`;
  renderSourceHealth(els.searchSources, state.searchSourceStatus);
  renderSearchFallbacks(query, fallbackPlatforms);
  renderResults();
}

function renderSearchFallbacks(query, failedPlatforms) {
  els.searchFallbacks.innerHTML = failedPlatforms.map((platformId) => {
    const meta = platformCatalog[platformId];
    return `<a class="chip fallback" href="${escapeHtml(meta.fallbackUrl(query))}" target="_blank" rel="noopener">直接去 ${escapeHtml(meta.label)} 搜索</a>`;
  }).join('');
}

function sortSearchResults() {
  const sorters = {
    score: (a, b) => potentialScore(b) - potentialScore(a),
    popular: (a, b) => projectPopularity(b) - projectPopularity(a),
    fresh: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  };
  state.results.sort(sorters[els.sort.value]);
}

function renderResults() {
  els.searchGrid.innerHTML = state.results.length
    ? state.results.map((project) => projectCard(project)).join('')
    : '<div class="empty"><h3>没有找到结果</h3><p>系统已经尝试中文需求扩展；可以减少限制词或换一个用途描述。</p></div>';
  bindProjectActions(els.searchGrid);
}

function init() {
  renderCategories();
  els.suggestions.innerHTML = suggestions.map((query) => `<button class="chip" data-query="${escapeHtml(query)}">${escapeHtml(query)}</button>`).join('');

  document.querySelectorAll('.nav').forEach((button) => {
    button.onclick = () => navigate(button.dataset.view);
  });

  els.categories.onclick = (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    state.category = button.dataset.category;
    renderCategories();
    renderRadar();
    navigate('radar');
  };

  document.querySelectorAll('.tab').forEach((button) => {
    button.onclick = () => {
      document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
      button.classList.add('active');
      state.period = button.dataset.period;
      renderRadar();
    };
  });

  els.platform.onchange = renderRadar;
  els.license.onchange = renderRadar;
  els.useType.onchange = renderRadar;
  els.refresh.onclick = () => radar(true);
  els.menu.onclick = () => els.sidebar.classList.toggle('open');

  els.quickSearch.onkeydown = (event) => {
    if (event.key === 'Enter' && event.target.value.trim()) {
      els.query.value = event.target.value.trim();
      navigate('search');
      searchProjects(els.query.value);
    }
  };

  els.searchForm.onsubmit = (event) => {
    event.preventDefault();
    const query = els.query.value.trim();
    query ? searchProjects(query) : toast('请输入搜索需求');
  };

  els.sort.onchange = () => {
    sortSearchResults();
    renderResults();
  };

  els.suggestions.onclick = (event) => {
    const button = event.target.closest('[data-query]');
    if (!button) return;
    els.query.value = button.dataset.query;
    searchProjects(button.dataset.query);
  };

  els.favoriteForm.onsubmit = (event) => {
    event.preventDefault();
    const project = findProject(els.projectId.value);
    if (!project) return;
    const item = normalizeProject({
      ...project,
      tags: els.tags.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
      note: els.note.value.trim(),
      action: els.action.value,
      savedAt: favoriteById(project.id)?.savedAt || new Date().toISOString(),
    });
    state.favorites = [item, ...state.favorites.filter((favorite) => favorite.id !== project.id)];
    persistFavorites();
    els.dialog.close();
    toast('已保存到收藏库');
  };

  els.closeDialog.onclick = els.cancel.onclick = () => els.dialog.close();
  els.favoriteSearch.oninput = renderFavorites;
  els.tagFilter.onchange = renderFavorites;

  els.export.onclick = () => {
    const blob = new Blob([JSON.stringify(state.favorites, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `openradar-favorites-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  els.clear.onclick = () => {
    if (state.favorites.length && confirm('确定清空全部收藏吗？')) {
      state.favorites = [];
      persistFavorites();
      toast('收藏已清空');
    }
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.install = event;
    els.install.hidden = false;
  });

  els.install.onclick = async () => {
    if (!state.install) return;
    state.install.prompt();
    await state.install.userChoice;
    state.install = null;
    els.install.hidden = true;
  };

  updateCounters();
  radar(false);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();
