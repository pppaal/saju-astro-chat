# Audit Repo Map

## Baseline Health (2026-02-17)

- `npm run -s lint`: PASS
- `npm run -s typecheck`: PASS
- `npm run -s build`: PASS (after cleaning `.next`/`tsconfig.tsbuildinfo` and rerunning)
- `npm test`: TIMEOUT at 182s (suite is very large/noisy; targeted critical suites were run instead)
- Targeted deterministic/contract suites:
  - `npx vitest run tests/lib/Saju/determinism-golden.test.ts tests/lib/astrology/foundation/determinism-golden.test.ts tests/lib/destiny-matrix/fusion-properties-regression.test.ts tests/lib/destiny-matrix/ai-report-score-determinism.test.ts tests/lib/demo/requireDemoToken.test.ts tests/middleware/demo-gating.test.ts`: PASS (34 tests)
  - `python -m pytest backend_ai/tests/unit/test_tarot_router_contract.py backend_ai/tests/unit/test_tarot_crisis_detection_contract.py backend_ai/tests/unit/test_tarot_interpret_evidence_route.py -q`: PASS (31 tests)
  - `python scripts/self_check.py` with `USE_CHROMADB=1 EXCLUDE_NON_SAJU_ASTRO=1 RAG_TRACE=1`: PASS

## Top-Level Product Modules

- Next.js App Router: `src/app/**` (89 page routes, 153 API routes)
- Frontend domain libs: `src/lib/**`
- Python backend AI runtime: `backend_ai/app/**`, `backend_ai/services/**`
- Graph/corpus data: `backend_ai/data/graph/**`, `backend_ai/data/corpus/**`
- Vector store: `backend_ai/data/chromadb/**`
- Indexing/diagnostics scripts: `scripts/**`, `backend_ai/scripts/**`
- Test suites:
  - Frontend/unit/integration: `tests/**` (1027 test files)
  - Backend Python: `backend_ai/tests/**` (159 test files)

## Truth Sources (Authoritative Files)

- SAJU computation:
  - `src/lib/Saju/saju.ts`
  - `src/lib/Saju/constants.ts`
  - API entry: `src/app/api/saju/route.ts`
- Western astrology computation:
  - `src/lib/astrology/foundation/shared.ts`
  - `src/lib/astrology/foundation/astrologyService.ts`
  - `src/lib/astrology/foundation/houses.ts`
  - `src/lib/astrology/foundation/aspects.ts`
  - `src/lib/astrology/foundation/transit.ts`
  - `src/lib/astrology/foundation/progressions.ts`
- Cross-fusion (saju x astro matrix):
  - `src/lib/destiny-matrix/engine.ts`
  - `src/lib/destiny-matrix/alignment.ts`
  - `src/lib/destiny-matrix/timeOverlap.ts`
  - `src/lib/destiny-matrix/domainScoring.ts`
  - `src/lib/destiny-matrix/monthlyTimeline.ts`
  - Mapping tables: `src/lib/destiny-matrix/data/layer*.ts`
- Tarot + GraphRAG pipeline:
  - Retrieval core: `backend_ai/app/saju_astro_rag.py`
  - Vector/chroma wrapper: `backend_ai/app/rag/vector_store.py`
  - Cross retrieval/grouping/ranking: `backend_ai/app/rag/cross_store.py`
  - Tarot route/prompt contracts: `backend_ai/app/routers/tarot/interpret.py`, `backend_ai/app/routers/tarot/prompt_builder.py`
  - Tarot safety crisis rules: `backend_ai/app/tarot/rules_loader.py`
- Counseling/chat streaming pipeline:
  - Main runtime: `backend_ai/services/streaming_service.py`
  - SSE helper layer: `backend_ai/app/services/streaming_service.py`
  - RAG prefetch managers:
    - `backend_ai/app/rag_manager.py`
    - `backend_ai/app/rag/optimized_manager.py`
- Credits/paywall/demo gating:
  - Next middleware gate: `middleware.ts`
  - API middleware guards: `src/lib/api/middleware/**`
  - Credits service: `src/lib/credits/creditService.ts`, `src/lib/credits/withCredits.ts`
  - Demo token logic: `src/lib/demo/token.ts`, `src/lib/demo/requireDemoToken.ts`

## Data/Index Sources

- Graph sources: `backend_ai/data/graph/{saju,astro,cross_analysis,fusion,tarot,...}`
- Fusion rule assets: `backend_ai/data/graph/fusion/*.json` and `*.csv`
- Chroma runtime collections (from self_check):
  - `saju_astro_graph_nodes_v1` = 25928
  - `saju_astro_cross_v1` = 17909
  - `domain_tarot` = 624
  - `domain_dream` = 171
  - `domain_persona` = 22080
  - `domain_destiny_map` = 2502
  - `corpus_nodes` = 78787

## Runtime Flow Map (Saju x Astro Counselor)

1. Request enters backend (`backend_ai/app/app.py`) and calls `prefetch_all_rag_data()`.
2. Prefetch uses optimized manager by default: `backend_ai/app/rag/optimized_manager.py`.
3. Graph seeds come from `GraphRAG.query()` in `backend_ai/app/saju_astro_rag.py`.
4. If `USE_CHROMADB=1`, graph retrieval is from `saju_astro_graph_nodes_v1` with `where={"domain": "saju_astro"}`.
5. Cross-analysis comes from `backend_ai/app/rag/cross_store.py` (`saju_astro_cross_v1`) when `EXCLUDE_NON_SAJU_ASTRO=1`.
6. Final generation happens in `backend_ai/services/streaming_service.py`.

## Key Route Surface (core product)

- Product pages: `/saju`, `/astrology`, `/destiny-map`, `/calendar`, `/tarot`, `/destiny-matrix`, `/compatibility`, `/icp`, `/personality`
- Core APIs: `/api/saju`, `/api/astrology`, `/api/destiny-map`, `/api/calendar`, `/api/tarot`, `/api/destiny-matrix`, `/api/compatibility`, `/api/icp`, `/api/personality`
- Demo APIs/pages are separately gated under `/demo/*` and `/api/demo/*`.

## High-Risk Architectural Duplication Found

- Two streaming service modules with similar names/roles:
  - `backend_ai/services/streaming_service.py` (active runtime path)
  - `backend_ai/app/services/streaming_service.py` (SSE helper module; imported mainly by tests)
- Two RAG managers with overlapping behavior:
  - `backend_ai/app/rag_manager.py`
  - `backend_ai/app/rag/optimized_manager.py` (active via `backend_ai/app/app.py`)

This duplication is a maintainability risk (drift, inconsistent fixes), not an immediate functional outage.
