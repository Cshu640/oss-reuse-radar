import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { buildCodexProjectContext, buildCodexResearchTask, codexExportSlug } from './codex-packet.js';

function safeTimestamp(value = new Date().toISOString()) {
  return String(value).replace(/[:.]/g, '-');
}

export function createCodexExportService({ rootDir, exportDir = resolve(rootDir, 'exports/codex'), now = () => new Date() } = {}) {
  if (!rootDir) throw new Error('rootDir is required');
  const absoluteExportDir = resolve(exportDir);
  const absoluteRoot = resolve(rootDir);
  if (!absoluteExportDir.startsWith(absoluteRoot)) throw new Error('exportDir must stay inside rootDir');

  return {
    status() {
      return {
        enabled: true,
        mode: 'local-research-packet',
        exportRoot: relative(absoluteRoot, absoluteExportDir).replace(/\\/g, '/'),
        autoLaunch: false,
      };
    },
    async exportProject(project, insight = null) {
      if (!project || typeof project !== 'object') throw new Error('Project is required');
      const generatedAt = now().toISOString();
      const slug = codexExportSlug(project);
      const folderName = `${safeTimestamp(generatedAt).slice(0, 19)}-${slug}`;
      const targetDir = resolve(absoluteExportDir, folderName);
      if (!targetDir.startsWith(absoluteExportDir)) throw new Error('Invalid export path');
      const task = buildCodexResearchTask(project, insight, { generatedAt });
      const context = buildCodexProjectContext(project, insight, { generatedAt });
      await mkdir(targetDir, { recursive: true });
      await writeFile(resolve(targetDir, 'RESEARCH_TASK.md'), `${task.trim()}\n`, 'utf8');
      await writeFile(resolve(targetDir, 'project-context.json'), `${JSON.stringify(context, null, 2)}\n`, 'utf8');
      const relativeFolder = relative(absoluteRoot, targetDir).replace(/\\/g, '/');
      return {
        ok: true,
        generatedAt,
        task,
        context,
        folder: relativeFolder,
        files: [`${relativeFolder}/RESEARCH_TASK.md`, `${relativeFolder}/project-context.json`],
        autoLaunch: false,
        message: 'Codex研究包已生成，并可复制到Codex新任务中。当前版本不会自动启动Codex或消耗额度。',
      };
    },
  };
}
