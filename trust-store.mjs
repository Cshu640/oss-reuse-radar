import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const SCHEMA_VERSION = 1;

function cleanText(value, max = 1000) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

export function normalizeTrustReport(value = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    projectId: cleanText(value.projectId, 320),
    fingerprint: cleanText(value.fingerprint, 160),
    generatedAt: cleanText(value.generatedAt, 80),
    expiresAt: cleanText(value.expiresAt, 80),
    repository: value.repository && typeof value.repository === 'object' ? value.repository : {},
    facts: value.facts && typeof value.facts === 'object' ? value.facts : {},
    assessment: value.assessment && typeof value.assessment === 'object' ? value.assessment : {},
    provenance: Array.isArray(value.provenance) ? value.provenance.slice(0, 100) : [],
    cached: Boolean(value.cached),
  };
}

export class TrustStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { schemaVersion: SCHEMA_VERSION, updatedAt: '', reports: {} };
  }

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8'));
      const reports = {};
      for (const [key, report] of Object.entries(parsed?.reports || {})) {
        const normalized = normalizeTrustReport(report);
        if (normalized.projectId) reports[key] = normalized;
      }
      this.data = { schemaVersion: SCHEMA_VERSION, updatedAt: cleanText(parsed?.updatedAt, 80), reports };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      await this.#save();
    }
    return this.status();
  }

  async get(projectId) {
    const report = this.data.reports[projectId];
    return report ? { ...normalizeTrustReport(report), cached: true } : null;
  }

  async getMany(ids = []) {
    const output = {};
    for (const id of ids) {
      const report = await this.get(id);
      if (report) output[id] = report;
    }
    return output;
  }

  async set(report) {
    const normalized = normalizeTrustReport(report);
    if (!normalized.projectId) throw new Error('Trust report projectId is required');
    this.data.reports[normalized.projectId] = { ...normalized, cached: false };
    this.data.updatedAt = new Date().toISOString();
    await this.#save();
    return normalizeTrustReport(normalized);
  }

  status() {
    return {
      enabled: true,
      storage: 'local-json',
      reportCount: Object.keys(this.data.reports).length,
      updatedAt: this.data.updatedAt,
    };
  }

  async #save() {
    const temporary = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(temporary, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8');
    await rename(temporary, this.filePath);
  }
}
