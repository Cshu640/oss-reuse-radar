import { createHash } from 'node:crypto';
import { categoryLabel, normalizeCategory } from './i18n/index.js';

const OLLAMA_TIMEOUT = 120_000;
const STATUS_TIMEOUT = 3_500;
const README_TIMEOUT = 8_000;
const README_MAX_CHARS = 7_000;
const ALLOWED_PLATFORMS = new Set(['github', 'huggingface', 'gitlab', 'codeberg', 'gitee', 'modelscope']);
const ALLOWED_LOCALES = new Set(['en', 'zh-CN']);

export const INSIGHT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    whatItDoes: { type: 'string' },
    bestFor: { type: 'string' },
    useMode: { type: 'string' },
    commercial: { type: 'string' },
    requirements: { type: 'string' },
    codexValue: { type: 'string' },
    fitForUser: { type: 'string' },
    risks: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    recommendation: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: [
    'summary',
    'whatItDoes',
    'bestFor',
    'useMode',
    'commercial',
    'requirements',
    'codexValue',
    'fitForUser',
    'risks',
    'recommendation',
    'confidence',
  ],
};

function text(value, max = 4000) {
  return String(value || '').replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function stringArray(value, maxItems = 12, maxLength = 220) {
  return Array.isArray(value) ? value.map((item) => text(item, maxLength)).filter(Boolean).slice(0, maxItems) : [];
}

function projectPath(project) {
  const id = text(project?.id, 300);
  const separator = id.indexOf(':');
  const platform = separator > 0 ? id.slice(0, separator) : text(project?.platform, 40);
  const path = separator > 0 ? id.slice(separator + 1) : `${text(project?.owner, 120)}/${text(project?.name, 120)}`;
  if (!ALLOWED_PLATFORMS.has(platform)) return { platform: '', path: '' };
  if (!/^[\w.@+\-/]+$/u.test(path) || !path.includes('/') || path.includes('..')) return { platform: '', path: '' };
  return { platform, path };
}

export function normalizeProjectInput(value = {}) {
  const identity = projectPath(value);
  return {
    id: text(value.id, 300),
    platform: identity.platform || text(value.platform, 40),
    path: identity.path,
    name: text(value.name, 160),
    owner: text(value.owner, 160),
    description: text(value.description, 1400),
    url: text(value.url, 1000),
    language: text(value.language, 120),
    license: text(value.license, 180) || '许可证待核查',
    updatedAt: text(value.updatedAt, 100),
    createdAt: text(value.createdAt, 100),
    category: text(value.category, 120),
    topics: stringArray(value.topics, 16, 100),
    useTypes: stringArray(value.useTypes, 6, 80),
    stars: Number(value.stars || 0),
    forks: Number(value.forks || 0),
    likes: Number(value.likes || 0),
    downloads: Number(value.downloads || 0),
  };
}

export function projectFingerprint(project) {
  const normalized = normalizeProjectInput(project);
  const source = JSON.stringify({
    id: normalized.id,
    description: normalized.description,
    updatedAt: normalized.updatedAt,
    license: normalized.license,
    language: normalized.language,
    category: normalized.category,
    topics: normalized.topics,
    useTypes: normalized.useTypes,
  });
  return createHash('sha256').update(source).digest('hex');
}

function licenseCopy(license) {
  if (/MIT|Apache|BSD|ISC|Unlicense/i.test(license)) return `${license}通常允许修改和商业使用，但正式发布前仍需核对许可证原文与第三方素材许可。`;
  if (/MPL/i.test(license)) return `${license}通常允许商业使用，但修改过的相关文件可能需要继续开放，采用前应复核具体义务。`;
  if (/AGPL/i.test(license)) return `${license}对网络服务公开源代码有较强要求，不适合未经审查就直接用于闭源SaaS。`;
  if (/GPL/i.test(license)) return `${license}存在较强的开源传播义务，闭源商业产品采用前需要专门审查。`;
  if (/待核查|unknown|other|custom/i.test(license)) return '许可证信息不明确，当前只能用于研究和评估，不能据此认定可商用。';
  return `${license}需要逐条核对，尤其要确认商业使用、修改、分发、模型权重和素材许可。`;
}

function useModeCopy(project) {
  const types = new Set(project.useTypes);
  const result = [];
  if (types.has('direct')) result.push('可以先直接安装或体验');
  if (types.has('selfhost')) result.push('适合个人或团队自行部署');
  if (types.has('codex')) result.push('可以交给Codex做二次开发');
  if (types.has('component')) result.push('更像可嵌入其他项目的技术组件');
  if (types.has('reference')) result.push('适合参考产品设计与交互');
  if (types.has('business')) result.push('可能具备产品化或商业化空间');
  return result.length ? result.join('；') : '需要先阅读README和安装文档，再判断是完整产品还是技术组件。';
}

function audienceCopy(project) {
  const category = project.category || '相关领域';
  if (project.useTypes.includes('direct')) return `适合希望直接使用${category}工具的个人、小团队或自托管用户。`;
  if (project.useTypes.includes('component')) return `适合正在开发${category}产品、希望复用成熟组件而不是从零实现的开发者。`;
  return `适合关注${category}、准备做技术选型或寻找二次开发底座的人。`;
}

export function ruleBasedInsight(projectValue, reason = '') {
  return ruleBasedInsightForLocale(projectValue, reason, 'zh-CN');
}

export function ruleBasedInsightForLocale(projectValue, reason = '', locale = 'zh-CN') {
  const project = normalizeProjectInput(projectValue);
  const category = normalizeCategory(project.category);
  const categoryText = categoryLabel(category, locale);
  const subject = project.description || `${categoryText}开源项目`;
  const summary = `${project.name || '这个项目'}是一个${category ? `偏${categoryText}的` : ''}开源项目，主要用途是：${subject.replace(/[。.!！]+$/u, '')}。`;
  const requirements = [
    project.language ? `主要技术或框架：${project.language}` : '主要技术栈尚未识别',
    project.platform ? `来源平台：${project.platform}` : '',
    '安装方式、系统要求、内存/显存与外部服务依赖仍需查看README确认',
  ].filter(Boolean).join('；');
  const risks = [
    '当前结论主要根据项目元数据和简介生成，尚未等同于完整代码审计。',
    /待核查|unknown|other|custom/i.test(project.license) ? '许可证尚未确认，不应直接用于商业发布。' : '即使许可证看起来友好，也要复核第三方依赖、模型和素材许可。',
    reason ? `本地AI未生成：${reason}` : '',
  ].filter(Boolean);
  return {
    projectId: project.id,
    fingerprint: projectFingerprint(project),
    model: '',
    source: 'rule-fallback',
    generatedAt: new Date().toISOString(),
    readmeUsed: false,
    summary,
    whatItDoes: project.description || '项目简介不足，需要进入项目主页阅读README、Demo和Release记录。',
    bestFor: audienceCopy(project),
    useMode: useModeCopy(project),
    commercial: licenseCopy(project.license),
    requirements,
    codexValue: project.useTypes.includes('codex') || project.useTypes.includes('component')
      ? '可以先让Codex审计目录结构、许可证、依赖和核心模块，再决定Fork、抽取组件还是只参考实现。'
      : 'Codex可用于检查安装方法、部署流程和是否存在可复用模块，但不一定需要直接Fork。',
    fitForUser: locale === 'en'
      ? 'Use-case fit depends on your integration cost, maintenance state, and current priorities; compare scores and trust signals before investing.'
      : '适用场景匹配度：取决于你的接入成本、维护状态和当前主线；建议结合评分与Trust信号判断后再投入。',
    risks,
    recommendation: project.useTypes.includes('direct')
      ? '先收藏并直接体验，确认真实好用后再考虑二次开发。'
      : '先收藏，交给Codex做一次轻量技术与许可证审计，不要立即大规模接入。',
    confidence: project.description ? 'medium' : 'low',
  };
}

function stripReadme(markdown = '') {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, ' [代码块已省略] ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*[#>*+-]+\s?/gm, '')
    .replace(/\|[-:| ]+\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, README_MAX_CHARS);
}

async function fetchWithTimeout(fetchImpl, url, options = {}, timeout = README_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetchImpl(url, { redirect: 'follow', ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function firstReadable(fetchImpl, requests) {
  for (const request of requests) {
    try {
      const response = await fetchWithTimeout(fetchImpl, request.url, request.options || {});
      if (!response.ok) continue;
      const body = await response.text();
      if (body && !/^\s*[{[]\s*"error"/i.test(body)) return stripReadme(body);
    } catch {
      // README is optional; try the next known-safe location.
    }
  }
  return '';
}

export async function fetchProjectReadme(projectValue, fetchImpl = fetch) {
  const project = normalizeProjectInput(projectValue);
  if (!project.path) return '';
  const encoded = encodeURIComponent(project.path);
  const [owner, ...repoParts] = project.path.split('/');
  const repo = repoParts.join('/');
  const rawHeaders = { Accept: 'text/plain, text/markdown;q=0.9', 'User-Agent': 'OpenRadar/0.3-B' };
  if (project.platform === 'github') {
    return firstReadable(fetchImpl, [{
      url: `https://api.github.com/repos/${encodeURIComponent(owner)}/${repoParts.map(encodeURIComponent).join('/')}/readme`,
      options: { headers: { Accept: 'application/vnd.github.raw+json', 'User-Agent': 'OpenRadar/0.3-B' } },
    }]);
  }
  if (project.platform === 'huggingface') {
    return firstReadable(fetchImpl, [{ url: `https://huggingface.co/${project.path}/raw/main/README.md`, options: { headers: rawHeaders } }]);
  }
  if (project.platform === 'gitlab') {
    const base = `https://gitlab.com/api/v4/projects/${encoded}/repository/files`;
    return firstReadable(fetchImpl, ['README.md', 'readme.md', 'README.rst'].map((file) => ({
      url: `${base}/${encodeURIComponent(file)}/raw?ref=HEAD`, options: { headers: rawHeaders },
    })));
  }
  if (project.platform === 'codeberg') {
    return firstReadable(fetchImpl, ['main', 'master'].flatMap((branch) => ['README.md', 'readme.md'].map((file) => ({
      url: `https://codeberg.org/${owner}/${repo}/raw/branch/${branch}/${file}`, options: { headers: rawHeaders },
    }))));
  }
  if (project.platform === 'gitee') {
    return firstReadable(fetchImpl, ['master', 'main'].map((branch) => ({
      url: `https://gitee.com/${owner}/${repo}/raw/${branch}/README.md`, options: { headers: rawHeaders },
    })));
  }
  if (project.platform === 'modelscope') {
    return firstReadable(fetchImpl, ['master', 'main'].map((branch) => ({
      url: `https://modelscope.cn/models/${project.path}/resolve/${branch}/README.md`, options: { headers: rawHeaders },
    })));
  }
  return '';
}

function buildPrompt(project, readme, locale) {
  const metadata = {
    name: project.name,
    owner: project.owner,
    platform: project.platform,
    description: project.description,
    category: project.category,
    language: project.language,
    license: project.license,
    topics: project.topics,
    useTypes: project.useTypes,
    stars: project.stars,
    forks: project.forks,
    likes: project.likes,
    downloads: project.downloads,
    updatedAt: project.updatedAt,
  };
  const isEnglish = locale === 'en';
  const instructions = isEnglish ? [
    'Analyze the open-source project below in clear, concise, plain English suitable for developers evaluating open-source software.',
    'Base conclusions strictly on the provided information; explicitly say "needs verification" when unknown. Never invent installation steps, hardware requirements, maturity, or license conclusions.',
    'Evaluate with neutral, anonymous criteria for a general OSS user or developer: actual purpose, maturity, maintenance, license, integration complexity, deployment model, documented requirements, and dependency burden. Do not assume a specific device, GPU, operating system, or personal project.',
    'License analysis is a risk note only, never legal advice.',
    'recommendation must pick a concrete action: test now, save and observe, audit with Codex, reference the design, or do not invest yet (one or a combination).',
    `Project metadata: ${JSON.stringify(metadata)}`,
    readme ? `README excerpt: ${readme}` : 'README excerpt: not available; analyze the metadata with low confidence only.',
    `Output must match this JSON Schema: ${JSON.stringify(INSIGHT_SCHEMA)}`,
  ] : [
    '请分析下面的开源项目，使用简体中文和普通用户能理解的大白话。',
    '必须严格依据提供的信息；不知道的内容明确说“需要核查”，禁止编造安装方式、硬件要求、成熟度或许可证结论。',
    '请以通用开源使用者与开发者视角判断：基于项目实际用途、成熟度、维护状态、许可证、接入复杂度、部署模型、文档要求和依赖负担。不要假设用户拥有特定设备、显卡、操作系统或个人项目。',
    '商业许可只能做风险提示，不要当作法律意见。',
    'recommendation必须给出明确动作：立即测试、收藏观察、交给Codex审计、只参考设计、暂不投入中的一种或组合。',
    `项目元数据：${JSON.stringify(metadata)}`,
    readme ? `README节选：${readme}` : 'README节选：未能取得，只能根据元数据进行低置信度分析。',
    `输出必须符合此JSON Schema：${JSON.stringify(INSIGHT_SCHEMA)}`,
  ];
  return instructions.join('\n\n');
}

function parseModelJson(content) {
  const raw = String(content || '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error('本地模型没有返回有效JSON');
  }
}

function mergeInsight(project, value, { model, fingerprint, readmeUsed, now, locale }) {
  const fallback = ruleBasedInsightForLocale(project, '', locale);
  const risks = stringArray(value?.risks, 8, 350);
  return {
    projectId: project.id,
    fingerprint,
    model,
    source: 'ollama',
    generatedAt: new Date(now()).toISOString(),
    readmeUsed,
    summary: text(value?.summary, 500) || fallback.summary,
    whatItDoes: text(value?.whatItDoes, 1200) || fallback.whatItDoes,
    bestFor: text(value?.bestFor, 800) || fallback.bestFor,
    useMode: text(value?.useMode, 500) || fallback.useMode,
    commercial: text(value?.commercial, 800) || fallback.commercial,
    requirements: text(value?.requirements, 1000) || fallback.requirements,
    codexValue: text(value?.codexValue, 1200) || fallback.codexValue,
    fitForUser: text(value?.fitForUser, 1200) || fallback.fitForUser,
    risks: risks.length ? risks : fallback.risks,
    recommendation: text(value?.recommendation, 700) || fallback.recommendation,
    confidence: ['high', 'medium', 'low'].includes(value?.confidence) ? value.confidence : (readmeUsed ? 'medium' : 'low'),
  };
}

export function createInsightService({
  store,
  fetchImpl = fetch,
  baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  model = process.env.OLLAMA_MODEL || 'qwen3:4b',
  now = Date.now,
} = {}) {
  if (!store) throw new Error('Insight service requires a store');
  let queue = Promise.resolve();
  let statusCache = null;

  async function status(force = false) {
    if (!force && statusCache && now() - statusCache.checkedAtMs < 15_000) {
      return { ...statusCache.value, store: await store.status() };
    }
    const storeStatus = await store.status();
    try {
      const response = await fetchWithTimeout(fetchImpl, `${baseUrl}/api/tags`, { headers: { Accept: 'application/json' } }, STATUS_TIMEOUT);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const models = Array.isArray(data.models) ? data.models.map((item) => item.name || item.model).filter(Boolean) : [];
      const installed = models.some((name) => name === model || name.startsWith(`${model}:`) || model.startsWith(`${name}:`));
      const value = {
        enabled: true,
        available: installed,
        ollamaRunning: true,
        model,
        modelInstalled: installed,
        installedModels: models,
        store: storeStatus,
        message: installed ? `Ollama已连接，模型${model}可用` : `Ollama已连接，但未找到模型${model}`,
      };
      statusCache = { checkedAtMs: now(), value };
      return value;
    } catch (error) {
      const value = {
        enabled: true,
        available: false,
        ollamaRunning: false,
        model,
        modelInstalled: false,
        installedModels: [],
        store: storeStatus,
        message: `无法连接本地Ollama：${error?.name === 'AbortError' ? '检测超时' : error?.message || error}`,
      };
      statusCache = { checkedAtMs: now(), value };
      return value;
    }
  }

  async function getMany(ids, locale = 'zh-CN') {
    return store.getMany(ids, locale);
  }

  async function runGenerate(projectValue, { force = false, locale = 'zh-CN' } = {}) {
    const project = normalizeProjectInput(projectValue);
    if (!project.id || !project.name || !project.platform) throw new Error('项目数据不完整');
    const normalizedLocale = ALLOWED_LOCALES.has(locale) ? locale : 'zh-CN';
    const fingerprint = projectFingerprint(project);
    const cached = await store.get(project.id, normalizedLocale);
    if (!force && cached?.fingerprint === fingerprint && cached?.source === 'ollama') {
      return { ...cached, cached: true };
    }

    const currentStatus = await status(true);
    if (!currentStatus.available) {
      return {
        ...ruleBasedInsightForLocale(project, currentStatus.message, normalizedLocale),
        warning: currentStatus.message,
        cached: false,
      };
    }

    const readme = await fetchProjectReadme(project, fetchImpl);
    const response = await fetchWithTimeout(fetchImpl, `${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: normalizedLocale === 'en' ? 'You are a rigorous open-source project analyst. Produce structured conclusions in plain English using only the provided material.' : '你是严谨的开源项目分析师，只依据给定材料生成结构化中文结论。' },
          { role: 'user', content: buildPrompt(project, readme, normalizedLocale) },
        ],
        stream: false,
        think: false,
        keep_alive: 0,
        format: INSIGHT_SCHEMA,
        options: { temperature: 0, num_ctx: 4096, num_predict: 900 },
      }),
    }, OLLAMA_TIMEOUT);
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json())?.error || ''; } catch { /* ignore */ }
      throw new Error(`Ollama生成失败：HTTP ${response.status}${detail ? ` · ${detail}` : ''}`);
    }
    const data = await response.json();
    const parsed = parseModelJson(data?.message?.content);
    const insight = mergeInsight(project, parsed, { model, fingerprint, readmeUsed: Boolean(readme), now, locale: normalizedLocale });
    const saved = await store.set(project.id, insight, normalizedLocale);
    return { ...saved, cached: false };
  }

  function generate(project, options = {}) {
    const task = queue.then(() => runGenerate(project, options));
    queue = task.catch(() => {});
    return task;
  }

  return { status, getMany, generate, ruleBasedInsight };
}
