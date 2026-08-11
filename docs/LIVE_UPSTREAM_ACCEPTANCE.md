# OSS-0Q.1 Windows Live Upstream Acceptance

Date: 2026-08-11 18:06 Asia/Shanghai. This is an observed engineering record,
not a claim that every provider is available from every Windows network.

## Environment and method

- OS/runtime: Windows `win32-x64`, Node `v24.18.0`, Asia/Shanghai.
- Execution: the user ran `RUN_LIVE_UPSTREAM_ACCEPTANCE.cmd` from an ordinary
  Windows PowerShell with `NODE_USE_ENV_PROXY=1`,
  `HTTP_PROXY`/`HTTPS_PROXY=http://127.0.0.1:7897`, and
  `NO_PROXY=localhost,127.0.0.1,::1`. The harness itself does not serialize
  environment variables; this description comes from the user's run report.
- Method: the repeatable native-Node harness started `node server.mjs` on an
  ephemeral loopback port (`55858`) with `OPENRADAR_AUTO_COLLECT=0`, then
  queried only the local product routes. The child server was stopped by the
  harness; no other Node process was touched.
- Chain under test: local server -> `/api/upstream/*` or
  `/api/packages/*` -> server gateway -> provider.
- GitHub was forced anonymous for this run (`authMode=anonymous`,
  `authenticated_mode_not_tested`). No token was printed, stored, or sent to
  the browser.
- Sanitized machine evidence: `artifacts/live-upstream-acceptance.json`
  (ignored local runtime evidence; it contains no token, Authorization header,
  cookie, raw environment value, or private path).

## Windows live provider matrix

The local routes returned HTTP 200 for project envelopes; `httpStatus` is the
local route status. Each row reflects a real provider response through the
product gateway.

| Provider/query | Local status | Auth | Count | Cache | Category |
| --- | ---: | --- | ---: | --- | --- |
| GitHub / `http client` | 200 | anonymous | 3 | miss | `PASS_LIVE` |
| Hugging Face / `http client` | 200 | anonymous | 3 | miss | `PASS_LIVE` |
| GitLab / `http client` | 200 | anonymous | 3 | miss | `PASS_LIVE` |
| Codeberg / `http client` | 200 | anonymous | 0 | miss | `PASS_LIVE_EMPTY` |
| ModelScope / `http client` | 200 | anonymous | 1 | miss | `PASS_LIVE` |

GitHub anonymous live rate-limit headers were observed through the local
route: `resource=search`, `limit=10`, `remaining=5`, `used=5`,
`reset=2026-08-11T10:06:38Z`, `retry-after` absent. This is real anonymous
quota evidence for a public beta that does not require a token. Authenticated
GitHub was not tested and is a documented non-blocking gap.

Codeberg returned a legal empty result (`PASS_LIVE_EMPTY`) with a healthy
contract and parser, not a parser failure.

## Package ecosystem probes

| Ecosystem/query | Local status | Count/parse | Usage signal | Category |
| --- | ---: | --- | --- | --- |
| npm / `axios` | 200 | 3 / projects array | downloads present | `PASS_LIVE` |
| PyPI / `requests` | 200 | 1 / projects array | downloads present | `PASS_LIVE` |
| crates.io / `serde` | 200 | 3 / projects array | downloads + recentDownloads | `PASS_LIVE` |

PyPI download values remain auxiliary adoption signals, not official precise
download totals. npm monthly, PyPI auxiliary, and crates cumulative/recent
signals are not cross-ranked as a single raw growth number.

## Gitee

- Gitee returned `gitee-external-search`, `degraded=true`, and zero projects;
  this is `DEGRADED_FALLBACK` and is not counted as a live platform or growth
  result. The fallback-only contract is intact.

## Cache re-hit (live local-server behavior)

Each request was made twice through the same local route; both attempts
returned `fresh` with identical data (`sameData=true`).

| Request | First | Second | Verified |
| --- | --- | --- | --- |
| GitHub / `http client` | fresh, 4 ms | fresh, 11 ms | true |
| Hugging Face / `http client` | fresh, 15 ms | fresh, 15 ms | true |
| npm / `axios` | fresh, 15 ms | fresh, 3 ms (faster) | true |

Live cache re-hit is therefore verified for GitHub, Hugging Face, and npm.
Latency reduction is observation only, not a hard threshold. The in-memory
cache still clears on restart, which is intentional and documented.

## Browser smoke

The Node acceptance harness does not drive a browser
(`not-run-by-node-harness`). The earlier OSS-0Q.1 environment-blocked run
covered the local degraded-path browser smoke (home, search, badges, detail,
favorites, package page, comparison, Codex export, zero console errors), and
that record remains in `docs/HANDOFF_LOG.md`. A new browser live-smoke on this
passing network was not part of this acceptance run and is not claimed.

## Failures, blockers, and release judgment

- No provider failed for a product reason in this run. Gitee
  `DEGRADED_FALLBACK` is the accepted contract; Codeberg zero is a legal empty
  result; authenticated GitHub and standalone Python Playwright were not run
  and are documented non-blocking gaps.
- No new release blocker was observed. The required anonymous GitHub live
  response and multi-provider/package live evidence are now recorded from a
  real Windows network.
- Public-beta gate: **`PUBLIC_BETA_RELEASE_GATE_READY = true`**.
- Readiness score stays `50/100 — NO`; no adoption or public-maintenance
  points were added. The score and the release gate are separate judgments:
  the gate covers live engineering evidence, while the 100-point heuristic
  still requires public maintenance and adoption evidence before re-scoring.

## Reproduction

From the project directory in an ordinary Windows Terminal or CMD:

```cmd
RUN_LIVE_UPSTREAM_ACCEPTANCE.cmd
```

The harness needs Node 24 (or the project-supported Node runtime), no Python,
Playwright, paid API, or token. It never changes global environment variables,
Git remotes, tags, push, merge, or public-repository state.
