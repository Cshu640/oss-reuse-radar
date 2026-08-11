# OSS Application Readiness

This is an internal, non-OpenAI, 100-point heuristic. It measures evidence
available on 2026-08-11, not product quality alone and not an application
endorsement.

## Score

**50 / 100 — NO**

| Area | Score | Evidence |
| --- | ---: | --- |
| A. Public OSS foundation | 15 / 20 | MIT license, public-facing README entry, governance files, templates, and secret-free CI now exist locally; the repository is not public, so public-repository points remain zero. |
| B. Product real value | 24 / 25 | Runnable local product, differentiated discover-to-evaluate workflow, package/project comparison, history, trust signals, and Codex packet export are code-backed; OSS-0Q.1 harness and browser smoke are real, but this Windows network did not yield live upstream payloads. |
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

1. Complete a Windows live upstream run on a network that can reach the providers and record per-source outcomes.
2. Implement public-beta rate-limit, caching, and degraded-mode safeguards.
3. Publish only after user approval and a real maintainer/contact path exists.
4. Create a real release and maintain it through real issues and pull requests.

## OSS-0Q.1 evidence

The local server-to-gateway acceptance path is repeatable through
`RUN_LIVE_UPSTREAM_ACCEPTANCE.cmd`. The 2026-08-11 run started the server and
verified anonymous GitHub mode and UI degradation, but observed network failure
for all five project providers and no live package payload. This adds no
readiness or adoption points and keeps the release gate at `50/100 — NO`.
