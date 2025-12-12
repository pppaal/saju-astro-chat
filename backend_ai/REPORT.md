# Backend AI Data & QA Summary

## Recent Changes
- GraphRAG fixes: prefers `.fixed.csv` files; loads dream rules/data; wraps list-style rules into dict (`backend_ai/app/saju_astro_rag.py`).
- RAG prompt restored: `base_context` passed into `generate_fusion_report` (`backend_ai/app/fusion_logic.py`).
- Data repair tools: `repair_graph_csvs.py`, `validate_graph_data.py`, `domain_quality_report.py`.
- Prompt/token tools: `prompt_length.py`, `prompt_token_count.py` (tiktoken cl100k base, GPT-4o/mini-friendly).
- Performance profile: `performance_profile.py`.
- Smoke tests: GraphRAG, signal extractor, domain presence; pytest marker registered (`pytest.ini`).
- Saju/Persona dedup: added deterministic `id` fields and contextualized repeated descriptions in `relations_saju_run_interactions_deep.csv.fixed.csv`, `relations_saju_advanced.csv`, and persona relations.
- Tarot refactor: card-context suffix added to repeated long texts in `rules/tarot/complete_interpretations.json` to eliminate duplicate strings.
- Signal highlights: `summarize_signals` injects dominant/weak elements, angular planets, benefic/malefic counts into fusion context.
- Tools: `content_sampling.py` for repeat-text surfacing; `performance_profile.py` now supports `--device=auto|cuda|cpu` and reports model device.
- Stylistic refresh: Saju run rows 1–11 reworded; Fool(major_0) upright/reversed lines diversified for tone.
- Pre-deploy script: `scripts/predeploy_quality.ps1` runs domain quality, content sampling, and CPU perf snapshot in one go.
- Additional tone refresh: Saju run rows 12–25 rephrased; Magician(major_1) upright/reversed fields rewritten to reduce sameness.
- QA aids: `content_qa_samples.py` generates random review sets (`qa_samples_saju.csv`, `qa_samples_tarot.csv`) for manual quality checks.
- Perf tuning: embedding model switched to `all-MiniLM-L6-v2` (faster), batch size reduced (16), search_graphs top_k=6, CPU threads capped via `RAG_CPU_THREADS`. Current CPU profile: load ~7.4s, warmup ~4.7s, search ~0.77s.

## Current Data Status (domain_quality_report.py)
- Saju: no empty desc; dup_ids 0 (ids added + contextualized desc in `relations_saju_run_interactions_deep.csv.fixed.csv` and `relations_saju_advanced.csv`).
- Astro: no empties; dup_ids 0 (dedup applied to `relations_astro_return.csv`).
- Tarot: rules present; `tarot` data folder missing (by design: rules-driven).
- Dream: rules present; `dream` data folder missing.
- Numerology/Jung: present; persona relations file now includes ids (deduped).

## Prompt Length (tiktoken cl100k_base)
- en / life_path: ~288 tokens (1088 chars)
- es / love: ~273 tokens (1039 chars)

## Performance Profile (CPU, cached embeddings)
- Model import/load: ~67.7s
- Embed warmup: ~9.1s
- `search_graphs("사주 궁합")`: ~2.7s

## Outstanding Gaps
- Content quality: repeated motifs remain semantically similar; human/heuristic review still needed for accuracy/variance.
- Dream/Tarot datasets are rule-only; no “dream” data folder present.
- Performance: GPU path not profiled yet; see perf strategy section for production tuning ideas.
- Consent Mode: GA/AdSense gated until consent; Consent Mode signals now synchronized on status change.

## Content Sampling (duplicates)
- Saju `relations_saju_run_interactions_deep.csv.fixed.csv`: rows 6,100; duplicate desc values 0 after per-combination context suffix.  
- Tarot `rules/tarot/complete_interpretations.json`: long-string duplicates eliminated via card-context suffixing (conceptual motifs still recur across suits).  
- Dream `rules/dream/complete_interpretations.json`: items 20, duplicate text 0.

## Performance Strategy (prod/GPU)
- Enable GPU inference for `SentenceTransformer` when available (`device="cuda"`, `torch.set_default_dtype(torch.float16 or bfloat16)`), cache the model on startup, and keep embeddings in GPU memory.
- Pre-warm: run a small `encode` batch on boot; persist/reuse embedding caches for graph corpora to avoid recompute.
- Throughput: batch-encode incoming queries, cap max concurrency, and reuse a shared inference worker/process pool.
- Memory/latency: consider quantized weights (bitsandbytes/int8) if GPU RAM is tight; prefer FAISS/ANN for similarity search if latency is critical.
- Observability: log load/encode times and cache hit ratios; alert on slow embeds or model reloads.
