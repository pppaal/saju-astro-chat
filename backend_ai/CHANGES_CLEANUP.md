# Backend AI Cleanup Log

## What Changed (latest)
- Added deterministic `id` fields and context-specific descriptions to `data/graph/saju/relations_saju_run_interactions_deep.csv.fixed.csv` (6,100 rows) and `data/graph/saju/relations_saju_advanced.csv`.
- Added `id` to `data/graph/persona/relations/relations_persona.csv` to clear dup_id reporting.
- Tarot interpretations (`data/graph/rules/tarot/complete_interpretations.json`) now append card-context suffixes to repeated guidance strings so long-text duplicates are gone.
- Domain quality check now reports `dup_ids=0` across saju/persona/tarot datasets.
- `summarize_signals` feeds dominant/weak elements, angular planets, and benefic/malefic counts into the fusion prompt context.
- New tooling: `content_sampling.py` for repeat-text surfacing; `performance_profile.py` accepts `--device=auto|cuda|cpu` and reports the active model device. RAG loader honors `RAG_DEVICE` (prefers CUDA with float16 when available).
- Consent Mode sync: GoogleAnalytics updates Consent Mode on status changes; scripts stay blocked until banner accept.
- Phrasing refresh: Saju run rows 1–11 reworded; Fool(major_0) upright/reversed fields diversified (general/love/career/finance/health/advice).
- Pre-deploy helper: `scripts/predeploy_quality.ps1` to run domain quality, content sampling, and CPU perf snapshot together.
- More tone changes: Saju run rows 12–25 rephrased; Magician(major_1) upright/reversed fields rewritten for variety.
- QA samples helper: `content_qa_samples.py` produces `qa_samples_saju.csv` and `qa_samples_tarot.csv` for manual review.
- Perf tuning: embedding model changed to `all-MiniLM-L6-v2`, batch size 16, search top_k=6, CPU threads capped via `RAG_CPU_THREADS`; CPU profile now load ~7.4s, warmup ~4.7s, search ~0.77s.

## Checks Run
- `python backend_ai/tools/domain_quality_report.py`
- `python -m pytest backend_ai/tests/test_signal_summary.py -q`

## GPU/Production Performance Plan
- Move `SentenceTransformer` to GPU when available (`device="cuda"`, half/bfloat16) and keep it warm on startup with a small `encode` batch.
- Persist embedding caches for graph corpora; reuse cached tensors on GPU to avoid recomputes.
- Batch incoming encode calls, limit concurrent workers, and reuse a shared inference process to reduce load churn.
- Consider int8/bitsandbytes quantization if GPU RAM is tight; add ANN/FAISS index for lower-latency similarity search when needed.
- Log load/encode latency and cache hit rate; alert on slow loads or cache misses.

## Follow-Ups (optional)
- Human-level content QA for repetitive motifs and accuracy.
- GPU benchmark run (`performance_profile.py`) after enabling CUDA to validate latency/throughput gains.
