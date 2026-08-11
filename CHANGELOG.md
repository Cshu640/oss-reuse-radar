# Changelog

This file records truthful project milestones. It is not a list of public releases.

## v0.1.0 — 2026-08-11 (public beta)

- User-approved public launch completed: `Cshu640/oss-reuse-radar` is public
  with the genuine recovered history, `main` at `0fe3906`, and a public CI
  pass on the released commit.
- Public `v0.1.0` release published from `docs/RELEASE_NOTES_v0.1.0.md`;
  annotated tag `v0.1.0` points to the same commit as `main`.
- Fixed the first public CI failure: the browser mock did not follow the
  OSS-0Q migration to `/api/upstream/*`; the mock and its modelscope assertion
  were aligned with the real routes.
- Repository settings: Issues on, Wiki/Projects/Discussions off, squash merge
  and auto-delete on, secret scanning and push protection enabled. Private
  Vulnerability Reporting remains pending a one-click manual enablement.
- Real UI screenshots remain deferred; none were faked.

## Unreleased — OSS-0R v0.1.0 release candidate

- Windows live upstream acceptance passed on a real user network: GitHub,
  Hugging Face, GitLab, ModelScope, npm, PyPI, and crates.io live; Codeberg
  legal-empty; Gitee fallback-only; GitHub anonymous and live cache re-hit
  verified.
- Full-history secret and privacy audit performed; no real credential found;
  the user's local artifact path in early provenance history is documented as
  a user decision.
- Completed the MIT license text and made the browser mock/CI portable
  (Node 24, Playwright/Chromium install, graceful skip without Playwright).
- Created the public release gate, release notes, release manifest, and
  GitHub repository plan as local release-candidate artifacts.
- `PUBLIC_RELEASE_GO = true`, pending explicit user approval. No public
  repository, push, tag, or release was created.

## Unreleased — OSS-0P public-readiness foundation

- Verified the supplied Phase 0.4-B ZIP and recovered Bundle.
- Preserved genuine Phase 0.4-A through 0.4-B history on a new local maintenance branch.
- Added artifact provenance, upstream/source review, public runtime risk register, naming decision, governance files, and secret-free CI.
- No public repository, release tag, push, or live upstream claim was created by this task.

## Phase 0.4-B — recovered artifact

- Package ecosystem radar for npm, PyPI, and crates.io.
- Two-to-five project comparator with rule-based dimensions.
- Conservative package-to-repository identity linking.
- Existing history, insights, trust, backup, identity correction, and Codex research-packet workflows preserved.

Historical phase details remain in `docs/HANDOFF_LOG.md`.
