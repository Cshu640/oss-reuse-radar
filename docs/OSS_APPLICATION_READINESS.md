# OSS Application Readiness

This is an internal, non-OpenAI, 100-point heuristic. It measures evidence
available on 2026-08-11, not product quality alone and not an application
endorsement.

## Score

**64 / 100 — NO**

| Area | Score | Evidence |
| --- | ---: | --- |
| A. Public OSS foundation | 20 / 20 | MIT license, public-facing README entry, governance files, templates, and secret-free CI are now committed to the public repository `Cshu640/oss-reuse-radar`; the genuine recovered history is public, the default branch is `main`, and GitHub recognizes the MIT license. |
| B. Product real value | 24 / 25 | Runnable local product, differentiated discover-to-evaluate workflow, package/project comparison, history, trust signals, and Codex packet export are code-backed. OSS-0Q.1 real Windows acceptance passed: GitHub/Hugging Face/GitLab/ModelScope `PASS_LIVE`, Codeberg `PASS_LIVE_EMPTY`, npm/PyPI/crates `PASS_LIVE`, Gitee `DEGRADED_FALLBACK`, with live cache re-hit verified. |
| C. Public maintenance evidence | 10 / 25 | A real public `v0.1.0` release exists, public CI passes on `main`, Issues are enabled with issue/PR templates, security policy and secret scanning are configured, and public maintenance commits were pushed. There is still no external issue triage, PR review, or sustained maintenance cycle. |
| D. Adoption | 0 / 20 | No verified public stars, forks, users, external issues, external pull requests, or traffic. |
| E. Application story | 10 / 10 | The product has a coherent OSS-maintainer use case: discover reusable projects, evaluate evidence, and use Codex for research, tests, triage, and maintenance workflows. |

## Interpretation

The public launch added real repository, release, and CI evidence (A and C),
but adoption (D) remains zero and no external issue, PR, or contributor exists
yet. The rating stays `NO` until real users and external maintenance activity
accumulate; a score of 64 without adoption evidence is not an endorsement.

## Gate before re-scoring

1. Public repository with genuine history and `main`: done in OSS-0S
   (`Cshu640/oss-reuse-radar`, main `0fe3906`).
2. Public CI passing on `main`: done (run `31512595320`, success).
3. Public `v0.1.0` release: done.
4. Maintain it through real issues and pull requests: still required for
   further re-scoring; adoption points remain zero.

## OSS-0Q.1 evidence

The real Windows live acceptance passed on 2026-08-11 through
`RUN_LIVE_UPSTREAM_ACCEPTANCE.cmd` (ordinary PowerShell, proxy at
127.0.0.1:7897): GitHub/Hugging Face/GitLab/ModelScope `PASS_LIVE`, Codeberg
`PASS_LIVE_EMPTY`, npm/PyPI/crates `PASS_LIVE`, Gitee `DEGRADED_FALLBACK`;
GitHub anonymous mode and live cache re-hit (GitHub/Hugging Face/npm) were
verified. `PUBLIC_BETA_RELEASE_GATE_READY = true`.

The score remains `50/100 — NO` and no adoption or public-maintenance points
were added. The release gate and this heuristic measure different things: the
gate covers live engineering evidence, while the heuristic still requires an
approved public repository, real releases, and real users before re-scoring.

## OSS-0R evidence

The v0.1.0 release candidate audit completed on 2026-08-11: full-history
secret/privacy scan passed (with one documented user decision for an early
provenance path), MIT license completed, browser mock/CI made portable,
README/quick-start/CI/community gates passed, and `PUBLIC_RELEASE_GO = true`
pending user approval. See `docs/PUBLIC_RELEASE_GATE.md` and
`docs/PUBLIC_RELEASE_MANIFEST.json`.

The score remains `50/100 — NO`. No adoption or public-maintenance points
were added: this heuristic cannot increase until the repository is actually
public, `v0.1.0` is released, and real issues, PRs, and users accumulate.

## OSS-0S evidence

The user-approved public launch completed on 2026-08-11:
`Cshu640/oss-reuse-radar` is public with genuine history, `main` at
`0fe3906`, public CI passing, and a public `v0.1.0` release. See
`docs/PUBLIC_LAUNCH_EVIDENCE.md` for the full evidence.

Points added from real evidence only: public repository and genuine public
history (A +5), public release (C +4), public CI passing (C +2), and enabled
issues/security/community channels (C +3). No adoption, stars, forks, external
contributors, external issues, or PRs were counted; D stays zero. The rating
remains `NO` at `64/100` until real external usage and a sustained public
maintenance cycle are observable.
