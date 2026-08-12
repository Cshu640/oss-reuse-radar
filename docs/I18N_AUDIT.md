# OpenRadar i18n Audit — OSS-0T.1 Foundation

Date: 2026-08-12. This document records the OSS-0T.1 decisions for the
English / Simplified Chinese i18n foundation and the public-profile
decoupling. It is engineering documentation, not a legal or marketing
statement.

## OSS / mature-solution review

Compared for this project only (vanilla HTML, vanilla JS, Node server, two
supported locales):

| Option | Fit | Decision |
| --- | --- | --- |
| i18next | Full-featured, but a runtime dependency with loaders, plural rules, and frameworks built around apps that need many locales and dynamic loading | Rejected for now: no clear benefit for two static locales; adds dependency and bundle complexity |
| Browser `Intl` / `navigator.language` | Useful for locale detection and number/date formatting; it is not a translation-key system and cannot drive UI copy by itself | Adopted for locale detection (`navigator.languages` / `navigator.language`); formatting stays out of scope for 0T.1 |
| Lightweight in-repo key-based layer | Tiny, testable, zero runtime dependency, fits the existing module style | Adopted: `i18n/en.js`, `i18n/zh-CN.js`, `i18n/index.js` |

Conclusion: zero new runtime dependencies. The i18n layer exposes `t(key,
locale, params)`, `resolveLocale`, `normalizeLocale`, `applyDocumentLanguage`,
and category helpers. Stable keys follow the requested shape
(`nav.radar`, `compare.title`, `project.*`) and the locale model is limited to
`en` and `zh-CN`.

## A. Static UI copy

Existing hardcoded UI copy (nav labels, tabs, filters, placeholders, titles,
empty states, tooltips, meta title/description) is inventoried in
`index.html` and `app.js`. OSS-0T.1 adds the translation keys and resources
for the navigation, categories, use types, actions, periods, sorts, and
filters, and wires the visible category labels through the translation layer.
The full static UI migration to `t()` calls is deferred to OSS-0T.2 so the
public app never shows a half-English UI before the language switch is
exposed.

## B. Dynamic UI copy

Dynamic strings (search summaries, loading/error/degraded states, history
accumulation notes, status badges, import/export messages) remain Chinese in
0T.1 and are tracked for OSS-0T.2. The architecture already drives
`document.documentElement.lang`, `<title>`, and the meta description from the
resolved locale; a future language switch can swap these without touching
business logic.

## C. Generated / analytical copy

Rule-based insight text and AI insight output are produced by
`insight-service.mjs`. OSS-0T.1 removes the maintainer-specific profile from
the prompt and the rule text, and makes the insight pipeline locale-aware
(`generate(project, { locale })`, locale-isolated cache). Full English rule
and AI copy is deferred to OSS-0T.3.

## D. Source data stays untouched

Repository names, owner names, upstream descriptions, topics, package names,
model names, URLs, license identifiers, platform names, versions, and
Stars/Forks/Downloads values are never modified by locale switching. A future
translated description must be a separate derived field, not an overwrite of
source data.

## Locale resolution

Priority: saved `openradar:locale:v1` > `navigator.languages` /
`navigator.language` > `en`. Any `zh`/`zh-*` maps to `zh-CN`; any `en`/`en-*`
maps to `en`; anything else falls back to `en`. Invalid saved values are
ignored and never break the app. No language switch is exposed in 0T.1
because the English UI coverage is not complete; the foundation and tests are
in place for OSS-0T.2.

## Category model

Categories now use stable machine IDs and are locale-independent:

| Machine ID | zh-CN | en |
| --- | --- | --- |
| `all` | 全部 | All |
| `game-development` | 游戏开发 | Game Development |
| `game-ai-npc` | 游戏AI与NPC | Game AI & NPC |
| `three-d-animation` | 3D与动画 | 3D & Animation |
| `ai-image-video` | AI图片视频 | AI Image & Video |
| `agent-mcp` | Agent与MCP | Agents & MCP |
| `web-app` | Web与App | Web & App |
| `wechat-ecosystem` | 微信生态 | WeChat Ecosystem |
| `education` | 教育产品 | Education Products |
| `content-creation` | 内容创作 | Content Creation |
| `productivity` | 办公效率 | Productivity |
| `life-tools` | 生活工具 | Life Tools |
| `business-foundation` | 商业应用底座 | Business Foundation |
| `dev-components` | 开发组件 | Development Components |

`classifyCategory()` returns machine IDs, `normalizeCategory()` maps legacy
Chinese values to IDs idempotently, and display text comes only from the
translation resources. Persisted data (favorites, compare items, radar cache,
backup client state) is normalized on load/import through
`normalizeProject()`, so old favorites and compare lists keep the same IDs
and counts.

## useTypes / action / sort enums

The internal values were already stable English IDs (`direct`, `selfhost`,
`codex`, `component`, `reference`, `business`; actions `later`, `test`,
`codex`, `reference`). Translation resources now carry the display labels for
OSS-0T.2; no display string is used as a business value.

## fitForUser semantics

The legacy `fitForUser` field is kept for data compatibility but its public
meaning changed from "match with the maintainer's personal conditions" to
"use-case fit for a general OSS user/developer". Chinese display becomes
"适用场景匹配度", English "Use-case fit". The recommendation text no longer
assumes the maintainer's device, GPU, or personal project interests. A later
schema migration may rename the field to `useCaseFit`; until then the
compatibility adapter is documented here.

## Insight profile decoupling

The Ollama prompt no longer contains the maintainer's private profile
(Windows PC, NVIDIA 8GB GPU, personal project directions). Analysis now uses
neutral criteria: actual purpose, maturity, maintenance, license, integration
complexity, deployment model, documented requirements, dependency burden, and
supply-chain signals. Personalization, if ever needed, must be an explicit
user-configured profile, not a hardcoded default.

## Insight cache locale isolation

`insight-store.mjs` schema moved to version 2. Entries are keyed
`projectId::locale`. Pre-locale entries (no `::`) are treated as `zh-CN` and
migrated to `projectId::zh-CN` on init without deleting old data. `en` and
`zh-CN` caches never share entries. Existing Chinese insights remain usable.
`/api/insights` and `/api/insights/generate` accept a `locale` parameter
(default `zh-CN`).

## Migration strategy

- Category: `normalizeCategory()` maps every legacy Chinese category to a
  machine ID; unknown values become `all` (items are never dropped).
- Favorites / compare / radar cache / backup client state: normalized through
  `normalizeProject()` on load, save, and import; counts and IDs are
  preserved.
- Insight cache: version 2 with `::locale` keys and an idempotent legacy-key
  migration; nothing is deleted.
- No other persisted schema changed in 0T.1.

## Deferred to later phases

- OSS-0T.2: full static + dynamic UI translation, formal language switch,
  English first-run.
- OSS-0T.3: bilingual rule and AI insight copy.
- OSS-0T.4: bilingual visual acceptance and final README screenshots.

## OSS-0T.2 full UI migration (2026-08-12)

OSS-0T.2 completed the full English / Simplified Chinese UI migration on top
of the 0T.1 foundation:

- All major user-visible static copy in `index.html` now carries `data-i18n`
  attributes (nav, hero, tabs, filters, search, favorites, packages,
  compare, watch panels, dialogs, placeholders, meta title/description) and
  is applied by `applyStaticI18n()`.
- All dynamic UI copy in `app.js` (toasts, summaries, statuses, empty
  states, errors, confirmations, cards, details, trust, insight, compare
  dimensions, history/backup panels, runtime mode) is generated through the
  `tt()` helper backed by the locale resources.
- A visible language switch (简体中文 / English) lives in the sidebar; it
  saves `openradar:locale:v1`, updates `<html lang>`, `<title>`, meta
  description, static text, and re-renders every active view immediately
  without a refresh.
- Locale resolution and persistence are unchanged from OSS-0T.1
  (saved > browser > en; `zh`/`zh-*` maps to `zh-CN`).
- Category machine IDs, favorites, compare, radar cache, backup/import
  state, legacy category migration, and insight cache schema v2 are
  untouched; browser acceptance confirmed favorites and compare survive
  locale switches and reloads.
- English-mode leakage audit passed: across radar, search, favorites,
  packages, compare, watch, and detail views, no Chinese UI copy remains
  except the language-switch button labels themselves (both languages shown,
  by design) and upstream source data, which stays untouched per class D.
- Hardcoded allowlist (kept intentionally): platform/product names (GitHub,
  Hugging Face, GitLab, Codeberg, Gitee, ModelScope, npm, PyPI, crates.io,
  OpenRadar, Codex, OpenSSF, deps.dev, OSV, Ollama, qwen3:4b), technical
  field names (Stars, Likes, Downloads, README, license identifiers, URLs,
  versions), search-expansion regexes, seed example descriptions (now in
  English), manual identity-correction notes, and internal comments.
- The `fitForUser` internal field name is unchanged; user-visible labels are
  "适用场景匹配度" (zh-CN) and "Use-case Fit" (en).
- Tests: Node suite passes (31/31, including a new en/zh key-tree equality
  and no-missing-translation check); JS/MJS syntax, Python `py_compile`,
  JSON validation, and `git diff --check` pass.
- Browser acceptance: real Playwright + system Edge on zh-CN and en-US ran
  the full path (home, categories, filters, favorites, compare, detail,
  package radar, watch), verified immediate language switching in both
  directions, locale persistence across reload, zero page errors, and zero
  console errors; Chinese-leak audit in English mode is empty.

## OSS-0T.3 bilingual rule and AI insight copy (2026-08-12)

OSS-0T.3 completed the bilingual copy for generated content:

- `ruleBasedInsightForLocale(project, reason, locale)` now produces fully
  localized rule insights for `en` and `zh-CN`: summary, best-for, use mode,
  license copy, requirements, Codex value, risks, and recommendation all
  come from the i18n resources. `whatItDoes` intentionally passes through
  the source description (class D source data).
- AI prompts are locale-aware: `en` requires plain English and `zh-CN`
  requires Simplified Chinese, with explicit neutral OSS-evaluation
  criteria and no personal profile (no Windows/NVIDIA/device assumptions,
  no personal projects, no private directories or identity).
- Insight cache stays locale-isolated (`projectId::locale`); the frontend
  now requests `/api/insights?locale=...` and sends `locale` on
  `/api/insights/generate`, and clears the in-memory insight map when the
  language changes so a different-language cached result is never shown for
  the wrong locale. If that locale has no cache, the app shows the localized
  rule summary and a "generate" action instead of another language's stale
  result.
- AI insight status text is generated client-side through i18n (connected,
  model missing, unreachable, static mode) instead of displaying server-side
  Chinese messages in English mode.
- `fitForUser` field name unchanged; display labels remain
  "适用场景匹配度" (zh-CN) and "Use-case Fit" (en).
- Tests extended: en/zh rule output (en has no Chinese; zh-CN is Chinese),
  en/zh AI prompt language instructions, en/zh cache isolation with
  locale-switch behavior, legacy cache migration, no personal-profile
  leakage, and translation key consistency. Node suite 31/31.
- Browser acceptance: Playwright + system Edge with a real local server
  (Ollama intentionally unreachable): en and zh-CN show fully localized rule
  summaries and AI status text; switching zh-CN -> en -> zh-CN updates
  immediately; favorites, compare, and category IDs unchanged; zero page or
  console errors; no untranslated keys or undefined/null copy. No remote AI
  was called; no AI success was faked.

## OSS-0T.4 bilingual visual acceptance and README screenshots (2026-08-12)

OSS-0T.4 completed the final visual acceptance and real README screenshots:

- Final visual acceptance run with Playwright + system Edge against a real
  local server (deterministic demo seed data, no live upstream): English and
  Simplified Chinese both passed home/radar, 14 categories, filters, project
  cards, detail, rule insight, AI insight status, favorites, compare,
  package radar, language switch, reload persistence; no layout overflow,
  no undefined/null copy, zero page/console errors.
- One real P1 blocker found and fixed with a minimal change: the English
  compare view showed a Chinese recommendation because
  `project-comparator.js` generated it directly. `compareProjects()` now
  accepts a locale and returns a localized recommendation ("Currently
  recommended: ..." / "当前更推荐 ..."); the UI passes the active locale.
  No other product behavior changed.
- Real screenshots captured at 1440x900 from the running app and committed
  to `docs/screenshots/`: `radar-en.png`, `detail-en.png`,
  `compare-en.png`, `radar-zh.png`. Data source is the built-in deterministic
  demo seed (repos / OpenDigger / repo-pulse), not fabricated live data.
- README.en.md gained a screenshots section and an English / Simplified
  Chinese language navigation; README.md gained the reverse navigation; the
  stale "local release candidate / publishing still requires approval" copy
  was corrected to public beta v0.1.0. No adoption, badge, benchmark, or
  performance claims were added.
- Onboarding recheck: Node + optional Python, `node server.mjs`, launchers,
  `http://localhost:8080`, optional local Ollama, optional server-only
  `GITHUB_TOKEN`, proxy env vars, beta limitations, and security reporting
  path all match the repository.
- Private Vulnerability Reporting: still `pending_manual_enablement` (not
  visible in the GitHub API `security_and_analysis`); not claimed as enabled.
- Tests: Node 31/31; JS/MJS syntax, Python py_compile, JSON validation,
  git diff --check all pass. Security scan: no tokens, credentials, personal
  paths, or browser privacy data in screenshots or new files.
- Git: committed to `docs/readme-visuals` (local only); no push, merge, tag,
  or release; `v0.1.0` unchanged. OSS-0T.4 PR ready; v0.2.0 release
  candidate not declared because screenshots/onboarding are docs-only and
  public adoption evidence is still absent.

## Security boundary

No API key, token, personal directory, device configuration, telemetry, or
remote translation service is added. The local Ollama path remains the only
insight backend and stays zero-cost.
