# Calculation Spec: Modern Destiny Core And Service Pipeline

Last audited: 2026-03-17 (Asia/Hong_Kong)

This spec is code-derived for the active destiny stack. It replaces the older report-only view with the current core-first pipeline used by calendar, counselor, and report surfaces.

## Scope And Primary Entrypoints

### Core judgment

- `src/lib/destiny-matrix/core/runDestinyCore.ts`
- `src/lib/destiny-matrix/core/canonical.ts`
- `src/lib/destiny-matrix/core/adapters.ts`

### Evidence and audit sidecar

- `src/lib/destiny-matrix/core/nextGenPipeline.ts`
- `src/lib/destiny-matrix/core/evaluationSuite.ts`
- `src/lib/destiny-matrix/core/inputVerdictAudit.ts`

### Presentation surfaces

- Calendar:
  - `src/app/api/calendar/route.ts`
  - `src/app/api/calendar/action-plan/route.ts`
- Counselor:
  - `src/app/api/destiny-map/chat-stream/route.ts`
  - `src/lib/destiny-matrix/counselorEvidence.ts`
- Report:
  - `src/lib/destiny-matrix/ai-report/aiReportService.ts`

### GraphRAG evidence

- `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts`

## Runtime Shape

Current deterministic runtime:

- `Raw Input -> Feature -> Rule -> Pattern -> Scenario -> Verdict -> Evaluation`

### Feature

- raw saju, astrology, advanced astrology, snapshots, cross inputs
- `tokenCompiler`
- `ontology`
- 10-layer matrix as evidence

### Rule

- `activationEngine`
- `ruleEngine`
- `stateEngine`

### Pattern

- `signalSynthesizer`
- `patternEngine`

### Scenario

- `scenarioEngine`
- `manifestationEngine`

### Verdict

- `decisionEngine`
- `canonical`
- adapters for calendar, counselor, report

### Evaluation

- `evaluationSuite`
- `inputVerdictAudit`
- `nextGenPipeline`

## Inputs Actually Used

The modern stack consumes and audits these major input families:

- saju structure
  - `dayMasterElement`
  - `pillarElements`
  - `sibsinDistribution`
  - `twelveStages`
  - `relations`
  - `geokguk`
  - `yongsin`
- cycles and timing
  - `currentDaeunElement`
  - `currentSaeunElement`
  - `currentWolunElement`
  - `currentIljinElement`
  - `currentIljinDate`
  - `currentDateIso`
  - `startYearMonth`
- astrology
  - `planetSigns`
  - `planetHouses`
  - `aspects`
  - `activeTransits`
  - `dominantWesternElement`
- advanced astrology and extras
  - `advancedAstroSignals`
  - `asteroidHouses`
  - `extraPointSigns`
  - `astroTimingIndex`
- snapshots
  - `sajuSnapshot`
  - `astrologySnapshot`
  - `crossSnapshot`
  - `profileContext`

These are not just accepted by schema. They are tokenized and audited through `inputVerdictAudit`.

## Decision And Action Model

The current decision layer is more granular than the older commit/prepare model.

Current action families include:

- `commit_now`
- `staged_commit`
- `prepare_only`
- `review_first`
- `negotiate_first`
- `boundary_first`
- `pilot_first`
- `route_recheck_first`
- `lease_review_first`
- `basecamp_reset_first`

These actions are converted into locale-aware user labels by:

- `src/lib/destiny-matrix/core/actionCopy.ts`

## Scenario Model

The scenario layer is now event-oriented and domain-specific.

Representative branches include:

- relationship
  - `distance_tuning_window`
  - `boundary_reset_window`
  - `commitment_preparation_window`
  - `clarify_expectations_window`
- career
  - `promotion_review_window`
  - `contract_negotiation_window`
  - `manager_track_window`
  - `specialist_track_window`
- wealth
  - `capital_allocation_window`
  - `debt_restructure_window`
  - `asset_exit_window`
- move
  - `route_recheck_window`
  - `commute_restructure_window`
  - `lease_decision_window`
  - `basecamp_reset_window`

Timing pressure and branch tie-breaks now materially affect these rankings.

## GraphRAG Role In The Current Pipeline

GraphRAG is evidence support, not verdict generation.

Current role split:

- Core decides `focusDomain`, `phase`, `topDecision`, `riskControl`
- GraphRAG aligns evidence and cross-source support around that decision
- Services present the same decision in different formats

`move` is now a first-class GraphRAG domain.

## Evaluation And Audit

The sidecar pipeline exposes:

- replay alignment
- contradiction audit
- influence audit
- timing sharpness
- top scenario gap
- top decision gap
- scenario cluster compression
- input coverage vs verdict pressure

Main files:

- `src/lib/destiny-matrix/core/evaluationSuite.ts`
- `src/lib/destiny-matrix/core/inputVerdictAudit.ts`
- `src/lib/destiny-matrix/core/nextGenPipeline.ts`

## Current QA Baseline

As of 2026-03-17:

- `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both`
  - `PASS=10 WARN=0 FAIL=0`
- `npx tsx scripts/ops/qa-counselor-questions.ts --lang=both`
  - `PASS=42 WARN=0 FAIL=0`
- core quality
  - `core_quality_warning_count=0`
  - `core_quality_pass=1`

## Practical Reading Rule

When reading current code, do not treat the 10-layer matrix or GraphRAG as the whole product logic.

The current order of trust is:

1. `runDestinyCore(...)`
2. `canonical`
3. adapters
4. GraphRAG evidence
5. service presentation code
