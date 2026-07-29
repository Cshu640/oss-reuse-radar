import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const SCHEMA_VERSION = 1;

function cleanText(value, max = 500) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

function uniqueStrings(value, maxItems = 250) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => cleanText(item, 320)).filter(Boolean))].slice(0, maxItems)
    : [];
}

function pairKey(left, right) {
  return [cleanText(left, 320), cleanText(right, 320)].filter(Boolean).sort().join('\u0000');
}

export function emptyIdentityOverrides() {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: '',
    mergeGroups: [],
    blockedPairs: [],
    primaryByMember: {},
  };
}

export function normalizeIdentityOverrides(value = {}) {
  const mergeGroups = Array.isArray(value.mergeGroups)
    ? value.mergeGroups.map((group, index) => ({
      id: cleanText(group?.id, 160) || `merge-${index + 1}`,
      sourceIds: uniqueStrings(group?.sourceIds, 100),
      note: cleanText(group?.note, 500),
      createdAt: cleanText(group?.createdAt, 80),
    })).filter((group) => group.sourceIds.length >= 2).slice(0, 250)
    : [];

  const blockedPairMap = new Map();
  if (Array.isArray(value.blockedPairs)) {
    for (const pair of value.blockedPairs) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const left = cleanText(pair[0], 320);
      const right = cleanText(pair[1], 320);
      if (!left || !right || left === right) continue;
      blockedPairMap.set(pairKey(left, right), [left, right].sort());
    }
  }

  const primaryByMember = {};
  if (value.primaryByMember && typeof value.primaryByMember === 'object' && !Array.isArray(value.primaryByMember)) {
    for (const [member, primary] of Object.entries(value.primaryByMember)) {
      const safeMember = cleanText(member, 320);
      const safePrimary = cleanText(primary, 320);
      if (safeMember && safePrimary) primaryByMember[safeMember] = safePrimary;
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: cleanText(value.updatedAt, 80),
    mergeGroups,
    blockedPairs: [...blockedPairMap.values()],
    primaryByMember,
  };
}

export class IdentityStore {
  constructor(filePath, { now = Date.now } = {}) {
    this.filePath = filePath;
    this.now = now;
    this.data = emptyIdentityOverrides();
  }

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      this.data = normalizeIdentityOverrides(JSON.parse(await readFile(this.filePath, 'utf8')));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      await this.#save();
    }
    return this.get();
  }

  get() {
    return JSON.parse(JSON.stringify(this.data));
  }

  async replace(value) {
    const normalized = normalizeIdentityOverrides(value);
    normalized.updatedAt = new Date(this.now()).toISOString();
    this.data = normalized;
    await this.#save();
    return this.get();
  }

  async #save() {
    const temporary = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(temporary, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8');
    await rename(temporary, this.filePath);
  }
}
