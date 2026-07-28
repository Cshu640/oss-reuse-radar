#!/usr/bin/env python3
"""Mocked browser smoke test for OpenRadar Phase 0.2-B.1.

This test never contacts external services. It exercises the six adapter schemas,
Chinese query expansion, platform status rendering, responsive layout, and the
legacy favorites storage key through an in-memory Chromium page.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOT = Path('/mnt/data/open-source-radar-phase-0.2-b.1-browser.png')


def build_html() -> str:
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'styles.css').read_text(encoding='utf-8')
    adapters = (ROOT / 'platform-adapters.js').read_text(encoding='utf-8')
    app = (ROOT / 'app.js').read_text(encoding='utf-8')

    adapters = adapters.replace('export const ', 'const ')
    adapters = adapters.replace('export async function ', 'async function ')
    app = re.sub(
        r"^import \{ platformCatalog, platformIds, radarPlatform, searchPlatform \} from './platform-adapters\.js';\s*",
        '',
        app,
        count=1,
    )

    html = re.sub(r'<link rel="stylesheet" href="styles\.css">', f'<style>{css}</style>', html)
    html = re.sub(r'<script type="module" src="app\.js"></script>', '', html)

    mock_script = r'''
<script>
window.__requestedUrls = [];
const jsonResponse = (value) => Promise.resolve(new Response(JSON.stringify(value), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
}));
const repo = (platform, index = 1) => ({
  name: `${platform}-tool-${index}`,
  full_name: `demo/${platform}-tool-${index}`,
  path_with_namespace: `demo/${platform}-tool-${index}`,
  name_with_namespace: `demo / ${platform}-tool-${index}`,
  path: `${platform}-tool-${index}`,
  description: `${platform} productivity self-hosted game npc memory tool`,
  html_url: `https://example.com/${platform}/${index}`,
  web_url: `https://example.com/${platform}/${index}`,
  owner: { login: 'demo', avatar_url: '' },
  namespace: { full_path: 'demo' },
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
});
window.fetch = (input) => {
  const url = typeof input === 'string' ? input : input.url;
  window.__requestedUrls.push(url);
  if (url.includes('api.github.com')) return jsonResponse({ items: [repo('github', 1), repo('github', 2)] });
  if (url.includes('huggingface.co/api/models')) return jsonResponse([{ id: 'demo/hf-model', likes: 31, downloads: 900, pipeline_tag: 'text-generation', library_name: 'transformers', tags: ['license:apache-2.0', 'npc', 'memory'], lastModified: '2026-07-28T00:00:00Z', createdAt: '2026-07-02T00:00:00Z' }]);
  if (url.includes('gitlab.com/api/v4/projects')) return jsonResponse([repo('gitlab', 1)]);
  if (url.includes('codeberg.org/api/v1/repos/search')) return jsonResponse({ ok: true, data: [repo('codeberg', 1)] });
  if (url.includes('/api/health')) return jsonResponse({ status: 'ok', version: '0.2-B.1', giteeProxy: true });
  if (url.includes('/api/gitee/search')) return jsonResponse({ projects: [repo('gitee', 1)], source: 'gitee-official-search', warning: 'mock fallback' });
  if (url.includes('modelscope.cn/openapi/v1/models')) return jsonResponse({ success: true, data: { models: [{ id: 'demo/ms-model', likes: 22, downloads: 1200, license: 'Apache License 2.0', tasks: ['text-generation', 'npc-memory'], library: 'PyTorch', last_modified: '2026-07-28T00:00:00Z', created_at: '2026-07-03T00:00:00Z' }] } });
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
    return html.replace('</body>', f'{mock_script}<script>{adapters}\n{app}</script>{boot_script}</body>')


def run_viewport(page, width: int, height: int, save_screenshot: bool = False) -> dict:
    errors: list[str] = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_viewport_size({'width': width, 'height': height})
    page.set_content(build_html(), wait_until='load')
    page.wait_for_function("document.querySelectorAll('#searchGrid .card').length >= 7", timeout=15000)

    if width <= 760:
        page.click('#menu')

    result = page.evaluate('''() => ({
      cards: document.querySelectorAll('#searchGrid .card').length,
      liveSources: document.querySelectorAll('#searchSources .source-chip.live').length,
      platformOptions: document.querySelectorAll('#platform option').length,
      labels: [...document.querySelectorAll('#searchGrid .badge.platform')].map((node) => node.textContent.trim()),
      summary: document.getElementById('searchSummary').textContent,
      requestedUrls: window.__requestedUrls,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      sidebarOpen: document.getElementById('sidebar').classList.contains('open'),
      favoriteKeyPresent: document.documentElement.innerHTML.includes('openradar:favorites:v1')
    })''')
    result['errors'] = errors
    if save_screenshot:
        page.screenshot(path=str(SCREENSHOT), full_page=True)
    return result


def assert_result(result: dict, mobile: bool = False) -> None:
    assert not result['errors'], result['errors']
    assert result['cards'] >= 7, result
    assert result['liveSources'] == 6, result
    assert result['platformOptions'] == 7, result
    for label in ('GitHub', 'Hugging Face', 'GitLab', 'Codeberg', 'Gitee', 'ModelScope'):
        assert label in result['labels'], (label, result['labels'])
    assert '找到 7 个候选' in result['summary'], result['summary']
    assert not result['horizontalOverflow'], result
    if mobile:
        assert result['sidebarOpen'], result

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
