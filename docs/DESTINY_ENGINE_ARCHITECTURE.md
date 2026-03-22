# Destiny Engine Architecture

This document explains how the current Destiny engine works from input to final output across counselor, calendar, and report services.

## 1. System overview

The engine is a layered pipeline:

1. Input collection
2. Saju computation
3. Astrology computation
4. Snapshot normalization
5. Destiny Matrix core computation
6. Human semantics translation
7. Service-specific formatting
8. Optional GraphRAG and premium AI polish

The core idea is:

- Saju explains structural flow, energy balance, and long-cycle pressure.
- Astrology explains timing, variable shifts, and activation windows.
- The Destiny Matrix core merges both into one canonical decision layer.
- Services do not invent their own meaning.
- Services mainly change format, depth, and tone.

## 2. Main entry points

### Counselor

- API route: `src/app/api/destiny-map/chat-stream/route.ts`
- Focus analysis: `src/app/api/destiny-map/chat-stream/lib/focusDomain.ts`
- Context assembly: `src/app/api/destiny-map/chat-stream/lib/context-builder.ts`
- Counselor evidence packet: `src/lib/destiny-matrix/counselorEvidence.ts`

### Calendar

- API route: `src/app/api/calendar/route.ts`
- Presentation layer: `src/app/api/calendar/lib/presentationAdapter.ts`
- Output helpers: `src/app/api/calendar/lib/helpers.ts`

### Report

- API route: `src/app/api/destiny-matrix/ai-report/route.ts`
- Report generation: `src/lib/destiny-matrix/ai-report/aiReportService.ts`

### Shared core

- Core envelope: `src/lib/destiny-matrix/core/buildCoreEnvelope.ts`
- Core execution: `src/lib/destiny-matrix/core/runDestinyCore.ts`
- Canonical output: `src/lib/destiny-matrix/core/canonical.ts`
- Core types: `src/lib/destiny-matrix/core/types.ts`
- Shared human translation layer: `src/lib/destiny-matrix/interpretation/humanSemantics.ts`

## 3. Input layer

The engine starts from a `MatrixCalculationInput`.

Main type:

- `src/lib/destiny-matrix/types.ts`

Important input fields:

- `birthDate`
- `birthTime`
- `timezone`
- `latitude`
- `longitude`
- `houseSystem`
- `analysisAt`
- `dayMasterElement`
- `pillarElements`
- `sibsinDistribution`
- `twelveStages`
- `relations`
- `geokguk`
- `yongsin`
- `currentDaeunElement`
- `currentSaeunElement`
- `currentWolunElement`
- `currentIljinElement`
- `planetHouses`
- `planetSigns`
- `aspects`
- `activeTransits`
- `astroTimingIndex`
- `advancedAstroSignals`
- `profileContext`

The input now also carries typed snapshots:

- `sajuSnapshot`
- `astrologySnapshot`
- `crossSnapshot`

These are no longer loose `Record<string, unknown>` bags only. They now have explicit known fields plus catch-all support.

## 4. Saju layer

Saju data is computed first from birth profile.

Main upstream functions:

- `src/lib/Saju/saju.ts`
- `src/lib/Saju/relations.ts`
- `src/lib/Saju/shinsal.ts`
- `src/lib/Saju/astrologyengine.ts`

Typical Saju fields used by the Destiny engine:

- day master
- four pillars
- five elements
- sibsin distribution
- twelve stages
- branch relations
- geokguk
- yongsin
- kisin
- daeun
- saeun
- wolun
- iljin
- shinsal

These are used both directly in `MatrixCalculationInput` and inside `sajuSnapshot`.

## 5. Astrology layer

Astrology data is computed from birth profile and current analysis time.

Main upstream functions:

- `src/lib/astrology/foundation/astrologyService.ts`
- `src/lib/astrology/foundation/aspects.ts`
- `src/lib/astrology/index.ts`

Typical astrology fields used:

- natal chart
- natal aspects
- planet signs
- planet houses
- active transits
- asteroid houses
- extra point signs
- secondary progressions
- solar return
- lunar return
- draconic comparison
- harmonics
- fixed stars
- eclipses
- midpoints

These are stored both in normalized input fields and in `astrologySnapshot`.

## 6. Snapshot layer

The snapshot layer exists so downstream reasoning can keep raw grounding.

Types:

- `SajuSnapshot`
- `AstrologySnapshot`
- `CrossSnapshot`

Defined in:

- `src/lib/destiny-matrix/types.ts`

Validated in:

- `src/lib/destiny-matrix/validation.ts`

Current snapshot design:

- keep important known fields strongly typed
- still allow extra keys for compatibility
- preserve raw context for deterministic grounding and audit

### SajuSnapshot

Known fields include:

- `source`
- `birthDate`
- `birthTime`
- `timezone`
- `dayMaster`
- `pillars`
- `fiveElements`
- `daeWoon`
- `unse`
- `sinsal`
- `advancedAnalysis`
- `facts`
- `derivedAt`

### AstrologySnapshot

Known fields include:

- `natalChart`
- `natalAspects`
- `currentTransits`
- `progressions`
- `returns`
- `advanced`
- `advancedCoverage`

### CrossSnapshot

Known fields include:

- `source`
- `theme`
- `category`
- `currentDateIso`
- `crossAgreement`
- `astroTimingIndex`
- `anchors`
- `coverage`
- `derivedAt`

## 7. Input normalization

Before core reasoning, the system normalizes availability and optional fields.

Main file:

- `src/lib/destiny-matrix/core/runDestinyCore.ts`

Normalization adds:

- `availability.shinsal`
- `availability.activeTransits`
- `availability.advancedAstroSignals`

Availability states:

- `present`
- `empty-computed`
- `missing-upstream`

This matters because the engine should distinguish:

- truly missing data
- present but empty data
- derived or partial support

## 8. Core pipeline

The shared core runs in this order:

1. `compileFeatureTokens`
2. `buildActivationEngine`
3. `buildRuleEngine`
4. `buildStateEngine`
5. `synthesizeMatrixSignals`
6. `buildPhaseStrategyEngine`
7. `buildPatternEngine`
8. `buildScenarioEngine`
9. `buildDecisionEngine`
10. `buildCoreCanonicalOutput`
11. `buildDestinyCoreQuality`

Main orchestration:

- `src/lib/destiny-matrix/core/runDestinyCore.ts`

## 9. What the core actually produces

The canonical output is the system's main semantic contract.

Type:

- `DestinyCoreCanonicalOutput`

Defined in:

- `src/lib/destiny-matrix/core/types.ts`

Key fields:

- `claimIds`
- `evidenceRefs`
- `confidence`
- `crossAgreement`
- `gradeLabel`
- `gradeReason`
- `focusDomain`
- `phase`
- `phaseLabel`
- `attackPercent`
- `defensePercent`
- `thesis`
- `riskControl`
- `primaryAction`
- `primaryCaution`
- `topSignalIds`
- `domainLeads`
- `advisories`
- `domainTimingWindows`
- `manifestations`
- `coherenceAudit`
- `judgmentPolicy`
- `domainVerdicts`
- `topPatterns`
- `topScenarios`
- `topDecision`

## 10. Timing model

The timing layer is much richer than a simple "good / bad time" label.

For each domain, the engine now carries:

- `window`
- `confidence`
- `timingRelevance`
- `whyNow`
- `entryConditions`
- `abortConditions`
- `evidenceIds`
- `provenance`

This is built in:

- `src/lib/destiny-matrix/core/canonical.ts`

The purpose:

- explain why timing is opening
- explain what has to be true to move
- explain what signs should delay or stop the move

## 11. Provenance

Provenance was added so each domain-level decision can be traced.

Shared type:

- `CoreProvenance`

Fields:

- `sourceFields`
- `sourceSignalIds`
- `sourceRuleIds`
- `sourceSetIds`

Now attached to:

- `CoreDomainVerdict`
- `CoreDomainAdvisory`
- `CoreDomainTimingWindow`
- `CoreDomainManifestation`

This means the engine can now say not just:

- what it thinks

but also:

- which input fields supported it
- which signal ids supported it
- which rule/pattern/scenario ids supported it
- which graph or evidence sets were involved

## 12. Data quality metadata

The core quality layer now also carries data-quality reasoning.

Location:

- `src/lib/destiny-matrix/core/runDestinyCore.ts`

Added fields:

- `missingFields`
- `derivedFields`
- `conflictingFields`
- `qualityPenalties`
- `confidenceReason`

This is attached under:

- `core.quality.dataQuality`

Meaning:

- `missingFields`: upstream support missing
- `derivedFields`: support was auto-derived rather than explicitly provided
- `conflictingFields`: signals or focus alignment are not clean
- `qualityPenalties`: machine-readable summary of penalties
- `confidenceReason`: human-readable reason why confidence is limited or acceptable

This is critical because "perfect data" in practice means:

- known source
- known gaps
- known derivations
- known conflicts
- known confidence limits

## 13. Human semantics layer

The core does not send raw engine language directly to every service anymore.

Shared translation layer:

- `src/lib/destiny-matrix/interpretation/humanSemantics.ts`

This layer translates concepts like:

- phase
- attack/defense balance
- confidence
- cross agreement
- timing windows
- why stack

into human language.

This is intentionally shared so that:

- counselor
- calendar
- report

all start from the same meaning layer, then only differ in:

- length
- tone
- format

## 14. Why stack

The engine now explicitly supports `why`.

It is not just:

- what
- when

but also:

- why the Saju layer points that way
- why the Astrology layer points that way
- why the cross layer reinforces or weakens it
- why GraphRAG evidence was selected

Main files:

- `src/lib/destiny-matrix/interpretation/humanSemantics.ts`
- `src/lib/destiny-matrix/counselorEvidence.ts`
- `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts`

## 15. GraphRAG role

GraphRAG is not the core engine. It is a supporting evidence layer.

Role:

- strengthen grounding
- surface anchor sets
- explain clustered evidence
- help with "why this matters"

Main file:

- `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts`

GraphRAG currently contributes:

- evidence summaries
- top anchors
- top claims
- focus reason
- graph reason

It should not replace deterministic reasoning. It should support it.

## 16. Service-specific output

### Counselor

Flow:

1. question analysis
2. build matrix snapshot
3. build counselor evidence packet
4. build prompt sections
5. stream final answer

Counselor-specific strengths:

- question-aware framing
- evidence packet
- why stack
- timing explanation
- streaming UI

### Calendar

Flow:

1. compute yearly date structure
2. compute matrix core
3. adapt core to calendar
4. translate via human semantics
5. emit day/week/month summaries

Calendar-specific strengths:

- short action-oriented summaries
- domain-prioritized timing framing
- category-sensitive top-domain ordering

### Report

Flow:

1. build core envelope
2. adapt core to report
3. generate deterministic report sections
4. optional premium selective AI polish
5. report quality gates

Report-specific strengths:

- longest structured explanation
- strongest post-processing
- premium hybrid path
- quality gates and repair

## 17. Premium report execution model

The report engine is not "AI first".

Actual architecture:

- deterministic core first
- deterministic section draft second
- selective AI polish only for premium
- validator + repair after rewrite

This keeps:

- structure stable
- evidence grounded
- premium text quality higher

## 18. Current strengths

### Strong

- shared deterministic core
- shared human semantics layer
- typed snapshots
- provenance on domain outputs
- data quality metadata
- richer timing reasoning
- stronger why reasoning
- shared service meaning model

### Still not final

- provenance can still go deeper into more exact rule ids
- some services do not expose all provenance yet
- data quality can still be surfaced more explicitly in report/calendar payloads
- user-log eval loops should be expanded for counselor and destiny services

## 19. What to tell GPT Pro

If you want GPT Pro to critique or improve the system, the most useful framing is:

1. This is a deterministic Saju + Astrology + cross-fusion engine.
2. The deterministic core produces canonical domain judgments.
3. Human semantics is a shared interpretation layer above the core.
4. Counselor, Calendar, and Report are service formatters, not separate meaning engines.
5. GraphRAG is supporting evidence, not the source of truth.
6. The system now tracks typed snapshots, provenance, and data quality.
7. The next frontier is deeper provenance, stronger conflict modeling, and better data-quality surfacing.

## 20. Current implementation status

As of this document:

- typed snapshot contract: implemented
- core provenance: implemented
- core data quality metadata: implemented
- shared human semantics: implemented
- domain why stack: implemented
- richer timing explanation: implemented
- premium report selective AI polish: implemented

## 21. Recommended next upgrades

1. Expand provenance to exact scenario/rule families and graph-set lineage everywhere.
2. Expose `dataQuality` in calendar/report payloads, not only counselor snapshot/debug paths.
3. Add service-level regression tests for provenance and data-quality fields.
4. Export real user question eval sets for counselor and destiny services.
5. Add conflict narratives:
   - Saju agrees
   - Astrology disagrees
   - Cross layer downgrades execution

That is the current architecture from start to finish.
