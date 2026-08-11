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

## Final release-gate output

```text
recommended_repo_slug: oss-reuse-radar
recommended_display_name: OpenRadar
rename_required_before_public: false
```

`oss-reuse-radar` communicates the repository purpose (discover and reuse OSS)
and is not known to collide with an established project. This is a discovery
preference, not a trademark or legal guarantee. The visible product name
`OpenRadar` remains collision-prone in search and should be paired with the
descriptive repository slug and a clear one-line description at launch.

## Decision

Do not rename the visible brand or the in-repository product name in this
phase. If publication is approved later, use the descriptive repository slug
`oss-reuse-radar` and make the relationship to the visible `OpenRadar` brand
explicit. No domain was registered or changed, and no public repository was
created.
