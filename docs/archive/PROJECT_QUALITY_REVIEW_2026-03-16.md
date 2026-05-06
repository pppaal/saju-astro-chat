# Project Quality Review

Last reviewed: 2026-04-01 (Asia/Hong_Kong)

## 2026-04-01 Addendum

Verification snapshot in the current workspace:

- `python scripts/self_check.py`: `PASS`
- `npm run audit:api`: regenerated `docs/API_AUDIT_REPORT.md` with 140 routes, 138 guarded routes, and 131 rate-limited routes
- `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both`: blocked by a parse error in `src/lib/destiny-matrix/ai-report/aiReportService.ts`
- `npx tsx scripts/ops/qa-counselor-questions.ts --lang=both`: overall `PASS=21 WARN=13 FAIL=8`, with all hard failures currently in `ko`

Updated assessment:

- Architecture direction still holds: core and GraphRAG responsibilities remain clearly separated.
- Retrieval health is good, but the workspace is no longer at the 2026-03-17 zero-fail destiny baseline.
- Release readiness for counselor/report-facing destiny work should be treated as degraded until the parse blocker and Korean counselor regressions are resolved.

## 2026-03-17 Addendum

The destiny stack has materially improved since the original 2026-03-16 review.

Current destiny-specific baseline:

- 3-service regression: `PASS=10 WARN=0 FAIL=0`
- counselor regression: `PASS=42 WARN=0 FAIL=0`
- core quality: `core_quality_warning_count=0`, `core_quality_pass=1`

Current state of the destiny surfaces:

- Core judgment is now clearly separated from GraphRAG evidence.
- Calendar, counselor, and report are substantially more synchronized around canonical output.
- English and Korean action/guardrail labels are aligned through shared adapter/action-copy paths.
- `move` is now a first-class focus domain in both the core and GraphRAG evidence path.

Revised destiny assessment:

- Core engine depth: high
- Cross-surface sync quality: high
- Counselor answer directness: high
- GraphRAG role clarity: high
- Maintainability: still medium because the report/counselor stack remains large

The original review below remains useful as broader product context.

---

Last reviewed: 2026-03-16 (Asia/Hong_Kong)

## Executive Summary

This project is no longer at the "prototype with isolated experiments" stage. It now has real product depth in four surfaces:

- Tarot
- Counselor
- Calendar
- AI Report

The strongest technical moat is the destiny-matrix/report stack. The strongest product loop is the calendar. The biggest upside is tarot, because the question-first direction is correct and differentiated. The biggest current risk is architectural sprawl: some of the most important surfaces are powered by very large files that mix orchestration, policy, copy shaping, and rendering concerns.

Overall assessment:

- Product ambition: high
- Core engine depth: high
- Output quality consistency: medium-high
- UX consistency across products: medium
- Maintainability: medium

Current overall grade: `7.8 / 10`

## Area Scores

### Tarot

Score: `6.9 / 10`

What is good:

- The product direction is now much better: question first, spread second.
- `src/lib/Tarot/questionEngineV2.ts` separates question understanding from card reading entry.
- `src/app/tarot/page.tsx` now exposes direct answer + question profile before the user draws cards.
- Detailed card view now separates base card meaning from AI interpretation, which is the correct UX distinction.

What is weak:

- The new engine still couples "question understanding" with "primary spread choice", so spread selection can still contaminate the main path.
- The reading result screen still re-infers question intent locally instead of fully trusting the analyzed intent.
- Tarot is in an architectural transition: the direction is right, but the old spread-centric DNA is still present.

Verdict:

- High upside.
- Not yet fully stable in product logic.
- This is the area most worth continued investment.

### Counselor

Score: `7.5 / 10`

What is good:

- Response normalization is materially better than before.
- `src/lib/counselor/responseContract.ts` imposes a readable structure and reduces duplicate/noisy output.
- `src/lib/streaming/StreamProcessor.ts` is robust enough for multiline SSE, partial chunks, and follow-up markers.
- The counselor now has a clearer output contract than many other surfaces.

What is weak:

- The normalization layer is still fairly rigid, so rich model output can be flattened into a narrow template.
- UX polish still depends heavily on frontend styling and typography discipline rather than content contract alone.
- This surface is cleaner than before, but still more "controlled" than "elegant."

Verdict:

- Quality is solid and improving.
- Engine quality is ahead of presentation quality.

### Calendar

Score: `8.1 / 10`

What is good:

- This is the strongest day-to-day product surface.
- The calendar combines deterministic scoring, presentation adaptation, reliability softening, and evidence shaping in a way that feels productized.
- `SelectedDatePanel` does a lot of heavy lifting to repair noisy text, dedupe content, soften low-confidence claims, and translate technical evidence into user-facing copy.
- The product has real operational usefulness, not just narrative appeal.

What is weak:

- Too much logic is concentrated in the detail panel.
- UI/presentation concerns, text sanitation, evidence synthesis, and export logic are mixed in one place.
- This makes regressions more likely when you keep iterating on copy quality.

Verdict:

- Strongest consumer utility.
- Needs decomposition more than conceptual redesign.

### AI Report

Score: `8.6 / 10`

What is good:

- This is the deepest and most defensible engine in the repo.
- The report stack has deterministic core signals, GraphRAG evidence assembly, rewrite guards, quality gates, and repair passes.
- Tests around report generation are real and useful, not just superficial route smoke checks.
- The system has credible grounding and quality-control infrastructure.

What is weak:

- The implementation is extremely large and centralized.
- `aiReportService.ts` is now a platform file, not a normal service file.
- Complexity is a moat, but it is also your operational risk.

Verdict:

- Best technical asset in the project.
- Strong moat, but must be modularized before the next phase of scale.

## Cross-Product Assessment

### What feels strongest

- Destiny-matrix core and AI report grounding
- Calendar as a practical daily product
- Tarot question-first pivot as product strategy

### What still feels uneven

- Visual and copy consistency across surfaces
- Shared UX grammar for confidence, fallback, and evidence
- Distribution of logic between engine/orchestration/rendering layers

### Product-level judgment

This is not a shallow AI wrapper project. The repo already contains strong proprietary structure, especially in destiny-matrix and report generation. The main issue is not lack of engine sophistication. The main issue is that the sophistication is unevenly translated into product UX.

In plain terms:

- The engine is often better than the screen.
- Tarot has the biggest market upside if question understanding is made truly first-class.
- Calendar is the most immediately useful.
- Reports are the strongest technical moat.
- Counselor is good enough to ship, but still wants sharper visual and narrative polish.

## Recommended Priorities

### P0

- Finish tarot migration from spread-centric orchestration to question-centric orchestration.
- Remove duplicate intent inference in the tarot results layer.
- Standardize confidence/fallback/evidence language across tarot, counselor, calendar, and report.

### P1

- Break `SelectedDatePanel.tsx` into view-model, evidence formatting, and presentation components.
- Break `aiReportService.ts` into orchestration, prompting, repair, and audit modules with narrower ownership.
- Create one shared "user-facing copy policy" for certainty, caution, and low-confidence phrasing.

### P2

- Unify typography and reading rhythm across all long-form output surfaces.
- Add evaluation fixtures for weird tarot questions, not only normal user intents.
- Add cross-product snapshot tests for rendered content sections.

## Verification Snapshot

Verified during this review:

- `npm run typecheck`
- `npm run test -- tests/lib/counselor/responseContract.test.ts tests/lib/streaming/StreamProcessor.test.ts tests/lib/destiny-matrix/ai-report/aiReportService.test.ts`

Both passed on 2026-03-16 in the current workspace state.
