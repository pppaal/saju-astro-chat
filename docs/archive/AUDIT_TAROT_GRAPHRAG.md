# Audit Tarot GraphRAG

## 4.1 Pipeline Map (verified)

### Runtime path

- Endpoint orchestration: `backend_ai/app/routers/tarot/interpret.py`.
- Tarot primary retrieval/context: `backend_ai/app/tarot/hybrid_rag.py` + `backend_ai/app/tarot/context/reading_context.py` + `backend_ai/app/tarot_rag.py`.
- Extra graph enhancement call in route: `interpret.py` uses shared graph search utility.

### Retrieval and context assembly

1. Map theme/spread from user question (`interpret.py:157`).
2. Build tarot reading context (`interpret.py:162` or `:171`).
3. Optional GraphRAG extra snippets (`interpret.py:180` onward).
4. Build unified prompt with strict JSON output schema (`prompt_builder.py:252` onward).
5. Parse response; if evidence missing, run repair prompt (`interpret.py:267`, `:474`).
6. If still invalid or GPT fails, fallback card evidence (`interpret.py:284`, `:520`).

### Safety/care detection

- Crisis detection method: `backend_ai/app/tarot/rules_loader.py:640` (`detect_crisis_situation`).
- Supports warning phrase detection + keyword + card-based triggers.
- Added built-in fallback phrases so safety still works when rules are incomplete.

## 4.2 Robustness Findings

### Strengths

- Evidence contract is strict and enforced at runtime (`_has_required_evidence`, repair/fallback paths).
- Prompt explicitly mandates structured JSON and evidence blocks.
- Crisis detector supports multi-source triggering (question + card mapping).

### Gaps / Risks

- Graph enhancement path currently calls shared graph search utility that targets `corpus_nodes` (`backend_ai/app/saju_astro_rag.py:2020`), so tarot context isolation depends on corpus quality.
- Prompt-injection resistance was mostly implicit before; now explicit anti-rule-override lines are added in prompt templates.
- No dedicated deterministic offline evaluator wired into CI for tarot routing/safety categories.

## 4.3 Failure Mode Coverage

| Failure mode                       | Current behavior                                             |
| ---------------------------------- | ------------------------------------------------------------ |
| LLM returns malformed/partial JSON | Repair prompt, then fallback evidence synthesis.             |
| Missing evidence blocks            | Contract checker + fallback synthesis.                       |
| Graph search error                 | Logged warning, core tarot context still proceeds.           |
| Chroma/vector store unavailable    | Degrades to non-graph tarot context path.                    |
| Crisis signal in question          | Crisis metadata returned by detector; safety path available. |

## 4.4 Deterministic Contract Tests (executed)

Executed:

- `backend_ai/tests/unit/test_tarot_router_contract.py`
- `backend_ai/tests/unit/test_tarot_crisis_detection_contract.py`
- `backend_ai/tests/unit/test_tarot_interpret_evidence_route.py`

Result:

- **31 passed**.

Coverage highlights:

- Prompt sections and evidence schema contract.
- Crisis detection contract, including fallback phrase behavior when config is sparse.
- Interpretation route always returns required evidence blocks across smoke prompts.

## 4.5 Offline Eval Set

- File present: `docs/EVAL_TAROT_PROMPTS.jsonl` (50 prompts, intent/routing/safety flags).
- Use as baseline for future deterministic routing/safety eval automation.

## 4.6 Readiness Score

**Tarot GraphRAG readiness: 3.9 / 5**

Breakdown:

- Retrieval robustness: 3.7
- Prompt contract rigor: 4.4
- Safety handling: 3.8
- Domain isolation: 3.2
- Deterministic testing: 4.1

## 4.7 Top Risks and Mitigations

1. Shared corpus contamination risk in graph enhancement path.
2. Missing CI gate for tarot eval set.
3. Safety coverage relies on curated phrase/rule quality.
4. Multilingual encoding artifacts can reduce debugging clarity.
5. Route-level exception handling is robust but observability fields can be expanded.
