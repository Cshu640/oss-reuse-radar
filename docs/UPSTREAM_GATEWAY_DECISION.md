# OSS-0Q Upstream Gateway Decision

Date: 2026-08-11. This is an engineering decision record, not legal advice.

## Decision

Adopt a small in-repository, server-side `Upstream Gateway` built on native
Node `fetch`, `AbortController`, `Headers`, and a bounded in-memory cache.
Browser code calls same-origin `/api/upstream/search` and
`/api/upstream/radar`; it does not make normal direct requests to GitHub,
Hugging Face, GitLab, Codeberg, or ModelScope. The package service uses the
same gateway for npm, PyPI, crates.io, pypistats, and ecosyste.ms requests.

The gateway provides:

- normalized request keys, bounded in-flight dedupe, fresh TTLs, ETag and
  Last-Modified revalidation, bounded eviction, and memory-only storage;
- bounded provider/global concurrency (GitHub 1, other configured providers 2,
  global 4);
- timeout, network/5xx retry with bounded exponential backoff, Retry-After
  handling, and no retry for ordinary 400/401/404/422 responses;
- GitHub primary cooldown from `x-ratelimit-remaining=0` and
  `x-ratelimit-reset`, secondary Retry-After handling, and a server-only
  optional `GITHUB_TOKEN` boundary;
- stale-if-error only inside a bounded stale window, with `cacheStatus:
  "stale"`, `degraded: true`, a safe reason, provider, age, and timestamps;
- a sanitized response contract with no Authorization header, token, raw
  environment value, or internal stack trace.

The cache is intentionally memory-only. Restarting the local server invalidates
it; no upstream response or validator is written to `data/`, backups, exports,
or Git.

## Open Source Scout

| Candidate | License / official evidence | Decision | Reason and dependency impact |
| --- | --- | --- | --- |
| Octokit | MIT; [official repository](https://github.com/octokit/octokit.js) | Reference-only | Useful reference for GitHub REST endpoint and rate-limit behavior, but the current product needs one cross-provider contract and only a small search surface. No install or copied source. |
| p-limit | MIT; [official repository](https://github.com/sindresorhus/p-limit) | Rejected for now | Its concurrency primitive is appropriate, but a tiny local limiter keeps this no-manifest runtime dependency-free. |
| p-queue | MIT; [official repository](https://github.com/sindresorhus/p-queue) | Rejected for now | More queue behavior than the explicit provider caps require; no install. |
| Bottleneck | MIT; [official repository](https://github.com/SGrondin/bottleneck) | Rejected for now | Mature scheduler/rate limiter, but its advanced queue/cluster surface is unnecessary for a single local server. |
| fetch-retry | MIT; [official repository](https://github.com/jonbern/fetch-retry) | Rejected for now | Generic retries do not encode GitHub primary/secondary cooldown or stale-if-error semantics; native fetch plus explicit gateway policy is clearer. |
| ky | MIT; [official repository](https://github.com/sindresorhus/ky) | Rejected for now | Useful Fetch wrapper, but it does not remove the need for provider-specific cache, rate-limit, secret, and response-contract logic. |
| undici | MIT/Node.js license context; [official repository](https://github.com/nodejs/undici) | Reference-only | Node already supplies Fetch through the supported runtime; adding a direct dependency would be redundant for this artifact. |

No candidate source was copied, vendored, or added to a package manifest.

## Provider source decisions

- npm uses the official Registry API `GET /-/v1/search`, not a web scraper;
  monthly downloads remain an ecosystem-specific signal. See the [npm
  Registry API](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md).
- PyPI calls set an identifiable User-Agent and retain ETag/Last-Modified
  validators. PyPI's policy explicitly documents ETag support and asks clients
  not to make thousands of requests in a short time. See [PyPI API
  policies](https://docs.pypi.org/api/).
- crates.io calls set User-Agent, timeout, bounded retry, cache, and stale
  fallback behavior. A 502 or network failure is a provider-local degraded
  result, not a reason to stop other radar sources. See [crates.io data
  access](https://crates.io/data-access).
- Gitee remains fallback-only. Its existing server service is still allowed
  to try the official API/search/explore paths, but its final external-search
  result is not counted as live platform data or growth.

## Acceptance boundary

Automated tests use injected fake fetch, clock, sleeper, and token values. They
prove cache hits, revalidation, dedupe, eviction, timeout, retry/cooldown,
stale refusal, response sanitization, provider isolation, and valid-empty vs
failure states. They do not prove that every live provider is available from a
particular Windows network. Full Windows live upstream acceptance remains a
separate task.
