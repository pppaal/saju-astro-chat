# Destiny Matrix

Last audited: 2026-03-17 (Asia/Hong_Kong)

## What It Is

The destiny engine in `src/lib/destiny-matrix` is no longer just a 10-layer matrix scorer. The current runtime is a deterministic judgment engine with explicit evidence, rule, scenario, verdict, and evaluation zones.

Current runtime shape:

- `Raw Input -> Feature -> Rule -> Pattern -> Scenario -> Verdict -> Evaluation`

Current role split:

- Core: judgment
- GraphRAG: evidence alignment and grounding
- Calendar / Counselor / Report: presentation

## Core Pipeline

Primary entrypoint:

- `src/lib/destiny-matrix/core/runDestinyCore.ts`

Major zones:

### Feature

- `src/lib/destiny-matrix/core/tokenCompiler.ts`
- `src/lib/destiny-matrix/core/ontology.ts`
- 10-layer matrix inputs and summary from `src/lib/destiny-matrix/types.ts`

Feature compiles raw saju/astrology/cross inputs into shared semantic tokens and preserves the 10-layer matrix as evidence.

### Rule

- `src/lib/destiny-matrix/core/activationEngine.ts`
- `src/lib/destiny-matrix/core/ruleEngine.ts`
- `src/lib/destiny-matrix/core/stateEngine.ts`

Rule resolves natal structure, daeun/saeun/wolun/iljin, transits, advanced astrology, and domain state into activation pressure, gates, delays, and domain state.

### Pattern

- `src/lib/destiny-matrix/core/signalSynthesizer.ts`
- `src/lib/destiny-matrix/core/patternEngine.ts`

Pattern no longer reads raw matrix alone. It now reflects activation, resolved rule mode, state, and cross-agreement.

### Scenario

- `src/lib/destiny-matrix/core/scenarioEngine.ts`
- `src/lib/destiny-matrix/core/manifestationEngine.ts`

Scenario is event-oriented. It now handles detailed branches across:

- relationship
- career
- wealth
- health
- move
- timing

It produces `whyNow`, `whyNotYet`, entry conditions, abort conditions, manifestation hints, and branch-specific timing pressure.

### Verdict

- `src/lib/destiny-matrix/core/decisionEngine.ts`
- `src/lib/destiny-matrix/core/canonical.ts`
- `src/lib/destiny-matrix/core/adapters.ts`

Decision now supports more than simple commit/prepare. Current action space includes review-first, boundary-first, pilot-first, and move-specific actions such as route recheck and lease review.

Canonical output is the contract that services should trust.

### Evaluation

- `src/lib/destiny-matrix/core/evaluationSuite.ts`
- `src/lib/destiny-matrix/core/inputVerdictAudit.ts`
- `src/lib/destiny-matrix/core/nextGenPipeline.ts`

Evaluation provides:

- architecture replay and contradiction checks
- influence audit
- input coverage vs verdict-pressure audit
- timing sharpness and scenario compression metrics

## Current Service Wiring

### Calendar

- Core adapter: `adaptCoreToCalendar(...)`
- Main route: `src/app/api/calendar/route.ts`
- Action plan route: `src/app/api/calendar/action-plan/route.ts`

Calendar now prefers canonical labels and judgment policy fields over legacy score-first summaries.

### Counselor

- Core adapter: `adaptCoreToCounselor(...)`
- Evidence packet: `src/lib/destiny-matrix/counselorEvidence.ts`
- Route: `src/app/api/destiny-map/chat-stream/route.ts`

Counselor prompt assembly is now core-first. Canonical brief, advisory, timing window, manifestation, and GraphRAG evidence are aligned around the same focus domain.

### Report

- Core adapter: `adaptCoreToReport(...)`
- Main generator: `src/lib/destiny-matrix/ai-report/aiReportService.ts`

Report now uses `reportCore` first for fact packs, fallback sections, and action-plan wording. GraphRAG remains evidence support, not the decision source.

## Current QA Baseline

The current green baseline for the destiny stack is:

- `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both`
  - `PASS=10 WARN=0 FAIL=0`
- `npx tsx scripts/ops/qa-counselor-questions.ts --lang=both`
  - `PASS=42 WARN=0 FAIL=0`
- Core quality:
  - `core_quality_warning_count=0`
  - `core_quality_pass=1`

## Operational Notes

- The old 10-layer matrix still matters, but it is now the evidence layer, not the whole engine.
- The current debugging path is:
  - `runDestinyCore(...)` for judgment
  - `buildNextGenCorePipeline(...)` for audit and explanation
  - `scripts/ops/trace-destinypal-pipeline.ts` for end-to-end tracing
- Service regressions should be checked with the dedicated destiny QA scripts before release.
