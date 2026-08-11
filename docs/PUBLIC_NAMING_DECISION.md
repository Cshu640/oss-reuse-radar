# Public Naming Decision

Date checked: 2026-08-11.

## Evidence

`OpenRadar` is collision-heavy in public search. Examples include the
[PreSenseRadar OpenRadar repository](https://github.com/presenseradar/openradar),
the [Open Radar Initiative](https://openradar.org/), and the
[OpenRadar Science project list](https://openradarscience.org/openradar-projects).
These are unrelated radar/science projects. This is a naming and discovery
risk, not a legal trademark conclusion.

## Options

| Option | Benefit | Cost/risk | Decision |
| --- | --- | --- | --- |
| Visible brand stays `OpenRadar`; repository slug becomes `oss-reuse-radar` | Preserves existing product continuity while making the repository purpose clear | Requires a later link/asset update and brand-to-repo explanation | Recommended |
| Brand becomes `OSS Reuse Radar` | More descriptive and less collision-prone | Breaks existing UI wording and historical references | Keep as fallback |
| Brand becomes `Open Source Reuse Radar` | Most explicit for global users | Long name; larger UI and migration cost | Keep as fallback |

## Decision

Do not rename the visible brand or repository in this phase. If publication is
approved later, use a descriptive repository slug such as `oss-reuse-radar`
and make the relationship to the visible `OpenRadar` brand explicit. No domain
was registered or changed, and no public repository was created.
