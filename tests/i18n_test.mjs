import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CATEGORY_IDS,
  DEFAULT_LOCALE,
  LEGACY_CATEGORY_MAP,
  LOCALE_STORAGE_KEY,
  applyDocumentLanguage,
  categoryLabel,
  getSavedLocale,
  normalizeCategory,
  normalizeLocale,
  resolveLocale,
  setSavedLocale,
  t,
} from '../i18n/index.js';
import { en } from '../i18n/en.js';
import { zhCN } from '../i18n/zh-CN.js';
import { InsightStore } from '../insight-store.mjs';
import { createInsightService, projectFingerprint, ruleBasedInsight, ruleBasedInsightForLocale } from '../insight-service.mjs';
import { createOpenRadarServer } from '../server.mjs';

// Locale resolution: saved > browser > fallback.
assert.equal(normalizeLocale('zh'), 'zh-CN');
assert.equal(normalizeLocale('zh-CN'), 'zh-CN');
assert.equal(normalizeLocale('zh-TW'), 'zh-CN');
assert.equal(normalizeLocale('en-US'), 'en');
assert.equal(normalizeLocale('en-GB'), 'en');
assert.equal(normalizeLocale('de'), '');
assert.equal(normalizeLocale('ja'), '');
assert.equal(normalizeLocale('unknown'), '');
assert.equal(normalizeLocale(''), '');
assert.equal(normalizeLocale(null), '');

assert.equal(resolveLocale({ saved: 'zh-TW', languages: ['en-US'] }), 'zh-CN');
assert.equal(resolveLocale({ saved: 'en', languages: ['zh-CN'] }), 'en');
assert.equal(resolveLocale({ saved: '', languages: ['zh-CN', 'en-US'] }), 'zh-CN');
assert.equal(resolveLocale({ saved: '', languages: ['zh', 'de'] }), 'zh-CN');
assert.equal(resolveLocale({ saved: '', languages: ['en-GB', 'ja'] }), 'en');
assert.equal(resolveLocale({ saved: '', languages: ['de'] }), DEFAULT_LOCALE);
assert.equal(resolveLocale({ saved: 'fr-FR' }), 'en');
assert.equal(resolveLocale({}), DEFAULT_LOCALE);
assert.equal(resolveLocale({ saved: 'zh-CN', languages: 'zh' }), 'zh-CN');

// Saved-locale storage: valid values round-trip, invalid values do not break.
const memory = new Map();
const storage = {
  getItem: (key) => memory.get(String(key)) ?? null,
  setItem: (key, value) => memory.set(String(key), String(value)),
};
assert.equal(getSavedLocale(storage), '');
assert.equal(setSavedLocale(storage, 'zh-TW'), true);
assert.equal(getSavedLocale(storage), 'zh-CN');
assert.equal(memory.get(LOCALE_STORAGE_KEY), 'zh-CN');
assert.equal(setSavedLocale(storage, 'fr'), false);
assert.equal(getSavedLocale(storage), 'zh-CN');
assert.equal(setSavedLocale(storage, 'en'), true);
assert.equal(getSavedLocale(storage), 'en');
assert.equal(setSavedLocale(null, 'en'), false);
assert.equal(getSavedLocale({ getItem: () => { throw new Error('blocked'); } }), '');

// Translation keys: stable key shape, per-locale values, fallback to en.
assert.equal(t('nav.search'), '灵感搜索');
assert.equal(t('nav.search', 'zh-CN'), '灵感搜索');
assert.equal(t('nav.search', 'en'), 'Inspiration Search');
assert.equal(t('category.all', 'zh-CN'), '全部');
assert.equal(t('category.all', 'en'), 'All');
assert.equal(t('missing.deep.key', 'zh-CN'), 'missing.deep.key');
assert.equal(t('useType.direct', 'en'), 'Install and use directly');

// Both locale resources expose the same key tree (no untranslated keys).
function flattenKeys(node, prefix = '') {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' && !Array.isArray(value) ? flattenKeys(value, path) : [path];
  });
}
const enKeys = flattenKeys(en).sort();
const zhKeys = flattenKeys(zhCN).sort();
assert.deepEqual(enKeys, zhKeys, 'en and zh-CN translation keys must match');
for (const key of enKeys) {
  assert.notEqual(t(key, 'en'), key, `en missing translation for ${key}`);
  assert.notEqual(t(key, 'zh-CN'), key, `zh-CN missing translation for ${key}`);
}

// Category ids are stable machine values, display text comes from resources.
for (const id of CATEGORY_IDS) assert.equal(normalizeCategory(id), id);
assert.equal(categoryLabel('game-development', 'zh-CN'), '游戏开发');
assert.equal(categoryLabel('game-development', 'en'), 'Game Development');
assert.equal(categoryLabel('agent-mcp', 'zh-CN'), 'Agent与MCP');
assert.equal(categoryLabel('agent-mcp', 'en'), 'Agents & MCP');

// Legacy category migration is complete, idempotent, and lossless for IDs.
assert.equal(normalizeCategory('游戏开发'), 'game-development');
assert.equal(normalizeCategory('Agent与MCP'), 'agent-mcp');
assert.equal(normalizeCategory('全部'), 'all');
assert.equal(normalizeCategory('Web与App'), 'web-app');
assert.equal(normalizeCategory('办公效率'), 'productivity');
assert.equal(normalizeCategory(''), 'all');
assert.equal(normalizeCategory(undefined), 'all');
assert.equal(normalizeCategory('made-up-value'), 'all');
assert.equal(normalizeCategory(normalizeCategory('游戏开发')), 'game-development');
assert.equal(Object.keys(LEGACY_CATEGORY_MAP).length, CATEGORY_IDS.length);

// Persisted favorites / compare objects keep count and IDs after migration.
const legacyFavorites = [
  { id: 'github:demo/one', name: 'one', category: '游戏开发', note: '备注', tags: ['test'] },
  { id: 'github:demo/two', name: 'two', category: 'Agent与MCP', note: '备注2', tags: [] },
];
const migratedFavorites = legacyFavorites.map((item) => ({ ...item, category: normalizeCategory(item.category) }));
assert.equal(migratedFavorites.length, legacyFavorites.length);
assert.deepEqual(migratedFavorites.map((item) => item.id), ['github:demo/one', 'github:demo/two']);
assert.equal(migratedFavorites[0].category, 'game-development');
assert.equal(migratedFavorites[1].category, 'agent-mcp');
assert.equal(migratedFavorites[0].note, '备注');
assert.deepEqual(migratedFavorites[0].tags, ['test']);

const legacyCompare = [
  { id: 'npm:@demo/pkg', category: '开发组件' },
  { id: 'github:demo/three', category: '办公效率' },
];
const migratedCompare = legacyCompare.map((item) => ({ ...item, category: normalizeCategory(item.category) }));
assert.equal(migratedCompare.length, 2);
assert.equal(migratedCompare[0].category, 'dev-components');
assert.equal(migratedCompare[1].category, 'productivity');

// Document metadata follows the locale without throwing.
const doc = {
  documentElement: { lang: '' },
  title: '',
  querySelector: () => ({ setAttribute: (name, value) => { doc.metaContent = value; } }),
};
assert.equal(applyDocumentLanguage(doc, 'zh-TW'), 'zh-CN');
assert.equal(doc.documentElement.lang, 'zh-CN');
assert.equal(applyDocumentLanguage(doc, 'en'), 'en');
assert.equal(doc.documentElement.lang, 'en');
assert.equal(applyDocumentLanguage({}, 'zh-CN'), 'zh-CN');

// Insight cache is isolated by locale; legacy key maps to zh-CN.
const insightRoot = await mkdtemp(join(tmpdir(), 'openradar-i18n-insights-'));
const insightFile = join(insightRoot, 'insights.json');
const store = new InsightStore(insightFile, { now: () => Date.parse('2026-07-29T00:00:00Z') });
await store.init();
const legacyInsight = {
  projectId: 'github:demo/cache',
  summary: '旧中文解读',
  fingerprint: 'fp-v1',
  source: 'ollama',
  risks: ['风险'],
  recommendation: '先测试',
  confidence: 'medium',
};
// Simulate a pre-locale file, then re-init to force migration.
const legacyFile = JSON.stringify({ version: 1, updatedAt: null, insights: { 'github:demo/cache': legacyInsight } });
await import('node:fs/promises').then((fs) => fs.writeFile(insightFile, legacyFile, 'utf8'));
const migratedStore = new InsightStore(insightFile, { now: () => Date.parse('2026-07-29T00:00:00Z') });
await migratedStore.init();
const legacyRead = await migratedStore.get('github:demo/cache', 'zh-CN');
assert.equal(legacyRead.summary, '旧中文解读');
assert.equal(legacyRead.locale, 'zh-CN');
assert.equal(await migratedStore.get('github:demo/cache', 'en'), null);

await migratedStore.set('github:demo/cache', { ...legacyInsight, summary: '中文新版' }, 'zh-CN');
await migratedStore.set('github:demo/cache', { ...legacyInsight, summary: 'English version' }, 'en');
const zhHit = await migratedStore.get('github:demo/cache', 'zh-CN');
const enHit = await migratedStore.get('github:demo/cache', 'en');
assert.equal(zhHit.summary, '中文新版');
assert.equal(enHit.summary, 'English version');
assert.notEqual(zhHit.summary, enHit.summary);
const storeStatus = await migratedStore.status();
assert.ok(storeStatus.insightCount >= 2);
await rm(insightRoot, { recursive: true, force: true });
const promptRoot = await mkdtemp(join(tmpdir(), 'openradar-i18n-prompt-'));

// Insight generation prompt is de-personalized and locale-aware, and the
// cache does not leak between zh-CN and en.
const project = {
  id: 'github:demo/openradar',
  platform: 'github',
  name: 'openradar',
  owner: 'demo',
  description: 'A self-hosted open-source project discovery dashboard.',
  url: 'https://github.com/demo/openradar',
  language: 'TypeScript',
  license: 'MIT',
  updatedAt: '2026-07-28T23:00:00Z',
  createdAt: '2026-07-01T00:00:00Z',
  category: '办公效率',
  topics: ['open-source', 'dashboard'],
  useTypes: ['direct', 'selfhost', 'codex'],
  stars: 100,
  forks: 12,
};
let promptBodies = [];
const promptStore = new InsightStore(join(promptRoot, 'prompt.json'));
const promptService = createInsightService({
  store: promptStore,
  now: () => Date.parse('2026-07-29T00:00:00Z'),
  fetchImpl: async (url, options = {}) => {
    const target = String(url);
    if (target.endsWith('/api/tags')) {
      return new Response(JSON.stringify({ models: [{ name: 'qwen3:4b' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (target.endsWith('/api/chat')) {
      const chatBody = JSON.parse(options.body);
      promptBodies.push(chatBody);
      const isEnglish = /plain English/.test(chatBody.messages[1].content);
      return new Response(JSON.stringify({
        message: {
          role: 'assistant',
          content: JSON.stringify({
            summary: isEnglish ? 'English summary' : '中文摘要',
            whatItDoes: 'what',
            bestFor: 'best',
            useMode: 'use',
            commercial: 'license',
            requirements: 'node',
            codexValue: 'codex',
            fitForUser: isEnglish ? 'Use-case fit depends on your context.' : '适用场景匹配度取决于你的接入成本。',
            risks: ['risk'],
            recommendation: 'test',
            confidence: 'medium',
          }),
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (target.includes('api.github.com/repos/demo/openradar/readme')) {
      return new Response('# OpenRadar\nREADME', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    throw new Error(`Unexpected URL: ${target}`);
  },
});

const zhPrompt = await promptService.generate(project, { locale: 'zh-CN' });
const enPrompt = await promptService.generate(project, { locale: 'en' });
assert.equal(promptBodies.length, 2);
assert.match(promptBodies[0].messages[1].content, /通用开源使用者与开发者/);
assert.doesNotMatch(promptBodies[0].messages[1].content, /Windows电脑|NVIDIA|8GB显存|用户偏好/);
assert.match(promptBodies[1].messages[1].content, /plain English/);
assert.doesNotMatch(promptBodies[1].messages[1].content, /Windows电脑|NVIDIA|8GB显存|用户偏好/);
assert.equal(zhPrompt.cached, false);
assert.equal(enPrompt.cached, false);
const zhAgain = await promptService.generate(project, { locale: 'zh-CN' });
assert.equal(zhAgain.cached, true);
const enAgain = await promptService.generate(project, { locale: 'en' });
assert.equal(enAgain.cached, true);
assert.equal(promptBodies.length, 2);
assert.notEqual(zhAgain.summary, enAgain.summary);

const rule = ruleBasedInsight(project);
assert.doesNotMatch(rule.fitForUser, /游戏\/AI|NVIDIA|Windows电脑/);
assert.match(rule.fitForUser, /适用场景匹配度/);

// Rule-based insight is fully localized: en has no Chinese, zh-CN is Chinese.
const ruleEn = ruleBasedInsightForLocale(project, '', 'en');
const ruleZh = ruleBasedInsightForLocale(project, '', 'zh-CN');
// whatItDoes intentionally passes through the source description (class D source data).
const ruleEnFields = [ruleEn.summary, ruleEn.bestFor, ruleEn.useMode, ruleEn.commercial, ruleEn.requirements, ruleEn.codexValue, ruleEn.fitForUser, ruleEn.recommendation, ...ruleEn.risks];
const ruleZhFields = [ruleZh.summary, ruleZh.bestFor, ruleZh.useMode, ruleZh.commercial, ruleZh.requirements, ruleZh.codexValue, ruleZh.fitForUser, ruleZh.recommendation, ...ruleZh.risks];
for (const field of ruleEnFields) assert.doesNotMatch(field, /[\u4e00-\u9fff]/, `en rule leaked Chinese: ${field}`);
for (const field of ruleZhFields) assert.match(field, /[\u4e00-\u9fff]/, `zh-CN rule missing Chinese: ${field}`);
assert.match(ruleEn.summary, /open-source project/);
assert.match(ruleZh.summary, /开源项目/);
assert.match(ruleEn.commercial, /MIT/);
assert.match(ruleZh.commercial, /MIT/);
// Reason text is localized for en (never raw Chinese server message).
const ruleEnReason = ruleBasedInsightForLocale(project, '无法连接本地Ollama', 'en');
assert.doesNotMatch(ruleEnReason.risks.join(' '), /[\u4e00-\u9fff]/);
const ruleZhReason = ruleBasedInsightForLocale(project, '无法连接本地Ollama', 'zh-CN');
assert.ok(ruleZhReason.risks.some((risk) => risk.includes('本地AI未生成')));

// AI prompts carry explicit language instructions and no personal profile.
const zhPromptBody = promptBodies.find((body) => body.messages[1].content.includes('简体中文'));
const enPromptBody = promptBodies.find((body) => body.messages[1].content.includes('plain English'));
assert.ok(zhPromptBody, 'zh-CN prompt missing Simplified Chinese instruction');
assert.ok(enPromptBody, 'en prompt missing plain English instruction');
assert.match(zhPromptBody.messages[0].content, /简体中文|结构化中文/);
assert.match(enPromptBody.messages[0].content, /plain English/);
assert.doesNotMatch(enPromptBody.messages[0].content, /[\u4e00-\u9fff]/);
for (const body of promptBodies) {
  assert.doesNotMatch(body.messages[1].content, /Windows电脑|NVIDIA|8GB显存|用户偏好|私人目录|用户身份/);
}

// Locale switch must not reuse the wrong-language insight from state.
const switchStore = new InsightStore(join(promptRoot, 'switch.json'));
const switchService = createInsightService({
  store: switchStore,
  now: () => Date.parse('2026-07-29T00:00:00Z'),
  fetchImpl: async (url, options = {}) => {
    const target = String(url);
    if (target.endsWith('/api/tags')) {
      return new Response(JSON.stringify({ models: [{ name: 'qwen3:4b' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (target.endsWith('/api/chat')) {
      const chatBody = JSON.parse(options.body);
      const isEnglish = /plain English/.test(chatBody.messages[1].content);
      return new Response(JSON.stringify({
        message: {
          role: 'assistant',
          content: JSON.stringify({
            summary: isEnglish ? 'English summary' : '中文摘要',
            whatItDoes: 'what',
            bestFor: 'best',
            useMode: 'use',
            commercial: 'license',
            requirements: 'node',
            codexValue: 'codex',
            fitForUser: isEnglish ? 'Use-case fit depends on your context.' : '适用场景匹配度取决于你的接入成本。',
            risks: ['risk'],
            recommendation: 'test',
            confidence: 'medium',
          }),
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (target.includes('api.github.com/repos/demo/openradar/readme')) {
      return new Response('# OpenRadar\nREADME', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    throw new Error(`Unexpected URL: ${target}`);
  },
});
const zhFirst = await switchService.generate(project, { locale: 'zh-CN' });
const enFirst = await switchService.generate(project, { locale: 'en' });
assert.equal(zhFirst.summary, '中文摘要');
assert.equal(enFirst.summary, 'English summary');
const zhCachedSwitch = await switchService.generate(project, { locale: 'zh-CN' });
const enCachedSwitch = await switchService.generate(project, { locale: 'en' });
assert.equal(zhCachedSwitch.cached, true);
assert.equal(enCachedSwitch.cached, true);
assert.equal((await switchStore.get(project.id, 'zh-CN')).summary, '中文摘要');
assert.equal((await switchStore.get(project.id, 'en')).summary, 'English summary');
assert.notEqual((await switchStore.get(project.id, 'zh-CN')).summary, (await switchStore.get(project.id, 'en')).summary);

// Server routes pass locale through to the insight service.
let receivedLocale = '';
const serverInsightService = {
  status: async () => ({ enabled: true, available: true, model: 'qwen3:4b' }),
  getMany: async (ids, locale) => Object.fromEntries(ids.map((id) => [id, { projectId: id, summary: 'x', locale }])),
  generate: async (projectValue, options) => { receivedLocale = options.locale; return { projectId: projectValue.id, summary: 'y', locale: options.locale }; },
};
const server = createOpenRadarServer({ insightService: serverInsightService });
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const generateResponse = await fetch(`${base}/api/insights/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project: { id: 'github:demo/openradar', name: 'openradar', platform: 'github' }, locale: 'en' }),
});
assert.equal(generateResponse.status, 200);
assert.equal((await generateResponse.json()).locale, 'en');
assert.equal(receivedLocale, 'en');
const cachedResponse = await fetch(`${base}/api/insights?ids=github%3Ademo%2Fopenradar&locale=zh-CN`).then((response) => response.json());
assert.equal(cachedResponse.insights['github:demo/openradar'].locale, 'zh-CN');
server.close();
await once(server, 'close');
await rm(promptRoot, { recursive: true, force: true });

console.log(JSON.stringify({
  supportedLocales: ['en', 'zh-CN'],
  categories: CATEGORY_IDS.length,
  legacyCategories: Object.keys(LEGACY_CATEGORY_MAP).length,
  promptBodies: promptBodies.length,
  zhCached: zhAgain.cached,
  enCached: enAgain.cached,
}, null, 2));
