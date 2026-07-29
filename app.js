import { platformCatalog, platformIds, radarPlatform, searchPlatform } from './platform-adapters.js';
import { deduplicationStats, entitiesOverlap, entityLookupIds, findEntityById, mergeProjectEntities, projectSources } from './project-identity.js';
import { buildCodexResearchTask, codexExportSlug } from './codex-packet.js';
import { compareProjects } from './project-comparator.js';

const FAVORITES_KEY = 'openradar:favorites:v1';
const RADAR_CACHE_KEY = 'openradar:radar-cache:v10';
const IDENTITY_OVERRIDES_KEY = 'openradar:identity-overrides:v1';
const COMPARE_KEY = 'openradar:compare:v1';
const APP_VERSION = '0.4-B';
const HISTORY_PERIOD_MAP = { today: 'day', week: 'week', month: 'month' };
const HISTORY_TARGET_HOURS = { day: 24, week: 168, month: 720 };
const HISTORY_COPY = {
  today: ['24小时增长', '仅在历史基线达到约20小时后显示真实增长；此前明确标记为积累中。'],
  week: ['7天增长', '仅在历史基线达到约6天后显示真实增长；不同平台按各自主指标计算。'],
  month: ['30天增长', '仅在历史基线达到约25天后显示真实增长；不会混同比较Star、Like与Downloads。'],
  rising: ['低 Star 高潜力', '这是代理潜力排序，不等于真实增长；适合寻找尚未变成大热门的新项目。'],
};
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
  '开发组件',
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
  ['开发组件', ['npm', 'pypi', 'crates.io', 'package', 'library', 'sdk', 'framework', 'plugin', 'middleware', 'dependency', 'component']],
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
  'TypeScript NPC memory package',
  'Python PDF OCR package',
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

function emptyIdentityOverrides() {
  return { schemaVersion: 1, updatedAt: '', mergeGroups: [], blockedPairs: [], primaryByMember: {} };
}

function normalizeIdentityOverrides(value = {}) {
  const mergeGroups = Array.isArray(value.mergeGroups)
    ? value.mergeGroups.map((group, index) => ({
      id: String(group?.id || `merge-${index + 1}`).slice(0, 160),
      sourceIds: [...new Set((Array.isArray(group?.sourceIds) ? group.sourceIds : []).map(String).filter(Boolean))].slice(0, 100),
      note: String(group?.note || '').slice(0, 500),
      createdAt: String(group?.createdAt || '').slice(0, 80),
    })).filter((group) => group.sourceIds.length >= 2)
    : [];
  const blockedPairs = [];
  const seenPairs = new Set();
  for (const pair of Array.isArray(value.blockedPairs) ? value.blockedPairs : []) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const values = [String(pair[0] || ''), String(pair[1] || '')].filter(Boolean).sort();
    if (values.length < 2 || values[0] === values[1]) continue;
    const key = values.join('\u0000');
    if (!seenPairs.has(key)) { seenPairs.add(key); blockedPairs.push(values); }
  }
  const primaryByMember = value.primaryByMember && typeof value.primaryByMember === 'object' && !Array.isArray(value.primaryByMember)
    ? Object.fromEntries(Object.entries(value.primaryByMember).map(([member, primary]) => [String(member), String(primary)]).filter(([member, primary]) => member && primary))
    : {};
  return { schemaVersion: 1, updatedAt: String(value.updatedAt || ''), mergeGroups, blockedPairs, primaryByMember };
}

function loadIdentityOverrides() {
  try {
    return normalizeIdentityOverrides(JSON.parse(localStorage.getItem(IDENTITY_OVERRIDES_KEY) || 'null') || {});
  } catch {
    return emptyIdentityOverrides();
  }
}

function loadCompareItems() {
  try {
    const value = JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]');
    return Array.isArray(value) ? value.slice(0, 5) : [];
  } catch {
    return [];
  }
}

const state = {
  rawProjects: seed.map(normalizeProject),
  projects: mergeProjectEntities(seed.map(normalizeProject)).map(normalizeProject),
  rawResults: [],
  results: [],
  favorites: loadFavorites().map(normalizeProject),
  category: '全部',
  period: 'today',
  install: null,
  lastSearchPlan: null,
  sourceStatus: {},
  searchSourceStatus: {},
  growth: {},
  historyStatus: null,
  historyAvailable: false,
  insights: {},
  insightStatus: null,
  insightServiceAvailable: false,
  insightAvailable: false,
  activeInsightId: '',
  activeDetailId: '',
  codexExportAvailable: false,
  codexTask: null,
  identityOverrides: loadIdentityOverrides(),
  identityServiceAvailable: false,
  trustReports: {},
  trustServiceAvailable: false,
  trustLoadingId: '',
  backupAvailable: false,
  packageServiceAvailable: false,
  packageSearchResults: [],
  packageSourceStatus: {},
  compareItems: loadCompareItems().map(normalizeProject),
  compareAuditing: false,
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

function persistCompareItems() {
  state.compareItems = state.compareItems.slice(0, 5).map(normalizeProject);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(state.compareItems));
  updateCounters();
  if (document.getElementById('compareView')?.classList.contains('active')) renderCompare();
  if (document.getElementById('packagesView')?.classList.contains('active')) renderPackageRadar();
}

function comparedProject(project) {
  return state.compareItems.find((item) => entitiesOverlap(item, project)) || null;
}

function toggleCompare(project) {
  const existing = comparedProject(project);
  if (existing) {
    state.compareItems = state.compareItems.filter((item) => !entitiesOverlap(item, project));
    persistCompareItems();
    toast('已移出对比');
    return;
  }
  if (state.compareItems.length >= 5) {
    toast('最多同时对比5个项目');
    return;
  }
  state.compareItems = [...state.compareItems, normalizeProject(project)];
  persistCompareItems();
  toast(state.compareItems.length >= 2 ? '已加入对比，可打开项目对比页' : '已加入对比，再选一个即可比较');
}

function liveCompareItems() {
  return state.compareItems.map((item) => {
    const live = [...state.projects, ...state.results, ...state.packageSearchResults].find((candidate) => entitiesOverlap(candidate, item));
    return normalizeProject(live || item);
  }).slice(0, 5);
}

function identityHasRules(value = state.identityOverrides) {
  return Boolean(value.mergeGroups?.length || value.blockedPairs?.length || Object.keys(value.primaryByMember || {}).length);
}

function persistIdentityLocal() {
  localStorage.setItem(IDENTITY_OVERRIDES_KEY, JSON.stringify(state.identityOverrides));
}

function rebuildEntities(anchorSourceId = '') {
  state.projects = dedupeEntities(state.rawProjects);
  state.results = dedupeEntities(state.rawResults);
  if (anchorSourceId) {
    const target = [...state.projects, ...state.results].find((entity) => entityLookupIds(entity).includes(anchorSourceId));
    if (target) state.activeDetailId = projectKey(target);
  }
  updateCounters();
  renderRadar();
  if (document.getElementById('searchView')?.classList.contains('active')) renderResults();
  if (document.getElementById('favoritesView')?.classList.contains('active')) renderFavorites();
  if (document.getElementById('detailView')?.classList.contains('active')) renderDetail();
}

async function saveIdentityOverrides(anchorSourceId = '') {
  state.identityOverrides = normalizeIdentityOverrides({ ...state.identityOverrides, updatedAt: new Date().toISOString() });
  persistIdentityLocal();
  rebuildEntities(anchorSourceId);
  if (state.identityServiceAvailable) {
    try {
      state.identityOverrides = normalizeIdentityOverrides(await fetchJsonSafe('/api/identity/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.identityOverrides),
      }));
      persistIdentityLocal();
    } catch (error) {
      toast(`人工纠错已保存在浏览器；本地文件同步失败：${readableError(error)}`);
    }
  }
}

async function loadIdentityOverridesFromServer() {
  try {
    const serverValue = normalizeIdentityOverrides(await fetchJsonSafe('/api/identity/overrides'));
    state.identityServiceAvailable = true;
    if (identityHasRules(serverValue) || !identityHasRules(state.identityOverrides)) {
      state.identityOverrides = serverValue;
      persistIdentityLocal();
      rebuildEntities();
    } else {
      await saveIdentityOverrides();
    }
  } catch {
    state.identityServiceAvailable = false;
  }
}

function mergeIdentityEntities(left, right) {
  const sourceIds = [...new Set([...entitySources(left), ...entitySources(right)].map((source) => source.id))];
  const memberSet = new Set(sourceIds);
  const retainedGroups = [];
  for (const group of state.identityOverrides.mergeGroups || []) {
    if (group.sourceIds.some((id) => memberSet.has(id))) group.sourceIds.forEach((id) => memberSet.add(id));
    else retainedGroups.push(group);
  }
  const mergedIds = [...memberSet];
  state.identityOverrides.mergeGroups = [...retainedGroups, {
    id: `manual-${Date.now().toString(36)}`,
    sourceIds: mergedIds,
    note: `人工合并 ${left.owner}/${left.name} 与 ${right.owner}/${right.name}`,
    createdAt: new Date().toISOString(),
  }];
  state.identityOverrides.blockedPairs = (state.identityOverrides.blockedPairs || []).filter((pair) => !(memberSet.has(pair[0]) && memberSet.has(pair[1])));
  const primaryId = entitySources(left)[0]?.id || mergedIds[0];
  mergedIds.forEach((id) => { state.identityOverrides.primaryByMember[id] = primaryId; });
  return primaryId;
}

function splitIdentitySource(project, sourceId) {
  const sourceIds = entitySources(project).map((source) => source.id);
  const pairs = state.identityOverrides.blockedPairs || [];
  const pairKeys = new Set(pairs.map((pair) => [...pair].sort().join('\u0000')));
  for (const otherId of sourceIds) {
    if (otherId === sourceId) continue;
    const pair = [sourceId, otherId].sort();
    const key = pair.join('\u0000');
    if (!pairKeys.has(key)) { pairKeys.add(key); pairs.push(pair); }
  }
  state.identityOverrides.blockedPairs = pairs;
  state.identityOverrides.mergeGroups = (state.identityOverrides.mergeGroups || []).map((group) => ({
    ...group,
    sourceIds: group.sourceIds.filter((id) => id !== sourceId),
  })).filter((group) => group.sourceIds.length >= 2);
  delete state.identityOverrides.primaryByMember[sourceId];
  for (const [member, primary] of Object.entries(state.identityOverrides.primaryByMember)) {
    if (primary === sourceId) delete state.identityOverrides.primaryByMember[member];
  }
}

function setIdentityPrimary(project, sourceId) {
  entitySources(project).forEach((source) => { state.identityOverrides.primaryByMember[source.id] = sourceId; });
}

function clearIdentityRules(project) {
  const ids = new Set(entitySources(project).map((source) => source.id));
  state.identityOverrides.mergeGroups = (state.identityOverrides.mergeGroups || []).filter((group) => !group.sourceIds.some((id) => ids.has(id)));
  state.identityOverrides.blockedPairs = (state.identityOverrides.blockedPairs || []).filter((pair) => !pair.some((id) => ids.has(id)));
  for (const [member, primary] of Object.entries(state.identityOverrides.primaryByMember || {})) {
    if (ids.has(member) || ids.has(primary)) delete state.identityOverrides.primaryByMember[member];
  }
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
  normalized.aliases = Array.isArray(normalized.aliases) ? [...new Set(normalized.aliases.filter(Boolean))] : [normalized.id].filter(Boolean);
  normalized.sourceProjects = Array.isArray(normalized.sourceProjects)
    ? normalized.sourceProjects.map((source) => ({ ...source, topics: Array.isArray(source.topics) ? source.topics : [], sourceProjects: undefined }))
    : undefined;
  normalized.sourcePlatforms = Array.isArray(normalized.sourcePlatforms)
    ? [...new Set(normalized.sourcePlatforms.filter(Boolean))]
    : [normalized.platform].filter(Boolean);
  normalized.sourceCount = Number(normalized.sourceCount || normalized.sourceProjects?.length || 1);
  normalized.category = normalized.category || classifyCategory(normalized);
  normalized.useTypes = inferUseTypes(normalized);
  return normalized;
}

function projectKey(project) {
  return project?.entityId || project?.id || '';
}

function entitySources(project) {
  return projectSources(project).map(normalizeProject);
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

function growthPeriod(project, periodId = HISTORY_PERIOD_MAP[state.period]) {
  if (!periodId) return null;
  const candidates = entitySources(project).map((source) => ({
    sourceProject: source,
    period: state.growth[source.id]?.periods?.[periodId] || null,
  })).filter((candidate) => candidate.period);
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    if (Boolean(b.period.ready) !== Boolean(a.period.ready)) return Number(b.period.ready) - Number(a.period.ready);
    if (b.period.ready && a.period.ready) {
      const bMeta = platformMeta(b.sourceProject);
      const aMeta = platformMeta(a.sourceProject);
      const bDelta = Number(b.period.deltas?.[bMeta.primaryField] || 0);
      const aDelta = Number(a.period.deltas?.[aMeta.primaryField] || 0);
      if (bDelta !== aDelta) return bDelta - aDelta;
    }
    return Number(b.period.coveredHours || 0) - Number(a.period.coveredHours || 0);
  });
  return { ...candidates[0].period, sourceProject: candidates[0].sourceProject };
}

function growthDelta(project, periodId = HISTORY_PERIOD_MAP[state.period]) {
  const period = growthPeriod(project, periodId);
  const meta = platformMeta(period?.sourceProject || project);
  return period?.ready ? Number(period.deltas?.[meta.primaryField] || 0) : null;
}

function sourceGrowthPercentile(source, periodId) {
  const period = state.growth[source.id]?.periods?.[periodId];
  if (!period?.ready) return null;
  const meta = platformMeta(source);
  const delta = Number(period.deltas?.[meta.primaryField] || 0);
  const peers = state.rawProjects
    .filter((candidate) => candidate.platform === source.platform)
    .map((candidate) => {
      const peerPeriod = state.growth[candidate.id]?.periods?.[periodId];
      return peerPeriod?.ready ? Number(peerPeriod.deltas?.[platformMeta(candidate).primaryField] || 0) : null;
    })
    .filter((value) => value !== null)
    .sort((a, b) => a - b);
  if (!peers.length) return 0;
  return peers.filter((value) => value <= delta).length / peers.length;
}

function growthPercentile(project, periodId) {
  const values = entitySources(project).map((source) => sourceGrowthPercentile(source, periodId)).filter((value) => value !== null);
  return values.length ? Math.max(...values) : null;
}

function formatDurationHours(hours = 0) {
  if (hours >= 24 * 20) return `${Math.round(hours / 24)}天`;
  if (hours >= 24) return `${Math.round(hours / 24 * 10) / 10}天`;
  return `${Math.max(0, Math.floor(hours))}小时`;
}

function growthBadge(project) {
  const periodId = HISTORY_PERIOD_MAP[state.period];
  if (!periodId) return '';
  if (!state.historyAvailable) return '<div class="growth-line pending"><b>历史未启用</b><span>请使用本地服务器启动</span></div>';
  const period = growthPeriod(project, periodId);
  if (!period) return '<div class="growth-line pending"><b>尚未追踪</b><span>任一来源进入候选池后开始积累</span></div>';
  const meta = platformMeta(period.sourceProject || project);
  const targetHours = HISTORY_TARGET_HOURS[periodId];
  if (period?.ready) {
    const delta = Number(period.deltas?.[meta.primaryField] || 0);
    const sign = delta > 0 ? '+' : '';
    const tone = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';
    return `<div class="growth-line ${tone}"><b>${sign}${formatNumber(delta)}</b><span>${escapeHtml(platformMeta(period.sourceProject || project).shortLabel)} ${escapeHtml(meta.primaryLabel)} · 实际覆盖${escapeHtml(formatDurationHours(period.coveredHours))}</span></div>`;
  }
  const covered = Math.min(targetHours, Math.max(0, period?.coveredHours || state.historyStatus?.historyAgeHours || 0));
  return `<div class="growth-line pending"><b>积累中</b><span>${escapeHtml(formatDurationHours(covered))} / ${escapeHtml(formatDurationHours(targetHours))}</span></div>`;
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

function rulePlainSummary(project) {
  const category = project.category || classifyCategory(project);
  const description = String(project.description || '').replace(/[。.!！]+$/u, '').trim();
  const useTypes = inferUseTypes(project);
  const mode = useTypes.includes('direct')
    ? '可以先直接安装体验'
    : useTypes.includes('component')
      ? '更适合当作技术组件接入现有项目'
      : useTypes.includes('codex')
        ? '适合交给Codex审计后二次开发'
        : '需要先阅读README确认使用方式';
  return `${project.name}是一个偏${category}的开源项目${description ? `，主要做${description}` : ''}；${mode}。`;
}

function projectInsight(project) {
  for (const id of entityLookupIds(project)) {
    if (state.insights[id]) return state.insights[id];
  }
  return null;
}

function insightSourceLabel(insight) {
  if (!insight) return '规则摘要';
  if (insight.source === 'ollama') return insight.cached ? '本地AI缓存' : '本地AI解读';
  return '规则摘要';
}

function findLiveEntity(id) {
  return findEntityById([...state.projects, ...state.results], id);
}

function favoriteForProject(project) {
  return state.favorites.find((item) => entitiesOverlap(item, project)) || null;
}

function favoriteById(id) {
  const entity = findLiveEntity(id);
  if (entity) return favoriteForProject(entity);
  return state.favorites.find((item) => entityLookupIds(item).includes(id)) || null;
}

function findProject(id) {
  return findLiveEntity(id)
    || findEntityById(state.favorites, id)
    || state.rawProjects.find((item) => item.id === id)
    || state.rawResults.find((item) => item.id === id)
    || state.packageSearchResults.find((item) => entityLookupIds(item).includes(id) || projectKey(item) === id)
    || state.compareItems.find((item) => entityLookupIds(item).includes(id) || projectKey(item) === id)
    || null;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function sourceBadgeRow(project) {
  const sources = entitySources(project);
  return sources.map((source, index) => {
    const meta = platformMeta(source);
    const primary = metricValue(source, meta.primaryField);
    return `<span class="source-mini ${index === 0 ? 'primary' : ''}" title="${escapeHtml(`${source.owner}/${source.name} · ${meta.primaryLabel} ${formatNumber(primary)}`)}">${escapeHtml(meta.shortLabel)}</span>`;
  }).join('');
}

function projectCard(project, saved = false, showGrowth = false) {
  const favorite = favoriteForProject(project);
  const key = projectKey(project);
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
  const insight = projectInsight(project);
  const plainSummary = insight?.summary || rulePlainSummary(project);
  const insightLabel = insightSourceLabel(insight);
  const mergedBadge = project.sourceCount > 1 ? `<span class="badge merged">已合并 ${project.sourceCount} 个来源</span>` : '';
  const compared = Boolean(comparedProject(project));
  const versionBadge = project.version ? `<span class="badge">v${escapeHtml(project.version)}</span>` : '';

  return `<article class="card ${compared ? 'is-compared' : ''}">
    <div class="card-top">
      ${avatar}
      <div class="title"><button class="title-link" data-detail="${escapeHtml(key)}" title="查看 ${escapeHtml(`${project.owner}/${project.name}`)} 详情">${escapeHtml(project.name)}</button><p>${escapeHtml(project.owner)} · 更新于${timeAgo(project.updatedAt)}</p></div>
      <button class="star ${favorite ? 'saved' : ''}" data-favorite="${escapeHtml(key)}" aria-label="收藏项目">${favorite ? '★' : '☆'}</button>
    </div>
    <div class="source-row">${sourceBadgeRow(project)}${mergedBadge}${versionBadge}</div>
    <p class="desc">${escapeHtml(project.description || '暂无描述，需要进一步读取项目文档。')}</p>
    <div class="plain-summary ${insight?.source === 'ollama' ? 'ai' : 'rule'}"><span>${escapeHtml(insightLabel)}</span><p>${escapeHtml(plainSummary)}</p></div>
    <div class="badges">
      <span class="badge platform">${escapeHtml(platformLabel)}</span>
      <span class="badge">${escapeHtml(project.category || classifyCategory(project))}</span>
      ${project.language ? `<span class="badge">${escapeHtml(project.language)}</span>` : ''}
      <span class="badge ${commercialFriendly(project.license) ? 'good' : 'warn'}">${escapeHtml(project.license || '许可证待核查')}</span>
    </div>
    <div class="use-types">${useBadges}</div>
    ${savedTags}${savedAction}${savedNote}
    ${showGrowth ? growthBadge(project) : ''}
    <div class="stats">
      <div class="stat"><b>${formatNumber(popularity)}</b><span>${escapeHtml(meta.primaryLabel)}</span></div>
      <div class="stat"><b>${formatNumber(secondary)}</b><span>${escapeHtml(meta.secondaryLabel)}</span></div>
      <div class="stat"><b>${timeAgo(project.createdAt)}</b><span>项目年龄</span></div>
      <div class="score" style="--score:${potentialScore(project)}">${potentialScore(project)}</div>
    </div>
    <div class="actions">
      <button data-detail="${escapeHtml(key)}">查看详情</button>
      <button data-analyze="${escapeHtml(key)}">中文解读</button>
      <button class="compare-toggle ${compared ? 'active' : ''}" data-compare="${escapeHtml(key)}">${compared ? '移出对比' : '加入对比'}</button>
      <a href="${escapeHtml(project.url)}" target="_blank" rel="noopener">打开主源</a>
      ${saved ? `<button data-remove="${escapeHtml(key)}">移出收藏</button>` : ''}
    </div>
  </article>`;
}

function removeFavoriteProject(project) {
  state.favorites = state.favorites.filter((item) => !entitiesOverlap(item, project));
  persistFavorites();
}

function bindProjectActions(root) {
  root.querySelectorAll('[data-favorite]').forEach((button) => {
    button.onclick = () => openFavoriteDialog(button.dataset.favorite);
  });
  root.querySelectorAll('[data-remove]').forEach((button) => {
    button.onclick = () => {
      const project = findProject(button.dataset.remove);
      if (!project) return;
      removeFavoriteProject(project);
      toast('已移出收藏');
    };
  });
  root.querySelectorAll('[data-analyze]').forEach((button) => {
    button.onclick = () => openInsightDialog(button.dataset.analyze);
  });
  root.querySelectorAll('[data-compare]').forEach((button) => {
    button.onclick = () => {
      const project = findProject(button.dataset.compare);
      if (!project) return;
      toggleCompare(project);
      if (root === els.projectGrid) renderRadar();
      if (root === els.searchGrid) renderResults();
      if (root === els.favoriteGrid) renderFavorites();
      if (root === els.packageGrid) renderPackageRadar();
    };
  });
  root.querySelectorAll('[data-detail]').forEach((button) => {
    button.onclick = () => openProjectDetail(button.dataset.detail);
  });
}


function provenanceBadge(kind, label = '') {
  const labels = { fact: '事实数据', rule: '规则判断', ai: '本地AI', human: '人工确认' };
  return `<span class="provenance ${escapeHtml(kind)}">${escapeHtml(label || labels[kind] || kind)}</span>`;
}

function detailSourceCard(source, project) {
  const meta = platformMeta(source);
  const primaryId = project.id;
  const primary = metricValue(source, meta.primaryField);
  const secondary = metricValue(source, meta.secondaryField);
  const period = growthPeriod(source);
  const growth = period?.ready
    ? `${Number(period.deltas?.[meta.primaryField] || 0) >= 0 ? '+' : ''}${formatNumber(Number(period.deltas?.[meta.primaryField] || 0))} ${meta.primaryLabel}`
    : period ? `积累中 · ${formatDurationHours(period.coveredHours || 0)}` : '尚未追踪';
  const sourceCount = entitySources(project).length;
  return `<article class="detail-source-card ${source.id === primaryId ? 'is-primary' : ''}">
    <div class="split"><div><span class="badge platform">${escapeHtml(meta.label)}</span>${source.id === primaryId ? '<span class="badge good">主来源</span>' : ''}${provenanceBadge('fact')}</div><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">打开来源 ↗</a></div>
    <h3>${escapeHtml(source.owner || '未知作者')}/${escapeHtml(source.name)}</h3>
    <p>${escapeHtml(source.description || '暂无公开描述。')}</p>
    <div class="detail-source-metrics"><span><b>${formatNumber(primary)}</b>${escapeHtml(meta.primaryLabel)}</span><span><b>${formatNumber(secondary)}</b>${escapeHtml(meta.secondaryLabel)}</span><span><b>${escapeHtml(growth)}</b>${escapeHtml(HISTORY_COPY[state.period]?.[0] || '增长')}</span></div>
    <div class="badges">${source.language ? `<span class="badge">${escapeHtml(source.language)}</span>` : ''}<span class="badge ${commercialFriendly(source.license) ? 'good' : 'warn'}">${escapeHtml(source.license || '许可证待核查')}</span><span class="badge">更新于${escapeHtml(timeAgo(source.updatedAt))}</span></div>
    <div class="source-correction-actions">${source.id !== primaryId ? `<button data-set-primary="${escapeHtml(source.id)}">设为主来源</button>` : ''}${sourceCount > 1 ? `<button data-split-source="${escapeHtml(source.id)}">拆分此来源</button>` : ''}</div>
  </article>`;
}

function detailInsightSections(project, insight) {
  const value = insight || {
    summary: rulePlainSummary(project),
    whatItDoes: project.description || '需要阅读README进一步确认。',
    useMode: inferUseTypes(project).map((type) => useTypeLabels[type] || type).join('；'),
    commercial: `${project.license || '许可证待核查'}；正式采用前必须核对许可证原文和第三方依赖。`,
    requirements: `${project.language ? `主要技术：${project.language}。` : ''}安装和硬件要求待核查。`,
    codexValue: '适合先交给Codex做目录、依赖、许可证和接入成本审计。',
    fitForUser: '需结合用户当前项目、Windows设备和8GB显存条件进一步判断。',
    risks: ['当前仅有规则摘要，尚未完成上游代码审计。'],
    recommendation: '先收藏并研究，不直接集成。',
  };
  const risks = Array.isArray(value.risks) ? value.risks : [];
  return `<div class="detail-insight-summary"><span>${escapeHtml(insightSourceLabel(insight))}</span><strong>${escapeHtml(value.summary || rulePlainSummary(project))}</strong></div>
    <div class="detail-insight-grid">
      ${insightSection('它实际做什么', value.whatItDoes)}
      ${insightSection('怎么使用或接入', value.useMode)}
      ${insightSection('许可证与商用', value.commercial)}
      ${insightSection('运行门槛', value.requirements)}
      ${insightSection('交给Codex的价值', value.codexValue)}
      ${insightSection('对你的适配度', value.fitForUser)}
      ${risks.length ? `<section><h3>主要风险</h3><ul>${risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join('')}</ul></section>` : ''}
      ${insightSection('当前建议', value.recommendation)}
    </div>`;
}

function trustForProject(project) {
  for (const id of entityLookupIds(project)) {
    if (state.trustReports[id]) return state.trustReports[id];
  }
  return null;
}

function trustLevelClass(level) {
  return ({ lower: 'good', medium: 'warn', high: 'danger' })[level] || 'unknown';
}

function renderTrustPanel(project) {
  const report = trustForProject(project);
  const loading = state.trustLoadingId === projectKey(project);
  if (!report) {
    return `<div class="trust-empty"><div>${provenanceBadge('fact', 'OpenSSF / deps.dev / OSV')}${provenanceBadge('rule')}</div><h3>${loading ? '正在运行免费可信度审计…' : '尚未运行可信度审计'}</h3><p>按需查询OpenSSF Scorecard、deps.dev与OSV。公开数据不足不等于安全，也不等于不安全。</p></div>`;
  }
  const assessment = report.assessment || {};
  const facts = report.facts || {};
  const scorecard = facts.scorecard || {};
  const osv = facts.osv || {};
  const deps = facts.deps || {};
  const lowChecks = (scorecard.checks || []).filter((check) => Number(check.score) >= 0).sort((a, b) => Number(a.score) - Number(b.score)).slice(0, 6);
  const advisories = (osv.advisories || []).slice(0, 8);
  return `<div class="trust-overview ${trustLevelClass(assessment.level)}">
      <div class="trust-score"><b>${Number.isFinite(Number(assessment.score)) ? Number(assessment.score) : '—'}</b><span>规则可信度分 / 100</span></div>
      <div><div class="provenance-row">${provenanceBadge('fact')}${provenanceBadge('rule')}</div><h3>${escapeHtml(assessment.label || '数据不足')}</h3><p>${escapeHtml(assessment.recommendation || '')}</p><small>生成于${escapeHtml(timeAgo(report.generatedAt))}；缓存24小时。自动结果不是安全认证或法律意见。</small></div>
    </div>
    <div class="trust-metrics">
      <div><b>${Number.isFinite(Number(scorecard.overallScore)) ? Number(scorecard.overallScore).toFixed(1) : '—'}</b><span>OpenSSF / 10</span></div>
      <div><b>${Number(osv.vulnerabilityCount || 0)}</b><span>OSV已知漏洞关联</span></div>
      <div><b>${Number(deps.packages?.length || 0)}</b><span>deps.dev软件包映射</span></div>
      <div><b>${escapeHtml(report.repository?.platform || '—')}</b><span>审计代码来源</span></div>
    </div>
    <div class="trust-columns">
      <section><h3>积极信号 ${provenanceBadge('rule')}</h3><ul>${(assessment.positives || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>暂无足够积极信号。</li>'}</ul></section>
      <section><h3>风险与缺口 ${provenanceBadge('rule')}</h3><ul>${(assessment.warnings || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>没有规则警告，但仍需人工审计。</li>'}</ul></section>
      <section><h3>Scorecard低分检查 ${provenanceBadge('fact')}</h3><ul>${lowChecks.map((check) => `<li><b>${escapeHtml(check.name)}</b> ${escapeHtml(String(check.score))}/10 · ${escapeHtml(check.reason || '无原因说明')}</li>`).join('') || '<li>没有可用的检查明细。</li>'}</ul></section>
      <section><h3>OSV关联 ${provenanceBadge('fact')}</h3><ul>${advisories.map((item) => `<li><b>${escapeHtml(item.id)}</b> · ${escapeHtml(item.package?.system || '')}/${escapeHtml(item.package?.name || '')}@${escapeHtml(item.package?.version || '')}</li>`).join('') || '<li>未返回已知漏洞，或缺少可精确查询的软件包版本。</li>'}</ul></section>
    </div>`;
}

async function loadCachedTrust(project) {
  if (!state.trustServiceAvailable || !project || trustForProject(project)) return;
  try {
    const ids = entityLookupIds(project).slice(0, 30);
    const response = await fetchJsonSafe(`/api/trust?ids=${encodeURIComponent(ids.join(','))}`);
    Object.assign(state.trustReports, response.reports || {});
    if (state.activeDetailId) renderDetail();
  if (document.getElementById('packagesView')?.classList.contains('active')) renderPackageRadar();
  if (document.getElementById('compareView')?.classList.contains('active')) renderCompare();
  } catch {
    // Trust is optional and must not block project details.
  }
}

async function analyzeTrust(project, force = false) {
  if (!state.trustServiceAvailable) {
    toast('请使用 node server.mjs 启动本地可信度服务');
    return;
  }
  const key = projectKey(project);
  state.trustLoadingId = key;
  renderDetail();
  try {
    const report = await fetchJsonSafe('/api/trust/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, force }),
    });
    state.trustReports[report.projectId || key] = report;
    toast('免费可信度审计完成');
  } catch (error) {
    toast(`可信度审计失败：${readableError(error)}`);
  } finally {
    state.trustLoadingId = '';
    renderDetail();
  }
}

function identityCorrectionPanel(project) {
  const sources = entitySources(project);
  const currentIds = new Set(sources.map((source) => source.id));
  const candidates = [...new Map([...state.projects, ...state.results]
    .filter((candidate) => !entitiesOverlap(candidate, project))
    .map((candidate) => [projectKey(candidate), candidate])).values()]
    .slice(0, 250);
  const options = candidates.map((candidate) => `<option value="${escapeHtml(projectKey(candidate))}">${escapeHtml(candidate.owner)}/${escapeHtml(candidate.name)} · ${escapeHtml(candidate.sourcePlatforms?.join('+') || candidate.platform)}</option>`).join('');
  const hasRelatedRules = (state.identityOverrides.mergeGroups || []).some((group) => group.sourceIds.some((id) => currentIds.has(id)))
    || (state.identityOverrides.blockedPairs || []).some((pair) => pair.some((id) => currentIds.has(id)))
    || Object.entries(state.identityOverrides.primaryByMember || {}).some(([member, primary]) => currentIds.has(member) || currentIds.has(primary));
  return `<section class="detail-section identity-panel"><div class="section-title"><div><h2>身份纠错 ${project.humanConfirmed ? provenanceBadge('human') : provenanceBadge('rule')}</h2><p>自动合并只使用强信号。你可以手动合并、拆分或指定主来源；决定会写入本地并进入完整备份。</p></div>${hasRelatedRules ? '<button data-clear-identity>清除相关人工规则</button>' : ''}</div>
    <div class="identity-merge-row"><select id="identityMergeTarget"><option value="">选择另一个项目实体…</option>${options}</select><button data-merge-identity ${options ? '' : 'disabled'}>人工合并</button></div>
    <p class="identity-note">${sources.length > 1 ? `当前实体含${sources.length}个来源；拆分按钮位于每张来源卡底部。` : '当前只有一个来源；可从下拉框选择另一个项目人工合并。'} 人工判断仍需以官方互链、组织身份与许可证为证据。</p>
  </section>`;
}

function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
  return Promise.resolve();
}

function downloadText(value, filename, type = 'text/markdown') {
  const blob = new Blob([value], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}


function downloadJson(value, filename) {
  downloadText(JSON.stringify(value, null, 2), filename, 'application/json');
}

function backupClientState() {
  return {
    favorites: state.favorites,
    identityOverrides: state.identityOverrides,
    compareItems: state.compareItems,
    settings: {
      category: state.category,
      period: state.period,
      platform: els.platform?.value || 'all',
      license: els.license?.value || 'all',
      useType: els.useType?.value || 'all',
      packageEcosystem: els.packageEcosystem?.value || 'all',
      packageSort: els.packageSort?.value || 'downloads',
    },
  };
}

function renderServiceStatuses() {
  if (els.trustMode) els.trustMode.textContent = state.trustServiceAvailable ? '已启用 · 项目详情页按需审计' : '未启用 · 请用 node server.mjs 启动';
  if (els.trustNote) els.trustNote.textContent = state.trustServiceAvailable
    ? 'OpenSSF Scorecard、deps.dev与OSV通过本地同源服务查询；事实与规则结论分开显示。'
    : '静态模式不运行可信度服务；项目浏览、收藏和规则摘要不受影响。';
  if (els.backupMode) els.backupMode.textContent = state.backupAvailable ? '已启用 · 可迁移全部本地数据' : '仅浏览器数据备份';
  if (els.backupNote) els.backupNote.textContent = state.backupAvailable
    ? '完整备份包含收藏、人工纠错、历史、AI解读、可信度报告和Codex研究包。'
    : '当前只能导出收藏、人工纠错与设置；历史和本地文件需要 node server.mjs。';
}

async function exportFullBackup() {
  const clientState = backupClientState();
  let backup;
  if (state.backupAvailable) {
    backup = await fetchJsonSafe('/api/backup/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientState }),
    });
  } else {
    backup = {
      format: 'openradar-browser-backup',
      backupVersion: 1,
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      clientState,
      warning: '静态模式备份不含历史、AI解读、可信度缓存和Codex研究包。',
    };
  }
  downloadJson(backup, `openradar-full-backup-${new Date().toISOString().slice(0, 10)}.json`);
  toast(state.backupAvailable ? '完整备份已导出' : '浏览器数据备份已导出');
}

async function importFullBackupFile(file) {
  if (!file) return;
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    toast('备份文件不是有效JSON');
    return;
  }
  const supported = ['openradar-backup', 'openradar-browser-backup'].includes(backup?.format);
  if (!supported) return toast('不是受支持的OpenRadar备份');
  if (!confirm('导入会替换当前收藏、人工纠错及本地数据。确认已备份当前版本并继续吗？')) return;
  try {
    let clientState = backup.clientState || {};
    let message = '浏览器数据已恢复。';
    if (backup.format === 'openradar-backup') {
      if (!state.backupAvailable) throw new Error('完整备份必须使用 node server.mjs 导入');
      const result = await fetchJsonSafe('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup }),
      });
      clientState = result.clientState || clientState;
      message = result.message || '完整备份已导入。';
    }
    state.favorites = (Array.isArray(clientState.favorites) ? clientState.favorites : []).map(normalizeProject);
    state.identityOverrides = normalizeIdentityOverrides(clientState.identityOverrides || {});
    state.compareItems = (Array.isArray(clientState.compareItems) ? clientState.compareItems : []).slice(0, 5).map(normalizeProject);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
    localStorage.setItem(COMPARE_KEY, JSON.stringify(state.compareItems));
    persistIdentityLocal();
    const settings = clientState.settings || {};
    if (categories.includes(settings.category)) state.category = settings.category;
    if (HISTORY_COPY[settings.period]) state.period = settings.period;
    if ([...els.platform.options].some((option) => option.value === settings.platform)) els.platform.value = settings.platform;
    if ([...els.license.options].some((option) => option.value === settings.license)) els.license.value = settings.license;
    if ([...els.useType.options].some((option) => option.value === settings.useType)) els.useType.value = settings.useType;
    if (els.packageEcosystem && [...els.packageEcosystem.options].some((option) => option.value === settings.packageEcosystem)) els.packageEcosystem.value = settings.packageEcosystem;
    if (els.packageSort && [...els.packageSort.options].some((option) => option.value === settings.packageSort)) els.packageSort.value = settings.packageSort;
    rebuildEntities();
    alert(`${message}\n\n请关闭黑色服务器窗口并重新运行 start-openradar.cmd，以重新载入历史、解读和可信度缓存。`);
  } catch (error) {
    toast(`导入失败：${readableError(error)}`);
  } finally {
    if (els.backupFile) els.backupFile.value = '';
  }
}

async function prepareCodexResearch(project) {
  const key = projectKey(project);
  const button = els.detailContent.querySelector('[data-codex]');
  if (button) {
    button.disabled = true;
    button.textContent = '正在准备研究包…';
  }
  const insight = projectInsight(project);
  const trust = trustForProject(project);
  let packet;
  try {
    if (!state.codexExportAvailable) throw new Error('本地导出服务未启用');
    packet = await fetchJsonSafe('/api/codex/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: { ...project, plainSummary: rulePlainSummary(project) }, insight, trust }),
    });
  } catch (error) {
    packet = {
      ok: true,
      task: buildCodexResearchTask({ ...project, plainSummary: rulePlainSummary(project) }, insight, trust),
      folder: '',
      files: [],
      autoLaunch: false,
      message: `本地文件导出不可用，已在浏览器生成研究提示词：${readableError(error)}`,
    };
  }
  state.codexTask = { ...packet, projectKey: key, filename: `${codexExportSlug(project)}-codex-research.md` };
  try {
    await copyText(packet.task);
    state.codexTask.copied = true;
  } catch {
    state.codexTask.copied = false;
  }
  renderDetail();
  toast(packet.folder ? 'Codex研究包已生成并复制' : 'Codex研究提示词已复制');
}

function renderDetail() {
  if (!els.detailContent) return;
  const project = findProject(state.activeDetailId);
  if (!project) {
    els.detailContent.innerHTML = '<div class="empty"><h3>项目详情尚未加载</h3><p>请返回雷达刷新数据后再打开。</p></div>';
    return;
  }
  const favorite = favoriteForProject(project);
  const insight = projectInsight(project);
  const trust = trustForProject(project);
  const sources = entitySources(project);
  const packet = state.codexTask?.projectKey === projectKey(project) ? state.codexTask : null;
  const licenseVariants = [...new Set(sources.map((source) => source.license).filter(Boolean))];
  const languages = [...new Set(sources.map((source) => source.language).filter(Boolean))];
  const topics = [...new Set(sources.flatMap((source) => source.topics || []))].slice(0, 18);
  const useBadges = inferUseTypes(project).map((type) => `<span class="badge use-type">${escapeHtml(useTypeLabels[type] || type)}</span>`).join('');
  const packetResult = packet ? `<div class="codex-result ${packet.folder ? 'success' : 'warn'}"><b>${packet.folder ? '研究包已写入本地' : '研究提示词已准备'}</b><p>${escapeHtml(packet.message || '')}</p>${packet.folder ? `<code>${escapeHtml(packet.folder)}</code>` : ''}<div class="actions"><button data-copy-codex>再次复制</button><button data-download-codex>下载 Markdown</button></div></div>` : '';

  els.detailContent.innerHTML = `<div class="detail-back-row"><button id="detailBack">← 返回</button><button data-share-detail>复制详情链接</button></div>
    <article class="detail-hero">
      <div><em>UNIFIED OPEN-SOURCE PROFILE</em><div class="detail-title-row"><h1>${escapeHtml(project.name)}</h1><button class="star ${favorite ? 'saved' : ''}" data-favorite="${escapeHtml(projectKey(project))}">${favorite ? '★' : '☆'}</button></div><p>${escapeHtml(project.owner || '未知作者')} · ${project.sourceCount || 1} 个平台来源 · 更新于${escapeHtml(timeAgo(project.updatedAt))}</p><button class="detail-compare ${comparedProject(project) ? 'active' : ''}" data-detail-compare>${comparedProject(project) ? '✓ 已加入项目对比' : '＋ 加入项目对比'}</button></div>
      <div class="detail-score"><span>综合潜力</span><b>${potentialScore(project)}</b></div>
    </article>
    <div class="detail-badges"><span class="badge">${escapeHtml(project.category || classifyCategory(project))}</span>${useBadges}${languages.map((language) => `<span class="badge">${escapeHtml(language)}</span>`).join('')}${licenseVariants.map((license) => `<span class="badge ${commercialFriendly(license) ? 'good' : 'warn'}">${escapeHtml(license)}</span>`).join('')}</div>
    ${topics.length ? `<div class="detail-topics">${topics.map((topic) => `<span>${escapeHtml(topic)}</span>`).join('')}</div>` : ''}
    <section class="detail-section"><div class="section-title"><div><h2>统一中文情报 ${insight?.source === 'ollama' ? provenanceBadge('ai') : provenanceBadge('rule')}</h2><p>同一项目的多平台来源合并后，只保留一张完整情报卡。</p></div><button data-analyze="${escapeHtml(projectKey(project))}">${insight ? '查看/更新中文解读' : '生成中文解读'}</button></div>${detailInsightSections(project, insight)}</section>
    <section class="detail-section trust-panel"><div class="section-title"><div><h2>安全与可信度</h2><p>免费按需查询OpenSSF Scorecard、deps.dev与OSV；自动结果只用于风险筛查。</p></div><button data-trust ${state.trustLoadingId === projectKey(project) ? 'disabled' : ''}>${state.trustLoadingId === projectKey(project) ? '审计中…' : (trust ? '重新审计' : '运行免费审计')}</button></div>${renderTrustPanel(project)}</section>
    <section class="detail-section"><div class="section-title"><div><h2>跨平台来源 ${provenanceBadge('fact')}</h2><p>${sources.length > 1 ? `已通过${escapeHtml((project.dedupReasons || []).join('、') || '身份信号')}合并${sources.length}条来源；采用前仍需让Codex核验是否真为同一项目。` : '当前只发现一个来源。'}</p></div><span>${sources.length} SOURCES</span></div><div class="detail-source-grid">${sources.map((source) => detailSourceCard(source, project)).join('')}</div></section>
    ${identityCorrectionPanel(project)}
    <section class="detail-section codex-panel"><div><em>CODEX RESEARCH PACKET</em><h2>一键交给 Codex 研究</h2><p>生成一份包含所有平台来源、中文解读、许可证核查、维护健康、安全风险、替代方案和强制交接格式的研究任务。当前版本不会自动启动Codex，也不会在你不知情时消耗额度。</p></div><button class="primary codex-button" data-codex>生成并复制研究任务</button>${packetResult}</section>`;

  els.detailContent.querySelector('#detailBack').onclick = () => {
    if (location.hash.startsWith('#project=')) history.back();
    else navigate('radar');
  };
  els.detailContent.querySelector('[data-favorite]').onclick = () => openFavoriteDialog(projectKey(project));
  els.detailContent.querySelector('[data-analyze]').onclick = () => openInsightDialog(projectKey(project));
  els.detailContent.querySelector('[data-trust]').onclick = () => void analyzeTrust(project, Boolean(trust));
  els.detailContent.querySelector('[data-detail-compare]').onclick = () => { toggleCompare(project); renderDetail(); };
  els.detailContent.querySelector('[data-codex]').onclick = () => void prepareCodexResearch(project);
  els.detailContent.querySelectorAll('[data-set-primary]').forEach((button) => {
    button.onclick = async () => {
      setIdentityPrimary(project, button.dataset.setPrimary);
      await saveIdentityOverrides(button.dataset.setPrimary);
      toast('已指定人工主来源');
    };
  });
  els.detailContent.querySelectorAll('[data-split-source]').forEach((button) => {
    button.onclick = async () => {
      const sourceId = button.dataset.splitSource;
      if (!confirm('确定把这个来源从当前实体拆分吗？此决定会保存到人工纠错规则。')) return;
      splitIdentitySource(project, sourceId);
      await saveIdentityOverrides(sourceId);
      toast('来源已拆分');
    };
  });
  els.detailContent.querySelector('[data-merge-identity]')?.addEventListener('click', async () => {
    const targetId = els.detailContent.querySelector('#identityMergeTarget')?.value;
    const target = findProject(targetId);
    if (!target) return toast('请选择要合并的项目');
    if (!confirm(`确定人工合并 ${project.owner}/${project.name} 与 ${target.owner}/${target.name} 吗？`)) return;
    const anchor = mergeIdentityEntities(project, target);
    await saveIdentityOverrides(anchor);
    toast('项目已人工合并');
  });
  els.detailContent.querySelector('[data-clear-identity]')?.addEventListener('click', async () => {
    if (!confirm('确定清除此项目相关的人工合并、拆分和主来源规则吗？')) return;
    const anchor = entitySources(project)[0]?.id;
    clearIdentityRules(project);
    await saveIdentityOverrides(anchor);
    toast('相关人工纠错规则已清除');
  });
  els.detailContent.querySelector('[data-share-detail]').onclick = async () => {
    await copyText(location.href);
    toast('详情链接已复制');
  };
  els.detailContent.querySelector('[data-copy-codex]')?.addEventListener('click', async () => {
    await copyText(packet.task);
    toast('Codex研究任务已复制');
  });
  els.detailContent.querySelector('[data-download-codex]')?.addEventListener('click', () => downloadText(packet.task, packet.filename));
}

function openProjectDetail(id, pushHash = true) {
  const project = findProject(id);
  if (!project) return;
  state.activeDetailId = projectKey(project);
  if (pushHash) location.hash = `project=${encodeURIComponent(state.activeDetailId)}`;
  navigate('detail');
  void loadCachedTrust(project);
}

function openHashProject() {
  if (!location.hash.startsWith('#project=')) return false;
  const id = decodeURIComponent(location.hash.slice('#project='.length));
  const project = findProject(id);
  if (!project) return false;
  openProjectDetail(id, false);
  return true;
}

function isPackageSource(project) {
  return Boolean(project?.packageSystem || ['npm', 'pypi', 'crates'].includes(project?.platform));
}

function packageSources(project) {
  return entitySources(project).filter(isPackageSource);
}

function packageAggregate(project, fields) {
  return Math.max(0, ...packageSources(project).flatMap((source) => fields.map((field) => Number(source?.[field] || 0))));
}

function packageEntities() {
  const combined = dedupeEntities([...state.rawProjects, ...state.packageSearchResults.flatMap((project) => entitySources(project))]);
  return combined.filter((project) => packageSources(project).length);
}

function sortPackageProjects(projects) {
  const sort = els.packageSort?.value || 'downloads';
  const sorters = {
    downloads: (a, b) => packageAggregate(b, ['downloads', 'recentDownloads']) - packageAggregate(a, ['downloads', 'recentDownloads']),
    dependents: (a, b) => packageAggregate(b, ['dependentPackages', 'dependentRepositories']) - packageAggregate(a, ['dependentPackages', 'dependentRepositories']),
    fresh: (a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0),
    score: (a, b) => potentialScore(b) - potentialScore(a),
  };
  return [...projects].sort(sorters[sort] || sorters.downloads);
}

function renderPackageRadar() {
  if (!els.packageGrid) return;
  const selected = els.packageEcosystem?.value || 'all';
  let projects = state.packageSearchResults.length ? [...state.packageSearchResults] : packageEntities();
  if (selected !== 'all') projects = projects.filter((project) => packageSources(project).some((source) => source.platform === selected));
  projects = sortPackageProjects(projects);
  const downloads = projects.reduce((sum, project) => sum + packageAggregate(project, ['downloads', 'recentDownloads']), 0);
  const dependents = projects.reduce((sum, project) => sum + packageAggregate(project, ['dependentPackages', 'dependentRepositories']), 0);
  els.packageEntityCount.textContent = formatNumber(projects.length);
  els.packageDownloadCount.textContent = formatNumber(downloads);
  els.packageDependentCount.textContent = formatNumber(dependents);
  els.packageComparedCount.textContent = state.compareItems.length;
  els.packageTitle.textContent = state.packageSearchResults.length ? '软件包搜索结果' : '软件包生态雷达';
  els.packageDesc.textContent = state.packageSearchResults.length
    ? '搜索结果会与已发现的代码仓库保守合并；下载量与下游采用来自公开数据，不等于安全或适合直接接入。'
    : '默认展示当前雷达收录的 npm、PyPI 与 crates.io 组件；真实增长将由本地历史快照逐步积累。';
  els.packageStatus.textContent = `${projects.length} 个软件包实体`;
  els.packageGrid.innerHTML = projects.length
    ? projects.map((project) => projectCard(project, false, true)).join('')
    : '<div class="empty"><h3>暂无软件包结果</h3><p>请确认使用 node server.mjs 启动，然后输入英文技术关键词搜索。</p></div>';
  bindProjectActions(els.packageGrid);
  renderSourceHealth(els.packageSources, state.packageSourceStatus);
}

async function searchPackages(query) {
  const safeQuery = String(query || '').trim();
  if (!safeQuery) return toast('请输入软件包用途或技术关键词');
  if (!state.packageServiceAvailable) return toast('软件包搜索需要使用 node server.mjs 启动');
  const ecosystems = (els.packageEcosystem?.value || 'all') === 'all' ? ['npm', 'pypi', 'crates'] : [els.packageEcosystem.value];
  state.packageSourceStatus = Object.fromEntries(ecosystems.map((id) => [id, sourceStatusEntry('loading')]));
  state.packageSearchResults = [];
  renderPackageRadar();
  const responses = await Promise.allSettled(ecosystems.map((id) => searchPlatform(id, safeQuery, 18)));
  const raw = [];
  responses.forEach((response, index) => {
    const id = ecosystems[index];
    if (response.status === 'fulfilled') {
      raw.push(...response.value);
      state.packageSourceStatus[id] = sourceStatusEntry(response.value.length ? 'live' : 'empty', response.value.length);
    } else {
      state.packageSourceStatus[id] = sourceStatusEntry('error', 0, readableError(response.reason));
    }
  });
  const rawIds = new Set(raw.map((project) => project.id));
  state.packageSearchResults = dedupeEntities([...state.rawProjects, ...raw]).filter((entity) => entitySources(entity).some((source) => rawIds.has(source.id)));
  els.packageStatus.textContent = `“${safeQuery}” 找到 ${state.packageSearchResults.length} 个实体`;
  renderPackageRadar();
  void loadCachedInsights(state.packageSearchResults);
  void loadHistoryGrowth(state.packageSearchResults, true);
}

function compareCell(value, extraClass = '') {
  return `<td class="${extraClass}">${value}</td>`;
}

function renderCompare() {
  if (!els.compareSelection) return;
  const items = liveCompareItems();
  state.compareItems = items;
  const report = compareProjects(items, state.trustReports);
  els.compareCount.textContent = items.length;
  els.packageComparedCount.textContent = items.length;
  els.compareSelection.innerHTML = items.map((project) => `<article class="compare-chip"><div><b>${escapeHtml(project.name)}</b><span>${escapeHtml(project.owner || '')} · ${escapeHtml(entitySources(project).map((source) => platformMeta(source).shortLabel).join(' + '))}</span></div><div><button data-detail="${escapeHtml(projectKey(project))}">详情</button><button data-remove-compare="${escapeHtml(projectKey(project))}">×</button></div></article>`).join('');
  els.compareEmpty.hidden = items.length >= 2;
  els.compareRecommendation.innerHTML = items.length >= 2
    ? `<article class="compare-recommendation"><em>OPENRADAR DECISION</em><h2>${escapeHtml(report.winner?.facts?.name || '')} 当前综合更优</h2><p>${escapeHtml(report.recommendation)}</p><small>综合分是规则判断，不是安全认证、性能基准或法律意见。未运行可信度审计的项目按中性分处理。</small></article>`
    : '';
  if (items.length < 2) {
    els.compareTableWrap.innerHTML = '';
  } else {
    const rows = report.rows;
    const headers = rows.map((row) => `<th><button data-detail="${escapeHtml(projectKey(row.project))}">${escapeHtml(row.facts.name)}</button><span>${row.score}分</span></th>`).join('');
    const row = (label, render) => `<tr><th>${label}</th>${rows.map((item) => compareCell(render(item))).join('')}</tr>`;
    els.compareTableWrap.innerHTML = `<table class="compare-table"><thead><tr><th>对比维度</th>${headers}</tr></thead><tbody>
      ${row('一句大白话', ({ project }) => escapeHtml(projectInsight(project)?.summary || rulePlainSummary(project)))}
      ${row('平台来源', ({ facts }) => escapeHtml(facts.platforms.map((id) => platformCatalog[id]?.shortLabel || id).join(' + ')))}
      ${row('软件包版本', ({ facts }) => escapeHtml(facts.version || '—'))}
      ${row('Stars', ({ facts }) => formatNumber(facts.stars))}
      ${row('下载量', ({ facts }) => formatNumber(facts.downloads))}
      ${row('下游采用', ({ facts }) => formatNumber(facts.dependents))}
      ${row('许可证', ({ facts }) => `<span class="badge ${commercialFriendly(facts.license) ? 'good' : 'warn'}">${escapeHtml(facts.license)}</span>`)}
      ${row('最近更新', ({ facts }) => escapeHtml(timeAgo(facts.updatedAt)))}
      ${row('可信度', ({ facts }) => `${Math.round(facts.scores.trust)} / 100`)}
      ${row('真实采用', ({ facts }) => `${Math.round(facts.scores.adoption)} / 100`)}
      ${row('维护活跃', ({ facts }) => `${Math.round(facts.scores.maintenance)} / 100`)}
      ${row('接入简易度', ({ facts }) => `${Math.round(facts.scores.simplicity)} / 100`)}
      ${row('对你的适配', ({ facts }) => `${Math.round(facts.scores.fit)} / 100`)}
    </tbody></table>`;
  }
  els.compareSelection.querySelectorAll('[data-remove-compare]').forEach((button) => {
    button.onclick = () => {
      const project = findProject(button.dataset.removeCompare);
      if (project) toggleCompare(project);
    };
  });
  [...els.compareSelection.querySelectorAll('[data-detail]'), ...els.compareTableWrap.querySelectorAll('[data-detail]')].forEach((button) => {
    button.onclick = () => openProjectDetail(button.dataset.detail);
  });
}

async function auditCompareItems() {
  if (state.compareAuditing) return;
  if (!state.trustServiceAvailable) return toast('请使用 node server.mjs 启用可信度服务');
  const items = liveCompareItems();
  state.compareAuditing = true;
  els.auditCompare.disabled = true;
  els.auditCompare.textContent = '逐项审计中…';
  try {
    for (const project of items) {
      if (trustForProject(project)) continue;
      try {
        const report = await fetchJsonSafe('/api/trust/analyze', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, force: false }),
        });
        state.trustReports[report.projectId || projectKey(project)] = report;
      } catch {
        // A package or repository may have no public mapping; continue the remaining items.
      }
    }
    renderCompare();
    toast('对比项目可信度审计已完成或按公开覆盖降级');
  } finally {
    state.compareAuditing = false;
    els.auditCompare.disabled = false;
    els.auditCompare.textContent = '审计缺失项目';
  }
}

function renderCategories() {
  els.categories.innerHTML = categories
    .map((name) => `<button class="category ${name === state.category ? 'active' : ''}" data-category="${name}">${name}</button>`)
    .join('');
}

function filteredProjects() {
  let projects = [...state.projects];
  if (state.category !== '全部') projects = projects.filter((project) => (project.category || classifyCategory(project)) === state.category);
  if (els.platform.value !== 'all') projects = projects.filter((project) => entitySources(project).some((source) => source.platform === els.platform.value));
  if (els.license.value === 'commercial') projects = projects.filter((project) => commercialFriendly(project.license));
  if (els.license.value === 'unknown') projects = projects.filter((project) => !project.license || /待核查|unknown|other/i.test(project.license));
  if (els.useType.value !== 'all') projects = projects.filter((project) => inferUseTypes(project).includes(els.useType.value));

  const historicalSorter = (periodId) => (a, b) => {
    const aPercentile = growthPercentile(a, periodId);
    const bPercentile = growthPercentile(b, periodId);
    if (aPercentile !== null || bPercentile !== null) {
      if (aPercentile === null) return 1;
      if (bPercentile === null) return -1;
      if (bPercentile !== aPercentile) return bPercentile - aPercentile;
      if (a.platform === b.platform) {
        const aDelta = growthDelta(a, periodId);
        const bDelta = growthDelta(b, periodId);
        if (bDelta !== aDelta) return bDelta - aDelta;
      }
    }
    return potentialScore(b) - potentialScore(a);
  };
  const sorters = {
    today: historicalSorter('day'),
    week: historicalSorter('week'),
    month: historicalSorter('month'),
    rising: (a, b) => potentialScore(b) / Math.log10(projectPopularity(b) + 10) - potentialScore(a) / Math.log10(projectPopularity(a) + 10),
  };
  return projects.sort(sorters[state.period]);
}

function renderRadar() {
  const [title, description] = HISTORY_COPY[state.period] || HISTORY_COPY.today;
  els.radarTitle.textContent = title;
  const historySuffix = state.historyAvailable
    ? ` 本地历史：${state.historyStatus?.projectCount || 0}个项目、${state.historyStatus?.sampleCount || 0}条样本。`
    : ' 需使用 node server.mjs 才能保存真实历史。';
  els.radarDesc.textContent = `${description}${historySuffix}`;
  const projects = filteredProjects();
  els.projectGrid.innerHTML = projects.length
    ? projects.map((project) => projectCard(project, false, true)).join('')
    : '<div class="empty"><h3>没有符合条件的项目</h3><p>可以切换分类、用途或许可证筛选。</p></div>';
  const stats = deduplicationStats(state.rawProjects, state.projects);
  els.candidateMetric.textContent = stats.entityCount;
  els.mergedMetric.textContent = stats.mergedSourceCount;
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
  els.favoriteGrid.innerHTML = favorites.map((project) => projectCard(project, true, true)).join('');

  const tags = [...new Set(state.favorites.flatMap((favorite) => favorite.tags || []))].sort();
  const currentTag = els.tagFilter.value;
  els.tagFilter.innerHTML = '<option value="all">全部标签</option>' + tags.map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('');
  if (tags.includes(currentTag)) els.tagFilter.value = currentTag;
  bindProjectActions(els.favoriteGrid);
}

function updateCounters() {
  els.favoriteCount.textContent = state.favorites.length;
  els.savedMetric.textContent = state.favorites.length;
  if (els.compareCount) els.compareCount.textContent = state.compareItems.length;
  if (els.packageComparedCount) els.packageComparedCount.textContent = state.compareItems.length;
  renderFavorites();
  renderRadar();
  if (state.results.length) renderResults();
  if (state.activeDetailId) renderDetail();
  if (document.getElementById('packagesView')?.classList.contains('active')) renderPackageRadar();
  if (document.getElementById('compareView')?.classList.contains('active')) renderCompare();
}

function navigate(view) {
  document.querySelectorAll('.view,.nav').forEach((node) => node.classList.remove('active'));
  const target = $(`${view}View`);
  if (!target) return;
  target.classList.add('active');
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  els.sidebar.classList.remove('open');
  if (view === 'favorites') renderFavorites();
  if (view === 'packages') renderPackageRadar();
  if (view === 'compare') renderCompare();
  if (view === 'detail') renderDetail();
}

function openFavoriteDialog(id) {
  const project = findProject(id);
  const favorite = project ? favoriteForProject(project) : null;
  if (!project) return;
  els.projectId.value = projectKey(project);
  els.dialogTitle.textContent = favorite ? `编辑收藏 · ${project.name}` : `收藏 · ${project.name}`;
  els.tags.value = favorite?.tags?.join(', ') || '';
  els.note.value = favorite?.note || '';
  els.action.value = favorite?.action || 'later';
  els.dialog.showModal();
}

function sourceStatusEntry(stateName, count = 0, message = '', badge = '') {
  return { state: stateName, count, message, badge };
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
    const badge = status.badge ? `<small>${escapeHtml(status.badge)}</small>` : '';
    return `<span class="source-chip ${status.state}"${title}><i></i>${escapeHtml(meta.shortLabel)} ${escapeHtml(label)}${badge}</span>`;
  }).join('');
}

async function fetchJsonSafe(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json())?.error || ''; } catch { /* ignore non-JSON errors */ }
    throw new Error(`HTTP ${response.status}${detail ? ` · ${detail}` : ''}`);
  }
  return response.json();
}

function renderHistoryStatus() {
  const status = state.historyStatus || {};
  if (els.historyProjectCount) els.historyProjectCount.textContent = status.projectCount ?? '—';
  if (els.historySampleCount) els.historySampleCount.textContent = status.sampleCount ?? '—';
  if (els.historyFirst) els.historyFirst.textContent = status.firstCapturedAt ? timeAgo(status.firstCapturedAt) : '尚未开始';
  if (els.historyLast) els.historyLast.textContent = status.lastCapturedAt ? timeAgo(status.lastCapturedAt) : '尚未采集';
  if (els.historyMode) els.historyMode.textContent = state.historyAvailable ? '本地JSON · 每6小时' : '未启用';
  if (els.historyNote) {
    const collector = status.collector || {};
    const readiness = status.readiness || {};
    const readyLabels = [readiness.day && '24小时', readiness.week && '7天', readiness.month && '30天'].filter(Boolean);
    els.historyNote.textContent = state.historyAvailable
      ? `${collector.running ? '后台采集中。' : '后台待命。'}${readyLabels.length ? ` 已具备${readyLabels.join('、')}真实增长基线。` : ' 首次运行后需要等待时间积累，不能立即生成历史涨幅。'} 本地服务器关闭期间不会自动采集。`
      : '当前为静态模式，不会保存历史。请使用 node server.mjs 或 start-openradar.cmd 启动。';
  }
}

function renderInsightStatus() {
  const status = state.insightStatus || {};
  const store = status.store || {};
  if (els.insightCount) els.insightCount.textContent = store.insightCount ?? '—';
  if (els.insightModel) els.insightModel.textContent = status.model || 'qwen3:4b';
  if (els.insightMode) {
    els.insightMode.textContent = state.insightAvailable
      ? 'Ollama已连接 · 按需生成'
      : state.insightServiceAvailable
        ? '规则摘要可用 · 本地AI未就绪'
        : '静态模式 · 仅规则摘要';
  }
  if (els.insightNote) {
    els.insightNote.textContent = state.insightServiceAvailable
      ? `${status.message || '本地解读服务已启用。'}${store.insightCount ? ` 已缓存${store.insightCount}个项目，重复打开不会再次占用算力。` : ' 尚未生成缓存。'}`
      : '请使用 node server.mjs 或 start-openradar.cmd 启动，才能调用本地Ollama并保存解读。';
  }
}

async function loadInsightStatus(force = false) {
  try {
    const status = await fetchJsonSafe(`/api/insights/status${force ? '?refresh=1' : ''}`);
    state.insightStatus = status;
    state.insightServiceAvailable = true;
    state.insightAvailable = Boolean(status.available);
  } catch {
    state.insightStatus = null;
    state.insightServiceAvailable = false;
    state.insightAvailable = false;
  }
  renderInsightStatus();
}

async function loadCachedInsights(projects) {
  if (!state.insightServiceAvailable) return;
  const ids = unique(projects.flatMap((project) => entityLookupIds(project))).filter((id) => !state.insights[id]).slice(0, 250);
  if (!ids.length) return;
  try {
    const response = await fetchJsonSafe(`/api/insights?ids=${encodeURIComponent(ids.join(','))}`);
    const received = response.insights || {};
    if (!Object.keys(received).length) return;
    state.insights = { ...state.insights, ...received };
    renderRadar();
    renderFavorites();
    if (state.results.length) renderResults();
    if (state.activeDetailId) renderDetail();
  if (document.getElementById('packagesView')?.classList.contains('active')) renderPackageRadar();
  if (document.getElementById('compareView')?.classList.contains('active')) renderCompare();
  } catch {
    // Cached insight loading is optional and must not block radar use.
  }
}

function insightSection(title, value) {
  if (!value) return '';
  return `<section><h3>${escapeHtml(title)}</h3><p>${escapeHtml(value)}</p></section>`;
}

function renderInsightDetails(project, insight, { loading = false, error = '' } = {}) {
  if (!project || !els.insightContent) return;
  const value = insight || {
    summary: rulePlainSummary(project),
    whatItDoes: project.description || '项目简介不足，需要阅读README进一步判断。',
    bestFor: `适合关注${project.category || classifyCategory(project)}、准备做技术选型或寻找开源底座的人。`,
    useMode: inferUseTypes(project).map((type) => useTypeLabels[type] || type).join('；'),
    commercial: commercialFriendly(project.license)
      ? `${project.license}通常较适合商业使用，但仍需复核许可证原文和第三方素材。`
      : `${project.license || '许可证待核查'}不能直接认定可商用。`,
    requirements: `${project.language ? `主要技术：${project.language}。` : ''}安装方式、硬件要求和外部服务依赖需要查看README。`,
    codexValue: '可以先让Codex检查目录结构、依赖、许可证和核心模块，再决定Fork、抽取组件或只参考设计。',
    fitForUser: '与优先复用开源、由Codex实施的工作方式存在一定匹配度；是否现在投入仍需看接入成本。',
    risks: ['当前是规则摘要，不等同于完整README、代码和许可证审计。'],
    recommendation: '先收藏并阅读项目主页；确认真实可用后再交给Codex审计。',
    source: 'rule-fallback',
    confidence: 'low',
  };
  const source = value.source === 'ollama' ? `本地AI · ${value.model || 'Ollama'}` : '免费规则摘要';
  const confidence = { high: '较高', medium: '中等', low: '较低' }[value.confidence] || '中等';
  const risks = Array.isArray(value.risks) && value.risks.length
    ? `<section><h3>主要风险</h3><ul>${value.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`
    : '';
  els.insightContent.innerHTML = `
    ${error ? `<div class="insight-error">${escapeHtml(error)}</div>` : ''}
    <div class="insight-summary"><span>${escapeHtml(source)} · 置信度${escapeHtml(confidence)}</span><strong>${escapeHtml(value.summary || rulePlainSummary(project))}</strong><small>${value.readmeUsed ? '已读取README节选' : '未读取README或仅使用元数据'}${value.generatedAt ? ` · ${escapeHtml(timeAgo(value.generatedAt))}生成` : ''}</small></div>
    <div class="insight-sections">
      ${insightSection('它到底是干什么的', value.whatItDoes)}
      ${insightSection('适合谁', value.bestFor)}
      ${insightSection('怎么使用或接入', value.useMode)}
      ${insightSection('许可证与商业使用', value.commercial)}
      ${insightSection('运行门槛', value.requirements)}
      ${insightSection('交给Codex有什么价值', value.codexValue)}
      ${insightSection('对你的适配度', value.fitForUser)}
      ${risks}
      ${insightSection('最终建议', value.recommendation)}
    </div>`;
  els.insightLoading.hidden = !loading;
  els.regenerateInsight.disabled = loading || !state.insightServiceAvailable;
  els.regenerateInsight.textContent = loading ? '正在生成…' : '重新生成';
}

async function generateProjectInsight(project, force = false) {
  renderInsightDetails(project, projectInsight(project), { loading: true });
  try {
    const insight = await fetchJsonSafe('/api/insights/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, force }),
    });
    state.insights[project.id] = insight;
    renderInsightDetails(project, insight);
    renderRadar();
    renderFavorites();
    if (state.results.length) renderResults();
    if (state.activeDetailId) renderDetail();
  if (document.getElementById('packagesView')?.classList.contains('active')) renderPackageRadar();
  if (document.getElementById('compareView')?.classList.contains('active')) renderCompare();
    await loadInsightStatus(false);
    toast(insight.source === 'ollama' ? (insight.cached ? '已读取本地AI缓存' : '中文解读已生成并缓存') : '本地AI未就绪，已显示规则摘要');
  } catch (error) {
    renderInsightDetails(project, state.insights[project.id], { error: readableError(error) });
    toast(`中文解读失败：${readableError(error)}`);
  }
}

function openInsightDialog(id) {
  const project = findProject(id);
  if (!project) return;
  state.activeInsightId = projectKey(project);
  els.insightTitle.textContent = `中文解读 · ${project.name}`;
  els.insightSubtitle.textContent = `${project.sourceCount > 1 ? `${project.sourceCount}个平台来源 · ` : ''}${platformMeta(project).label} · ${project.owner || '未知作者'} · ${project.license || '许可证待核查'}`;
  const insight = projectInsight(project);
  renderInsightDetails(project, insight);
  els.insightDialog.showModal();
  if (!insight && state.insightServiceAvailable) void generateProjectInsight(project, false);
}

async function loadHistoryGrowth(projects, capture = false) {
  const trackable = dedupeProjects(projects.flatMap((project) => entitySources(project))).filter((project) => project.platform !== 'gitee').slice(0, 400);
  if (!trackable.length) return;
  try {
    if (capture) {
      await fetchJsonSafe('/api/history/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: trackable, source: 'browser-radar' }),
      });
    }
    const chunks = [];
    for (let index = 0; index < trackable.length; index += 50) chunks.push(trackable.slice(index, index + 50));
    const responses = await Promise.all(chunks.map((chunk) => fetchJsonSafe(`/api/history/growth?ids=${encodeURIComponent(chunk.map((project) => project.id).join(','))}`)));
    state.growth = Object.assign({}, ...responses.map((response) => response.projects || {}));
    state.historyStatus = responses.at(-1)?.status || await fetchJsonSafe('/api/history/status');
    const statusWithCollector = await fetchJsonSafe('/api/history/status');
    state.historyStatus = statusWithCollector;
    state.historyAvailable = true;
  } catch {
    state.historyAvailable = false;
    state.growth = {};
    state.historyStatus = null;
  }
  renderHistoryStatus();
  renderRadar();
}

async function radar(force = false) {
  if (!force) {
    const cached = loadRadarCache();
    if (cached?.projects?.length) {
      state.rawProjects = dedupeProjects([...cached.projects.flatMap((project) => entitySources(project)), ...seed.map(normalizeProject)]);
      state.projects = dedupeEntities(state.rawProjects);
      state.sourceStatus = cached.sourceStatus || {};
      state.packageSourceStatus = Object.fromEntries(['npm','pypi','crates'].map((id) => [id, state.sourceStatus[id] || sourceStatusEntry('empty')]));
      els.status.textContent = '本地缓存 · 点击刷新可重新扫描';
      els.status.className = 'live';
      renderSourceHealth(els.sourceHealth, state.sourceStatus);
      renderRadar();
      void loadHistoryGrowth(state.projects, false);
      void loadCachedInsights([...state.projects, ...state.favorites]);
      openHashProject();
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
      const fallback = projects.some((project) => project.sourceMode === 'gitee-official-search');
      const warning = unique(projects.map((project) => project.sourceWarning)).join('；');
      state.sourceStatus[platformId] = sourceStatusEntry(
        projects.length ? 'live' : 'empty',
        projects.length,
        warning,
        fallback ? '搜索回退' : '',
      );
    } else if (response.reason?.degraded) {
      state.sourceStatus[platformId] = sourceStatusEntry('empty', 0, readableError(response.reason), response.reason.badge || '外部搜索');
    } else {
      state.sourceStatus[platformId] = sourceStatusEntry('error', 0, readableError(response.reason));
    }
  });

  state.rawProjects = liveProjects.length
    ? dedupeProjects([...liveProjects, ...seed.map(normalizeProject)])
    : seed.map(normalizeProject);
  state.projects = dedupeEntities(state.rawProjects);

  if (liveProjects.length) saveRadarCache(state.rawProjects, state.sourceStatus);
  const liveCount = Object.values(state.sourceStatus).filter((status) => status.state === 'live').length;
  const failedCount = Object.values(state.sourceStatus).filter((status) => status.state === 'error').length;
  const searchOnlyCount = Object.values(state.sourceStatus).filter((status) => status.badge === '外部搜索').length;
  els.status.textContent = liveProjects.length
    ? `实时数据 · ${liveCount}/${platformIds.length} 平台${searchOnlyCount ? ` · ${searchOnlyCount}个搜索入口` : ''}${failedCount ? ` · ${failedCount}个故障` : ''}`
    : '公开接口暂不可用，显示种子数据';
  els.status.className = liveProjects.length ? (failedCount ? 'warn' : 'live') : 'warn';
  renderSourceHealth(els.sourceHealth, state.sourceStatus);
  state.packageSourceStatus = Object.fromEntries(['npm','pypi','crates'].map((id) => [id, state.sourceStatus[id] || sourceStatusEntry('empty')]));
  renderRadar();
  if (document.getElementById('packagesView')?.classList.contains('active')) renderPackageRadar();
  void loadHistoryGrowth(liveProjects.length ? liveProjects : state.projects, Boolean(liveProjects.length));
  void loadCachedInsights([...state.projects, ...state.favorites]);
  openHashProject();
}

function dedupeProjects(projects) {
  return [...new Map((Array.isArray(projects) ? projects : []).filter((project) => project?.id).map((project) => [project.id, normalizeProject(project)])).values()];
}

function dedupeEntities(projects) {
  return mergeProjectEntities(dedupeProjects(projects), state.identityOverrides).map(normalizeProject);
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
    return {
      platformId,
      projects,
      partialError: errors[0]?.reason,
      fallback: projects.some((project) => project.sourceMode === 'gitee-official-search'),
      sourceWarning: unique(projects.map((project) => project.sourceWarning)).join('；'),
    };
  });

  const responses = await Promise.allSettled(jobs);
  const projects = [];
  responses.forEach((response, index) => {
    const platformId = selectedPlatforms[index];
    if (response.status === 'fulfilled') {
      projects.push(...response.value.projects);
      const messages = [
        response.value.partialError ? `部分查询失败：${readableError(response.value.partialError)}` : '',
        response.value.sourceWarning,
      ].filter(Boolean).join('；');
      state.searchSourceStatus[platformId] = sourceStatusEntry(
        response.value.projects.length ? 'live' : 'empty',
        response.value.projects.length,
        messages,
        response.value.fallback ? '搜索回退' : '',
      );
    } else if (response.reason?.degraded) {
      state.searchSourceStatus[platformId] = sourceStatusEntry('empty', 0, readableError(response.reason), response.reason.badge || '外部搜索');
    } else {
      state.searchSourceStatus[platformId] = sourceStatusEntry('error', 0, readableError(response.reason));
    }
  });

  state.rawResults = dedupeProjects(projects);
  state.results = dedupeEntities(state.rawResults);
  sortSearchResults();

  const expanded = plan.terms.length ? `已扩展关键词：${plan.terms.slice(0, 10).join(' · ')}。` : '';
  const failedPlatforms = selectedPlatforms.filter((platformId) => state.searchSourceStatus[platformId]?.state === 'error');
  const searchOnlyPlatforms = selectedPlatforms.filter((platformId) => state.searchSourceStatus[platformId]?.badge === '外部搜索');
  const fallbackPlatforms = selectedPlatforms.filter((platformId) => ['error', 'empty'].includes(state.searchSourceStatus[platformId]?.state));
  const dedupStats = deduplicationStats(state.rawResults, state.results);
  els.searchSummary.textContent = `“${query}” 找到 ${dedupStats.entityCount} 个项目实体${dedupStats.mergedSourceCount ? `，合并了 ${dedupStats.mergedSourceCount} 条跨平台重复来源` : ''}。${expanded}${searchOnlyPlatforms.length ? `${searchOnlyPlatforms.map((platformId) => platformCatalog[platformId].label).join('、')} 仅提供外部搜索入口。` : ''}${failedPlatforms.length ? `${failedPlatforms.map((platformId) => platformCatalog[platformId].label).join('、')} 当前故障。` : ''}许可证需在正式采用前再次核查。`;
  renderSourceHealth(els.searchSources, state.searchSourceStatus);
  renderSearchFallbacks(query, fallbackPlatforms);
  renderResults();
  void loadCachedInsights(state.results);
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


async function detectRuntimeMode() {
  if (!els.runtimeMode || !els.runtimeDetail) return;
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('静态服务器');
    const health = await response.json();
    if (!health.giteeProxy) throw new Error('兼容通道未启用');
    state.codexExportAvailable = Boolean(health.codexExport);
    state.identityServiceAvailable = Boolean(health.identityCorrections);
    state.trustServiceAvailable = Boolean(health.trust);
    state.backupAvailable = Boolean(health.backup);
    state.packageServiceAvailable = Boolean(health.packages);
    els.runtimeMode.textContent = '● 本地兼容服务';
    els.runtimeMode.className = 'runtime-live';
    els.runtimeDetail.textContent = health.insights ? `代码、模型与软件包生态 · 历史、本地AI、可信度、完整备份与${health.codexExport ? 'Codex研究包' : '浏览器研究提示词'}` : '代码、模型与软件包生态 · 跨平台纠错 · 本地历史与完整备份';
    renderServiceStatuses();
    if (state.identityServiceAvailable) await loadIdentityOverridesFromServer();
  } catch {
    state.codexExportAvailable = false;
    state.identityServiceAvailable = false;
    state.trustServiceAvailable = false;
    state.backupAvailable = false;
    state.packageServiceAvailable = false;
    renderServiceStatuses();
    els.runtimeMode.textContent = '● 静态模式';
    els.runtimeMode.className = 'runtime-warn';
    els.runtimeDetail.textContent = '静态数据可浏览 · 软件包、历史、Gitee与本地AI请改用 node server.mjs';
  }
}

function init() {
  detectRuntimeMode();
  void loadInsightStatus(false).then(() => loadCachedInsights([...state.projects, ...state.favorites]));
  renderCategories();
  els.suggestions.innerHTML = suggestions.map((query) => `<button class="chip" data-query="${escapeHtml(query)}">${escapeHtml(query)}</button>`).join('');

  document.querySelectorAll('.nav').forEach((button) => {
    button.onclick = () => {
      if (location.hash.startsWith('#project=')) history.replaceState(null, '', `${location.pathname}${location.search}`);
      state.activeDetailId = '';
      navigate(button.dataset.view);
    };
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
    const existing = favoriteForProject(project);
    const item = normalizeProject({
      ...project,
      tags: els.tags.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
      note: els.note.value.trim(),
      action: els.action.value,
      savedAt: existing?.savedAt || new Date().toISOString(),
    });
    state.favorites = [item, ...state.favorites.filter((favorite) => !entitiesOverlap(favorite, project))];
    persistFavorites();
    els.dialog.close();
    toast('已保存到收藏库');
  };

  els.closeDialog.onclick = els.cancel.onclick = () => els.dialog.close();
  els.favoriteSearch.oninput = renderFavorites;
  els.tagFilter.onchange = renderFavorites;

  els.export.onclick = () => downloadJson(state.favorites, `openradar-favorites-${new Date().toISOString().slice(0, 10)}.json`);
  [els.exportBackup, els.watchExportBackup].filter(Boolean).forEach((button) => {
    button.onclick = async () => {
      button.disabled = true;
      try { await exportFullBackup(); }
      catch (error) { toast(`备份失败：${readableError(error)}`); }
      finally { button.disabled = false; }
    };
  });
  [els.importBackup, els.watchImportBackup].filter(Boolean).forEach((button) => {
    button.onclick = () => els.backupFile?.click();
  });
  if (els.backupFile) els.backupFile.onchange = () => void importFullBackupFile(els.backupFile.files?.[0]);

  if (els.refreshInsights) {
    els.refreshInsights.onclick = async () => {
      els.refreshInsights.disabled = true;
      els.refreshInsights.textContent = '检测中…';
      await loadInsightStatus(true);
      await loadCachedInsights([...state.projects, ...state.results, ...state.favorites]);
      els.refreshInsights.disabled = false;
      els.refreshInsights.textContent = '重新检测';
      toast(state.insightAvailable ? 'Ollama与qwen3:4b已连接' : (state.insightStatus?.message || '本地AI未就绪'));
    };
  }

  els.closeInsight.onclick = els.closeInsightBottom.onclick = () => els.insightDialog.close();
  els.regenerateInsight.onclick = () => {
    const project = findProject(state.activeInsightId);
    if (project) void generateProjectInsight(project, true);
  };

  if (els.packageSearchForm) {
    els.packageSearchForm.onsubmit = (event) => {
      event.preventDefault();
      void searchPackages(els.packageQuery.value);
    };
  }
  if (els.packageEcosystem) els.packageEcosystem.onchange = () => {
    if (state.packageSearchResults.length && els.packageQuery.value.trim()) void searchPackages(els.packageQuery.value);
    else renderPackageRadar();
  };
  if (els.packageSort) els.packageSort.onchange = renderPackageRadar;
  if (els.auditCompare) els.auditCompare.onclick = () => void auditCompareItems();
  if (els.clearCompare) els.clearCompare.onclick = () => {
    if (!state.compareItems.length || confirm('确定清空当前项目对比吗？')) {
      state.compareItems = [];
      persistCompareItems();
      renderCompare();
      toast('项目对比已清空');
    }
  };

  if (els.collectHistory) {
    els.collectHistory.onclick = async () => {
      els.collectHistory.disabled = true;
      els.collectHistory.textContent = '采集中…';
      try {
        await fetchJsonSafe('/api/history/collect', { method: 'POST' });
        const status = await fetchJsonSafe('/api/history/status');
        state.historyStatus = status;
        state.historyAvailable = true;
        renderHistoryStatus();
        await loadHistoryGrowth(state.projects, false);
        toast('历史快照采集完成');
      } catch (error) {
        toast(`历史采集失败：${readableError(error)}`);
      } finally {
        els.collectHistory.disabled = false;
        els.collectHistory.textContent = '立即采集一次';
      }
    };
  }

  els.clear.onclick = () => {
    if (state.favorites.length && confirm('确定清空全部收藏吗？')) {
      state.favorites = [];
      persistFavorites();
      toast('收藏已清空');
    }
  };

  window.addEventListener('hashchange', () => {
    if (!openHashProject() && document.getElementById('detailView')?.classList.contains('active')) {
      state.activeDetailId = '';
      navigate('radar');
    }
  });

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
  renderHistoryStatus();
  renderInsightStatus();
  renderServiceStatuses();
  radar(false);
  openHashProject();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();
