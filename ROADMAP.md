# Roadmap

This is a directional plan, not a promise of dates or features.

## Before public beta

- Complete Windows live acceptance for GitHub, Hugging Face, GitLab, Codeberg, ModelScope, npm, PyPI, and crates.io.
- Add explicit rate-limit state, caching, backoff, and degraded-mode behavior, especially for GitHub Search.
- Confirm upstream terms and data handling before any persistent or redistributable cache is introduced.
- Validate backup/restore and local persistence with real user data on Windows.

## Early public maintenance

- Publish a descriptive repository slug after the naming decision is approved.
- Make a real, reproducible `v0.1.0` release only after the public-beta gate is met.
- Triage real issues, review real pull requests, and maintain the changelog from public evidence.
- Re-score OSS application readiness using actual public maintenance and adoption evidence.

## Explicitly out of scope for this phase

- MCP implementation
- cloud unattended collection
- accounts, payments, or a SaaS backend
- additional data platforms
- a full UI redesign
- rebuilding the reuse-fit workflow
