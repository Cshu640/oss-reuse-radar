# Contributing

Thank you for helping improve Open Source Radar.

## Before opening a change

- Read `AGENTS.md`, `HANDOFF.md`, `docs/PROJECT_STATE.json`, and the latest `docs/HANDOFF_LOG.md` entry.
- Keep the local-first, zero-paid-API-cost goal.
- Audit reusable OSS projects, APIs, SDKs, and data sources before adding a subsystem. Record the decision in the source ledger when it matters.
- Do not expose tokens, local runtime data, or generated Codex packets.
- Do not describe mocked tests as live API acceptance, and do not describe rule scores as security, performance, or legal conclusions.

## Development

This repository intentionally has no dependency-install workflow. Use the bundled Node and Python runtimes:

```bash
node --test tests/*.mjs
python tests/browser_mock_test.py
```

For runtime behavior use `node server.mjs`, not a static file server. Add or update focused tests with behavior changes. Do not make CI depend on live third-party APIs.

## Pull requests

Describe the user-visible outcome, files changed, tests actually run, and anything not verified. Keep commits focused. Include migration or compatibility notes for changes to favorites, history, insight, trust, identity, comparison, or backup schemas.

No remote, push, release, tag, merge, public-repository creation, or external message is performed by local automation in this repository without explicit authorization.
