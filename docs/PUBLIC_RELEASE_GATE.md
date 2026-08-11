# Public Release Gate — v0.1.0 Release Candidate

Date: 2026-08-11. This is the local release audit for a v0.1.0 public beta
release candidate. It proves the current repository can be published safely,
honestly, and maintainably, and it freezes the candidate for user approval.
No remote, push, tag, release, merge, website, or public repository was
created by this task.

## Gate summary

| Gate | Result | Evidence |
| --- | --- | --- |
| Git history secret scan | PASSED | `git grep` over all 36 reachable commits found no real credential; only a clearly fake test token (`ghp_fake_server_only_1234567890`) in an injected test. |
| Git history privacy scan | PASSED WITH USER DECISION | No personal emails or credentials. One local artifact path with the Windows account name exists in early history; current file is generalized. See `docs/ARTIFACT_PROVENANCE.md`. |
| Provenance | PASSED | Genuine recovered history preserved (`fd44b7f`, `e60b3a0`); no backdating, no synthetic tags, no fake contributors; author identities are `OpenRadar Maintainer` / `OpenAI Codex` emails, not personal addresses. |
| License / source ledger | PASSED | Repo-level MIT completed to the standard text; `docs/SOURCE_LEDGER.json` records no copied upstream code; external API/data use is runtime-only. |
| Naming | PASSED | `oss-reuse-radar` recommended; no rename required before public. See `docs/PUBLIC_NAMING_DECISION.md`. |
| README | PASSED | `README.en.md` provides the public entry with product purpose, sources, quick start, proxy note, caveats, and beta limitations. |
| Screenshots | NOT RUN | No real UI screenshots are committed yet; capture from a real local run before launch. Non-blocking for this audit. |
| Quick start | PASSED | README covers launcher and `node server.mjs`; no paid API or token required; proxy guidance is generic and does not hardcode a local port. |
| CI | PASSED (fixed) | CI now uses Node 24, installs Playwright/Chromium for the mocked browser test, and runs deterministic local tests only. |
| Community / security | PASSED WITH USER DECISION | CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue/PR templates exist. SECURITY.md has no public contact; recommend GitHub Private Vulnerability Reporting at launch. |
| Version consistency | PASSED | Internal artifact phase remains `0.4-B`; public release is `v0.1.0`. The distinction is documented in `docs/RELEASE_NOTES_v0.1.0.md`; no version normalization was needed. |
| Full regression | PASSED | Node 30/30; JS/MJS syntax passed; Python syntax passed; JSON parse passed; `git diff --check` passed. Python Playwright mock skipped locally (module missing); CI will install it. |

## Secret audit details

Current tree scan covered source, tests, docs, CI, launchers, manifest, and
ignored-file rules. Full-history scan covered all 36 reachable commits. No
`ghp_`, `github_pat_`, `sk-`, AWS key, private key, bearer token, cookie,
password, or real API credential was found. The only hit is the deliberately
fake `ghp_fake_server_only_1234567890` in `tests/upstream_gateway_test.mjs`,
which is an injected test value and never appears in responses, cache, logs,
or committed environment files.

## Privacy audit details

All commits use neutral author identities (`OpenRadar Maintainer
<openradar@local.invalid>`, `OpenAI <noreply@openai.com>`, `OpenAI Codex
<codex@openai.com>`), and commit messages contain no personal information.
The only privacy item is the original artifact path
(`C:\Users\<user>\Desktop\临时下载\水印图\...`) recorded in early
`docs/ARTIFACT_PROVENANCE.md` history. It is a local file path, not a
credential. The current file generalizes it, and the exposure is listed as a
required user decision because history cannot be rewritten without explicit
approval.

## License and source gate

The repository `LICENSE` is the complete MIT text (completed during this
audit). `docs/UPSTREAM_AUDIT.md` and `docs/SOURCE_LEDGER.json` classify every
external source as official API use, open data, reference-only, or rejected;
`copied_upstream_code` is false throughout. No vendored source, SDK tree, or
copied component was identified. Public endpoints are not treated as license
grants for returned data. No NOTICE/ATTRIBUTIONS file is required by the
current source composition; re-check if assets or dependencies are added.

## Release-candidate artifacts

- `docs/RELEASE_NOTES_v0.1.0.md` — v0.1.0 highlights, limitations, install/run.
- `docs/PUBLIC_RELEASE_MANIFEST.json` — machine-readable release manifest.
- `docs/GITHUB_PUBLIC_REPOSITORY_PLAN.md` — repository configuration plan
  (plan only; nothing executed).
- `docs/PUBLIC_NAMING_DECISION.md` — naming output.

## Required user decisions before launch

1. Approve the exact repository owner (`<owner>`) and the `oss-reuse-radar`
   slug; the plan does not invent an owner.
2. Approve public exposure of the early provenance history that contains the
   Windows desktop path, or authorize a later history rewrite before
   publishing.
3. Choose the security contact: enable GitHub Private Vulnerability Reporting
   (recommended) or provide an approved public email. No email is guessed.
4. Approve the actual public launch (create repository, push genuine history,
   establish `main`, tag `v0.1.0`, publish the Release, enable security and
   community settings, verify public CI).

## Final judgment

```text
PUBLIC_RELEASE_GO = true
```

No release blocker remains after the LICENSE and CI/test portability fixes.
Authenticated GitHub, Gitee fallback-only, memory-only cache, standalone
Playwright in the bundled local Python, natural-time growth, and zero adoption
are documented non-blocking items. Actual publication is explicitly deferred
until the user approves it.

## Forbidden until user approval

```text
create_remote
push
tag
github_release
make_public
```

None of these were performed.
