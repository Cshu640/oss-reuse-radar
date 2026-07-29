import assert from 'node:assert/strict';
import { createPackageService, mapNpmSearchObject, pyPiProject, cratesProject } from '../package-service.mjs';

const calls = [];
const json = (value) => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
const fetchImpl = async (url) => {
  const target = String(url);
  calls.push(target);
  if (target.includes('registry.npmjs.org/-/v1/search')) return json({ objects: [{
    package: { name: '@demo/npc-memory', version: '1.2.0', description: 'NPC memory toolkit', date: '2026-07-28T00:00:00Z', license: 'MIT', keywords: ['npc', 'memory'], links: { npm: 'https://www.npmjs.com/package/@demo/npc-memory', repository: 'https://github.com/demo/npc-memory' }, publisher: { username: 'demo' } },
    score: { detail: { quality: 0.91, popularity: 0.74 } },
  }] });
  if (target.includes('api.npmjs.org/downloads/point')) return json({ downloads: 45678 });
  if (target.includes('packages.ecosyste.ms') && target.includes('pypi.org')) return json([{ name: 'npc-memory-py', description: 'NPC memory toolkit for Python', latest_release_number: '0.8.0', latest_release_published_at: '2026-07-27T00:00:00Z', repository_url: 'https://github.com/demo/npc-memory-py', html_url: 'https://pypi.org/project/npc-memory-py/', license: 'Apache-2.0', downloads: 12000, dependent_packages_count: 8 }]);
  if (target.includes('crates.io/api/v1/crates')) return json({ crates: [{ name: 'npc_memory', description: 'NPC memory crate', max_stable_version: '0.4.1', repository: 'https://github.com/demo/npc-memory-rs', license: 'MIT', downloads: 8000, recent_downloads: 1200, updated_at: '2026-07-28T00:00:00Z' }] });
  throw new Error(`Unexpected URL: ${target}`);
};

const now = Date.parse('2026-07-29T06:00:00Z');
const service = createPackageService({ fetchImpl, now: () => now, cacheTtlMs: 60_000 });
const npm = await service.search('npm', 'npc memory', 10);
assert.equal(npm.projects.length, 1);
assert.equal(npm.projects[0].downloads, 45678);
assert.equal(npm.projects[0].repositoryUrl, 'https://github.com/demo/npc-memory');
assert.equal(npm.projects[0].packageSystem, 'npm');
const npmCached = await service.search('npm', 'npc memory', 10);
assert.equal(npmCached.cached, true);

const pypi = await service.search('pypi', 'npc memory', 10);
assert.equal(pypi.projects[0].platform, 'pypi');
assert.equal(pypi.projects[0].dependentPackages, 8);
const crates = await service.search('crates', 'npc memory', 10);
assert.equal(crates.projects[0].recentDownloads, 1200);
assert.equal(service.status().ecosystems.length, 3);
assert.equal(service.status().cacheHits, 1);

assert.equal(mapNpmSearchObject({ package: { name: 'x', links: { repository: 'git+https://github.com/a/x.git' } } }).repositoryUrl, 'https://github.com/a/x');
assert.equal(pyPiProject({ info: { name: 'py-x', version: '1.0', summary: 'x' }, releases: {} }).packageSystem, 'pypi');
assert.equal(cratesProject({ name: 'rs-x', max_version: '1.0' }).packageSystem, 'crates');
console.log(JSON.stringify({ npm: npm.projects[0].downloads, pypi: pypi.projects.length, crates: crates.projects.length, calls: calls.length }, null, 2));
