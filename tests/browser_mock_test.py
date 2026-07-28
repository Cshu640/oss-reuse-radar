#!/usr/bin/env python3
"""Mocked browser smoke test for OpenRadar Phase 0.3-C.

No external network is used. The test validates six adapter schemas, conservative
cross-platform identity merging, unified project details, Codex research packet
preparation, local insight compatibility, responsive layout, and favorites v1.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOT = Path('/mnt/data/open-source-radar-phase-0.3-c-browser.png')


def make_inline_module(source: str) -> str:
    source = source.replace('export const ', 'const ')
    source = source.replace('export async function ', 'async function ')
    source = source.replace('export function ', 'function ')
    source = re.sub(r'^export \{[^}]+\};\s*$', '', source, flags=re.MULTILINE)
    return source


def build_html() -> str:
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'styles.css').read_text(encoding='utf-8')
    adapters = make_inline_module((ROOT / 'platform-adapters.js').read_text(encoding='utf-8'))
    identity = make_inline_module((ROOT / 'project-identity.js').read_text(encoding='utf-8'))
    codex_packet = make_inline_module((ROOT / 'codex-packet.js').read_text(encoding='utf-8'))
    app = (ROOT / 'app.js').read_text(encoding='utf-8')

    app = re.sub(r"^import .*?;\s*$", '', app, count=3, flags=re.MULTILINE)
    html = re.sub(r'<link rel="stylesheet" href="styles\.css">', f'<style>{css}</style>', html)
    html = re.sub(r'<script type="module" src="app\.js"></script>', '', html)

    mock_script = r'''
<script>
window.__requestedUrls = [];
window.__copiedText = '';
Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: { writeText: async (value) => { window.__copiedText = String(value); } }
});
const jsonResponse = (value) => Promise.resolve(new Response(JSON.stringify(value), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
}));
const repo = (platform, index = 1, fullName = `demo/${platform}-tool-${index}`) => {
  const [owner, name] = fullName.split('/');
  const host = platform === 'gitlab' ? 'gitlab.com' : platform === 'codeberg' ? 'codeberg.org' : platform === 'gitee' ? 'gitee.com' : 'github.com';
  const url = `https://${host}/${fullName}`;
  return {
    name,
    full_name: fullName,
    path_with_namespace: fullName,
    name_with_namespace: `${owner} / ${name}`,
    path: name,
    description: `${platform} productivity self-hosted game npc memory tool`,
    html_url: url,
    web_url: url,
    owner: { login: owner, avatar_url: '' },
    namespace: { full_path: owner },
    stargazers_count: 120 + index,
    stars_count: 120 + index,
    star_count: 120 + index,
    forks_count: 10 + index,
    language: 'TypeScript',
    license: { spdx_id: 'MIT', name: 'MIT' },
    topics: ['productivity', 'npc', 'memory'],
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-28T00:00:00Z',
    pushed_at: '2026-07-28T00:00:00Z',
    last_activity_at: '2026-07-28T00:00:00Z'
  };
};
window.fetch = (input, options = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  window.__requestedUrls.push(url);
  if (url.includes('api.github.com')) return jsonResponse({ items: [repo('github', 1, 'demo/github-tool-1'), repo('github', 2, 'demo/github-tool-2')] });
  if (url.includes('huggingface.co/api/models')) return jsonResponse([
    { id: 'demo/github-tool-1', likes: 44, downloads: 4000, pipeline_tag: 'text-generation', library_name: 'transformers', tags: ['license:mit', 'npc', 'memory'], lastModified: '2026-07-28T00:00:00Z', createdAt: '2026-07-02T00:00:00Z', repository_url: 'https://github.com/demo/github-tool-1' },
    { id: 'demo/hf-model', likes: 31, downloads: 900, pipeline_tag: 'text-generation', library_name: 'transformers', tags: ['license:apache-2.0', 'npc', 'memory'], lastModified: '2026-07-28T00:00:00Z', createdAt: '2026-07-02T00:00:00Z' }
  ]);
  if (url.includes('gitlab.com/api/v4/projects')) return jsonResponse([repo('gitlab', 1)]);
  if (url.includes('codeberg.org/api/v1/repos/search')) return jsonResponse({ ok: true, data: [repo('codeberg', 1)] });
  if (url.includes('/api/health')) return jsonResponse({ status: 'ok', version: '0.3-C', giteeProxy: true, history: true, insights: true, codexExport: true });
  if (url.includes('/api/codex/status')) return jsonResponse({ enabled: true, mode: 'local-research-packet', exportRoot: 'exports/codex', autoLaunch: false });
  if (url.includes('/api/codex/export')) return jsonResponse({ ok: true, generatedAt: '2026-07-29T04:05:06Z', task: '# Codex 开源项目研究任务\n\n只研究，不集成。\n\n读取 AGENTS.md、HANDOFF.md、docs/PROJECT_STATE.json、docs/HANDOFF_LOG.md。', folder: 'exports/codex/2026-07-29T04-05-06-demo-github-tool-1', files: ['exports/codex/2026-07-29T04-05-06-demo-github-tool-1/RESEARCH_TASK.md', 'exports/codex/2026-07-29T04-05-06-demo-github-tool-1/project-context.json'], autoLaunch: false, message: 'Codex研究包已生成，并可复制到Codex新任务中。当前版本不会自动启动Codex或消耗额度。' });
  if (url.includes('/api/insights/status')) return jsonResponse({ enabled: true, available: true, ollamaRunning: true, model: 'qwen3:4b', modelInstalled: true, message: 'Ollama已连接，模型qwen3:4b可用', store: { insightCount: 0 } });
  if (url.includes('/api/insights?')) return jsonResponse({ insights: {} });
  if (url.includes('/api/insights/generate')) return jsonResponse({ projectId: 'github:demo/github-tool-1', source: 'ollama', model: 'qwen3:4b', generatedAt: '2026-07-29T00:00:00Z', readmeUsed: true, summary: '这是一个适合网页游戏的NPC记忆开源组件。', whatItDoes: '让NPC保存玩家行为和关系变化。', bestFor: '网页游戏与AI活世界原型。', useMode: '作为TypeScript组件接入现有游戏。', commercial: 'MIT通常允许商用，但仍需核对依赖。', requirements: '需要Node.js，不要求独立GPU。', codexValue: 'Codex可以审计接口并接入现有项目。', fitForUser: '适合用户的网页游戏和Codex工作流。', risks: ['需要验证存档兼容。'], recommendation: '收藏并交给Codex轻量审计。', confidence: 'high' });
  if (url.includes('/api/history/capture')) return jsonResponse({ received: 8, added: 8, skipped: 0 });
  if (url.includes('/api/history/status')) return jsonResponse({ enabled: true, storage: 'local-json', projectCount: 8, sampleCount: 8, historyAgeHours: 2, firstCapturedAt: '2026-07-28T00:00:00Z', lastCapturedAt: '2026-07-28T02:00:00Z', readiness: { day: false, week: false, month: false }, collector: { running: false } });
  if (url.includes('/api/history/growth')) {
    const ids = decodeURIComponent(url.split('ids=')[1] || '').split(',').filter(Boolean);
    const projects = Object.fromEntries(ids.map((id) => [id, { id, sampleCount: 1, periods: { day: { ready: false, coveredHours: 2, deltas: {} }, week: { ready: false, coveredHours: 2, deltas: {} }, month: { ready: false, coveredHours: 2, deltas: {} } } }]));
    return jsonResponse({ projects, status: { projectCount: 8, sampleCount: 8, historyAgeHours: 2 } });
  }
  if (url.includes('/api/gitee/search')) return jsonResponse({ projects: [repo('gitee', 1)], source: 'gitee-official-search', warning: 'mock fallback' });
  if (url.includes('modelscope.cn/openapi/v1/models')) return jsonResponse({ success: true, data: { models: [{ id: 'demo/github-tool-1', likes: 22, downloads: 1200, license: 'MIT', tasks: ['text-generation', 'npc-memory'], library: 'PyTorch', repository_url: 'https://github.com/demo/github-tool-1', last_modified: '2026-07-28T00:00:00Z', created_at: '2026-07-03T00:00:00Z' }] } });
  return Promise.reject(new Error(`Unmocked URL: ${url}`));
};
</script>
'''
    boot_script = r'''
<script>
window.addEventListener('load', () => setTimeout(() => {
  document.querySelector('[data-view="search"]').click();
  document.getElementById('query').value = '适合网页游戏的开源NPC记忆系统';
  document.getElementById('searchForm').requestSubmit();
}, 250));
</script>
'''
    return html.replace('</body>', f'{mock_script}<script>{adapters}\n{identity}\n{codex_packet}\n{app}</script>{boot_script}</body>')


def run_viewport(page, width: int, height: int, save_screenshot: bool = False) -> dict:
    errors: list[str] = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_viewport_size({'width': width, 'height': height})
    page.set_content(build_html(), wait_until='load')
    page.wait_for_function("document.querySelectorAll('#searchGrid .card').length === 6", timeout=15000)

    if save_screenshot:
        merged_card = page.locator('#searchGrid .card').filter(has_text='github-tool-1').first
        merged_card.locator('[data-detail]').first.click()
        page.wait_for_function("document.getElementById('detailView').classList.contains('active') && document.querySelectorAll('.detail-source-card').length === 3", timeout=15000)
        page.click('#detailContent [data-analyze]')
        page.wait_for_function("document.getElementById('insightDialog').open && document.getElementById('insightContent').textContent.includes('NPC记忆')", timeout=15000)
        page.click('#closeInsightBottom')
        page.click('#detailContent [data-codex]')
        page.wait_for_function("document.querySelector('.codex-result.success') && window.__copiedText.includes('Codex 开源项目研究任务')", timeout=15000)

    if width <= 760:
        page.click('#menu')

    result = page.evaluate('''() => ({
      cards: document.querySelectorAll('#searchGrid .card').length,
      liveSources: document.querySelectorAll('#searchSources .source-chip.live').length,
      platformOptions: document.querySelectorAll('#platform option').length,
      sourceLabels: [...document.querySelectorAll('#searchGrid .source-mini')].map((node) => node.textContent.trim()),
      summary: document.getElementById('searchSummary').textContent,
      requestedUrls: window.__requestedUrls,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      sidebarOpen: document.getElementById('sidebar').classList.contains('open'),
      favoriteKeyPresent: document.documentElement.innerHTML.includes('openradar:favorites:v1'),
      historyText: document.getElementById('radarDesc').textContent,
      growthLines: document.querySelectorAll('#projectGrid .growth-line').length,
      plainSummaries: document.querySelectorAll('.plain-summary').length,
      insightMode: document.getElementById('insightMode').textContent,
      mergedBadges: document.querySelectorAll('#searchGrid .badge.merged').length,
      detailActive: document.getElementById('detailView').classList.contains('active'),
      detailSources: document.querySelectorAll('.detail-source-card').length,
      detailText: document.getElementById('detailContent').textContent,
      codexResult: document.querySelector('.codex-result')?.textContent || '',
      copiedText: window.__copiedText
    })''')
    result['errors'] = errors
    if save_screenshot:
        page.screenshot(path=str(SCREENSHOT), full_page=True)
    return result


def assert_result(result: dict, mobile: bool = False) -> None:
    assert not result['errors'], result['errors']
    assert result['cards'] == 6, result
    assert result['liveSources'] == 6, result
    assert result['platformOptions'] == 7, result
    for label in ('GitHub', 'Hugging Face', 'GitLab', 'Codeberg', 'Gitee', 'ModelScope'):
        assert label in result['sourceLabels'], (label, result['sourceLabels'])
    assert '找到 6 个项目实体' in result['summary'], result['summary']
    assert '合并了 2 条跨平台重复来源' in result['summary'], result['summary']
    assert '本地历史' in result['historyText'], result['historyText']
    assert result['growthLines'] >= 5, result
    assert result['plainSummaries'] >= 6, result
    assert result['mergedBadges'] >= 1, result
    assert 'Ollama已连接' in result['insightMode'], result
    assert result['favoriteKeyPresent'], result
    assert not result['horizontalOverflow'], result
    if mobile:
        assert result['sidebarOpen'], result
    else:
        assert result['detailActive'], result
        assert result['detailSources'] == 3, result
        assert '统一中文情报' in result['detailText'], result
        assert '研究包已写入本地' in result['codexResult'], result
        assert 'Codex 开源项目研究任务' in result['copiedText'], result

    gitee_urls = [url for url in result['requestedUrls'] if '/api/gitee/search' in url]
    modelscope_urls = [url for url in result['requestedUrls'] if 'modelscope.cn/openapi/v1/models' in url]
    assert any('%E9%80%82%E5%90%88%E7%BD%91%E9%A1%B5%E6%B8%B8%E6%88%8F' in url for url in gitee_urls), gitee_urls
    assert any('%E9%80%82%E5%90%88%E7%BD%91%E9%A1%B5%E6%B8%B8%E6%88%8F' in url for url in modelscope_urls), modelscope_urls


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path='/usr/bin/chromium',
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage'],
        )
        desktop = run_viewport(browser.new_page(), 1440, 1000, save_screenshot=True)
        mobile = run_viewport(browser.new_page(), 390, 844)
        browser.close()

    assert_result(desktop)
    assert_result(mobile, mobile=True)
    print(json.dumps({'desktop': desktop, 'mobile': mobile, 'screenshot': str(SCREENSHOT)}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
