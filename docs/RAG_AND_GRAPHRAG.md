# RAG And GraphRAG

## Components

- Vector store manager: `backend_ai/app/rag/vector_store.py`
- Cross reasoning store: `backend_ai/app/rag/cross_store.py`
- Runtime orchestration: `backend_ai/services/streaming_service.py`
- Canonical diagnostics: `scripts/self_check.py`

## Collections And Domains

### `saju_astro_graph_nodes_v1`

- Domain: `saju_astro`
- Purpose: GraphRAG evidence nodes for saju+astrology context retrieval.
- Source indexing: `scripts/reindex_saju_astro_graph_nodes.py`

### `saju_astro_cross_v1`

- Domain: `saju_astro_cross`
- Purpose: Cross-analysis rules and fused thematic interpretations.
- Source indexing: `scripts/reindex_saju_astro_cross.py`

## Cross Summary Pipeline

`build_cross_summary()` in `backend_ai/app/rag/cross_store.py`:

1. search cross collection (`domain=saju_astro_cross`)
2. rank score = `sim + 0.2*rule_match + 0.2*overlap`
3. group by `axis/theme`
4. return 1-3 grouped summaries (`max_groups=3`)
5. attach evidence lines:

- `?? ??` from `saju_refs`
- `?? ??` from `astro_refs`

## Evidence Fill Strategy

Cross evidence is filled in layers:

1. metadata refs

- `saju_refs` / `astro_refs`
- JSON variants (`*_refs_json`)

2. metadata inference

- infer from tags/label/token rules

3. graph backfill

- query graph collection
- derive refs from graph hit metadata/text
- mark backfill trace path

Reindex path (`scripts/reindex_saju_astro_cross.py`) also backfills refs from graph similarity and records source markers such as `backfill_similarity`.

## Domain Filtering And Isolation

Recommended production runtime:

- `USE_CHROMADB=1`
- `EXCLUDE_NON_SAJU_ASTRO=1`

Effect:

- retrieval uses saju/astro graph + cross collections
- unrelated corpora (persona/domain/corpus) are skipped in streaming path
- skip events are visible in `RAG_TRACE` logs

## Fallback Policy

Current behavior:

- if cross search fails or empty, `build_cross_summary()` returns empty summary
- evidence slots are padded when insufficient refs remain (`id=none` fallback)
- runtime graph backfill attempts to avoid empty evidence

Recommended production policy:

- keep Chroma + exclusion flags on
- treat `self_check` `WARN/FAIL` as deploy blocker for AI quality-sensitive releases
- monitor evidence-related metrics from diagnostics

## RAG Trace

Enable trace:

### PowerShell

```powershell
$env:USE_CHROMADB='1'
$env:EXCLUDE_NON_SAJU_ASTRO='1'
$env:RAG_TRACE='1'
python scripts/self_check.py --runtime-evidence
```

### Bash

```bash
USE_CHROMADB=1 EXCLUDE_NON_SAJU_ASTRO=1 RAG_TRACE=1 python scripts/self_check.py --runtime-evidence
```

### What To Look For

- cross grouping counts and top-k behavior
- evidence backfill events in cross summary
- skipped corpus/persona/domain logs when exclusion is enabled
- quality table (`avg_unique_theme@12`, `cross_present_rate`, `evidence_rate`)

Current expected target: `evidence_rate = 100%`.
