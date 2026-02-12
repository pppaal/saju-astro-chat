# Tarot Corpus (Single Source of Truth)

This folder is the canonical source for tarot retrieval data used by Chroma.

## Canonical file

- `tarot_corpus_v1.jsonl`

Each line is a JSON object with this contract:

- `doc_id`: deterministic `sha1(card_id|orientation|domain|position|version)[:16]`
- `doc_type`: `card` (default policy) or `combo` (optional mode)
- `card_id`
- `card_name`
- `orientation`: `upright` or `reversed`
- `domain`: `love` / `career` / `money` / `general`
- `position`: optional string (empty allowed)
- `source`
- `version`
- `text`

## Quality gates

Run lint before rebuild:

```bash
python scripts/tarot_lint.py
```

Rebuild Chroma from this corpus:

```bash
python scripts/tarot_rebuild_chroma.py \
  --corpus-path backend_ai/data/tarot_corpus/tarot_corpus_v1.jsonl \
  --persist-dir backend_ai/data/chromadb \
  --collection-name domain_tarot \
  --combo-mode graph_only \
  --embedding-model-id minilm
```

## Combo policy

- Default: `graph_only`. Tarot card combinations are handled by graph edges/nodes, not a separate combo retrieval collection.
- Optional: `docs`. If you need combo documents in Chroma, build corpus with `--combo-mode docs` and rebuild with `--combo-mode docs`.
- `domain_tarot_combo` is removed during rebuild when `--combo-mode graph_only` to avoid stale/partial indexes.

## Source-of-truth policy

- Chroma collection(s) are runtime index artifacts.
- `.pt` embedding caches (e.g. `tarot_embeds.pt`) are optional legacy artifacts and are **not required** for tarot retrieval reproducibility.
- Reproducibility is guaranteed by: `tarot_corpus_v1.jsonl` + `tarot_lint.py` + `tarot_rebuild_chroma.py`.
