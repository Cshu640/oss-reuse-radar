# GitHub Public Repository Plan

This is a plan only. No remote, repository, setting change, push, tag, or
release was performed. Execute it only after user approval.

## Target repository

```text
owner: <user GitHub owner; to be confirmed at launch approval>
repo: oss-reuse-radar
visibility: public
default_branch: main
license: existing MIT (docs/../LICENSE)
description: Discover, evaluate, and reuse open-source projects instead of rebuilding from scratch.
```

## Branch plan

- Preserve the genuine commit graph from `oss/phase-0-public-readiness`.
- Establish `main` as the public default branch from the current history
  without squashing the recovered history.
- Keep the maintenance branch; do not delete it.
- Push only after user approval; no tag or release is created by the plan
  step itself until separately approved.

## Recommended settings

- Issues: ON
- Discussions: optional; can stay OFF for v0.1
- Wiki: OFF unless needed
- Projects: OFF unless needed
- Allow squash merge: ON
- Allow merge commits and rebase: per maintainer preference
- Auto-delete head branches after merge: ON
- Actions: enabled for the existing secret-free CI
- Dependabot alerts: enable where available
- Secret scanning: enable where GitHub provides it
- Secret push protection: enable where GitHub provides it
- Private vulnerability reporting: enable after the repository is public
  (recommended security contact path; no personal email is guessed)

## Release plan (later, separate approval)

- Tag `v0.1.0` on the approved head after `main` is established.
- Publish a GitHub Release from `docs/RELEASE_NOTES_v0.1.0.md` content.
- Verify public CI results on the pushed branch.

## Do not do automatically

- Do not create an organization, team, sponsors, or maintainer roster.
- Do not enable paid features, dependency-approval gates, or deployment
  workflows.
- Do not add MCP, SaaS, cloud collectors, accounts, or new platforms.
