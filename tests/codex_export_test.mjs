import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCodexExportService } from '../codex-export-service.mjs';
import { buildCodexProjectContext, buildCodexResearchTask, codexExportSlug } from '../codex-packet.js';

const root = await mkdtemp(join(tmpdir(), 'openradar-codex-export-'));
const project = {
  id: 'github:demo/remember-me',
  entityId: 'entity:abc123',
  aliases: ['github:demo/remember-me', 'huggingface:demo/remember-me'],
  sourceCount: 2,
  platform: 'github',
  owner: 'demo',
  name: 'Remember Me / NPC Toolkit',
  url: 'https://github.com/demo/remember-me',
  category: '游戏AI与NPC',
  language: 'TypeScript',
  languages: ['TypeScript', 'transformers'],
  license: 'MIT',
  score: 91,
  useTypes: ['component', 'codex'],
  sourceProjects: [
    {
      id: 'github:demo/remember-me', platform: 'github', owner: 'demo', name: 'remember-me', url: 'https://github.com/demo/remember-me', description: 'NPC memory toolkit', language: 'TypeScript', license: 'MIT', stars: 120, forks: 12, updatedAt: '2026-07-29T00:00:00Z', topics: ['npc', 'memory'],
    },
    {
      id: 'huggingface:demo/remember-me', platform: 'huggingface', owner: 'demo', name: 'remember-me', url: 'https://huggingface.co/demo/remember-me', description: 'Companion model', language: 'transformers', license: 'MIT', likes: 44, downloads: 4000, updatedAt: '2026-07-28T00:00:00Z', topics: ['text-generation'],
    },
  ],
};
const insight = {
  source: 'ollama',
  model: 'qwen3:4b',
  confidence: 'high',
  summary: '这是一个给游戏NPC增加结构化记忆的工具。',
  whatItDoes: '保存玩家行为与关系变化。',
  commercial: 'MIT通常允许商用，但依赖仍需核查。',
  requirements: 'Node.js，无独立GPU硬要求。',
  codexValue: '适合审计后抽取为游戏组件。',
  fitForUser: '适合网页游戏和Codex工作流。',
  risks: ['需要验证存档迁移。'],
  recommendation: '立即测试。',
};

assert.equal(codexExportSlug(project), 'demo-remember-me-npc-toolkit');
const task = buildCodexResearchTask(project, insight, { generatedAt: '2026-07-29T01:02:03.000Z' });
for (const required of [
  'AGENTS.md',
  'HANDOFF.md',
  'docs/PROJECT_STATE.json',
  'docs/HANDOFF_LOG.md',
  '只研究，不集成',
  '不得直接修改',
  'github',
  'huggingface',
  'research_complete_unintegrated',
  'docs/research/open-source/demo-remember-me-npc-toolkit.md',
]) assert.match(task, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

const context = buildCodexProjectContext(project, insight, { generatedAt: '2026-07-29T01:02:03.000Z' });
assert.equal(context.entityId, 'entity:abc123');
assert.equal(context.sources.length, 2);
assert.equal(context.insight.summary, insight.summary);

const service = createCodexExportService({
  rootDir: root,
  now: () => new Date('2026-07-29T01:02:03.000Z'),
});
assert.deepEqual(service.status(), {
  enabled: true,
  mode: 'local-research-packet',
  exportRoot: 'exports/codex',
  autoLaunch: false,
});
const result = await service.exportProject(project, insight);
assert.equal(result.ok, true);
assert.equal(result.autoLaunch, false);
assert.match(result.folder, /^exports\/codex\/2026-07-29T01-02-03-demo-remember-me-npc-toolkit$/);
assert.equal(result.files.length, 2);
for (const file of result.files) await access(join(root, file));
const writtenTask = await readFile(join(root, result.files[0]), 'utf8');
const writtenContext = JSON.parse(await readFile(join(root, result.files[1]), 'utf8'));
assert.match(writtenTask, /证据驱动/);
assert.equal(writtenContext.sources.length, 2);
assert.match(result.message, /不会自动启动Codex或消耗额度/);

await assert.rejects(
  async () => createCodexExportService({ rootDir: root, exportDir: join(root, '..', 'outside') }),
  /inside rootDir/,
);

await rm(root, { recursive: true, force: true });
console.log(JSON.stringify({ folder: result.folder, files: result.files, autoLaunch: result.autoLaunch }, null, 2));
