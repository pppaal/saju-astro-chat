# RAG And GraphRAG

Last audited: 2026-03-17 (Asia/Hong_Kong)

## Current Position In The System

GraphRAG is not the judgment engine.

Current role split:

- Core: judgment and timing decisions
- GraphRAG: evidence alignment, cross-source grounding, and support traces
- Calendar / Counselor / Report: presentation

This separation is intentional. Core decides `focusDomain`, `phase`, `topDecision`, `riskControl`, and timing posture. GraphRAG explains and supports that decision with cross evidence.

## Main Code Paths

### Destiny-side GraphRAG

- `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts`
  - `buildGraphRAGEvidence(...)`
  - `formatGraphRAGEvidenceForPrompt(...)`
  - `summarizeGraphRAGEvidence(...)`

### Python backend GraphRAG and vector infrastructure

- `backend_ai/app/rag/vector_store.py`
- `backend_ai/app/rag/cross_store.py`
- `backend_ai/services/streaming_service.py`
- `scripts/self_check.py`

The Python side remains the retrieval/runtime substrate. The TypeScript destiny layer uses its own GraphRAG evidence bundle to align matrix, aspect, transit, and cross evidence around the core verdict.

## Supported GraphRAG Domains

Current GraphRAG domain set in the destiny stack:

- `personality`
- `career`
- `relationship`
- `wealth`
- `health`
- `spirituality`
- `timing`
- `move`

`move` is now a first-class GraphRAG domain. It is no longer forced through a timing fallback.

## Evidence Model

### Bundle

`buildGraphRAGEvidence(...)` returns a bundle with:

- mode
- optional theme/period
- anchors[]

### Anchor

Each anchor contains:

- `section`
- `sajuEvidence`
- `astrologyEvidence`
- `crossConclusion`
- `crossEvidenceSets[]`

### Cross evidence set

Each set contains:

- matrix evidence
- astrology evidence
- saju evidence
- overlap domains
- overlap score
- orb fit score
- combined conclusion

## How It Is Used Now

### Report

- `src/lib/destiny-matrix/ai-report/aiReportService.ts`

Report uses GraphRAG as evidence support. `reportCore` decides the focus domain and operating logic. GraphRAG summary is then narrowed around that core focus instead of re-judging the whole chart.

### Counselor

- `src/lib/destiny-matrix/counselorEvidence.ts`
- `src/app/api/destiny-map/chat-stream/route.ts`

Counselor now aligns GraphRAG with the same preferred domain used by the canonical counselor block. Anchor selection and packet evidence are routed through the current core focus, not just the raw question theme.

### Calendar

- `src/app/api/calendar/action-plan/route.ts`
- `src/components/calendar/CalendarActionPlanView.tsx`

Calendar uses GraphRAG as evidence support for action-plan confidence and top cross-evidence summaries. It does not use GraphRAG to override canonical decisions.

## Ranking And Alignment Notes

GraphRAG ranking in the destiny stack currently depends on:

- section-domain map
- domain orb multipliers
- aspect/domain-specific orb logic
- overlap domains
- core-driven focus narrowing in service layers

Important constraint:

- GraphRAG should surface the most relevant evidence for the current decision.
- It should not become a second competing verdict engine.

## Diagnostics And Trace

### Runtime trace

Use:

```bash
npx tsx scripts/ops/trace-destinypal-pipeline.ts
```

This produces end-to-end outputs under `reports/ops/` including:

- core trace
- next-gen evaluation
- input verdict audit
- GraphRAG evidence bundle summary
- service consistency checks

### Python-side retrieval checks

Use:

```bash
python scripts/self_check.py
python scripts/self_check.py --runtime-evidence
```

These remain the canonical retrieval and evidence health checks for the Python GraphRAG substrate.

## Current Quality Baseline

As of 2026-03-17:

- 3-service destiny regression: `PASS=10 WARN=0 FAIL=0`
- counselor regression: `PASS=42 WARN=0 FAIL=0`
- core quality warnings: `0`

This does not mean GraphRAG replaces the core. It means GraphRAG is currently synchronized well enough with the core and service layers to avoid visible drift in the tested paths.

## Current Gaps

The main remaining GraphRAG improvement area is precision, not role definition.

Most useful next steps are:

- tighten anchor ranking around `leadScenarioId` and `leadPatternId`
- improve section-specific evidence wording
- keep locale quality aligned between Korean and English outputs
