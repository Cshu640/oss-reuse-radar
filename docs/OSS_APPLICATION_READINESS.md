# OSS Application Readiness

This is an internal, non-OpenAI, 100-point heuristic. It measures evidence
available on 2026-08-11, not product quality alone and not an application
endorsement.

## Score

**50 / 100 — NO**

| Area | Score | Evidence |
| --- | ---: | --- |
| A. Public OSS foundation | 15 / 20 | MIT license, public-facing README entry, governance files, templates, and secret-free CI now exist locally; the repository is not public, so public-repository points remain zero. |
| B. Product real value | 24 / 25 | Runnable local product, differentiated discover-to-evaluate workflow, package/project comparison, history, trust signals, and Codex packet export are code-backed. OSS-0Q.1 real Windows acceptance passed: GitHub/Hugging Face/GitLab/ModelScope `PASS_LIVE`, Codeberg `PASS_LIVE_EMPTY`, npm/PyPI/crates `PASS_LIVE`, Gitee `DEGRADED_FALLBACK`, with live cache re-hit verified. |
| C. Public maintenance evidence | 1 / 25 | Changelog and roadmap were added, but there is no verified public release, public commit continuity, issue triage, or PR review. The single point reflects documentation presence, not public maintenance evidence. |
| D. Adoption | 0 / 20 | No verified public stars, forks, users, external issues, external pull requests, or traffic. |
| E. Application story | 10 / 10 | The product has a coherent OSS-maintainer use case: discover reusable projects, evaluate evidence, and use Codex for research, tests, triage, and maintenance workflows. |

## Interpretation

The largest gap is public maintenance and adoption evidence, not the absence of
product functionality. The score should not increase until the project has a
real public repository, real releases, real user feedback, and verifiable
maintenance activity. Local tests and historical handoff notes do not count as
public adoption.

## Gate before re-scoring

1. Windows live upstream run on a real provider-reachable network: done
   2026-08-11, recorded per-source in `docs/LIVE_UPSTREAM_ACCEPTANCE.md`.
2. Public-beta rate-limit, caching, and degraded-mode safeguards: done in
   OSS-0Q and live-verified on Windows.
3. Publish only after user approval and a real maintainer/contact path exists:
   still required before any actual public release.
4. Create a real release and maintain it through real issues and pull
   requests: still required for re-scoring.

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
