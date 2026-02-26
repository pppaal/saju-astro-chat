# Unicorn Scorecard

## 5.1 Moat / Differentiation (code-based)

### What is easy to copy (2 weeks)

- Standard single-domain tarot text generation UX.
- Generic astrology route wrappers around Swiss ephemeris.
- Basic RAG retrieval with vector search only.

### What is harder to copy

1. **Deterministic 10-layer SAJU×ASTRO fusion engine**
   - Mapping assets + adjusted scoring + explainability: `src/lib/destiny-matrix/engine.ts`, `src/lib/destiny-matrix/data/layer*.ts`.
2. **Cross-domain (saju+astro) GraphRAG isolation + cross collection design**
   - `saju_astro_graph_nodes_v1`, `saju_astro_cross_v1`, strict domain filtering in runtime paths.
3. **Operational guardrails around leakage**
   - `scripts/self_check.py`, `scripts/e2e_rag_smoke.py`, `EXCLUDE_NON_SAJU_ASTRO` + `RAG_TRACE` controls.
4. **Tarot evidence-contract flow**
   - prompt schema + evidence repair/fallback in route.

## 5.2 Operability (Perf/Cost/Reliability)

### Strengths

- Extensive caching infrastructure (LRU + Redis + versioned cache keys): `src/lib/cache/*`, `src/lib/destiny-matrix/cache.ts`.
- Middleware pattern centralizes auth/token/rate-limit/credits: `src/lib/api/middleware/context.ts`.
- Domain-specific Chroma collections reduce mixed retrieval in saju×astro mode.

### Bottlenecks / cost drivers

- Heavy inference paths (Swiss ephemeris + multi-layer fusion + LLM generation) under high concurrency.
- Large corpus collections (`corpus_nodes`) and broad retrieval surfaces increase query and ranking cost.
- Full test suite instability increases release friction and hidden regression risk.

## 5.3 Security Review

### Good controls present

- Timing-safe comparison utilities (`src/lib/security/timingSafe.ts`).
- Public token validation helpers (`src/lib/auth/publicToken.ts`).
- Secret/token redaction patterns (`src/lib/security/errorSanitizer.ts`).

### Main security/safety risks

1. Demo behavior split between middleware pass-through and route-level deny can confuse threat modeling (`middleware.ts` vs route guards).
2. Prompt-injection handling mostly prompt-policy based; no explicit model-side sandboxing.
3. Shared graph search utility (`corpus_nodes`) can introduce domain contamination if reused carelessly.
4. Broad API surface area requires stricter route-by-route auth/rate auditing.

## 5.4 Graded Scores (0–10)

| Dimension            | Score | Rationale                                                                                    |
| -------------------- | ----: | -------------------------------------------------------------------------------------------- |
| Correctness          |   7.6 | SAJU/ASTRO deterministic internals are strong; external-oracle validation depth is limited.  |
| Reliability          |   6.8 | Core targeted tests pass, but full suite has substantial pre-existing failures.              |
| Safety               |   7.2 | Good contract/fallback patterns; still prompt-layer-centric for injection and crisis nuance. |
| Differentiation      |   8.1 | 10-layer deterministic fusion + explainability + cross collections is non-trivial.           |
| Scalability          |   6.9 | Caching exists, but expensive compute/retrieval paths need tighter perf budgets.             |
| Conversion readiness |   7.0 | Product breadth strong; consistency/test drift can harm trust and release velocity.          |

## 5.5 Unicorn Likelihood

**Score: 7.4 / 10 (conditional)**

Condition for upward move:

- Stabilize release quality gates (full test suite health).
- Tighten domain-isolation guarantees across all tarot/graph retrieval edges.
- Add deterministic eval harnesses that gate regressions in fusion quality and safety behavior.

Without this, differentiation remains strong but operational drag will cap growth velocity.
