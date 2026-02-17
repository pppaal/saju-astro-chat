# Tarot GraphRAG Audit (Quality + Safety)

Date: 2026-02-17

## Scope + Evidence

- Pipeline files reviewed:
  - `backend_ai/app/routers/tarot/interpret.py`
  - `backend_ai/app/routers/tarot/prompt_builder.py`
  - `backend_ai/app/routers/tarot/context_detector.py`
  - `backend_ai/app/routers/tarot/dependencies.py`
  - `backend_ai/app/tarot/hybrid_rag.py`
  - `backend_ai/app/sanitizer.py`
  - `backend_ai/app/tarot/rules_loader.py`
- Contract tests run (no LLM call):
  - `backend_ai/tests/unit/test_tarot_router_contract.py` (PASS, 4)
  - `backend_ai/tests/unit/test_tarot_crisis_detection_contract.py` (PASS, 4)
- Offline prompt eval set present:
  - `docs/EVAL_TAROT_PROMPTS.jsonl` (50 rows)

## 4.1 Pipeline Map

1. Request intake + sanitize
   - suspicious pattern check + sanitization (`sanitize_user_input`, `is_suspicious_input`)
2. Draw validation/routing
   - validates provided draws or derives from cards
3. Retrieval/context assembly
   - Hybrid RAG context + optional GraphRAG snippets
4. Prompt assembly
   - unified JSON contract prompt (`overall`, `cards`, `card_evidence`, `advice`)
5. Generation + repair
   - first LLM call; if evidence contract fails, repair prompt retry
   - fallback evidence generator if still invalid
6. Safety overlays
   - sanitizer patterns; crisis detection rules available in rules loader
7. Response
   - structured payload with evidence and follow-ups

## 4.2 Robustness / Safety Findings

- Prompt safety:
  - explicit input sanitization exists; suspicious markers are stripped
  - role/system override patterns are screened by regex rules
- Evidence contract robustness:
  - hard validator `_has_required_evidence` enforces schema and sentence bounds
  - repair path + deterministic fallback prevents empty evidence leakage
- Crisis handling:
  - crisis detection logic exists and is test-covered for self-harm phrase detection
- Failure modes:
  - GraphRAG failure handled with warning and continue
  - cache miss and empty retrieval still returns fallback narrative
  - LLM call failure has deterministic fallback

## 4.3 Deterministic Contract Tests Added/Validated

- `backend_ai/tests/unit/test_tarot_router_contract.py`
  - unified prompt includes required JSON/evidence schema
  - chat system prompt contains key safety/evidence rules
  - fallback evidence rows always include required keys
  - evidence-repair prompt includes expected draw schema
- `backend_ai/tests/unit/test_tarot_crisis_detection_contract.py`
  - warning phrase crisis detection
  - keyword-based crisis detection
  - supportive-card crisis detection
  - neutral case -> no crisis

## 4.4 Offline Eval Set

- `docs/EVAL_TAROT_PROMPTS.jsonl`
  - 50 categorized prompts
  - includes expected route and safety flags fields

## Tarot GraphRAG Readiness

- Score: **3.7 / 5**
- Rationale:
  - robust prompt contract + fallback design + crisis hooks
  - limited by regex-only injection defense, heuristic context routing, and dependency/runtime variability

## Top 10 Failure Risks + Mitigations

1. Regex-only injection defense can miss obfuscated payloads.
   - Mitigation: layered policy checks at prompt-builder boundary.
2. Context detector is large keyword heuristic tree.
   - Mitigation: add intent classifier regression set + confusion matrix tracking.
3. GraphRAG availability issues can silently reduce answer quality.
   - Mitigation: emit structured telemetry tag on GraphRAG fallback path.
4. Retrieval context truncation (`[:900]`) may drop critical evidence.
   - Mitigation: budgeted chunk prioritization before truncation.
5. LLM response parsing via regex `{...}` can mis-parse malformed outputs.
   - Mitigation: strict JSON mode + schema validation first.
6. Crisis detection coverage relies on rule list completeness.
   - Mitigation: expand phrase library and add adversarial tests.
7. Latency spikes from hybrid retrieval + repair retry.
   - Mitigation: timeout budget with staged degradation policy.
8. Prompt safety rules mostly in natural language instructions.
   - Mitigation: enforce non-negotiable server-side post-validation checks.
9. Cache key excludes some contextual dimensions by design.
   - Mitigation: explicitly document cache eligibility criteria and monitor mismatch rates.
10. Inconsistent multilingual handling can degrade safety cues.

- Mitigation: language-specific safety templates and tests.
