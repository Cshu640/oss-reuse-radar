# OpenRadar v0.2.0

OpenRadar is a local-first discovery and evaluation tool for open-source
projects, models, and software packages. v0.2.0 adds the complete English and
Simplified Chinese interface and bilingual insight foundation on top of the
v0.1.0 public beta baseline. It remains a public beta / early-stage OSS
project with no verified external adoption yet.

## Core changes

1. English / Simplified Chinese interface
   - Complete English and Simplified Chinese UI
   - Visible language switcher
   - Locale persistence (`openradar:locale:v1`)
   - Resolution order: saved locale > browser language > English

2. Locale-independent data model
   - Stable, locale-independent category machine IDs
   - Idempotent migration of legacy Chinese category values
   - Favorites, compare, backup, and import compatibility preserved

3. Bilingual OSS insights
   - Bilingual rule-based insights (English / Simplified Chinese)
   - Locale-aware AI prompts (plain English / Simplified Chinese)
   - Bilingual AI status text
   - Use-case Fit / 适用场景匹配度

4. Locale-aware insight cache
   - `projectId::locale` cache isolation
   - Legacy no-locale cache compatibility (treated as zh-CN)
   - Switching locale never shows a stale insight from another language

5. Public documentation
   - Real English screenshots (radar, detail, compare)
   - Real Simplified Chinese screenshot
   - Refreshed English / Chinese README navigation
   - Public beta onboarding cleanup

6. Quality fixes
   - Compare recommendation localized per UI language
   - Browser-mock and CI fixes discovered during the OSS-0T.4 public CI
     (identifier collisions in the inline mock bundle)

## Notes

- Ollama is an optional local insight backend; rule summaries work without
  it. No remote translation service is used.
- No fabricated adoption, user-count, benchmark, or performance claims are
  made. Adoption and community evidence are still early.

## Known limitations

- Private Vulnerability Reporting is pending manual enablement in the GitHub
  repository settings.
- Gitee remains fallback-only external search and is not counted as live or
  growth data.
- The upstream gateway cache is memory-only and clears on server restart.
- Ollama availability and model support depend on the local environment.
- External adoption, community, and maintenance evidence is still
  accumulating.
