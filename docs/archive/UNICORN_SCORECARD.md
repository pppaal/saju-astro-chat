# Unicorn Scorecard

Last audited: 2026-04-08 (Asia/Hong_Kong)

## 5.1 Moat / Differentiation (code-based)

### What is easy to copy (2 weeks)

- Standard single-domain tarot text generation UX.
- Generic astrology route wrappers around Swiss ephemeris.
- Basic RAG retrieval with vector search only.

### What is harder to copy

1. **Deterministic SAJU x ASTRO core with shared service adapters**
   - Core judgment plus canonical/adapted surfaces now drive calendar, counselor, and report together: `src/lib/destiny-matrix/core/runDestinyCore.ts`, `src/lib/destiny-matrix/core/adapters*.ts`.
2. **Cross-domain GraphRAG isolation and evidence support design**
   - `saju_astro_graph_nodes_v1`, `saju_astro_cross_v1`, and strict domain filtering in runtime paths.
3. **Operational guardrails around leakage and output drift**
   - `scripts/self_check.py`, destiny three-service QA, report quality metrics, route regressions, `EXCLUDE_NON_SAJU_ASTRO`, `RAG_TRACE`.
4. **Multi-surface product integration on one judgment model**
   - Calendar, counselor, action-plan, and premium report all share the same core judgment surface instead of re-judging input independently.

## 5.2 Operability (Perf/Cost/Reliability)

### Strengths

- Extensive caching infrastructure (LRU + Redis + versioned cache keys): `src/lib/cache/*`, `src/lib/destiny-matrix/cache.ts`.
- Middleware pattern centralizes auth/token/rate-limit/credits: `src/lib/api/middleware/context.ts`.
- Domain-specific Chroma collections reduce mixed retrieval in saju x astro mode.
- Targeted regression coverage is now strong enough to catch report, counselor, calendar, tarot, and engine contract regressions together.

### Bottlenecks / cost drivers

- Heavy inference paths (Swiss ephemeris + fusion + LLM generation) under high concurrency.
- Full-suite status is still weaker than targeted regression coverage, which limits release confidence.
- Output-layer polish is still less consistent than the quality of the underlying deterministic core.

## 5.3 Security Review

### Good controls present

- Timing-safe comparison utilities (`src/lib/security/timingSafe.ts`).
- Public token validation helpers (`src/lib/auth/publicToken.ts`).
- Secret/token redaction patterns (`src/lib/security/errorSanitizer.ts`).
- Stronger route guard and middleware conventions across the API surface.

### Main security/safety risks

1. Demo behavior split between middleware pass-through and route-level deny can still confuse threat modeling (`middleware.ts` vs route guards).
2. Prompt-injection handling is improved but still largely prompt-policy based; there is no true model-side sandboxing.
3. Shared graph search utility can introduce domain contamination if retrieval scope is widened carelessly.
4. Large API surface still benefits from stricter route-by-route auth/rate audit automation.

## 5.4 Graded Scores (0-10)

| Dimension            | Score | Rationale                                                                                                                      |
| -------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------ |
| Correctness          |   8.3 | Deterministic core, shared adapters, and targeted contracts are strong; some output layers still need cleanup.                 |
| Reliability          |   7.9 | `tsc`, targeted regressions, and destiny three-service QA are green; full-suite posture is still less certain.                 |
| Safety               |   7.6 | Good contract/fallback patterns and better route guard coverage; prompt/output safety can still improve.                       |
| Differentiation      |   8.6 | Shared destiny-core across multiple surfaces plus GraphRAG support is genuinely non-trivial.                                   |
| Scalability          |   7.3 | Caching and route middleware are real strengths, but heavy compute and LLM orchestration still need tighter budget discipline. |
| Conversion readiness |   7.8 | Product breadth is strong; the main gap is consistency of final prose and polished user trust surfaces.                        |

## 5.5 Unicorn Likelihood

**Score: 7.9 / 10 (conditional)**

Condition for upward move:

- Keep release gates green across both targeted regressions and a healthier full-suite baseline.
- Continue reducing output-layer drift so report/counselor quality matches the core engine quality.
- Tighten domain-isolation guarantees across retrieval edges and keep deterministic eval harnesses active.

Honest conclusion:

- This repository has real moat and real engineering depth.
- It is not unicorn-grade yet in the sense of operational maturity, release confidence, or product consistency.
- It is, however, far above ordinary side-project quality and already at the level of a serious technical asset.
