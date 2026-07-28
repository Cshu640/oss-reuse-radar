import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const SCHEMA_VERSION = 1;

function isoNow(now) {
  return new Date(now()).toISOString();
}

function cleanText(value, max = 4000) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

function cleanStringArray(value, maxItems = 8, maxLength = 220) {
  return Array.isArray(value)
    ? value.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

export function normalizeInsight(value = {}) {
  return {
    projectId: cleanText(value.projectId, 300),
    fingerprint: cleanText(value.fingerprint, 128),
    model: cleanText(value.model, 120),
    source: ['ollama', 'rule-fallback'].includes(value.source) ? value.source : 'ollama',
    generatedAt: cleanText(value.generatedAt, 80),
    readmeUsed: Boolean(value.readmeUsed),
    summary: cleanText(value.summary, 500),
    whatItDoes: cleanText(value.whatItDoes, 1200),
    bestFor: cleanText(value.bestFor, 800),
    useMode: cleanText(value.useMode, 500),
    commercial: cleanText(value.commercial, 800),
    requirements: cleanText(value.requirements, 1000),
    codexValue: cleanText(value.codexValue, 1200),
    fitForUser: cleanText(value.fitForUser, 1200),
    risks: cleanStringArray(value.risks, 8, 350),
    recommendation: cleanText(value.recommendation, 700),
    confidence: ['high', 'medium', 'low'].includes(value.confidence) ? value.confidence : 'medium',
  };
}

export class InsightStore {
  constructor(filePath, { now = Date.now } = {}) {
    this.filePath = filePath;
    this.now = now;
    this.data = null;
    this.writeQueue = Promise.resolve();
  }

  async init() {
    if (this.data) return this;
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8'));
      this.data = {
        version: SCHEMA_VERSION,
        updatedAt: parsed.updatedAt || null,
        insights: parsed?.insights && typeof parsed.insights === 'object' ? parsed.insights : {},
      };
    } catch (error) {
      if (error?.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
      this.data = { version: SCHEMA_VERSION, updatedAt: null, insights: {} };
    }
    return this;
  }

  async status() {
    await this.init();
    const values = Object.values(this.data.insights);
    return {
      enabled: true,
      storage: 'local-json',
      insightCount: values.length,
      lastGeneratedAt: values.map((item) => item.generatedAt).filter(Boolean).sort().at(-1) || null,
      updatedAt: this.data.updatedAt,
    };
  }

  async get(projectId) {
    await this.init();
    const item = this.data.insights[String(projectId || '')];
    return item ? normalizeInsight(item) : null;
  }

  async getMany(projectIds = []) {
    await this.init();
    const result = {};
    for (const projectId of projectIds) {
      const item = this.data.insights[String(projectId || '')];
      if (item) result[projectId] = normalizeInsight(item);
    }
    return result;
  }

  async set(projectId, insight) {
    await this.init();
    const normalized = normalizeInsight({ ...insight, projectId });
    if (!normalized.projectId || !normalized.summary) throw new Error('Insight requires projectId and summary');
    this.data.insights[normalized.projectId] = normalized;
    this.data.updatedAt = isoNow(this.now);
    await this.#persist();
    return normalized;
  }

  async #persist() {
    this.writeQueue = this.writeQueue.then(async () => {
      const tmp = `${this.filePath}.tmp`;
      await writeFile(tmp, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8');
      await rename(tmp, this.filePath);
    });
    return this.writeQueue;
  }
}
