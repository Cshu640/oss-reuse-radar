import assert from 'node:assert/strict';
import {
  canonicalProjectUrl,
  deduplicationStats,
  entitiesOverlap,
  findEntityById,
  mergeProjectEntities,
  projectIdentitySignals,
} from '../project-identity.js';

const github = {
  id: 'github:demo/remember-me',
  platform: 'github',
  owner: 'demo',
  name: 'remember-me',
  url: 'https://github.com/demo/remember-me',
  description: 'NPC memory toolkit',
  stars: 120,
  forks: 12,
  language: 'TypeScript',
  license: 'MIT',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-29T00:00:00Z',
};
const huggingface = {
  id: 'huggingface:demo/remember-me',
  platform: 'huggingface',
  owner: 'demo',
  name: 'remember-me',
  url: 'https://huggingface.co/demo/remember-me',
  description: 'Model companion for the remember-me project',
  likes: 44,
  downloads: 4000,
  language: 'transformers',
  license: 'MIT',
  createdAt: '2026-07-03T00:00:00Z',
  updatedAt: '2026-07-28T00:00:00Z',
};
const modelscopeLinked = {
  id: 'modelscope:another/model-card',
  platform: 'modelscope',
  owner: 'another',
  name: 'model-card',
  url: 'https://modelscope.cn/models/another/model-card',
  repositoryUrl: 'https://github.com/demo/remember-me',
  description: 'Official mirror linked to https://github.com/demo/remember-me',
  likes: 20,
  downloads: 800,
  license: 'MIT',
  updatedAt: '2026-07-27T00:00:00Z',
};
const unrelatedSameName = {
  id: 'gitlab:different/remember-me',
  platform: 'gitlab',
  owner: 'different',
  name: 'remember-me',
  url: 'https://gitlab.com/different/remember-me',
  description: 'Unrelated application with the same repository name',
  stars: 10,
  forks: 1,
  license: 'Apache-2.0',
  updatedAt: '2026-07-20T00:00:00Z',
};

assert.equal(canonicalProjectUrl('https://huggingface.co/models/demo/remember-me/tree/main'), 'huggingface.co/demo/remember-me');
assert.equal(canonicalProjectUrl('https://gitlab.com/group/subgroup/tool/-/releases'), 'gitlab.com/group/subgroup/tool');
assert.equal(projectIdentitySignals(modelscopeLinked).referencedUrls.includes('github.com/demo/remember-me'), true);

const entities = mergeProjectEntities([github, huggingface, modelscopeLinked, unrelatedSameName]);
assert.equal(entities.length, 2);
const merged = findEntityById(entities, github.id);
assert.ok(merged);
assert.equal(merged.sourceCount, 3);
assert.equal(merged.platform, 'github', 'GitHub should be the preferred primary source when quality is comparable');
assert.deepEqual(new Set(merged.sourcePlatforms), new Set(['github', 'huggingface', 'modelscope']));
assert.ok(merged.dedupReasons.includes('same-owner-name'));
assert.ok(merged.dedupReasons.includes('cross-linked-url'));
assert.ok(findEntityById(entities, unrelatedSameName.id));
assert.equal(entitiesOverlap(merged, huggingface), true);
assert.equal(entitiesOverlap(merged, unrelatedSameName), false);

const stats = deduplicationStats([github, huggingface, modelscopeLinked, unrelatedSameName], entities);
assert.deepEqual(stats, {
  rawCount: 4,
  entityCount: 2,
  mergedSourceCount: 2,
  multiSourceEntities: 1,
});

const sameNameDifferentOwners = mergeProjectEntities([
  { ...github, id: 'github:a/toolkit', owner: 'a', name: 'toolkit', url: 'https://github.com/a/toolkit' },
  { ...github, id: 'gitlab:b/toolkit', platform: 'gitlab', owner: 'b', name: 'toolkit', url: 'https://gitlab.com/b/toolkit' },
]);
assert.equal(sameNameDifferentOwners.length, 2, 'Name-only matching must never merge projects');

console.log(JSON.stringify({ entities: entities.length, mergedSources: merged.sourceCount, stats }, null, 2));
