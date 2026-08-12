import { platformCatalog, platformIds, radarPlatform, searchPlatform } from './platform-adapters.js';
import { deduplicationStats, entitiesOverlap, entityLookupIds, findEntityById, mergeProjectEntities, projectSources } from './project-identity.js';
import { buildCodexResearchTask, codexExportSlug } from './codex-packet.js';
import { compareProjects } from './project-comparator.js';
import { CATEGORY_IDS, LOCALE_STORAGE_KEY, applyDocumentLanguage, categoryLabel, getSavedLocale, normalizeCategory, normalizeLocale, resolveLocale, setSavedLocale, t } from './i18n/index.js';

function tt(key, params = {}) {
  return t(key, state?.locale || 'zh-CN', params);
}

function historyCopy(periodId) {
  const titles = {
    today: tt('period.today'),
    week: tt('period.week'),
    month: tt('period.month'),
    rising: tt('period.rising'),
  };
  const descriptions = {
    today: tt('radar.descToday'),
    week: tt('radar.descWeek'),
    month: tt('radar.descMonth'),
    rising: tt('radar.descRising'),
  };
  return [titles[periodId] || titles.today, descriptions[periodId] || descriptions.today];
}

function applyStaticI18n() {
  const locale = state.locale;
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n, locale);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder, locale);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((node) => {
    node.setAttribute('aria-label', t(node.dataset.i18nAria, locale));
  });
}

function applyDocumentLocale(locale) {
  state.locale = normalizeLocale(locale) || 'zh-CN';
  applyDocumentLanguage(document, state.locale);
  applyStaticI18n();
  renderCategories();
  els.suggestions.innerHTML = suggestions.map((key) => {
    const label = tt(`suggestions.${key}`);
    return `<button class="chip" data-query="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
  }).join('');
  renderRadar();
  if (state.results.length) renderResults();
  if (document.getElementById('favoritesView')?.classList.contains('active')) renderFavorites();
  if (document.getElementById('packagesView')?.classList.contains('active')) renderPackageRadar();
  if (document.getElementById('compareView')?.classList.contains('active')) renderCompare();
  renderHistoryStatus();
  renderInsightStatus();
  renderServiceStatuses();
  if (state.activeDetailId) renderDetail();
  state.insights = {};
  void loadCachedInsights([...state.projects, ...state.favorites], state.locale);
  if (els.insightDialog?.open && state.activeInsightId) {
    const active = findProject(state.activeInsightId);
    if (active) renderInsightDetails(active, projectInsight(active));
  }
}

function setLocale(locale) {
  const normalized = normalizeLocale(locale);
  if (!normalized) return;
  setSavedLocale(localStorage, normalized);
  applyDocumentLocale(normalized);
  document.querySelectorAll('[data-locale]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.locale === normalized));
  });
}

function bindLocaleSwitch() {
  document.querySelectorAll('[data-locale]').forEach((button) => {
    button.onclick = () => setLocale(button.dataset.locale);
  });
}

const FAVORITES_KEY = 'openradar:favorites:v1';
const RADAR_CACHE_KEY = 'openradar:radar-cache:v10';
const IDENTITY_OVERRIDES_KEY = 'openradar:identity-overrides:v1';
const COMPARE_KEY = 'openradar:compare:v1';
const APP_VERSION = '0.4-B';
const HISTORY_PERIOD_MAP = { today: 'day', week: 'week', month: 'month' };
const HISTORY_TARGET_HOURS = { day: 24, week: 168, month: 720 };
const RADAR_CACHE_TTL = 15 * 60 * 1000;

const categories = CATEGORY_IDS;

const categoryRules = [
  ['game-ai-npc', ['npc', 'game ai', 'behavior tree', 'game agent', 'character memory', 'game memory', 'dialogue system']],
  ['three-d-animation', ['3d', 'rigging', 'animation', 'motion capture', 'retargeting', 'blender', 'mesh', 'avatar']],
  ['ai-image-video', ['text-to-image', 'image generation', 'video generation', 'diffusion', 'computer vision', 'image edit', 'video edit']],
  ['agent-mcp', ['agent', 'mcp', 'codex', 'claude code', 'multi-agent', 'tool calling', 'rag', 'llm workflow']],
  ['wechat-ecosystem', ['wechat', 'mini program', 'miniprogram', '小程序', '小游戏']],
  ['education', ['education', 'learning', 'tutor', 'children', 'school', 'quiz', 'course', 'flashcard']],
  ['content-creation', ['creator', 'content', 'newsletter', 'podcast', 'audio editor', 'social media', 'subtitle', 'transcription']],
  ['productivity', ['office', 'productivity', 'document', 'pdf', 'ocr', 'spreadsheet', 'presentation', 'calendar', 'email', 'meeting', 'notes', 'knowledge base', 'kanban', 'project management', 'task management', 'collaboration', 'file manager', 'markdown editor']],
  ['life-tools', ['personal finance', 'budget', 'expense', 'health', 'fitness', 'sleep', 'recipe', 'meal planner', 'shopping list', 'travel', 'trip planner', 'itinerary', 'home automation', 'smart home', 'photo management', 'media server', 'password manager', 'habit', 'journal', 'family', 'parenting', 'pet', 'grocery']],
  ['business-foundation', ['saas', 'crm', 'erp', 'ecommerce', 'e-commerce', 'billing', 'invoice', 'booking', 'marketplace', 'customer support', 'admin dashboard', 'multi-tenant', 'inventory management', 'point of sale']],
  ['dev-components', ['npm', 'pypi', 'crates.io', 'package', 'library', 'sdk', 'framework', 'plugin', 'middleware', 'dependency', 'component']],
  ['game-development', ['game', 'godot', 'phaser', 'pixi', 'roguelike', 'rpg', 'game engine', 'level editor', 'procedural generation']],
  ['web-app', ['typescript', 'javascript', 'react', 'next.js', 'web app', 'pwa', 'mobile app', 'desktop app', 'frontend', 'backend']],
];

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

const suggestions = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];

const seed = [
  {
    id: 'github:ddfriday/repo-pulse',
    platform: 'github',
    name: 'repo-pulse',
    owner: 'ddfriday',
    description: 'Tracks public repository snapshots, compares daily/weekly/monthly growth, and discovers emerging GitHub projects.',
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
    description: 'Open repository metadata API across code-hosting platforms; a key foundation for cross-platform open-source intelligence.',
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
    description: 'Open-source ecosystem activity, contributor networks, and OpenRank metrics for project health analysis.',
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
  category: 'all',
  locale: resolveLocale({ saved: getSavedLocale(localStorage), languages: navigator.languages || [navigator.language] }),
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
    toast(tt('compare.removed'));
    return;
  }
  if (state.compareItems.length >= 5) {
    toast(tt('compare.max'));
    return;
  }
  state.compareItems = [...state.compareItems, normalizeProject(project)];
  persistCompareItems();
  toast(state.compareItems.length >= 2 ? tt('compare.added') : tt('compare.addedOneMore'));
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
      toast(tt('toast.identitySavedBrowser', { error: readableError(error) }));
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
  return new Intl.NumberFormat(state?.locale === 'en' ? 'en-US' : 'zh-CN', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function projectAgeDays(project) {
  const createdAt = new Date(project.createdAt || Date.now()).getTime();
  return Math.max(1, (Date.now() - createdAt) / 864e5);
}

function timeAgo(value) {
  if (!value) return tt('timeAgo.unknown');
  const days = Math.max(0, Math.floor((Date.now() - new Date(value)) / 864e5));
  if (days < 1) return tt('timeAgo.today');
  if (days < 30) return tt('timeAgo.days', { n: days });
  if (days < 365) return tt('timeAgo.months', { n: Math.floor(days / 30) });
  return tt('timeAgo.years', { n: Math.floor(days / 365) });
}

function projectText(project) {
  return [project.name, project.description, project.language, ...(project.topics || [])].join(' ').toLowerCase();
}

function classifyCategory(project) {
  const text = projectText(project);
  let bestCategory = 'web-app';
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
  normalized.category = normalizeCategory(normalized.category || classifyCategory(normalized));
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
    label: id || tt('sourceHealth.unknown'),
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
  if (hours >= 24 * 20) return tt('duration.days', { n: Math.round(hours / 24) });
  if (hours >= 24) return tt('duration.days', { n: Math.round(hours / 24 * 10) / 10 });
  return tt('duration.hours', { n: Math.max(0, Math.floor(hours)) });
}

function growthBadge(project) {
  const periodId = HISTORY_PERIOD_MAP[state.period];
  if (!periodId) return '';
  if (!state.historyAvailable) return `<div class="growth-line pending"><b>${tt('growth.historyDisabled')}</b><span>${tt('growth.historyDisabledHint')}</span></div>`;
  const period = growthPeriod(project, periodId);
  if (!period) return `<div class="growth-line pending"><b>${tt('growth.notTracked')}</b><span>${tt('growth.notTrackedHint')}</span></div>`;
  const meta = platformMeta(period.sourceProject || project);
  const targetHours = HISTORY_TARGET_HOURS[periodId];
  if (period?.ready) {
    const delta = Number(period.deltas?.[meta.primaryField] || 0);
    const sign = delta > 0 ? '+' : '';
    const tone = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';
    return `<div class="growth-line ${tone}"><b>${sign}${formatNumber(delta)}</b><span>${escapeHtml(platformMeta(period.sourceProject || project).shortLabel)} ${escapeHtml(meta.primaryLabel)} · ${tt('growth.covered')}${escapeHtml(formatDurationHours(period.coveredHours))}</span></div>`;
  }
  const covered = Math.min(targetHours, Math.max(0, period?.coveredHours || state.historyStatus?.historyAgeHours || 0));
  return `<div class="growth-line pending"><b>${tt('growth.accumulating')}</b><span>${escapeHtml(formatDurationHours(covered))} / ${escapeHtml(formatDurationHours(targetHours))}</span></div>`;
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
  const category = categoryLabel(project.category || classifyCategory(project), state.locale);
  const description = String(project.description || '').replace(/[。.!！]+$/u, '').trim();
  const useTypes = inferUseTypes(project);
  const mode = useTypes.includes('direct')
    ? tt('rule.modeDirect')
    : useTypes.includes('component')
      ? tt('rule.modeComponent')
      : useTypes.includes('codex')
        ? tt('rule.modeCodex')
        : tt('rule.modeReadme');
  return tt('rule.summary', { name: project.name, category, description: description ? tt('rule.summaryDesc', { description }) : '', mode });
}

function projectInsight(project) {
  for (const id of entityLookupIds(project)) {
    if (state.insights[id]) return state.insights[id];
  }
  return null;
}

function insightSourceLabel(insight) {
  if (!insight) return tt('insight.sourceRule');
  if (insight.source === 'ollama') return insight.cached ? tt('insight.sourceAiCached') : tt('insight.sourceAi');
  return tt('insight.sourceRule');
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
    ? `<span class="saved-action">${tt('action.next')}：${escapeHtml(tt(`action.${favorite.action}`) || favorite.action)}</span>`
    : '';
  const useBadges = inferUseTypes(project)
    .map((type) => `<span class="badge use-type">${escapeHtml(tt(`useType.${type}`) || type)}</span>`)
    .join('');
  const insight = projectInsight(project);
  const plainSummary = insight?.summary || rulePlainSummary(project);
  const insightLabel = insightSourceLabel(insight);
  const mergedBadge = project.sourceCount > 1 ? `<span class="badge merged">${tt('card.mergedSources', { count: project.sourceCount })}</span>` : '';
  const compared = Boolean(comparedProject(project));
  const versionBadge = project.version ? `<span class="badge">v${escapeHtml(project.version)}</span>` : '';

  return `<article class="card ${compared ? 'is-compared' : ''}">
    <div class="card-top">
      ${avatar}
    <div class="title"><button class="title-link" data-detail="${escapeHtml(key)}" title="${tt('card.viewDetail', { name: `${project.owner}/${project.name}` })}">${escapeHtml(project.name)}</button><p>${escapeHtml(project.owner)} · ${tt('detail.updatedAt', { time: timeAgo(project.updatedAt) })}</p></div>
      <button class="star ${favorite ? 'saved' : ''}" data-favorite="${escapeHtml(key)}" aria-label="${tt('card.favorite')}">${favorite ? '★' : '☆'}</button>
    </div>
    <div class="source-row">${sourceBadgeRow(project)}${mergedBadge}${versionBadge}</div>
    <p class="desc">${escapeHtml(project.description || tt('card.noDescription'))}</p>
    <div class="plain-summary ${insight?.source === 'ollama' ? 'ai' : 'rule'}"><span>${escapeHtml(insightLabel)}</span><p>${escapeHtml(plainSummary)}</p></div>
    <div class="badges">
      <span class="badge platform">${escapeHtml(platformLabel)}</span>
    <span class="badge">${escapeHtml(categoryLabel(project.category || classifyCategory(project), state.locale))}</span>
      ${project.language ? `<span class="badge">${escapeHtml(project.language)}</span>` : ''}
      <span class="badge ${commercialFriendly(project.license) ? 'good' : 'warn'}">${escapeHtml(project.license || tt('card.licenseUnknown'))}</span>
    </div>
    <div class="use-types">${useBadges}</div>
    ${savedTags}${savedAction}${savedNote}
    ${showGrowth ? growthBadge(project) : ''}
    <div class="stats">
      <div class="stat"><b>${formatNumber(popularity)}</b><span>${escapeHtml(meta.primaryLabel)}</span></div>
      <div class="stat"><b>${formatNumber(secondary)}</b><span>${escapeHtml(meta.secondaryLabel)}</span></div>
      <div class="stat"><b>${timeAgo(project.createdAt)}</b><span>${tt('card.projectAge')}</span></div>
      <div class="score" style="--score:${potentialScore(project)}">${potentialScore(project)}</div>
    </div>
    <div class="actions">
      <button data-detail="${escapeHtml(key)}">${tt('card.viewDetailShort')}</button>
      <button data-analyze="${escapeHtml(key)}">${tt('card.insight')}</button>
      <button class="compare-toggle ${compared ? 'active' : ''}" data-compare="${escapeHtml(key)}">${compared ? tt('compare.removed') : tt('card.addCompare')}</button>
      <a href="${escapeHtml(project.url)}" target="_blank" rel="noopener">${tt('card.openSource')}</a>
      ${saved ? `<button data-remove="${escapeHtml(key)}">${tt('card.removeFavorite')}</button>` : ''}
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
      toast(tt('favorites.removed'));
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
  return `<span class="provenance ${escapeHtml(kind)}">${escapeHtml(label || tt(`provenance.${kind}`) || kind)}</span>`;
}

function detailSourceCard(source, project) {
  const meta = platformMeta(source);
  const primaryId = project.id;
  const primary = metricValue(source, meta.primaryField);
  const secondary = metricValue(source, meta.secondaryField);
  const period = growthPeriod(source);
  const growth = period?.ready
    ? `${Number(period.deltas?.[meta.primaryField] || 0) >= 0 ? '+' : ''}${formatNumber(Number(period.deltas?.[meta.primaryField] || 0))} ${meta.primaryLabel}`
    : period ? `${tt('growth.accumulating')} · ${formatDurationHours(period.coveredHours || 0)}` : tt('growth.notTracked');
  const sourceCount = entitySources(project).length;
  return `<article class="detail-source-card ${source.id === primaryId ? 'is-primary' : ''}">
    <div class="split"><div><span class="badge platform">${escapeHtml(meta.label)}</span>${source.id === primaryId ? `<span class="badge good">${tt('identity.primary')}</span>` : ''}${provenanceBadge('fact')}</div><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${tt('identity.openSource')}</a></div>
    <h3>${escapeHtml(source.owner || tt('identity.unknownAuthor'))}/${escapeHtml(source.name)}</h3>
    <p>${escapeHtml(source.description || tt('identity.noDescription'))}</p>
    <div class="detail-source-metrics"><span><b>${formatNumber(primary)}</b>${escapeHtml(meta.primaryLabel)}</span><span><b>${formatNumber(secondary)}</b>${escapeHtml(meta.secondaryLabel)}</span><span><b>${escapeHtml(growth)}</b>${escapeHtml(tt('growth.growth'))}</span></div>
    <div class="badges">${source.language ? `<span class="badge">${escapeHtml(source.language)}</span>` : ''}<span class="badge ${commercialFriendly(source.license) ? 'good' : 'warn'}">${escapeHtml(source.license || tt('card.licenseUnknown'))}</span><span class="badge">${tt('detail.updatedAt', { time: timeAgo(source.updatedAt) })}</span></div>
    <div class="source-correction-actions">${source.id !== primaryId ? `<button data-set-primary="${escapeHtml(source.id)}">${tt('identity.setPrimary')}</button>` : ''}${sourceCount > 1 ? `<button data-split-source="${escapeHtml(source.id)}">${tt('identity.split')}</button>` : ''}</div>
  </article>`;
}

function detailInsightSections(project, insight) {
  const value = insight || {
    summary: rulePlainSummary(project),
    whatItDoes: project.description || tt('insight.ruleWhat'),
    useMode: inferUseTypes(project).map((type) => tt(`useType.${type}`) || type).join('；'),
    commercial: `${project.license || tt('card.licenseUnknown')}；${tt('rule.commercialNote')}`,
    requirements: `${project.language ? tt('rule.mainTech', { language: project.language }) : ''}${tt('rule.requirementsNote')}`,
    codexValue: tt('rule.codexValue'),
    fitForUser: tt('rule.fitFallback'),
    risks: [tt('rule.riskFallback')],
    recommendation: tt('rule.recommendFallback'),
  };
  const risks = Array.isArray(value.risks) ? value.risks : [];
  return `<div class="detail-insight-summary"><span>${escapeHtml(insightSourceLabel(insight))}</span><strong>${escapeHtml(value.summary || rulePlainSummary(project))}</strong></div>
    <div class="detail-insight-grid">
      ${insightSection(tt('insight.whatItDoes'), value.whatItDoes)}
      ${insightSection(tt('insight.useMode'), value.useMode)}
      ${insightSection(tt('insight.commercial'), value.commercial)}
      ${insightSection(tt('insight.requirements'), value.requirements)}
      ${insightSection(tt('insight.codexValue'), value.codexValue)}
      ${insightSection(tt('insight.fitForUser'), value.fitForUser)}
      ${risks.length ? `<section><h3>${tt('insight.risks')}</h3><ul>${risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join('')}</ul></section>` : ''}
      ${insightSection(tt('insight.recommendation'), value.recommendation)}
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
    return `<div class="trust-empty"><div>${provenanceBadge('fact', 'OpenSSF / deps.dev / OSV')}${provenanceBadge('rule')}</div><h3>${loading ? tt('trust.emptyLoading') : tt('trust.emptyTitle')}</h3><p>${tt('trust.emptyDesc')}</p></div>`;
  }
  const assessment = report.assessment || {};
  const facts = report.facts || {};
  const scorecard = facts.scorecard || {};
  const osv = facts.osv || {};
  const deps = facts.deps || {};
  const lowChecks = (scorecard.checks || []).filter((check) => Number(check.score) >= 0).sort((a, b) => Number(a.score) - Number(b.score)).slice(0, 6);
  const advisories = (osv.advisories || []).slice(0, 8);
  return `<div class="trust-overview ${trustLevelClass(assessment.level)}">
      <div class="trust-score"><b>${Number.isFinite(Number(assessment.score)) ? Number(assessment.score) : '—'}</b><span>${tt('trust.scoreLabel')}</span></div>
      <div><div class="provenance-row">${provenanceBadge('fact')}${provenanceBadge('rule')}</div><h3>${escapeHtml(assessment.label || tt('trust.insufficient'))}</h3><p>${escapeHtml(assessment.recommendation || '')}</p><small>${tt('trust.generated', { time: timeAgo(report.generatedAt) })}</small></div>
    </div>
    <div class="trust-metrics">
      <div><b>${Number.isFinite(Number(scorecard.overallScore)) ? Number(scorecard.overallScore).toFixed(1) : '—'}</b><span>${tt('trust.ossf')}</span></div>
      <div><b>${Number(osv.vulnerabilityCount || 0)}</b><span>${tt('trust.osv')}</span></div>
      <div><b>${Number(deps.packages?.length || 0)}</b><span>${tt('trust.deps')}</span></div>
      <div><b>${escapeHtml(report.repository?.platform || '—')}</b><span>${tt('trust.source')}</span></div>
    </div>
    <div class="trust-columns">
      <section><h3>${tt('trust.positives')} ${provenanceBadge('rule')}</h3><ul>${(assessment.positives || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || `<li>${tt('trust.noPositives')}</li>`}</ul></section>
      <section><h3>${tt('trust.warnings')} ${provenanceBadge('rule')}</h3><ul>${(assessment.warnings || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || `<li>${tt('trust.noWarnings')}</li>`}</ul></section>
      <section><h3>${tt('trust.lowChecks')} ${provenanceBadge('fact')}</h3><ul>${lowChecks.map((check) => `<li><b>${escapeHtml(check.name)}</b> ${escapeHtml(String(check.score))}/10 · ${escapeHtml(check.reason || tt('trust.noReason'))}</li>`).join('') || `<li>${tt('trust.noChecks')}</li>`}</ul></section>
      <section><h3>${tt('trust.osvSection')} ${provenanceBadge('fact')}</h3><ul>${advisories.map((item) => `<li><b>${escapeHtml(item.id)}</b> · ${escapeHtml(item.package?.system || '')}/${escapeHtml(item.package?.name || '')}@${escapeHtml(item.package?.version || '')}</li>`).join('') || `<li>${tt('trust.noOsv')}</li>`}</ul></section>
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
    toast(tt('trust.needServer'));
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
    toast(tt('trust.done'));
  } catch (error) {
    toast(tt('trust.failed', { error: readableError(error) }));
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
  return `<section class="detail-section identity-panel"><div class="section-title"><div><h2>${tt('identity.title')} ${project.humanConfirmed ? provenanceBadge('human') : provenanceBadge('rule')}</h2><p>${tt('identity.desc')}</p></div>${hasRelatedRules ? `<button data-clear-identity>${tt('identity.clearRules')}</button>` : ''}</div>
    <div class="identity-merge-row"><select id="identityMergeTarget"><option value="">${tt('identity.selectTarget')}</option>${options}</select><button data-merge-identity ${options ? '' : 'disabled'}>${tt('identity.merge')}</button></div>
    <p class="identity-note">${sources.length > 1 ? tt('identity.noteMulti', { count: sources.length }) : tt('identity.noteSingle')} ${tt('identity.evidence')}</p>
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
  if (els.trustMode) els.trustMode.textContent = state.trustServiceAvailable ? tt('status.trustModeOn') : tt('status.trustModeOff');
  if (els.trustNote) els.trustNote.textContent = state.trustServiceAvailable
    ? tt('status.trustNoteOn')
    : tt('status.trustNoteOff');
  if (els.backupMode) els.backupMode.textContent = state.backupAvailable ? tt('status.backupModeOn') : tt('status.backupModeOff');
  if (els.backupNote) els.backupNote.textContent = state.backupAvailable
    ? tt('status.backupNoteOn')
    : tt('status.backupNoteOff');
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
      warning: tt('status.backupStaticWarning'),
    };
  }
  downloadJson(backup, `openradar-full-backup-${new Date().toISOString().slice(0, 10)}.json`);
  toast(state.backupAvailable ? tt('toast.backupExported') : tt('toast.browserBackupExported'));
}

async function importFullBackupFile(file) {
  if (!file) return;
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    toast(tt('toast.backupInvalidJson'));
    return;
  }
  const supported = ['openradar-backup', 'openradar-browser-backup'].includes(backup?.format);
  if (!supported) return toast(tt('toast.backupUnsupported'));
  if (!confirm(tt('toast.backupConfirm'))) return;
  try {
    let clientState = backup.clientState || {};
    let message = tt('toast.backupRestored');
    if (backup.format === 'openradar-backup') {
      if (!state.backupAvailable) throw new Error(tt('toast.backupNeedServer'));
      const result = await fetchJsonSafe('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup }),
      });
      clientState = result.clientState || clientState;
      message = result.message || tt('toast.backupImported');
    }
    state.favorites = (Array.isArray(clientState.favorites) ? clientState.favorites : []).map(normalizeProject);
    state.identityOverrides = normalizeIdentityOverrides(clientState.identityOverrides || {});
    state.compareItems = (Array.isArray(clientState.compareItems) ? clientState.compareItems : []).slice(0, 5).map(normalizeProject);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
    localStorage.setItem(COMPARE_KEY, JSON.stringify(state.compareItems));
    persistIdentityLocal();
    const settings = clientState.settings || {};
    state.category = normalizeCategory(settings.category);
    if (HISTORY_PERIOD_MAP[settings.period]) state.period = settings.period;
    if ([...els.platform.options].some((option) => option.value === settings.platform)) els.platform.value = settings.platform;
    if ([...els.license.options].some((option) => option.value === settings.license)) els.license.value = settings.license;
    if ([...els.useType.options].some((option) => option.value === settings.useType)) els.useType.value = settings.useType;
    if (els.packageEcosystem && [...els.packageEcosystem.options].some((option) => option.value === settings.packageEcosystem)) els.packageEcosystem.value = settings.packageEcosystem;
    if (els.packageSort && [...els.packageSort.options].some((option) => option.value === settings.packageSort)) els.packageSort.value = settings.packageSort;
    rebuildEntities();
    alert(`${message}\n\n${tt('toast.backupRestart')}`);
  } catch (error) {
    toast(tt('toast.backupImportFailed', { error: readableError(error) }));
  } finally {
    if (els.backupFile) els.backupFile.value = '';
  }
}

async function prepareCodexResearch(project) {
  const key = projectKey(project);
  const button = els.detailContent.querySelector('[data-codex]');
  if (button) {
    button.disabled = true;
    button.textContent = tt('detail.codexPreparing');
  }
  const insight = projectInsight(project);
  const trust = trustForProject(project);
  let packet;
  try {
    if (!state.codexExportAvailable) throw new Error(tt('detail.codexLocalUnavailable'));
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
      message: tt('detail.codexLocalFallback', { error: readableError(error) }),
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
  toast(packet.folder ? tt('detail.codexCopied') : tt('detail.codexPromptCopied'));
}

function renderDetail() {
  if (!els.detailContent) return;
  const project = findProject(state.activeDetailId);
  if (!project) {
    els.detailContent.innerHTML = `<div class="empty"><h3>${tt('detail.emptyTitle')}</h3><p>${tt('detail.emptyHint')}</p></div>`;
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
  const useBadges = inferUseTypes(project).map((type) => `<span class="badge use-type">${escapeHtml(tt(`useType.${type}`) || type)}</span>`).join('');
  const packetResult = packet ? `<div class="codex-result ${packet.folder ? 'success' : 'warn'}"><b>${packet.folder ? tt('detail.codexSaved') : tt('detail.codexPrompt')}</b><p>${escapeHtml(packet.message || '')}</p>${packet.folder ? `<code>${escapeHtml(packet.folder)}</code>` : ''}<div class="actions"><button data-copy-codex>${tt('detail.codexCopyAgain')}</button><button data-download-codex>${tt('detail.codexDownload')}</button></div></div>` : '';

  els.detailContent.innerHTML = `<div class="detail-back-row"><button id="detailBack">${tt('detail.back')}</button><button data-share-detail>${tt('detail.share')}</button></div>
    <article class="detail-hero">
      <div><em>UNIFIED OPEN-SOURCE PROFILE</em><div class="detail-title-row"><h1>${escapeHtml(project.name)}</h1><button class="star ${favorite ? 'saved' : ''}" data-favorite="${escapeHtml(projectKey(project))}">${favorite ? '★' : '☆'}</button></div><p>${escapeHtml(project.owner || tt('detail.unknownOwner'))} · ${tt('detail.platformSources', { count: project.sourceCount || 1 })} · ${tt('detail.updatedAt', { time: timeAgo(project.updatedAt) })}</p><button class="detail-compare ${comparedProject(project) ? 'active' : ''}" data-detail-compare>${comparedProject(project) ? tt('detail.inCompare') : tt('detail.addCompare')}</button></div>
      <div class="detail-score"><span>${tt('detail.potential')}</span><b>${potentialScore(project)}</b></div>
    </article>
  <div class="detail-badges"><span class="badge">${escapeHtml(categoryLabel(project.category || classifyCategory(project), state.locale))}</span>${useBadges}${languages.map((language) => `<span class="badge">${escapeHtml(language)}</span>`).join('')}${licenseVariants.map((license) => `<span class="badge ${commercialFriendly(license) ? 'good' : 'warn'}">${escapeHtml(license)}</span>`).join('')}</div>
    ${topics.length ? `<div class="detail-topics">${topics.map((topic) => `<span>${escapeHtml(topic)}</span>`).join('')}</div>` : ''}
    <section class="detail-section"><div class="section-title"><div><h2>${tt('detail.unifiedTitle')} ${insight?.source === 'ollama' ? provenanceBadge('ai') : provenanceBadge('rule')}</h2><p>${tt('detail.unifiedDesc')}</p></div><button data-analyze="${escapeHtml(projectKey(project))}">${insight ? tt('detail.viewInsight') : tt('detail.generateInsight')}</button></div>${detailInsightSections(project, insight)}</section>
    <section class="detail-section trust-panel"><div class="section-title"><div><h2>${tt('detail.trustTitle')}</h2><p>${tt('detail.trustDesc')}</p></div><button data-trust ${state.trustLoadingId === projectKey(project) ? 'disabled' : ''}>${state.trustLoadingId === projectKey(project) ? tt('detail.trustLoading') : (trust ? tt('detail.trustRerun') : tt('detail.trustRun'))}</button></div>${renderTrustPanel(project)}</section>
    <section class="detail-section"><div class="section-title"><div><h2>${tt('detail.sourcesTitle')} ${provenanceBadge('fact')}</h2><p>${sources.length > 1 ? tt('detail.sourcesDescMulti', { reasons: escapeHtml((project.dedupReasons || []).join('、') || tt('identity.signals')), count: sources.length }) : tt('detail.sourcesDescSingle')}</p></div><span>${sources.length} SOURCES</span></div><div class="detail-source-grid">${sources.map((source) => detailSourceCard(source, project)).join('')}</div></section>
    ${identityCorrectionPanel(project)}
    <section class="detail-section codex-panel"><div><em>CODEX RESEARCH PACKET</em><h2>${tt('detail.codexTitle')}</h2><p>${tt('detail.codexDesc')}</p></div><button class="primary codex-button" data-codex>${tt('detail.codexButton')}</button>${packetResult}</section>`;

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
      toast(tt('identity.primarySet'));
    };
  });
  els.detailContent.querySelectorAll('[data-split-source]').forEach((button) => {
    button.onclick = async () => {
      const sourceId = button.dataset.splitSource;
      if (!confirm(tt('identity.splitConfirm'))) return;
      splitIdentitySource(project, sourceId);
      await saveIdentityOverrides(sourceId);
      toast(tt('identity.splitDone'));
    };
  });
  els.detailContent.querySelector('[data-merge-identity]')?.addEventListener('click', async () => {
    const targetId = els.detailContent.querySelector('#identityMergeTarget')?.value;
    const target = findProject(targetId);
    if (!target) return toast(tt('identity.chooseProject'));
    if (!confirm(tt('identity.mergeConfirm', { a: `${project.owner}/${project.name}`, b: `${target.owner}/${target.name}` }))) return;
    const anchor = mergeIdentityEntities(project, target);
    await saveIdentityOverrides(anchor);
    toast(tt('identity.mergedDone'));
  });
  els.detailContent.querySelector('[data-clear-identity]')?.addEventListener('click', async () => {
    if (!confirm(tt('identity.clearConfirm'))) return;
    const anchor = entitySources(project)[0]?.id;
    clearIdentityRules(project);
    await saveIdentityOverrides(anchor);
    toast(tt('identity.clearedDone'));
  });
  els.detailContent.querySelector('[data-share-detail]').onclick = async () => {
    await copyText(location.href);
    toast(tt('detail.copiedLink'));
  };
  els.detailContent.querySelector('[data-copy-codex]')?.addEventListener('click', async () => {
    await copyText(packet.task);
    toast(tt('detail.codexTaskCopied'));
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
  els.packageTitle.textContent = state.packageSearchResults.length ? tt('packages.titleResults') : tt('packages.titleRadar');
  els.packageDesc.textContent = state.packageSearchResults.length
    ? tt('packages.descResults')
    : tt('packages.descRadar');
  els.packageStatus.textContent = tt('packages.statusCount', { count: projects.length });
  els.packageGrid.innerHTML = projects.length
    ? projects.map((project) => projectCard(project, false, true)).join('')
    : `<div class="empty"><h3>${tt('packages.empty')}</h3><p>${tt('packages.emptyHint')}</p></div>`;
  bindProjectActions(els.packageGrid);
  renderSourceHealth(els.packageSources, state.packageSourceStatus);
}

async function searchPackages(query) {
  const safeQuery = String(query || '').trim();
  if (!safeQuery) return toast(tt('packages.queryEmpty'));
  if (!state.packageServiceAvailable) return toast(tt('packages.needServer'));
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
  els.packageStatus.textContent = tt('packages.statusFound', { query: safeQuery, count: state.packageSearchResults.length });
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
  els.compareSelection.innerHTML = items.map((project) => `<article class="compare-chip"><div><b>${escapeHtml(project.name)}</b><span>${escapeHtml(project.owner || '')} · ${escapeHtml(entitySources(project).map((source) => platformMeta(source).shortLabel).join(' + '))}</span></div><div><button data-detail="${escapeHtml(projectKey(project))}">${tt('compare.details')}</button><button data-remove-compare="${escapeHtml(projectKey(project))}">×</button></div></article>`).join('');
  els.compareEmpty.hidden = items.length >= 2;
  els.compareRecommendation.innerHTML = items.length >= 2
    ? `<article class="compare-recommendation"><em>OPENRADAR DECISION</em><h2>${tt('compare.recommendationTitle', { name: escapeHtml(report.winner?.facts?.name || '') })}</h2><p>${escapeHtml(report.recommendation)}</p><small>${tt('compare.recommendationNote')}</small></article>`
    : '';
  if (items.length < 2) {
    els.compareTableWrap.innerHTML = '';
  } else {
    const rows = report.rows;
    const headers = rows.map((row) => `<th><button data-detail="${escapeHtml(projectKey(row.project))}">${escapeHtml(row.facts.name)}</button><span>${tt('compare.score', { score: row.score })}</span></th>`).join('');
    const row = (label, render) => `<tr><th>${label}</th>${rows.map((item) => compareCell(render(item))).join('')}</tr>`;
    els.compareTableWrap.innerHTML = `<table class="compare-table"><thead><tr><th>${tt('compare.dimension')}</th>${headers}</tr></thead><tbody>
      ${row(tt('compare.plainSummary'), ({ project }) => escapeHtml(projectInsight(project)?.summary || rulePlainSummary(project)))}
      ${row(tt('compare.platforms'), ({ facts }) => escapeHtml(facts.platforms.map((id) => platformCatalog[id]?.shortLabel || id).join(' + ')))}
      ${row(tt('compare.version'), ({ facts }) => escapeHtml(facts.version || '—'))}
      ${row('Stars', ({ facts }) => formatNumber(facts.stars))}
      ${row(tt('compare.downloads'), ({ facts }) => formatNumber(facts.downloads))}
      ${row(tt('compare.dependents'), ({ facts }) => formatNumber(facts.dependents))}
      ${row(tt('compare.license'), ({ facts }) => `<span class="badge ${commercialFriendly(facts.license) ? 'good' : 'warn'}">${escapeHtml(facts.license)}</span>`)}
      ${row(tt('compare.updated'), ({ facts }) => escapeHtml(timeAgo(facts.updatedAt)))}
      ${row(tt('compare.trust'), ({ facts }) => `${Math.round(facts.scores.trust)} / 100`)}
      ${row(tt('compare.adoption'), ({ facts }) => `${Math.round(facts.scores.adoption)} / 100`)}
      ${row(tt('compare.maintenance'), ({ facts }) => `${Math.round(facts.scores.maintenance)} / 100`)}
      ${row(tt('compare.simplicity'), ({ facts }) => `${Math.round(facts.scores.simplicity)} / 100`)}
      ${row(tt('compare.fit'), ({ facts }) => `${Math.round(facts.scores.fit)} / 100`)}
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
  if (!state.trustServiceAvailable) return toast(tt('compare.needServer'));
  const items = liveCompareItems();
  state.compareAuditing = true;
  els.auditCompare.disabled = true;
  els.auditCompare.textContent = tt('compare.auditing');
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
    toast(tt('compare.auditDone'));
  } finally {
    state.compareAuditing = false;
    els.auditCompare.disabled = false;
    els.auditCompare.textContent = tt('compare.audit');
  }
}

function renderCategories() {
  els.categories.innerHTML = categories
    .map((id) => `<button class="category ${id === state.category ? 'active' : ''}" data-category="${id}">${categoryLabel(id, state.locale)}</button>`)
    .join('');
}

function filteredProjects() {
  let projects = [...state.projects];
  if (state.category !== 'all') projects = projects.filter((project) => normalizeCategory(project.category || classifyCategory(project)) === state.category);
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
  const [title, description] = historyCopy(state.period);
  els.radarTitle.textContent = title;
  const historySuffix = state.historyAvailable
    ? tt('radar.historySuffix', { projects: state.historyStatus?.projectCount || 0, samples: state.historyStatus?.sampleCount || 0 })
    : tt('radar.historyStatic');
  els.radarDesc.textContent = `${description}${historySuffix}`;
  const projects = filteredProjects();
  els.projectGrid.innerHTML = projects.length
    ? projects.map((project) => projectCard(project, false, true)).join('')
    : `<div class="empty"><h3>${tt('radar.empty')}</h3><p>${tt('radar.emptyHint')}</p></div>`;
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
    .filter((favorite) => !query || [favorite.name, favorite.owner, favorite.note, favorite.category, ...inferUseTypes(favorite).map((type) => tt(`useType.${type}`)), ...(favorite.tags || [])].join(' ').toLowerCase().includes(query))
    .filter((favorite) => selectedTag === 'all' || favorite.tags?.includes(selectedTag));

  els.favoriteEmpty.hidden = Boolean(favorites.length);
  els.favoriteGrid.innerHTML = favorites.map((project) => projectCard(project, true, true)).join('');

  const tags = [...new Set(state.favorites.flatMap((favorite) => favorite.tags || []))].sort();
  const currentTag = els.tagFilter.value;
  els.tagFilter.innerHTML = `<option value="all">${tt('filter.allTags')}</option>` + tags.map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('');
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
  els.dialogTitle.textContent = favorite ? tt('favorites.editTitle', { name: project.name }) : tt('favorites.saveTitle', { name: project.name });
  els.tags.value = favorite?.tags?.join(', ') || '';
  els.note.value = favorite?.note || '';
  els.action.value = favorite?.action || 'later';
  els.dialog.showModal();
}

function sourceStatusEntry(stateName, count = 0, message = '', badge = '') {
  return { state: stateName, count, message, badge };
}

function badgeLabel(badge) {
  if (!badge) return '';
  const labels = {
    '外部搜索': tt('search.platformSearchOnly'),
    '搜索回退': tt('search.badgeFallback'),
    '过期缓存（非实时）': tt('search.badgeStale'),
    '服务端缓存（非实时）': tt('search.badgeFresh'),
    '已重新验证': tt('search.badgeRevalidated'),
  };
  return labels[badge] || badge;
}

function readableError(error) {
  const message = error?.message || String(error || tt('errors.unknown'));
  if (/primary-rate-limit|rate-limited-cooldown/i.test(message)) return tt('errors.rateLimited');
  if (/secondary-rate-limit/i.test(message)) return tt('errors.secondaryLimited');
  if (/upstream-http-(429|403)/i.test(message)) return tt('errors.upstreamThrottled');
  if (/upstream-http-5\d\d|upstream-unavailable|network-error|timeout/i.test(message)) return tt('errors.upstreamDown');
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) return tt('errors.network');
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
          ? tt('sourceHealth.unavailable')
          : status.state === 'loading'
            ? tt('sourceHealth.querying')
            : tt('sourceHealth.pending');
    const title = status.message ? ` title="${escapeHtml(status.message)}"` : '';
    const badge = status.badge ? `<small>${escapeHtml(badgeLabel(status.badge))}</small>` : '';
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
  if (els.historyFirst) els.historyFirst.textContent = status.firstCapturedAt ? timeAgo(status.firstCapturedAt) : tt('watch.first');
  if (els.historyLast) els.historyLast.textContent = status.lastCapturedAt ? timeAgo(status.lastCapturedAt) : tt('watch.last');
  if (els.historyMode) els.historyMode.textContent = state.historyAvailable ? tt('watch.modeEnabled') : tt('watch.modeDisabled');
  if (els.historyNote) {
    const collector = status.collector || {};
    const readiness = status.readiness || {};
    const readyLabels = [readiness.day && tt('period.today'), readiness.week && tt('period.week'), readiness.month && tt('period.month')].filter(Boolean);
    els.historyNote.textContent = state.historyAvailable
      ? `${collector.running ? tt('watch.backgroundRunning') : tt('watch.backgroundIdle')}${readyLabels.length ? tt('watch.readyBaselines', { labels: readyLabels.join('、') }) : tt('watch.waiting')}${tt('watch.serverOff')}`
      : tt('watch.staticNote');
  }
}

function renderInsightStatus() {
  const status = state.insightStatus || {};
  const store = status.store || {};
  if (els.insightCount) els.insightCount.textContent = store.insightCount ?? '—';
  if (els.insightModel) els.insightModel.textContent = status.model || 'qwen3:4b';
  if (els.insightMode) {
    els.insightMode.textContent = state.insightAvailable
      ? tt('status.insightOn')
      : state.insightServiceAvailable
        ? tt('status.insightRule')
        : tt('status.insightStatic');
  }
  if (els.insightNote) {
    let base = '';
    if (state.insightServiceAvailable) {
      if (state.insightAvailable) {
        base = status.modelInstalled === false
          ? tt('status.insightModelMissing', { model: status.model || 'qwen3:4b' })
          : tt('status.insightConnected', { model: status.model || 'qwen3:4b' });
      } else {
        base = tt('status.insightUnreachable');
      }
      els.insightNote.textContent = `${base}${store.insightCount ? tt('status.insightCacheCount', { count: store.insightCount }) : tt('status.insightNoCache')}`;
    } else {
      els.insightNote.textContent = tt('status.insightStaticNeed');
    }
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

async function loadCachedInsights(projects, locale = state.locale) {
  if (!state.insightServiceAvailable) return;
  const ids = unique(projects.flatMap((project) => entityLookupIds(project))).filter((id) => !state.insights[id]).slice(0, 250);
  if (!ids.length) return;
  try {
    const response = await fetchJsonSafe(`/api/insights?ids=${encodeURIComponent(ids.join(','))}&locale=${encodeURIComponent(locale)}`);
    const received = response.insights || {};
    if (!Object.keys(received).length) return;
    state.insights = { ...state.insights, ...received };
    renderRadar();
    renderFavorites();
    if (state.results.length) renderResults();
    if (state.activeDetailId) renderDetail();
    if (els.insightDialog?.open && state.activeInsightId) {
      const active = findProject(state.activeInsightId);
      if (active) renderInsightDetails(active, projectInsight(active));
    }
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
    whatItDoes: project.description || tt('insight.ruleWhat'),
    bestFor: tt('rule.bestFor', { category: categoryLabel(project.category || classifyCategory(project), state.locale) }),
    useMode: inferUseTypes(project).map((type) => tt(`useType.${type}`) || type).join('；'),
    commercial: commercialFriendly(project.license)
      ? tt('rule.commercialFriendly', { license: project.license })
      : tt('rule.commercialUnknown', { license: project.license || tt('card.licenseUnknown') }),
    requirements: `${project.language ? tt('rule.mainTech', { language: project.language }) : ''}${tt('rule.requirementsNote')}`,
    codexValue: tt('rule.codexValueLong'),
    fitForUser: tt('rule.fitFallback'),
    risks: [tt('rule.riskFallbackLong')],
    recommendation: tt('rule.recommendLong'),
    source: 'rule-fallback',
    confidence: 'low',
  };
  const source = value.source === 'ollama' ? tt('insight.sourceAiLabel', { model: value.model || 'Ollama' }) : tt('insight.sourceRule');
  const confidenceMap = { high: tt('insight.confidenceHigh'), medium: tt('insight.confidenceMedium'), low: tt('insight.confidenceLow') };
  const confidence = confidenceMap[value.confidence] || tt('insight.confidenceMedium');
  const risks = Array.isArray(value.risks) && value.risks.length
    ? `<section><h3>${tt('insight.risks')}</h3><ul>${value.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`
    : '';
  els.insightContent.innerHTML = `
    ${error ? `<div class="insight-error">${escapeHtml(error)}</div>` : ''}
    <div class="insight-summary"><span>${escapeHtml(source)} · ${tt('insight.confidence', { level: escapeHtml(confidence) })}</span><strong>${escapeHtml(value.summary || rulePlainSummary(project))}</strong><small>${value.readmeUsed ? tt('insight.readmeUsed') : tt('insight.readmeUnused')}${value.generatedAt ? tt('insight.generatedAt', { time: escapeHtml(timeAgo(value.generatedAt)) }) : ''}</small></div>
    <div class="insight-sections">
      ${insightSection(tt('insight.whatItDoes'), value.whatItDoes)}
      ${insightSection(tt('insight.bestFor'), value.bestFor)}
      ${insightSection(tt('insight.useMode'), value.useMode)}
      ${insightSection(tt('insight.commercial'), value.commercial)}
      ${insightSection(tt('insight.requirements'), value.requirements)}
      ${insightSection(tt('insight.codexValue'), value.codexValue)}
      ${insightSection(tt('insight.fitForUser'), value.fitForUser)}
      ${risks}
      ${insightSection(tt('insight.recommendation'), value.recommendation)}
    </div>`;
  els.insightLoading.hidden = !loading;
  els.regenerateInsight.disabled = loading || !state.insightServiceAvailable;
  els.regenerateInsight.textContent = loading ? tt('insight.generating') : tt('insight.regenerate');
}

async function generateProjectInsight(project, force = false) {
  renderInsightDetails(project, projectInsight(project), { loading: true });
  try {
    const insight = await fetchJsonSafe('/api/insights/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, force, locale: state.locale }),
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
    toast(insight.source === 'ollama' ? (insight.cached ? tt('insight.cachedRead') : tt('insight.generatedCached')) : tt('insight.offlineRule'));
  } catch (error) {
    renderInsightDetails(project, state.insights[project.id], { error: readableError(error) });
    toast(tt('insight.failed', { error: readableError(error) }));
  }
}

function openInsightDialog(id) {
  const project = findProject(id);
  if (!project) return;
  state.activeInsightId = projectKey(project);
  els.insightTitle.textContent = tt('insight.title', { name: project.name });
  els.insightSubtitle.textContent = project.sourceCount > 1 ? tt('insight.subtitleMulti', {
    count: project.sourceCount,
    platform: platformMeta(project).label,
    owner: project.owner || tt('detail.unknownOwner'),
    license: project.license || tt('card.licenseUnknown'),
  }) : tt('insight.subtitleSingle', {
    platform: platformMeta(project).label,
    owner: project.owner || tt('detail.unknownOwner'),
    license: project.license || tt('card.licenseUnknown'),
  });
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
      els.status.textContent = tt('radar.statusCached');
      els.status.className = 'live';
      renderSourceHealth(els.sourceHealth, state.sourceStatus);
      renderRadar();
      void loadHistoryGrowth(state.projects, false);
      void loadCachedInsights([...state.projects, ...state.favorites]);
      openHashProject();
      return;
    }
  }

  els.status.textContent = tt('radar.statusLoading', { count: platformIds.length });
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
      const cached = projects.find((project) => ['fresh', 'stale', 'revalidated'].includes(project.sourceCacheStatus));
      const warning = unique(projects.map((project) => project.sourceWarning)).join('；');
      state.sourceStatus[platformId] = sourceStatusEntry(
        projects.length ? 'live' : 'empty',
        projects.length,
        warning,
        fallback ? tt('search.badgeFallback') : cached?.sourceCacheStatus === 'stale' ? tt('search.badgeStale') : cached?.sourceCacheStatus === 'fresh' ? tt('search.badgeFresh') : cached?.sourceCacheStatus === 'revalidated' ? tt('search.badgeRevalidated') : '',
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
  const searchOnlyCount = Object.values(state.sourceStatus).filter((status) => status.badge === '外部搜索' || status.badge === tt('search.platformSearchOnly')).length;
  els.status.textContent = liveProjects.length
    ? tt('radar.statusLive', { live: liveCount, total: platformIds.length, searchEntry: searchOnlyCount ? tt('radar.searchEntry', { count: searchOnlyCount }) : '', failed: failedCount ? tt('radar.failed', { count: failedCount }) : '' })
    : tt('radar.statusFallback');
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
    toast(tt('search.chooseSource'));
    return;
  }

  state.searchSourceStatus = Object.fromEntries(selectedPlatforms.map((platformId) => [platformId, sourceStatusEntry('loading')]));
  els.searchSummary.textContent = tt('search.analyzing', { count: selectedPlatforms.length });
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
        response.value.partialError ? tt('search.partial', { error: readableError(response.value.partialError) }) : '',
        response.value.sourceWarning,
      ].filter(Boolean).join('；');
      state.searchSourceStatus[platformId] = sourceStatusEntry(
        response.value.projects.length ? 'live' : 'empty',
        response.value.projects.length,
        messages,
        response.value.fallback ? '搜索回退' : (() => {
          const cached = response.value.projects.find((project) => ['fresh', 'stale', 'revalidated'].includes(project.sourceCacheStatus));
          return cached?.sourceCacheStatus === 'stale' ? '过期缓存（非实时）' : cached?.sourceCacheStatus === 'fresh' ? '服务端缓存（非实时）' : cached?.sourceCacheStatus === 'revalidated' ? '已重新验证' : '';
        })(),
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

  const expanded = plan.terms.length ? tt('search.expanded', { terms: plan.terms.slice(0, 10).join(' · ') }) : '';
  const failedPlatforms = selectedPlatforms.filter((platformId) => state.searchSourceStatus[platformId]?.state === 'error');
  const searchOnlyPlatforms = selectedPlatforms.filter((platformId) => state.searchSourceStatus[platformId]?.badge === '外部搜索');
  const fallbackPlatforms = selectedPlatforms.filter((platformId) => ['error', 'empty'].includes(state.searchSourceStatus[platformId]?.state));
  const dedupStats = deduplicationStats(state.rawResults, state.results);
  els.searchSummary.textContent = `${tt('search.found', { query, count: dedupStats.entityCount, merged: dedupStats.mergedSourceCount ? tt('search.merged', { count: dedupStats.mergedSourceCount }) : '' })}${expanded}${searchOnlyPlatforms.length ? tt('search.searchOnly', { platforms: searchOnlyPlatforms.map((platformId) => platformCatalog[platformId].label).join('、') }) : ''}${failedPlatforms.length ? tt('search.failed', { platforms: failedPlatforms.map((platformId) => platformCatalog[platformId].label).join('、') }) : ''}${tt('search.licenseNote')}`;
  renderSourceHealth(els.searchSources, state.searchSourceStatus);
  renderSearchFallbacks(query, fallbackPlatforms);
  renderResults();
  void loadCachedInsights(state.results);
}

function renderSearchFallbacks(query, failedPlatforms) {
  els.searchFallbacks.innerHTML = failedPlatforms.map((platformId) => {
    const meta = platformCatalog[platformId];
    return `<a class="chip fallback" href="${escapeHtml(meta.fallbackUrl(query))}" target="_blank" rel="noopener">${tt('search.fallback', { platform: escapeHtml(meta.label) })}</a>`;
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
    : `<div class="empty"><h3>${tt('search.empty')}</h3><p>${tt('search.emptyHint')}</p></div>`;
  bindProjectActions(els.searchGrid);
}


async function detectRuntimeMode() {
  if (!els.runtimeMode || !els.runtimeDetail) return;
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error(tt('errors.staticServer'));
    const health = await response.json();
    if (!health.giteeProxy) throw new Error(tt('status.channelDisabled'));
    state.codexExportAvailable = Boolean(health.codexExport);
    state.identityServiceAvailable = Boolean(health.identityCorrections);
    state.trustServiceAvailable = Boolean(health.trust);
    state.backupAvailable = Boolean(health.backup);
    state.packageServiceAvailable = Boolean(health.packages);
    els.runtimeMode.textContent = tt('status.runtimeLive');
    els.runtimeMode.className = 'runtime-live';
    const githubAuthMode = health.upstream?.providers?.github?.authMode === 'authenticated' ? tt('status.githubAuth') : tt('status.githubAnon');
    els.runtimeDetail.textContent = health.insights ? tt('status.runtimeDetailFull', { auth: githubAuthMode, packet: health.codexExport ? tt('status.packet') : tt('status.browserPrompt') }) : tt('status.runtimeDetailNoInsight', { auth: githubAuthMode });
    renderServiceStatuses();
    if (state.identityServiceAvailable) await loadIdentityOverridesFromServer();
  } catch {
    state.codexExportAvailable = false;
    state.identityServiceAvailable = false;
    state.trustServiceAvailable = false;
    state.backupAvailable = false;
    state.packageServiceAvailable = false;
    renderServiceStatuses();
    els.runtimeMode.textContent = tt('status.runtimeStatic');
    els.runtimeMode.className = 'runtime-warn';
    els.runtimeDetail.textContent = tt('status.runtimeStaticDetail');
  }
}

function init() {
  applyDocumentLanguage(document, state.locale);
  applyStaticI18n();
  bindLocaleSwitch();
  detectRuntimeMode();
  void loadInsightStatus(false).then(() => loadCachedInsights([...state.projects, ...state.favorites]));
  renderCategories();
  els.suggestions.innerHTML = suggestions.map((key) => `<button class="chip" data-query="${escapeHtml(tt(`suggestions.${key}`))}">${escapeHtml(tt(`suggestions.${key}`))}</button>`).join('');

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
    query ? searchProjects(query) : toast(tt('search.queryEmpty'));
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
    toast(tt('favorites.saved'));
  };

  els.closeDialog.onclick = els.cancel.onclick = () => els.dialog.close();
  els.favoriteSearch.oninput = renderFavorites;
  els.tagFilter.onchange = renderFavorites;

  els.export.onclick = () => downloadJson(state.favorites, `openradar-favorites-${new Date().toISOString().slice(0, 10)}.json`);
  [els.exportBackup, els.watchExportBackup].filter(Boolean).forEach((button) => {
    button.onclick = async () => {
      button.disabled = true;
      try { await exportFullBackup(); }
      catch (error) { toast(tt('toast.backupImportFailed', { error: readableError(error) })); }
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
      els.refreshInsights.textContent = tt('status.rechecking');
      await loadInsightStatus(true);
      await loadCachedInsights([...state.projects, ...state.results, ...state.favorites]);
      els.refreshInsights.disabled = false;
      els.refreshInsights.textContent = tt('status.recheck');
      toast(state.insightAvailable ? tt('status.insightOllamaReady') : tt('status.insightNotReady'));
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
    if (!state.compareItems.length || confirm(tt('compare.clearConfirm'))) {
      state.compareItems = [];
      persistCompareItems();
      renderCompare();
      toast(tt('compare.cleared'));
    }
  };

  if (els.collectHistory) {
    els.collectHistory.onclick = async () => {
      els.collectHistory.disabled = true;
      els.collectHistory.textContent = tt('watch.collecting');
      try {
        await fetchJsonSafe('/api/history/collect', { method: 'POST' });
        const status = await fetchJsonSafe('/api/history/status');
        state.historyStatus = status;
        state.historyAvailable = true;
        renderHistoryStatus();
        await loadHistoryGrowth(state.projects, false);
        toast(tt('watch.collected'));
      } catch (error) {
        toast(tt('watch.collectFailed', { error: readableError(error) }));
      } finally {
        els.collectHistory.disabled = false;
        els.collectHistory.textContent = tt('watch.collect');
      }
    };
  }

  els.clear.onclick = () => {
    if (state.favorites.length && confirm(tt('favorites.clearConfirm'))) {
      state.favorites = [];
      persistFavorites();
      toast(tt('favorites.cleared'));
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
