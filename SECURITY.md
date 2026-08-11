# Security Policy

## Scope

Open Source Radar is a local-first application that calls public upstream APIs and, optionally, a local Ollama service. It is not a security scanner, certification service, or hosted multi-tenant system.

## Reporting

This recovered artifact does not yet have a public security contact or public issue tracker. Until one is explicitly configured, do not publish sensitive details in a public issue. Keep the report private in the local project workflow and include:

- affected file, endpoint, or launcher;
- reproducible steps and impact;
- whether a secret, local data file, or upstream account is involved;
- a minimal safe proof, with secrets and personal data removed.

Do not include GitHub tokens, Ollama cloud keys, Supabase service-role keys, backup archives, or personal runtime data in reports.

## Current security boundaries

- No service token belongs in browser code or committed files.
- `data/*.json` and generated `exports/codex/*` are local runtime data and must remain ignored.
- OpenSSF Scorecard, deps.dev, and OSV output is a risk signal only; missing results are not proof of safety.
- Upstream API availability, CORS, rate limits, and metadata accuracy remain public-beta risks.

## Disclosure status

No public security advisories or response-time guarantees are claimed at this stage. See `docs/PUBLIC_RUNTIME_RISK_REGISTER.md` for the current risk register.
