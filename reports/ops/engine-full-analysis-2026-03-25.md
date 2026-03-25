# Destiny Engine Full Analysis

Updated: 2026-03-25
Repo: `c:\Users\pjyrh\Desktop\saju-astro-chat-backup-latest`
Audience: external technical review / GPT Pro prompt input

## Executive Summary

The current system is not a toy text generator. It is a real cross-domain interpretation engine with these layers already in production:

- raw input normalization
- feature token compilation
- activation engine
- rule engine
- state engine
- signal synthesis
- strategy engine
- pattern engine
- scenario engine
- decision engine
- canonical output generation
- quality evaluation
- latent state generation
- service adapters
- counselor / calendar / report rendering
- timing calibration logging and runtime application

The engine is already strong on calculation and timing arbitration. The main weakness is not the core math but the last-mile output layer. The system currently behaves more like a strong cross-verdict engine than a fully expressive "destiny world model".

Current high-level assessment:

- calculation layer: about 9.0/10
- timing layer: about 9.0/10
- interpretation compression layer: about 8.4/10
- output layer:
  - calendar: about 8.2/10
  - counselor: about 8.0~8.2/10
  - report comprehensive: about 8.1~8.3/10
  - report themed: still the weakest surface

## What The Engine Already Does Well

### 1. Real cross-domain timing

The engine already combines:

- Saju timing:
  - daeun
  - seun
  - wolun
  - iljin
- Astrology timing:
  - active transits
  - retrograde
  - major transits
  - progressions
  - solar return
  - lunar return
- Cross-timing semantics:
  - readinessScore
  - triggerScore
  - convergenceScore
  - timingConflictNarrative
  - timingGranularity
  - precisionReason

Key files:

- `src/lib/destiny-matrix/core/strategyEngine.ts`
- `src/lib/destiny-matrix/core/canonical.ts`
- `src/lib/destiny-matrix/core/scenarioEngine.ts`
- `src/lib/destiny-matrix/monthlyTimeline.ts`
- `src/lib/destiny-matrix/monthlyTimelinePrecise.ts`

### 2. End-to-end core pipeline exists and is coherent

Core execution flow:

1. normalize input
2. compile feature tokens
3. build activation
4. apply rules
5. derive states
6. synthesize signals
7. build strategy
8. build patterns
9. build scenarios
10. build decision
11. build canonical output
12. evaluate quality
13. build latent state

Confirmed in:

- `src/lib/destiny-matrix/core/runDestinyCore.ts`

The actual implementation does this in order. This is not just documented architecture.

### 3. The engine has a latent interpretation layer

The current engine preserves a high-dimensional internal interpretation state instead of collapsing immediately to one label.

Current latent version:

- `v3-96`

Grouped surfaces:

- structural
- timing
- astrology
- domain
- conflict
- narrative

Key files:

- `src/lib/destiny-matrix/core/latentState.ts`
- `src/lib/destiny-matrix/core/adapters.ts`

### 4. There is already arbitration, not just one winning label

The engine preserves:

- focus winner
- focus runner-up
- action winner
- action runner-up
- suppressed domains
- conflict reasons

Key files:

- `src/lib/destiny-matrix/core/types.ts`
- `src/lib/destiny-matrix/core/canonical.ts`
- `src/lib/destiny-matrix/core/adapters.ts`

### 5. Service integration is real

This engine is already wired into 3 surfaces:

- Calendar
- Counselor
- AI Report

Key routes / adapters:

- `src/app/api/calendar/route.ts`
- `src/app/api/calendar/lib/presentationAdapter.ts`
- `src/app/api/destiny-map/chat-stream/route.ts`
- `src/lib/destiny-matrix/counselorEvidence.ts`
- `src/app/api/destiny-matrix/ai-report/route.ts`
- `src/lib/destiny-matrix/ai-report/aiReportService.ts`
- `src/lib/destiny-matrix/ai-report/reportRendering.ts`

## Core Input Model

The current input type is still fundamentally single-subject, but already rich.

Key raw input fields include:

- dayMasterElement
- pillarElements
- sibsinDistribution
- twelveStages
- relations
- geokguk
- yongsin
- currentDaeunElement
- currentSaeunElement
- currentWolunElement
- currentIljinElement / currentIljinDate
- activeTransits
- astroTimingIndex
- advancedAstroSignals
- sajuSnapshot
- astrologySnapshot
- crossSnapshot
- profileContext

Key file:

- `src/lib/destiny-matrix/types.ts`

Important limitation:

- `profileContext` is still centered on one subject
- there is no first-class `subjects[]`, `relationContexts[]`, or time-sliced subject graph in the core input

That matters later for multi-person or relationship world modeling, but not for immediate single-subject completion.

## Timing Model: What Is Real Today

### Current timing strengths

The timing engine is materially better than a generic horoscope scheduler.

It already does:

- separate structural readiness from trigger pressure
- compute convergence between them
- assign timing windows
- cap granularity
- generate conflict narrative
- generate monthly precise probes
- run calibration-friendly timing metadata

The current timing profile logic is explicit in `computeTimingProfile()`:

- readinessScore from daeun / seun / wolun / iljin activation
- triggerScore from transit count + short-term signals
- convergenceScore from geometric overlap + bonus
- timeActivation as a bounded composite

Key file:

- `src/lib/destiny-matrix/core/strategyEngine.ts`

### Monthly precise timing

The engine now supports an async precise monthly layer.

It probes each month at multiple intra-month points and recalculates:

- runtime timing
- transit chart
- major transits
- secondary progressions
- solar return
- lunar return
- astro timing index

The strongest probe is selected for global timing, and separate strongest probes can be selected per domain.

Key file:

- `src/lib/destiny-matrix/monthlyTimelinePrecise.ts`

This means the timing layer is already much more than a flat "good month / bad month" overlay.

### Timing limits still present

The engine is still not a full daily sweep destiny simulator.

Current limits:

- monthly precise uses sampled probe days, not full rolling daily recomputation
- exact date claims must still be capped by granularity
- real-world timing quality still depends on calibration data volume

## Interpretation Model: What Is Strong vs What Is Still Thin

### Strong

The engine is strong at:

- identifying dominant domain pressure
- distinguishing identity axis vs action axis
- identifying risk-control pressure
- generating scenario candidates
- generating domain verdicts
- generating timing conflict narratives
- merging Saju structure and astrology triggers into one operational judgment

### Still thin

The engine is thinner at:

- showing multiple simultaneous pressures in one person without collapsing too early
- expressing why one interpretation beat another in rich user-facing language
- presenting alternative branches instead of one compressed answer
- making themed reports as strong as comprehensive reports

This is why the core feels smarter than the final answer in some flows.

## Current Interpretation Compression Problem

This is the main issue.

The engine already computes a lot, but still compresses too early into:

- focusDomain
- actionFocusDomain
- topDecision
- one dominant report/counselor summary

That means a person who is simultaneously:

- career-open
- relationship-constrained
- health-drained
- financially defensive

can still get flattened too quickly into one lead judgment.

The problem is not lack of computation. The problem is premature collapse.

## Current Service-Level Reality

### Calendar

Good:

- uses projections
- uses timing and conflict
- uses action focus split
- survives complexity because output is short

Weakness:

- still more summary-oriented than truly multi-angle
- projection is present but not fully surfaced as structured UI

### Counselor

Good:

- has projection-first packet
- receives readiness / trigger / convergence
- receives arbitration
- receives risk and action projections
- now uses a slimmer packet than before

Weakness:

- still the most sensitive to output-layer prompt design
- if packet is too rich, the model spends effort translating internal structure instead of answering like a real advisor
- still benefits from stronger action-axis-first answering

### Report

Good:

- comprehensive report is materially better than before
- projection blocks exist
- structure / timing / conflict / action / risk / evidence are all available

Weakness:

- comprehensive is better than themed
- themed remains the weakest surface
- some report body still relies on deterministic/fallback copy patterns that can flatten nuance

## Calibration Status

The codebase now includes the backbone for prediction/outcome calibration.

Existing pieces:

- prediction snapshot generation
- predictionId propagation
- outcome feedback API
- timing calibration table builder
- runtime calibration application hooks

Key files:

- `src/lib/destiny-matrix/core/logging.ts`
- `src/lib/destiny-matrix/predictionSnapshot.ts`
- `src/lib/destiny-matrix/calibration.ts`
- `src/lib/destiny-matrix/calibrationRuntime.ts`
- `src/app/api/destiny-feedback/route.ts`
- `scripts/ops/build-timing-calibration-table.ts`

Important limitation:

- quality gains from calibration depend on actual accumulated production feedback
- infrastructure exists, but the system is not yet fully matured by large empirical history

## Current Bottlenecks

### Bottleneck 1: Single-verdict bias

The engine already knows more than it says.

It still tends to compress into one winner too early instead of consistently showing:

- lead axis
- action axis
- risk axis
- suppressed axis
- alternate branch

### Bottleneck 2: Output architecture, not core math

The engine has many strong internal layers, but the final answer can still feel thinner than the core because:

- internal engine data
- projection data
- debug/evidence payload
- user-facing render

are not separated hard enough in every path.

### Bottleneck 3: Themed report quality variability

Current themed reports still show more variability in:

- cross-section repetition
- generic advice density
- personalization density

than comprehensive reports.

### Bottleneck 4: Focus domain vs action domain mismatch in question flows

In some QA cases, the system is actually operationally correct but looks wrong because:

- the user asks about wealth or health
- the core identity axis remains move or relationship
- the output is corrected by actionFocusDomain
- but QA still warns because expected-domain checks compare against focusDomain

This means the engine is partially right, but the evaluation standard and question routing are still slightly misaligned.

## What Should Be Done Next

This is the most important section.

### Priority 1: Complete the single-subject engine before multi-subject expansion

Do not jump to relationship graph / multi-person world modeling yet.

First make the single-subject engine complete as a multi-angle interpreter.

For one person, the engine should always expose at least:

- structure axis
- action axis
- risk axis
- timing state
- competing pressure map
- branch set

### Priority 2: Add branch output, not just one answer

The engine already has scenarios, reversibility, entry conditions, abort conditions.

The next step is to expose 2–3 plausible branches instead of only one compressed verdict.

Example shape:

- Branch A: action now, if conditions X and Y hold
- Branch B: review first, then move in 1–3 months
- Branch C: delay, because structure supports but trigger is still weak

This is the most important move if the goal is to feel truly "multi-angle" rather than merely "smart".

### Priority 3: Replace scalar crossAgreement with a matrix

The current scalar crossAgreement is useful, but too thin for the next stage.

Need:

- agreement[domain][timescale]
- contradiction[domain][timescale]
- leadLag[domain]

This would let the engine say:

- structure is ready but trigger is late
- trigger is hot but sustainability is weak
- long-cycle support exists but short-term friction delays entry

### Priority 4: Make question-type services privilege actionFocusDomain

For question-answer surfaces:

- counselor
- question-shaped calendar use cases

`actionFocusDomain` should generally outrank `focusDomain` in user-facing lead logic.

The engine already computes both. The product just needs to treat them differently by service intent.

### Priority 5: Treat themed as a separate authoring engine

Themed reports should not be lightly repainted comprehensive reports.

Each theme should have its own narrative logic and cadence.

Current recommendation:

- keep common infrastructure
- keep shared projections
- but maintain separate thematic renderers per theme

## Suggested Conceptual Model For The Single-Subject Engine

This is the strongest framing for the next version.

For one subject:

`Destiny(subject, domain, t) = Structure + Cycle + Trigger + Risk + Action + Calibration`

Where:

- Structure = natal / 원국 / 격국 / 용신 / built-in disposition
- Cycle = daeun / seun / progressions / long-wave support
- Trigger = wolun / iljin / transits / returns / immediate ignition
- Risk = contradiction, suppression, reversal, overload, leakage
- Action = what should actually be done now
- Calibration = how trustworthy this read is for this bucket

This is enough to make the 1-person engine feel truly multi-angle without widening into multi-subject relations yet.

## Recommendation To External Reviewer

If you are reviewing this engine from the outside, the correct critique is not:

- “the system lacks enough astrology or Saju signals”

The correct critique is:

- “the system is already rich in core calculation and timing arbitration, but it still compresses too early into a single user-facing verdict”

The most valuable next improvements are therefore:

1. branch modeling
2. domain-timescale agreement matrix
3. stronger action-axis-first output in question flows
4. themed report isolation and rewrite
5. clearer separation between engine packet, projection packet, and render packet

## Current Verified State

Recent local verification completed:

- `npx tsc -p tsconfig.json --noEmit`
- core/report/calendar/counselor targeted tests pass
- current service QA:
  - `PASS=3 WARN=2 FAIL=0`

Interpretation of current QA:

- no hard failure in the main three-service pipeline
- remaining warnings are about domain alignment semantics, not broken engine execution

## Final Verdict

This engine is already a serious cross-interpretation system.

It is not blocked by lack of signals.
It is not blocked by lack of timing logic.
It is not blocked by lack of arbitration.

It is blocked by the fact that a very strong internal engine is still being surfaced too often as a single compressed answer.

The next leap is not “more features”.
The next leap is: make the single-subject engine present simultaneous pressures, branch futures, and action-vs-identity separation in a stable product form.
