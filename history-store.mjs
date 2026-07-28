import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const METRIC_KEYS = ['stars', 'forks', 'likes', 'downloads'];
const PERIODS = {
  day: { targetMs: 24 * 60 * 60 * 1000, readyMs: 20 * 60 * 60 * 1000 },
  week: { targetMs: 7 * 24 * 60 * 60 * 1000, readyMs: 6 * 24 * 60 * 60 * 1000 },
  month: { targetMs: 30 * 24 * 60 * 60 * 1000, readyMs: 25 * 24 * 60 * 60 * 1000 },
};

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeProject(project) {
  if (!project || typeof project !== 'object') return null;
  const id = String(project.id || '').trim().slice(0, 300);
  const platform = String(project.platform || '').trim().slice(0, 80);
  if (!id || !platform) return null;
  return {
    id,
    platform,
    name: String(project.name || id).trim().slice(0, 300),
    owner: String(project.owner || '').trim().slice(0, 300),
    url: String(project.url || '').trim().slice(0, 2_000),
    metrics: Object.fromEntries(METRIC_KEYS.map((key) => [key, finiteNumber(project[key])])),
  };
}

function metricsEqual(a = {}, b = {}) {
  return METRIC_KEYS.every((key) => finiteNumber(a[key]) === finiteNumber(b[key]));
}

function emptyData(nowIso) {
  return {
    schemaVersion: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    projects: {},
  };
}

function selectBaseline(samples, targetTime) {
  let baseline = null;
  for (const sample of samples) {
    const time = Date.parse(sample.capturedAt);
    if (!Number.isFinite(time)) continue;
    if (time <= targetTime) baseline = sample;
    else break;
  }
  return baseline;
}

export class HistoryStore {
  constructor(filePath, {
    now = () => Date.now(),
    retentionDays = 400,
    unchangedIntervalMs = 5.5 * 60 * 60 * 1000,
    changedIntervalMs = 30 * 60 * 1000,
  } = {}) {
    this.filePath = filePath;
    this.now = now;
    this.retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    this.retentionDays = retentionDays;
    this.unchangedIntervalMs = unchangedIntervalMs;
    this.changedIntervalMs = changedIntervalMs;
    this.data = null;
    this.writeChain = Promise.resolve();
  }

  async init() {
    if (this.data) return this;
    const nowIso = new Date(this.now()).toISOString();
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8'));
      this.data = parsed && parsed.schemaVersion === 1 && parsed.projects && typeof parsed.projects === 'object'
        ? parsed
        : emptyData(nowIso);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      this.data = emptyData(nowIso);
    }
    return this;
  }

  async persist() {
    await this.init();
    this.writeChain = this.writeChain.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      const tempPath = `${this.filePath}.tmp`;
      await writeFile(tempPath, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8');
      await rename(tempPath, this.filePath);
    });
    await this.writeChain;
  }

  async capture(projects, { source = 'unknown', capturedAt = new Date(this.now()).toISOString() } = {}) {
    await this.init();
    const capturedMs = Date.parse(capturedAt);
    if (!Number.isFinite(capturedMs)) throw new Error('Invalid capturedAt');
    const normalized = [...new Map((Array.isArray(projects) ? projects : [])
      .slice(0, 500)
      .map(normalizeProject)
      .filter(Boolean)
      .map((project) => [project.id, project])).values()];

    let added = 0;
    let skipped = 0;
    const cutoff = capturedMs - this.retentionMs;

    for (const project of normalized) {
      const record = this.data.projects[project.id] || {
        id: project.id,
        platform: project.platform,
        name: project.name,
        owner: project.owner,
        url: project.url,
        samples: [],
      };
      record.platform = project.platform;
      record.name = project.name;
      record.owner = project.owner;
      record.url = project.url;
      record.samples = Array.isArray(record.samples)
        ? record.samples.filter((sample) => Date.parse(sample.capturedAt) >= cutoff)
        : [];

      const last = record.samples.at(-1);
      const lastMs = last ? Date.parse(last.capturedAt) : 0;
      const unchanged = last ? metricsEqual(last.metrics, project.metrics) : false;
      const minimumInterval = unchanged ? this.unchangedIntervalMs : this.changedIntervalMs;
      if (last && capturedMs - lastMs < minimumInterval) {
        skipped += 1;
      } else {
        record.samples.push({ capturedAt, source: String(source).slice(0, 100), metrics: project.metrics });
        added += 1;
      }
      this.data.projects[project.id] = record;
    }

    this.prune(cutoff);
    this.data.updatedAt = capturedAt;
    if (added) await this.persist();
    return { received: normalized.length, added, skipped, capturedAt, status: await this.status() };
  }

  prune(cutoff = this.now() - this.retentionMs) {
    for (const [id, record] of Object.entries(this.data.projects)) {
      record.samples = (record.samples || []).filter((sample) => Date.parse(sample.capturedAt) >= cutoff);
      if (!record.samples.length) delete this.data.projects[id];
    }
  }

  async status() {
    await this.init();
    let sampleCount = 0;
    let firstCapturedAt = '';
    let lastCapturedAt = '';
    const platformCounts = {};
    for (const record of Object.values(this.data.projects)) {
      const samples = record.samples || [];
      sampleCount += samples.length;
      platformCounts[record.platform] = (platformCounts[record.platform] || 0) + 1;
      const first = samples[0]?.capturedAt || '';
      const last = samples.at(-1)?.capturedAt || '';
      if (first && (!firstCapturedAt || first < firstCapturedAt)) firstCapturedAt = first;
      if (last && (!lastCapturedAt || last > lastCapturedAt)) lastCapturedAt = last;
    }
    const historyAgeHours = firstCapturedAt
      ? Math.max(0, (this.now() - Date.parse(firstCapturedAt)) / 3_600_000)
      : 0;
    return {
      enabled: true,
      storage: 'local-json',
      retentionDays: this.retentionDays,
      projectCount: Object.keys(this.data.projects).length,
      sampleCount,
      firstCapturedAt,
      lastCapturedAt,
      historyAgeHours,
      platformCounts,
      readiness: {
        day: historyAgeHours >= 20,
        week: historyAgeHours >= 6 * 24,
        month: historyAgeHours >= 25 * 24,
      },
    };
  }

  async growth(ids = []) {
    await this.init();
    const requested = Array.isArray(ids) && ids.length
      ? ids.slice(0, 500)
      : Object.keys(this.data.projects).slice(0, 500);
    const projects = {};

    for (const id of requested) {
      const record = this.data.projects[id];
      const samples = record?.samples || [];
      if (!samples.length) continue;
      const current = samples.at(-1);
      const currentMs = Date.parse(current.capturedAt);
      const periods = {};
      for (const [periodId, config] of Object.entries(PERIODS)) {
        const baseline = selectBaseline(samples, currentMs - config.targetMs);
        const coveredMs = baseline ? currentMs - Date.parse(baseline.capturedAt) : Math.max(0, currentMs - Date.parse(samples[0].capturedAt));
        const deltas = Object.fromEntries(METRIC_KEYS.map((key) => [
          key,
          baseline ? finiteNumber(current.metrics[key]) - finiteNumber(baseline.metrics[key]) : 0,
        ]));
        periods[periodId] = {
          ready: Boolean(baseline && coveredMs >= config.readyMs),
          coveredHours: coveredMs / 3_600_000,
          baselineAt: baseline?.capturedAt || samples[0].capturedAt,
          currentAt: current.capturedAt,
          current: current.metrics,
          deltas,
        };
      }
      projects[id] = {
        id,
        platform: record.platform,
        sampleCount: samples.length,
        firstCapturedAt: samples[0].capturedAt,
        lastCapturedAt: current.capturedAt,
        periods,
      };
    }

    return { projects, status: await this.status() };
  }
}
