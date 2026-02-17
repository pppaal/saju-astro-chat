# Audit Repo Map

Date: 2026-02-17
Repo: `c:\Users\pjyrh\Desktop\saju-astro-chat-backup-latest`

## 0.1 Baseline Health (commands run)

- `npm run -s lint`: PASS
- `npm run -s typecheck`: PASS
- `npm run -s build`: PASS (Next.js 16.1.6 build completed)
- `npm test`: FAIL (large pre-existing suite mismatch/noise; major failures in ICP tests and many route expectation drift cases)
- Targeted deterministic suites (run to reduce noise): PASS
  - `npx vitest run --coverage.enabled false tests/lib/Saju/determinism-golden.test.ts tests/lib/astrology/foundation/determinism-golden.test.ts tests/lib/destiny-matrix/fusion-properties-regression.test.ts tests/lib/destiny-matrix/ai-report-score-determinism.test.ts tests/lib/demo/requireDemoToken.test.ts tests/middleware/demo-gating.test.ts tests/app/api/demo/ai-review-route.test.ts tests/lib/credits/withCredits.test.ts`
  - `python -m pytest backend_ai/tests/unit/test_tarot_router_contract.py backend_ai/tests/unit/test_tarot_crisis_detection_contract.py -q`

## 0.2 Repository Areas

- Frontend + API app routes: `src/app`
- Core business/domain libraries: `src/lib`
- Python AI backend + RAG pipelines: `backend_ai/app`
- Test suites: `tests` (TypeScript/Vitest), `backend_ai/tests` (Pytest)
- Static/data assets: `public`, `data`, `backend_ai/data`
- Infra/config/scripts: `prisma`, `scripts`, `middleware.ts`, `next.config.ts`

## Top-Level Module Map

- UI/routes: `src/app/*`
- API routes: `src/app/api/*`
- SAJU engine: `src/lib/Saju/*`
- Astrology engine: `src/lib/astrology/foundation/*`
- Cross-fusion (Destiny Matrix): `src/lib/destiny-matrix/*`
- Credits/demo/paywall: `src/lib/credits/*`, `src/lib/demo/*`, `middleware.ts`
- Tarot frontend assets: `src/lib/Tarot/*`
- Tarot GraphRAG + generation backend: `backend_ai/app/tarot/*`, `backend_ai/app/routers/tarot/*`, `backend_ai/app/rag*`

## 0.3 Truth Sources

- SAJU computation
  - `src/lib/Saju/saju.ts` (main entrypoint: `calculateSajuData`)
  - `src/lib/Saju/unse.ts` (luck cycles, iljin/monthly helpers)
  - `src/lib/Saju/yongsin.ts` and `src/lib/Saju/johuYongsin.ts` (?? logic/rule tables)
  - `src/lib/Saju/sibsinAnalysis.ts` (?? mapping)
- Astrology computation
  - `src/lib/astrology/foundation/astrologyService.ts` (natal chart)
  - `src/lib/astrology/foundation/transit.ts` (transits)
  - `src/lib/astrology/foundation/progressions.ts` (progressions)
  - `src/lib/astrology/foundation/aspects.ts` (aspects/orbs)
  - `src/lib/astrology/foundation/ephe.ts` (Swiss Ephemeris loading)
- Cross-fusion matrix/metric
  - `src/lib/destiny-matrix/engine.ts` (10-layer fusion + summary)
  - `src/lib/destiny-matrix/alignment.ts` (alignment term)
  - `src/lib/destiny-matrix/timeOverlap.ts` (time-overlap weight)
  - `src/lib/destiny-matrix/domainScoring.ts`, `drivers.ts`, `calendarSignals.ts`, `monthlyTimeline.ts`
- Tarot data + RAG pipeline
  - `backend_ai/app/tarot/hybrid_rag.py` (orchestration)
  - `backend_ai/app/routers/tarot/interpret.py` (main interpret route + evidence repair)
  - `backend_ai/app/routers/tarot/prompt_builder.py` (prompt contracts)
  - `backend_ai/app/routers/tarot/context_detector.py` (routing/context heuristics)
  - `backend_ai/app/sanitizer.py` (injection sanitation)
  - `backend_ai/app/tarot/rules_loader.py` (crisis/safety rules)
- Counseling/chat streaming pipeline
  - `src/app/api/tarot/chat/stream/route.ts`
  - `src/app/api/destiny-map/chat-stream/route.ts`
  - `backend_ai/app/routers/tarot/chat.py`
- Credits/paywall/demo bypass
  - `src/lib/credits/withCredits.ts`, `src/lib/credits/creditService.ts`
  - `src/lib/demo/requireDemoToken.ts`, `src/lib/demo/token.ts`
  - `middleware.ts` (`dp_demo` cookie grant + demo token acceptance)

## Keyword File Index (selected high-signal)

- SAJU keywords: `src/lib/Saju/saju.ts`, `src/lib/Saju/unse.ts`, `src/lib/Saju/yongsin.ts`, `src/lib/Saju/sibsinAnalysis.ts`, `src/lib/Saju/johuYongsin.ts`
- ASTRO keywords: `src/lib/astrology/foundation/astrologyService.ts`, `src/lib/astrology/foundation/aspects.ts`, `src/lib/astrology/foundation/transit.ts`, `src/lib/astrology/foundation/progressions.ts`, `src/lib/astrology/foundation/houses.ts`
- FUSION keywords: `src/lib/destiny-matrix/engine.ts`, `src/lib/destiny-matrix/alignment.ts`, `src/lib/destiny-matrix/timeOverlap.ts`, `src/lib/destiny-matrix/domainScoring.ts`, `src/lib/destiny-matrix/monthlyTimeline.ts`
- TAROT/RAG keywords: `backend_ai/app/tarot/hybrid_rag.py`, `backend_ai/app/routers/tarot/interpret.py`, `backend_ai/app/routers/tarot/prompt_builder.py`, `backend_ai/app/rag_manager.py`, `backend_ai/app/tarot/rules_loader.py`
- PROMPT/guardrail keywords: `backend_ai/app/sanitizer.py`, `backend_ai/app/tarot/prompts/system_prompts.py`, `backend_ai/app/routers/tarot/prompt_builder.py`, `backend_ai/app/routers/tarot/interpret.py`
