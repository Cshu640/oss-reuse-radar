# Public Runtime Risk Register

Date: 2026-08-11. Severity describes public-beta impact, not exploitability.

| Risk | Severity | OSS-0Q status | Evidence/current behavior | Remaining boundary / release impact |
| --- | --- | --- | --- | --- |
| GitHub unauthenticated and Search limits | High | Mitigated; anonymous live verified | Server gateway parses limit headers, honors primary reset and secondary Retry-After, caches/revalidates, retries only bounded failures, and shows anonymous/authenticated mode without a token. OSS-0Q.1 real Windows run: anonymous `PASS_LIVE` (3 results for `http client`) with `resource=search`, `limit=10`, `remaining=5`, `used=5`, and reset observed; live cache re-hit verified. | Authenticated quota untested; limits vary by network/IP; no token is required for the anonymous base experience. |
| Client-side direct upstream calls | High | Mitigated for normal path | Browser code calls same-origin `/api/upstream/search` and `/api/upstream/radar`; optional GitHub token is server-only. | Direct external URLs remain user-visible fallback links; CORS and live acceptance are still open. |
| npm/PyPI/crates.io rate limits and field drift | High | Mitigated; live verified | Package calls reuse gateway timeout/cache/retry/stale behavior. OSS-0Q.1 real Windows run: npm/`axios` 3, PyPI/`requests` 1, crates/`serde` 3, all `PASS_LIVE`; download fields recorded as ecosystem-specific usage signals. | Keep ecosystem-specific wording; PyPI downloads remain auxiliary; no cross-ecosystem raw ranking. |
| Upstream CORS and service instability | High | Mitigated; live verified | Provider isolation, bounded retry, timeout, stale-if-error, and sanitized degraded responses prevent one source from blanking the radar. Live project and package responses passed on 2026-08-11; Gitee fallback behaved as designed. | No guarantee of live availability; stale data is explicitly non-live and bounded. |
| Gitee fallback ambiguity | Medium | Mitigated | Server-side bounded fallback remains; browser has no direct Gitee API call; external-search results remain excluded from live/growth data. OSS-0Q.1 observed `DEGRADED_FALLBACK` with zero projects. | Accepted as a deliberate fallback-only feature. |
| Ollama optionality | Medium | Accepted | Rule summaries remain first and local model use is on-demand/serial. | Not part of OSS-0Q upstream gateway; malformed/model availability risks remain bounded. |
| Data normalization across ecosystems | High | Accepted | Existing rules still distinguish npm monthly, PyPI auxiliary, and crates cumulative/recent signals. | Growth still requires `data/history.json`; no cross-ecosystem raw fastest claim is allowed. |
| Local persistence and backup | Medium | Accepted | Existing backup includes user state and server data; gateway cache is memory-only and restart-invalidated. | Windows backup/restore acceptance remains a separate product check. |
| Trust signal interpretation | Medium | Accepted | Scorecard/deps.dev/OSV remain on-demand public risk signals, not certification. | Wording must remain bounded. |
| Public OSS governance and support | Medium | Open | Local governance files and CI exist, but there is no public repository, release, issue triage, or adoption evidence. | Blocks application-ready re-scoring independent of the release gate; publishing still requires user approval. |

## Security boundary

No token, service-role key, Ollama cloud key, or other model key may be placed in
browser code, JSON API responses, cache entries, logs, generated packets, or
committed files. The optional `GITHUB_TOKEN` is read only by the server process;
`.env.example` contains an empty placeholder and is not a credential store.

## Release gate

`PUBLIC_BETA_RELEASE_GATE_READY = true` as of the 2026-08-11 Windows live
acceptance record: anonymous GitHub, project providers, npm/PyPI/crates, Gitee
fallback, and live cache re-hit were all observed through the real local
server-to-gateway chain. The gate is an engineering/live-evidence judgment;
the `OSS_APPLICATION_READINESS` score remains `50/100 — NO` because public
maintenance and adoption evidence is still absent.

## Evidence links

The OSS-0Q.1 live matrix and reproduction steps are in
`docs/LIVE_UPSTREAM_ACCEPTANCE.md`; the ignored local machine record is
`artifacts/live-upstream-acceptance.json`.

GitHub's [rate-limit endpoint documentation](https://docs.github.com/en/rest/rate-limit/rate-limit)
states that core and search resources are separate. Its
[REST rate-limit guide](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
also documents primary and secondary limits. These references support the
risk classification; they do not establish a fixed limit for every future
request or authentication mode.
