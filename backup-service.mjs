import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';

const FORMAT = 'openradar-backup';
const BACKUP_VERSION = 1;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_CODEX_PACKETS = 250;

async function readJsonOrDefault(path, fallback) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size > MAX_FILE_BYTES) throw new Error(`Backup source too large: ${basename(path)}`);
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

function safePacketFolderName(value) {
  const name = basename(String(value || '')).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 180);
  return name && !name.startsWith('.') ? name : '';
}

async function readCodexPackets(rootDir) {
  const exportRoot = resolve(rootDir, 'exports/codex');
  let entries;
  try {
    entries = await readdir(exportRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const packets = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || packets.length >= MAX_CODEX_PACKETS) continue;
    const folder = safePacketFolderName(entry.name);
    if (!folder) continue;
    try {
      const task = await readFile(join(exportRoot, folder, 'RESEARCH_TASK.md'), 'utf8');
      const context = JSON.parse(await readFile(join(exportRoot, folder, 'project-context.json'), 'utf8'));
      packets.push({ folder, task: task.slice(0, 1_500_000), context });
    } catch {
      // Ignore incomplete local packet folders.
    }
  }
  return packets;
}

async function restoreCodexPackets(rootDir, packets) {
  const exportRoot = resolve(rootDir, 'exports/codex');
  await mkdir(exportRoot, { recursive: true });
  let restored = 0;
  for (const packet of Array.isArray(packets) ? packets.slice(0, MAX_CODEX_PACKETS) : []) {
    const folder = safePacketFolderName(packet?.folder);
    if (!folder || typeof packet?.task !== 'string' || !packet?.context) continue;
    const target = resolve(exportRoot, folder);
    if (!target.startsWith(exportRoot + sep)) continue;
    await mkdir(target, { recursive: true });
    await writeFile(join(target, 'RESEARCH_TASK.md'), packet.task.slice(0, 1_500_000), 'utf8');
    await writeFile(join(target, 'project-context.json'), `${JSON.stringify(packet.context, null, 2)}\n`, 'utf8');
    restored += 1;
  }
  return restored;
}

export function createBackupService({ rootDir, now = Date.now } = {}) {
  if (!rootDir) throw new Error('Backup rootDir is required');
  const paths = {
    history: resolve(rootDir, 'data/history.json'),
    insights: resolve(rootDir, 'data/insights.json'),
    trust: resolve(rootDir, 'data/trust.json'),
    identity: resolve(rootDir, 'data/identity-overrides.json'),
  };

  return {
    status() {
      return { enabled: true, format: FORMAT, version: BACKUP_VERSION, includes: ['favorites', 'identity overrides', 'history', 'insights', 'trust reports', 'Codex research packets'] };
    },

    async exportAll(clientState = {}) {
      return {
        format: FORMAT,
        backupVersion: BACKUP_VERSION,
        createdAt: new Date(now()).toISOString(),
        appVersion: '0.4-A',
        clientState: {
          favorites: Array.isArray(clientState.favorites) ? clientState.favorites : [],
          identityOverrides: clientState.identityOverrides && typeof clientState.identityOverrides === 'object' ? clientState.identityOverrides : {},
          settings: clientState.settings && typeof clientState.settings === 'object' ? clientState.settings : {},
        },
        serverData: {
          history: await readJsonOrDefault(paths.history, { schemaVersion: 1, projects: {} }),
          insights: await readJsonOrDefault(paths.insights, { schemaVersion: 1, insights: {} }),
          trust: await readJsonOrDefault(paths.trust, { schemaVersion: 1, reports: {} }),
          identityOverrides: await readJsonOrDefault(paths.identity, { schemaVersion: 1, mergeGroups: [], blockedPairs: [], primaryByMember: {} }),
          codexPackets: await readCodexPackets(rootDir),
        },
      };
    },

    async importAll(backup) {
      if (!backup || backup.format !== FORMAT || Number(backup.backupVersion) !== BACKUP_VERSION) {
        throw new Error('不是受支持的OpenRadar完整备份');
      }
      const data = backup.serverData || {};
      await atomicWriteJson(paths.history, data.history || { schemaVersion: 1, projects: {} });
      await atomicWriteJson(paths.insights, data.insights || { schemaVersion: 1, insights: {} });
      await atomicWriteJson(paths.trust, data.trust || { schemaVersion: 1, reports: {} });
      await atomicWriteJson(paths.identity, data.identityOverrides || backup.clientState?.identityOverrides || { schemaVersion: 1, mergeGroups: [], blockedPairs: [], primaryByMember: {} });
      const restoredPackets = await restoreCodexPackets(rootDir, data.codexPackets || []);
      return {
        ok: true,
        importedAt: new Date(now()).toISOString(),
        requiresRestart: true,
        restoredPackets,
        clientState: backup.clientState || {},
        message: '完整数据已写入新版目录。请关闭并重新启动OpenRadar，让历史、解读和可信度缓存重新载入。',
      };
    },
  };
}
