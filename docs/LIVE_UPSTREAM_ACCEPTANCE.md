# OSS-0Q.1 Windows Live Upstream Acceptance

Date: 2026-08-11 16:19 Asia/Shanghai. This is an observed engineering record,
not a claim that every provider is available from every Windows network.

## Environment and method

- OS/runtime: Windows `win32-x64`, Node `v24.18.0`, Asia/Shanghai.
- Method: the repeatable native-Node harness started `node server.mjs` on an
  ephemeral loopback port with `OPENRADAR_AUTO_COLLECT=0`, then queried only
  the local product routes. The child server was stopped by the harness; no
  other Node process was touched.
- Chain under test: local server -> `/api/upstream/*` or
  `/api/packages/*` -> server gateway -> provider.
- GitHub was forced anonymous for this run. An authenticated check was not
  performed and no token was printed, stored, or sent to the browser.
- Sanitized machine evidence: `artifacts/live-upstream-acceptance.json`
  (ignored local runtime evidence; it contains no token, Authorization header,
  cookie, raw environment value, or private path).

## Windows live provider matrix

The local routes returned HTTP 200 for project envelopes even when the gateway
reported a network failure. That is the intended sanitized degraded contract;
the `httpStatus` below is therefore the local route status, not a fabricated
upstream status.

| Provider/query | Local status | Auth | Count | Cache | Gateway state | Category |
| --- | ---: | --- | ---: | --- | --- | --- |
| GitHub / `http client` | 200 | anonymous | 0 | miss | network-error | `FAIL_NETWORK` |
| Hugging Face / `http client` | 200 | anonymous | 0 | miss | network-error | `FAIL_NETWORK` |
| GitLab / `http client` | 200 | anonymous | 0 | miss | network-error | `FAIL_NETWORK` |
| Codeberg / `http client` | 200 | anonymous | 0 | miss | network-error | `FAIL_NETWORK` |
| ModelScope / `http client` | 200 | anonymous | 0 | miss | network-error | `FAIL_NETWORK` |

This run did not observe a real project response or GitHub rate-limit headers;
all GitHub limit fields remained null because the request could not reach the
provider. It therefore does not prove anonymous quota availability or failure.

## Package ecosystem probes

| Ecosystem/query | Local status | Count/parse | Category | Notes |
| --- | ---: | --- | --- | --- |
| npm / `axios` | 502 | no projects array | `FAIL_UPSTREAM_HTTP` | registry-backed package route failed upstream |
| PyPI / `requests` | 200 | 0 / valid projects array | `FAIL_NETWORK` | all related gateway providers were degraded; not treated as a valid empty package result |
| crates.io / `serde` | 502 | no projects array | `FAIL_UPSTREAM_HTTP` | registry-backed package route failed upstream |

PyPI download values, when available in a future live run, must remain auxiliary
adoption signals rather than official precise download totals. npm monthly,
PyPI auxiliary, and crates cumulative/recent signals are not cross-ranked as a
single raw growth number.

## Gitee and cache re-hit

- Gitee returned `gitee-external-search`, `degraded=true`, and zero projects;
  this is `DEGRADED_FALLBACK` and is not counted as a live platform or growth
  result.
- GitHub, Hugging Face, and npm were each requested twice through the same
  local route. Because the first provider calls were network failures, both
  attempts remained `miss`; no live cache re-hit was claimed. Category:
  `NOT_TESTED_ENVIRONMENT_BLOCKED`.
- The in-memory cache behavior itself remains covered by the injected gateway
  tests; restart invalidation remains intentional.

## Browser smoke

The in-app browser used the same local server and completed these checks:

- Home/radar rendered with `GitHub匿名` and explicit `上游不可用`/`外部搜索`
  badges; no fake loading result was presented after the requests settled.
- The `http client` search rendered zero results with per-provider degraded
  states, npm/crates HTTP 502 notices, and direct external search links.
- A seed project detail opened; the detail page showed source facts, rule
  summary, license caution, trust wording, and Codex research boundaries.
- Favorite save and reload persistence passed (`openradar:favorites:v1`).
- Package page rendered; `axios` search showed npm/crates unavailable without
  hiding the failure.
- Two seed projects entered comparison; the result was labeled a rule
  judgment, not a benchmark, certification, or legal conclusion.
- Codex research packet generation wrote a local packet and explicitly stated
  that Codex was not auto-started and no quota was consumed.
- Browser console inspection returned zero warning/error entries from the tab
  API. This browser backend did not expose a full network panel; no direct
  provider success was inferred from that limitation. Static browser/server
  direct-upstream scans remain part of regression below.

## Failures, blockers, and release judgment

- The current Codex Shell and in-app browser both could start the local server,
  but their outbound provider calls were unavailable. The harness is therefore
  a real, repeatable Windows acceptance path, not a simulated PASS; rerun
  `RUN_LIVE_UPSTREAM_ACCEPTANCE.cmd` from an ordinary Windows Terminal on a
  network that can reach the providers.
- No product code fix was justified by this run: the local routes preserved the
  sanitized degraded contract and the UI surfaced the provider-local failures.
- Public-beta gate: **`PUBLIC_BETA_RELEASE_GATE_READY = false`**. The required
  anonymous GitHub live response and the mandatory multi-provider/package live
  evidence were not observed from this environment. This is an acceptance
  blocker, not evidence that all providers are down globally.
- Readiness score stays `50/100 — NO`; no adoption or public-maintenance points
  were added.

## Reproduction

From the project directory in an ordinary Windows Terminal or CMD:

```cmd
RUN_LIVE_UPSTREAM_ACCEPTANCE.cmd
```

The harness needs Node 24 (or the project-supported Node runtime), no Python,
Playwright, paid API, or token. It never changes global environment variables,
Git remotes, tags, push, merge, or public-repository state.
