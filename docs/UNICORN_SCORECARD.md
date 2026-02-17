# Unicorn Readiness Scorecard

Date: 2026-02-17

## 5.1 Moat / Differentiation (code-based)

### What competitors can copy in ~2 weeks

- Generic Next.js route scaffolding and standard auth/credit wrappers
- Basic tarot prompt orchestration and cache wrappers
- Single-engine SAJU or western astrology calculators using known libraries

### What is materially harder to copy

- Multi-layer fusion metric + explainability surfaces in `src/lib/destiny-matrix/*`
  - alignment, overlap weight, domain/timeline explainability, calendar signals
- Domain mapping assets and rule tables
  - SAJU rule DBs (`johuYongsin`, sibsin/yongsin mappings)
  - fusion layer matrices
- Contract-test harness across TS + Python (deterministic + safety contracts)
- End-to-end productized blend (SAJU + Astro + Tarot + chat/report routes)

## 5.2 Operability

- Performance hotspots (observed by code path)
  - Swiss Ephemeris calls in natal/transit/progression generation
  - Tarot hybrid retrieval + optional GraphRAG + potential repair pass
  - Fusion report generation under rate-limited routes
- Caching
  - in-memory SAJU cache and tarot API cache paths exist
  - caching strategy is mixed (in-process + external), needs consistency at scale
- Cost drivers
  - repeated LLM calls (main + repair) in tarot interpretation
  - high-volume chart generation
- Rate limits/abuse
  - route-level controls exist but full-suite failures show expectation drift in tests
- Observability
  - logging present in key paths; structured metrics coverage is uneven

## 5.3 Security

- Prompt injection surface
  - sanitizer regexes present; contract validation improves output safety
- Secrets leakage
  - no direct hardcoded secret found in reviewed paths
- SSRF/open proxy
  - no direct SSRF sink observed in reviewed core paths, but external fetches exist in scripts
- Demo token + cookie scope
  - middleware grants `dp_demo` cookie for demo paths; now set `secure` in production
  - credit bypass previously header-only; hardened in this audit to require demo cookie + token
- PII handling
  - user profile/birth data processed across services; retention/encryption policy not fully evident in reviewed subset

## 5.4 Graded Scores (0-10)

- Correctness: **7.2**
- Reliability: **6.3**
- Safety: **6.8**
- Differentiation: **7.9**
- Scalability: **6.4**
- Conversion readiness: **7.0**
- Unicorn likelihood: **6.9**

### Justification

- Strongest asset is true cross-fusion architecture with explainability and deterministic properties.
- Main drag is operational quality variance: full-suite instability and mixed guardrail maturity across many modules.

## Phase 6 Fixes Applied (minimal, high-impact)

1. Hardened credit bypass path to reduce demo token replay risk.
   - `src/lib/credits/withCredits.ts`
   - demo bypass now requires both valid `x-demo-token` and `dp_demo=1` cookie.
2. Added regression tests for hardened bypass behavior.
   - `tests/lib/credits/withCredits.test.ts`
3. Strengthened demo cookie transport policy in production.
   - `middleware.ts` sets `secure: true` in production for `dp_demo` cookie.
4. Added transit-window determinism guardrail.
   - `tests/lib/astrology/foundation/determinism-golden.test.ts`

## Commands Run + Results

- `npm run -s lint` -> PASS
- `npm run -s typecheck` -> PASS
- `npm run -s build` -> PASS
- `npm test` -> FAIL (existing broad-suite expectation drift; notable ICP and route-level contract mismatches)
- `npx vitest run --coverage.enabled false tests/lib/Saju/determinism-golden.test.ts tests/lib/astrology/foundation/determinism-golden.test.ts tests/lib/destiny-matrix/fusion-properties-regression.test.ts tests/lib/destiny-matrix/ai-report-score-determinism.test.ts tests/lib/demo/requireDemoToken.test.ts tests/middleware/demo-gating.test.ts tests/app/api/demo/ai-review-route.test.ts tests/lib/credits/withCredits.test.ts` -> PASS (55 tests)
- `python -m pytest backend_ai/tests/unit/test_tarot_router_contract.py backend_ai/tests/unit/test_tarot_crisis_detection_contract.py -q` -> PASS (8 tests)
- `npm run -s test:ssr-placeholders` -> FAIL in this session (no running local server at `http://127.0.0.1:3000`)
