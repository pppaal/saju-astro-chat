# Tarot Chroma Pipeline

## Objective

Use Chroma as the single runtime source for tarot retrieval, with fully reproducible rebuild/lint/eval steps.

## Source of truth

- Corpus: `backend_ai/data/tarot_corpus/tarot_corpus_v1.jsonl`
- Quality gate: `scripts/tarot_lint.py`
- Rebuild: `scripts/tarot_rebuild_chroma.py`
- Eval: `scripts/tarot_eval.py`

`.pt` embedding artifacts (for example `tarot_embeds.pt`) are optional legacy caches and are not required for reproducibility.

## Commands

From repository root:

```bash
python scripts/tarot_lint.py
python scripts/tarot_build_eval_dataset.py \
  --corpus-path backend_ai/data/tarot_corpus/tarot_corpus_v1.jsonl \
  --auto-output-path data/eval/eval_auto.jsonl \
  --realstyle-output-path data/eval/eval_realstyle.jsonl \
  --realstyle-draws-output-path data/eval/eval_realstyle_draws.jsonl \
  --realstyle-samples 100
python scripts/tarot_rebuild_chroma.py \
  --corpus-path backend_ai/data/tarot_corpus/tarot_corpus_v1.jsonl \
  --persist-dir backend_ai/data/chromadb \
  --collection-name domain_tarot \
  --combo-mode graph_only \
  --embedding-model-id minilm
python scripts/tarot_eval.py \
  --eval-auto-path data/eval/eval_auto.jsonl \
  --eval-realstyle-path data/eval/eval_realstyle_draws.jsonl \
  --top-k 5 \
  --context-top-n 3
```

## Combo collection policy

- Default pipeline is `graph_only`: combo knowledge is represented in graph data (`edges_tarot_combinations.csv` etc).
- In this mode, `domain_tarot_combo` is removed during rebuild to prevent stale mixed-quality documents.
- If combo retrieval docs are explicitly needed, run:

```bash
python scripts/tarot_build_corpus.py --combo-mode docs
python scripts/tarot_rebuild_chroma.py --combo-mode docs
```

## Threshold tuning

Tarot retrieval currently uses `TAROT_MIN_SCORE` and defaults to `0.20`.

Recommended range:

- `0.18`: recall-first (fewer empty hits, more noise)
- `0.20`: balanced default
- `0.22`: precision-first (cleaner results, higher empty-hit risk)

Set:

```bash
set TAROT_MIN_SCORE=0.20
```
