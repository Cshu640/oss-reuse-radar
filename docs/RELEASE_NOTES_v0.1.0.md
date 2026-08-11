# OpenRadar v0.1.0 — Public Beta Release Candidate

Version note: the internal artifact phase remains `0.4-B`; `v0.1.0` is the
public semantic release number for this candidate. The two labels coexist and
do not conflict.

## Highlights

- Multi-source open-source discovery: GitHub, Hugging Face, GitLab, Codeberg,
  and ModelScope.
- Package ecosystem radar: npm, PyPI, and crates.io with ecosystem-specific
  download signals.
- Local historical growth backed by `data/history.json`; missing baselines
  show as "accumulating" instead of invented numbers.
- Two-to-five project comparator with rule-based dimensions, clearly labeled
  as a rule judgment, not a benchmark or certification.
- Trust and supply-chain risk signals (OpenSSF Scorecard, deps.dev, OSV) with
  explicit fact/rule/AI/manual boundaries.
- Optional local Ollama Chinese explanations with a rule-summary fallback.
- Codex research-packet export that only generates and copies tasks; it never
  auto-launches Codex or consumes quota.
- Server-side upstream gateway with bounded cache, ETag revalidation,
  in-flight dedupe, timeout, bounded retry, rate-limit handling, provider
  isolation, and visible degraded/stale states.
- Windows double-click launchers with visible error windows.

## Known limitations

- Gitee is fallback-only external search and is not counted as live data or
  growth.
- Growth needs natural time; 24h/7d/30d periods only appear once real history
  accumulates.
- npm monthly, PyPI auxiliary, and crates cumulative/recent downloads are not
  directly comparable across ecosystems.
- The gateway cache is memory-only and clears on server restart.
- Authenticated GitHub is optional and was not live-acceptance tested;
  anonymous mode is verified and works without a token.
- Trust signals are risk signals, not security certification, no-vulnerability
  proof, or legal conclusions.
- Upstream availability varies by network; a proxy may be needed in some
  environments.
- Early provenance history contains the user's local desktop path (now
  generalized in current docs); publication exposes that history.
- Real UI screenshots are pending capture before launch.

## Install and run

See the README (`README.en.md` for the public entry, `README.md` for Chinese
product notes). Quick start: double-click `START-OPENRADAR.bat` on Windows or
run `node server.mjs` and open `http://localhost:8080`. No paid API or token
is required for the base experience.

## Windows proxy note

If the local network needs a proxy, configure it through environment
variables; the project does not hardcode a proxy address:

```text
NODE_USE_ENV_PROXY=1
HTTP_PROXY=<your proxy>
HTTPS_PROXY=<your proxy>
NO_PROXY=localhost,127.0.0.1,::1
```
