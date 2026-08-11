# Upstream and License Audit

Date of this audit: 2026-08-11. This is engineering compliance documentation,
not legal advice.

## Method

The review inspected the recovered source tree, especially
`platform-adapters.js`, `package-service.mjs`, `trust-service.mjs`,
`insight-service.mjs`, `server.mjs`, `app.js`, and the test fixtures. URLs were
compared with the official documentation pages where available. The audit
distinguishes runtime API use, external data, reference links, and copied code.

The repository's MIT `LICENSE` applies to this repository's code only. A public
endpoint is not treated as a license grant for returned data, package metadata,
model cards, repository content, or third-party code.

## Findings

| Source | Current use | Copied code? | Current decision | Main caveat |
| --- | --- | ---: | --- | --- |
| GitHub | Project search and repository metadata | No | Keep | Search and primary rate limits are separate; browser calls need public-beta hardening. |
| Hugging Face Hub | Model/dataset search and metadata | No | Keep | Per-model and per-repository licenses still govern reuse. |
| GitLab | Project search and metadata | No | Keep | Returned project licenses and service terms apply. |
| Codeberg / Forgejo | Repository search and metadata | No | Keep | Returned repository licenses and service terms apply. |
| ModelScope | Model search and metadata | No | Keep | Per-model terms apply; live acceptance remains a task result, not a source-license conclusion. |
| Gitee | Degraded external-search fallback | No | Keep with downgrade | Fallback results are not counted as real-time platform data or growth. |
| npm | Search, metadata, monthly download signal | No | Keep | Package licenses vary; monthly downloads are ecosystem-specific adoption signals. |
| PyPI JSON/RSS | Exact-name metadata and radar fallback | No | Keep with caveat | Official JSON is not treated as a precise total-download source. |
| pypistats | Auxiliary recent-download signal | No | Evaluate | Service/data terms and availability need review before redistribution or bulk caching. |
| crates.io | Search and cumulative/recent download signals | No | Evaluate | API/data terms and crate-specific licenses need review before redistribution. |
| ecosyste.ms | Open-metadata fallback for package discovery | No | Evaluate | The adapter uses it at runtime and does not commit bulk responses. |
| OpenSSF Scorecard | On-demand risk signal | No | Keep | Not security certification, a no-vulnerability proof, or a legal conclusion. |
| deps.dev | Package/repository relationship signal | No | Keep | Missing data is not evidence of safety. |
| OSV | Known-vulnerability association signal | No | Keep | A zero-result response is not proof of no vulnerabilities. |
| Ollama | Optional local model HTTP API | No | Keep | Ollama and selected-model terms apply; no model or service secret is bundled. |

The complete machine-readable record is `docs/SOURCE_LEDGER.json`.

## Copied-code result

No vendored upstream repository, SDK source tree, or copied component was
identified in the reviewed artifact. The project contains its own adapters,
stores, UI, and tests, plus reference URLs and sample metadata. This result is
not a substitute for a future dependency-by-dependency review if the project
adds npm, PyPI, or other third-party code.

## License conclusion

The repository-level MIT notice can remain unchanged for this phase. It is
compatible with the reviewed project-owned source because no copied
copyleft/share-alike component was identified. External API/data terms remain
separate obligations; the project must re-check them before adding persistent
redistribution, bundled data, a release archive with upstream content, or a
new dependency.
