import { en } from './en.js';
import { zhCN } from './zh-CN.js';

export const SUPPORTED_LOCALES = Object.freeze(['en', 'zh-CN']);
export const LOCALE_STORAGE_KEY = 'openradar:locale:v1';
export const DEFAULT_LOCALE = 'en';
// Existing zh-CN data and insights were written before locales existed.
export const LEGACY_DEFAULT_LOCALE = 'zh-CN';

const MESSAGES = Object.freeze({ en, 'zh-CN': zhCN });

export const CATEGORY_IDS = Object.freeze([
  'all',
  'game-development',
  'game-ai-npc',
  'three-d-animation',
  'ai-image-video',
  'agent-mcp',
  'web-app',
  'wechat-ecosystem',
  'education',
  'content-creation',
  'productivity',
  'life-tools',
  'business-foundation',
  'dev-components',
]);

// Legacy display strings used as internal values in old data.
export const LEGACY_CATEGORY_MAP = Object.freeze({
  '全部': 'all',
  '游戏开发': 'game-development',
  '游戏AI与NPC': 'game-ai-npc',
  '3D与动画': 'three-d-animation',
  'AI图片视频': 'ai-image-video',
  'Agent与MCP': 'agent-mcp',
  'Web与App': 'web-app',
  '微信生态': 'wechat-ecosystem',
  '教育产品': 'education',
  '内容创作': 'content-creation',
  '办公效率': 'productivity',
  '生活工具': 'life-tools',
  '商业应用底座': 'business-foundation',
  '开发组件': 'dev-components',
});

export function normalizeLocale(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'en' || raw.startsWith('en-')) return 'en';
  if (raw === 'zh' || raw.startsWith('zh-')) return 'zh-CN';
  return '';
}

export function resolveLocale({ saved = '', languages = [] } = {}) {
  const savedLocale = normalizeLocale(saved);
  if (savedLocale) return savedLocale;
  const list = Array.isArray(languages) ? languages : [languages];
  for (const language of list) {
    const normalized = normalizeLocale(language);
    if (normalized) return normalized;
  }
  return DEFAULT_LOCALE;
}

export function getSavedLocale(storage) {
  try {
    return normalizeLocale(storage?.getItem?.(LOCALE_STORAGE_KEY));
  } catch {
    return '';
  }
}

export function setSavedLocale(storage, locale) {
  const normalized = normalizeLocale(locale);
  if (!normalized) return false;
  if (!storage || typeof storage.setItem !== 'function') return false;
  try {
    storage.setItem(LOCALE_STORAGE_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

export function translate(key, locale = 'zh-CN', params = {}) {
  const normalized = normalizeLocale(locale) || LEGACY_DEFAULT_LOCALE;
  let value = key.split('.').reduce((node, part) => node?.[part], MESSAGES[normalized]);
  if (value === undefined) value = key.split('.').reduce((node, part) => node?.[part], MESSAGES.en);
  if (value === undefined) return key;
  return String(value).replace(/\{(\w+)\}/g, (match, name) => (Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match));
}

export function t(key, locale = 'zh-CN', params = {}) {
  return translate(key, locale, params);
}

export function normalizeCategory(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'all';
  if (CATEGORY_IDS.includes(raw)) return raw;
  return LEGACY_CATEGORY_MAP[raw] || 'all';
}

export function categoryLabel(categoryId, locale = 'zh-CN') {
  return t(`category.${normalizeCategory(categoryId)}`, locale);
}

export function applyDocumentLanguage(doc, locale) {
  const normalized = normalizeLocale(locale) || DEFAULT_LOCALE;
  try {
    if (doc?.documentElement) doc.documentElement.lang = normalized;
    const title = translate('meta.title', normalized);
    if (title && doc?.title) doc.title = title;
    const description = translate('meta.description', normalized);
    if (description && doc?.querySelector) {
      const meta = doc.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', description);
    }
  } catch {
    // Document metadata is best-effort and must never break app boot.
  }
  return normalized;
}
