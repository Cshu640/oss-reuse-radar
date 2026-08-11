# Artifact Provenance

## Scope

This repository was recovered from a ChatGPT web-conversation artifact. The
recovered product version is Open Source Radar Phase 0.4-B.

## Verified artifact

- Source artifact: `open-source-radar-phase-0.4-b.zip`
- Original supplied path: `C:\Users\28293\Desktop\临时下载\水印图\open-source-radar-phase-0.4-b.zip`
- Verified copy: `C:\Users\28293\Desktop\临时下载\水印图\open-source-radar-phase-0.4-b-VERIFIED.zip`
- Size: 150,410 bytes
- SHA-256: `4fcd03e483196bd48e3c47f4e8d7e53c9ee96c5d8b89fb75613b42a55341ce3d`
- Result: exact match with the task-provided expected hash
- The archive was checked before project modifications. Its extracted project
  content matches the current project content byte-for-byte.

## Recovered Git history

The supplied Bundle was also verified:

- Bundle: `C:\Users\28293\Desktop\临时下载\水印图\open-source-radar-phase-0.4-b.bundle`
- SHA-256: `915f1c9184623e2284859c270f3db8b6a5d0e6ac57bf7104ffd01c2212597df3`
- `git bundle verify`: passed; the bundle records a complete history
- Recovered Phase 0.4-B handoff commit: `e60b3a0249e16c4aae3988eabaeccadf7ac4b4fc`
- Recovered package/comparator feature commit: `fd44b7f`

The ZIP and the recovered Bundle have identical project content after line
ending normalization. The ZIP uses LF line endings while the recovered Bundle
worktree uses CRLF. This is recorded as a reconciliation detail, not as a
new historical claim.

The branch `oss/phase-0-public-readiness` preserves the genuine recovered
history. Historical phase documents and historical commit references remain
provenance records; they are not recreated or backdated. The public-maintenance
baseline starts from the recovered Phase 0.4-B commit on this branch.

## Limitations

The artifact hash proves the supplied archive, not the correctness of every
upstream API response or every license conclusion. Runtime, source, and
license findings are recorded separately in `docs/UPSTREAM_AUDIT.md` and
`docs/SOURCE_LEDGER.json`. This is engineering provenance, not legal advice.
