import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HistoryStore } from '../history-store.mjs';
import { createHistoryCollector } from '../server.mjs';

const root = await mkdtemp(join(tmpdir(), 'openradar-history-'));
const file = join(root, 'history.json');
let current = Date.parse('2026-06-01T00:00:00.000Z');
const store = new HistoryStore(file, { now: () => current, changedIntervalMs: 0, unchangedIntervalMs: 0 });

const project = (stars, forks = 10) => ({
  id: 'github:demo/radar',
  platform: 'github',
  name: 'radar',
  owner: 'demo',
  url: 'https://github.com/demo/radar',
  stars,
  forks,
});

await store.capture([project(100)], { source: 'test-day-0' });
current += 23 * 864e5;
await store.capture([project(150)], { source: 'test-day-23' });
current += 6 * 864e5;
await store.capture([project(190)], { source: 'test-day-29' });
current += 864e5;
await store.capture([project(205, 14)], { source: 'test-day-30' });

const growth = await store.growth(['github:demo/radar']);
const item = growth.projects['github:demo/radar'];
assert.equal(item.sampleCount, 4);
assert.equal(item.periods.day.ready, true);
assert.equal(item.periods.day.deltas.stars, 15);
assert.equal(item.periods.week.ready, true);
assert.equal(item.periods.week.deltas.stars, 55);
assert.equal(item.periods.month.ready, true);
assert.equal(item.periods.month.deltas.stars, 105);
assert.equal(item.periods.month.deltas.forks, 4);
assert.equal(growth.status.projectCount, 1);
assert.equal(growth.status.sampleCount, 4);
assert.equal(growth.status.readiness.month, true);

const reloaded = new HistoryStore(file, { now: () => current });
const reloadedStatus = await reloaded.status();
assert.equal(reloadedStatus.sampleCount, 4);
assert.match(await readFile(file, 'utf8'), /github:demo\/radar/);


const collectorRoot = await mkdtemp(join(tmpdir(), 'openradar-collector-'));
const collectorStore = new HistoryStore(join(collectorRoot, 'history.json'));
await collectorStore.init();
const collector = createHistoryCollector({
  historyStore: collectorStore,
  platforms: ['github', 'gitlab'],
  radarPlatformImpl: async (platformId) => {
    if (platformId === 'gitlab') throw new Error('mock unavailable');
    return [{ id: 'github:demo/collector', platform: 'github', name: 'collector', owner: 'demo', url: 'https://github.com/demo/collector', stars: 33, forks: 4 }];
  },
  now: () => current,
});
const collectorResult = await collector.collect('test');
assert.equal(collectorResult.lastProjectCount, 1);
assert.equal(collectorResult.lastAddedSamples, 1);
assert.equal(collectorResult.platformResults.github.state, 'live');
assert.equal(collectorResult.platformResults.gitlab.state, 'error');
assert.equal((await collectorStore.status()).projectCount, 1);
await rm(collectorRoot, { recursive: true, force: true });

await rm(root, { recursive: true, force: true });
console.log(JSON.stringify({ status: growth.status, periods: item.periods, collector: collectorResult }, null, 2));
