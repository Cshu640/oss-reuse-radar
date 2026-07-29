import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IdentityStore } from '../identity-store.mjs';

const root = await mkdtemp(join(tmpdir(), 'openradar-identity-'));
const file = join(root, 'identity.json');
const now = Date.parse('2026-07-29T05:00:00Z');
const store = new IdentityStore(file, { now: () => now });
await store.init();
const saved = await store.replace({
  mergeGroups: [{ id: 'g1', sourceIds: ['github:a/x', 'huggingface:a/x', 'github:a/x'], note: '确认同源' }],
  blockedPairs: [['github:b/y', 'gitlab:b/y'], ['gitlab:b/y', 'github:b/y']],
  primaryByMember: { 'github:a/x': 'huggingface:a/x' },
});
assert.equal(saved.mergeGroups[0].sourceIds.length, 2);
assert.equal(saved.blockedPairs.length, 1);
assert.equal(saved.updatedAt, '2026-07-29T05:00:00.000Z');
const reloaded = new IdentityStore(file);
await reloaded.init();
assert.equal(reloaded.get().mergeGroups.length, 1);
assert.match(await readFile(file, 'utf8'), /确认同源/);
await rm(root, { recursive: true, force: true });
console.log(JSON.stringify(saved, null, 2));
