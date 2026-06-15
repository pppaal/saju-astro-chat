# RAG And GraphRAG

> **Removed.** This feature was removed in the 2026-06 restructure
> (`src/lib/destiny-matrix` -> `src/lib/destiny` / `calendar-engine`).
> This document is retained only as a historical pointer.

Last audited: 2026-06-15 (Asia/Hong_Kong)

## What this used to be

The destiny stack once carried a GraphRAG "evidence" layer
(`src/lib/destiny-matrix/ai-report/graphRagEvidence.ts` and
`counselorEvidence.ts`). It did not make judgments itself; it aligned
cross-source evidence (saju / astrology / matrix) behind a decision the core
engine had already made, and fed evidence summaries into the report, counselor,
and calendar surfaces. None of this code exists anymore — there is no
`graphRagEvidence`, `buildGraphRAGEvidence`, or any `graphrag` symbol anywhere
under `src/`.

## Where to look now

For how the current system is structured, see:

- `README.md`
- `OVERVIEW.md`
- `docs/DESTINY_ENGINE_ARCHITECTURE.md`
