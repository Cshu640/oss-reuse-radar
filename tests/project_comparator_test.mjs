import assert from 'node:assert/strict';
import { compareProjects, comparisonFacts } from '../project-comparator.js';

const packageProject = {
  id: 'npm:@demo/tool', platform: 'npm', packageSystem: 'npm', name: '@demo/tool', owner: 'demo', description: 'Small TypeScript library', license: 'MIT', updatedAt: new Date().toISOString(), downloads: 250000, dependentRepositories: 1500, version: '2.0.0', useTypes: ['component', 'codex'], score: 92,
};
const repositoryProject = {
  id: 'github:demo/heavy', platform: 'github', name: 'heavy', owner: 'demo', description: 'Docker Kubernetes GPU distributed platform', license: 'AGPL-3.0', updatedAt: '2023-01-01T00:00:00Z', stars: 3000, useTypes: ['selfhost'], score: 55,
};
const facts = comparisonFacts(packageProject, { assessment: { score: 76 } });
assert.equal(facts.downloads, 250000);
assert.equal(facts.dependents, 1500);
assert.equal(facts.version, '2.0.0');
assert.equal(facts.scores.trust, 76);
const report = compareProjects([repositoryProject, packageProject], { 'npm:@demo/tool': { assessment: { score: 76 } } });
assert.equal(report.rows.length, 2);
assert.equal(report.winner.project.id, 'npm:@demo/tool');
assert.match(report.recommendation, /@demo\/tool/);
assert.ok(report.rows.every((row) => row.score >= 0 && row.score <= 100));
console.log(JSON.stringify({ winner: report.winner.project.id, scores: report.rows.map((row) => row.score) }, null, 2));
