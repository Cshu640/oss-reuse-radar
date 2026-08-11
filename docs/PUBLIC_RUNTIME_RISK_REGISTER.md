# Public Runtime Risk Register

Date: 2026-08-11. Severity describes public-beta impact, not exploitability.

| Risk | Severity | Evidence/current behavior | Required public-beta mitigation | Blocks v0.1 public release? |
| --- | --- | --- | --- | ---: |
| GitHub unauthenticated and Search limits | High | `app.js` calls the browser-facing search path; GitHub documents separate search and core buckets | Add visible rate-limit state, response-header handling, cache/ETag use, backoff, and a safe optional server-side authenticated mode | Yes |
| Client-side direct upstream calls | High | Platform adapters are reachable from the browser flow; user-origin requests share public limits and expose upstream variability | Route sensitive/high-volume calls through the local server, never expose tokens, and keep degraded results explicit | Yes |
| npm/PyPI/crates.io rate limits and field drift | High | Package adapters use multiple registries and fallback metadata; metrics have different meanings and availability | Per-ecosystem timeout/cache/error state, contract fixtures, conservative labels, and no cross-ecosystem raw ranking | Yes |
| Upstream CORS and service instability | High | Historical audit recorded failures for npm/crates and weak PyPI search in the development environment | Treat each source independently, show source status, retry with bounded backoff, and keep local/rule results usable | Yes |
| Gitee fallback ambiguity | Medium | Official path is degraded to external search | Keep fallback visually separate and exclude it from real-time/growth data | No, if clearly degraded |
| Ollama optionality | Medium | Model may be absent, slow, or return malformed output | Keep rule summaries first, validate structured output, serialise requests, and release model resources | No |
| Data normalization across ecosystems | High | npm monthly, PyPI auxiliary, and crates cumulative/recent signals differ | Normalize within ecosystem, require `data/history.json` baselines for growth, and avoid “fastest across ecosystems” claims | Yes |
| Local persistence and backup | Medium | Favorites, history, insights, trust, identity corrections, comparison, and Codex packets are local | Add backup/restore acceptance on Windows, replacement warnings, schema migrations, and restart guidance | Yes for a reliable beta |
| Trust signal interpretation | Medium | Scorecard/deps.dev/OSV are on-demand public signals | Label facts/rules/AI/manual confirmation separately and never claim certification or no vulnerabilities | No, if wording remains bounded |
| Public OSS governance and support | Medium | Repository is not public and has no verified public issue/PR history | Publish only after contacts, templates, response ownership, release evidence, and a real maintenance loop exist | Yes for an application-ready public release |

## Security boundary

No token, service-role key, Ollama cloud key, or other model key may be placed in
browser code or committed files. The current task documents the risk; it does
not implement the full public-beta rate-limit redesign.

## Evidence links

GitHub's [rate-limit endpoint documentation](https://docs.github.com/en/rest/rate-limit/rate-limit)
states that core and search resources are separate. Its
[REST rate-limit guide](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
also documents primary and secondary limits. These references support the
risk classification; they do not establish a fixed limit for every future
request or authentication mode.
