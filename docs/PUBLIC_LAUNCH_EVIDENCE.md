# Public Launch Evidence — v0.1.0

Date: 2026-08-11 (UTC) / 2026-08-12 (Asia/Shanghai). This file records only
observed public state; nothing is inferred or fabricated.

## Repository

- GitHub owner: `Cshu640`
- Repository: `oss-reuse-radar`
- Public URL: https://github.com/Cshu640/oss-reuse-radar
- Creation timestamp: `2026-08-11T15:37:31Z`
- Visibility: `public`
- Description: `Discover, evaluate, and reuse open-source projects instead of rebuilding from scratch.`
- Default branch: `main`
- Public main SHA: `0fe3906ba681eee5167b56d8995bdd85fe7d8499`
- Topics: `open-source`, `developer-tools`, `discovery`, `github`,
  `huggingface`, `gitlab`, `npm`, `pypi`, `rust`, `codex`, `oss`

## Release and tag

- Tag: `v0.1.0` (annotated, `OpenRadar v0.1.0 public beta`)
- Tag object SHA: `e00cfdba946d32138aa246d4ad1b7da2ff82f4df`
- Tag target: commit `0fe3906ba681eee5167b56d8995bdd85fe7d8499` (matches `main`)
- Release URL: https://github.com/Cshu640/oss-reuse-radar/releases/tag/v0.1.0
- Release title: `OpenRadar v0.1.0 — Public Beta`
- Draft: `false`; Prerelease: `false`
- Notes source: `docs/RELEASE_NOTES_v0.1.0.md`

## Public CI

- Run ID: `31512595320`
- Conclusion: `success`
- Commit: `0fe3906ba681eee5167b56d8995bdd85fe7d8499`
- Steps passed: Node regression tests, Playwright install, Chromium install,
  browser mock, Python syntax, JavaScript syntax, JSON checks (Node 24)
- Annotation only: GitHub warns that `actions/checkout@v4`,
  `actions/setup-node@v4`, and `actions/setup-python@v5` run on Node 24
  because Node 20 is deprecated on GitHub-hosted runners; this is a platform
  notice, not a project failure.

## Repository settings

- Issues: `on`
- Wiki: `off`
- Projects: `off`
- Discussions: `off`
- Squash merge: `on`
- Delete branch after merge: `on`
- Secret scanning: `enabled` (public-repository automatic plus explicit
  enablement; API reports `enabled`)
- Secret scanning push protection: `enabled` (API reports `enabled`)
- Private Vulnerability Reporting: `pending_manual_enablement`; the GitHub
  API accepted the PATCH but the setting is not visible in
  `security_and_analysis`, so it must be confirmed/clicked in the repository
  Settings > Security UI before it is claimed as enabled.

## Post-public secret scan

- GitHub secret scanning alerts: `0`
- Public CI logs reviewed: no token, Authorization header, cookie, private
  path, or credential appeared in the run log; GitHub masked checkout tokens
  as `***`.
- Committed tree/history recheck: only the deliberately fake
  `ghp_fake_server_only_1234567890` test token exists (injected test value);
  no real credential was found.
- GitHub code-search for the fake token in this repository returned 0 hits
  (index/search dependent; the local full-history scan remains the
  authoritative check).

## Screenshots

- Status: `deferred_environment_limit`; no real UI screenshot was captured
  before launch and no fake screenshot was generated. README contains no
  broken image link. This is a non-blocking deferred item.

## Public smoke

- Visibility, default branch, license (`MIT`), Issues, and settings verified
  through the GitHub API with the authenticated owner.
- Key files verified present on `main` through the GitHub API:
  `README.en.md`, `README.md`, `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `ROADMAP.md`,
  `docs/PUBLIC_RELEASE_GATE.md`, `docs/PUBLIC_RELEASE_MANIFEST.json`,
  `docs/RELEASE_NOTES_v0.1.0.md`, `.github/workflows/ci.yml`.
- Anonymous direct HTTP smoke could not be run from the Codex sandbox because
  outbound `api.github.com` is unreachable in this environment; public
  visibility is instead confirmed by the GitHub API (`visibility: public`).
- No fake community activity was created: no bot accounts, fake stars, forks,
  issues, PRs, or contributors.

## Pending manual items

- Confirm/enable GitHub Private Vulnerability Reporting in the repository
  UI (Settings > Code security and analysis) and verify the "Privately
  report a vulnerability" entry appears.
- Capture and commit real UI screenshots for the README later.
