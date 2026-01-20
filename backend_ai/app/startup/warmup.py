"""
Startup Warmup - Preload models and caches
Reduces first request latency by loading models on startup

Enhanced warmup with:
- Parallel embedding cache loading
- OptimizedRAGManager pre-warming
- Connection pooling initialization
- Performance target: p95 < 700ms
"""

import os
import time
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any

logger = logging.getLogger("backend_ai")


def warmup_models():
    """Preload all singleton models and caches on startup."""
    from backend_ai.app.loaders import (
        get_model,
        get_graph_rag,
        get_corpus_rag,
        get_persona_embed_rag,
        get_tarot_hybrid_rag,
        HAS_GRAPH_RAG,
        HAS_CORPUS_RAG,
        HAS_PERSONA_EMBED,
        HAS_TAROT,
    )
    from backend_ai.app.services.cross_analysis_service import _load_cross_analysis_cache
    from backend_ai.app.redis_cache import get_cache

    logger.info("🔥 Starting model warmup...")
    start = time.time()

    try:
        # 0. Cross-analysis cache (instant, no ML)
        _load_cross_analysis_cache()

        # 1. SentenceTransformer model + GraphRAG
        if HAS_GRAPH_RAG:
            model = get_model()
            logger.info(f"  ✅ SentenceTransformer loaded: {model.get_sentence_embedding_dimension()}d")

            # 2. GraphRAG with embeddings
            rag = get_graph_rag()
            logger.info(f"  ✅ GraphRAG loaded: {len(rag.graph.nodes())} nodes")

        # 3. Corpus RAG (Jung quotes)
        if HAS_CORPUS_RAG:
            corpus = get_corpus_rag()
            logger.info(f"  ✅ CorpusRAG loaded")

        # 4. Persona embeddings (if available)
        if HAS_PERSONA_EMBED:
            persona = get_persona_embed_rag()
            logger.info(f"  ✅ PersonaEmbedRAG loaded")

        # 5. Tarot RAG (if available)
        if HAS_TAROT:
            tarot = get_tarot_hybrid_rag()
            logger.info(f"  ✅ TarotHybridRAG loaded")

        # 6. Dream RAG (for faster dream interpretation)
        try:
            from backend_ai.app.dream_logic import get_dream_embed_rag
            dream_rag = get_dream_embed_rag()
            # Warmup query to pre-compute any lazy embeddings
            _ = dream_rag.search("꿈 해석 테스트", top_k=1)
            logger.info(f"  ✅ DreamEmbedRAG loaded and warmed up")
        except Exception as dream_err:
            logger.warning(f"  ⚠️ DreamEmbedRAG warmup failed: {dream_err}")

        # 7. Redis cache connection
        cache = get_cache()
        logger.info(f"  ✅ Redis cache: {'connected' if cache.enabled else 'memory fallback'}")

        elapsed = time.time() - start
        logger.info(f"🔥 Model warmup completed in {elapsed:.2f}s")

    except Exception as e:
        logger.warning(f"⚠️ Warmup error (non-fatal): {e}")


def warmup_optimized():
    """
    Enhanced warmup using OptimizedRAGManager.

    Benefits:
    - Parallel loading of all RAG systems
    - Query cache pre-warming
    - Thread pool initialization
    - Eliminates cold start completely
    """
    logger.info("🚀 Starting optimized warmup (target: p95 < 700ms)...")
    start = time.time()

    results: Dict[str, Any] = {
        "success": True,
        "systems": {},
        "errors": []
    }

    try:
        # 1. Cross-analysis cache (instant, no ML) - do first
        from backend_ai.app.services.cross_analysis_service import _load_cross_analysis_cache
        _load_cross_analysis_cache()
        results["systems"]["cross_analysis_cache"] = True
        logger.info("  ✅ Cross-analysis cache loaded")

        # 2. OptimizedRAGManager warmup (handles all RAG systems in parallel)
        from backend_ai.app.rag.optimized_manager import warmup_optimized_rag
        rag_result = warmup_optimized_rag()
        results["systems"].update(rag_result.get("systems", {}))
        logger.info(f"  ✅ OptimizedRAGManager warmed: {rag_result.get('elapsed_seconds', 0):.2f}s")

        # 3. Redis cache connection
        from backend_ai.app.redis_cache import get_cache
        cache = get_cache()
        results["systems"]["redis"] = cache.enabled
        logger.info(f"  ✅ Redis: {'connected' if cache.enabled else 'memory fallback'}")

        # 4. Pre-warm with sample query (optional, for embedding cache)
        try:
            _prewarm_with_sample_query()
            results["systems"]["query_prewarm"] = True
            logger.info("  ✅ Sample query prewarm completed")
        except Exception as e:
            results["systems"]["query_prewarm"] = False
            logger.warning(f"  ⚠️ Sample query prewarm skipped: {e}")

        # 5. Tarot and Dream RAG (if available)
        try:
            from backend_ai.app.loaders import get_tarot_hybrid_rag, HAS_TAROT
            if HAS_TAROT:
                _ = get_tarot_hybrid_rag()
                results["systems"]["tarot_rag"] = True
                logger.info("  ✅ TarotHybridRAG loaded")
        except Exception as e:
            results["systems"]["tarot_rag"] = False

        try:
            from backend_ai.app.dream_logic import get_dream_embed_rag
            dream_rag = get_dream_embed_rag()
            _ = dream_rag.search("꿈 해석", top_k=1)
            results["systems"]["dream_rag"] = True
            logger.info("  ✅ DreamEmbedRAG loaded")
        except Exception as e:
            results["systems"]["dream_rag"] = False

    except Exception as e:
        results["success"] = False
        results["errors"].append(str(e))
        logger.error(f"⚠️ Optimized warmup error: {e}")

    elapsed = time.time() - start
    results["elapsed_seconds"] = elapsed

    logger.info(f"🚀 Optimized warmup completed in {elapsed:.2f}s")
    logger.info(f"   Systems ready: {sum(1 for v in results['systems'].values() if v)}/{len(results['systems'])}")

    return results


def _prewarm_with_sample_query():
    """
    Execute a sample RAG query to warm up embedding caches.
    This ensures first real request is fast.
    """
    import asyncio
    from backend_ai.app.rag.optimized_manager import get_optimized_rag_manager

    # Sample data for warmup query
    sample_saju = {
        "dayMaster": {"heavenlyStem": "甲", "element": "wood"},
        "dominantElement": "wood"
    }
    sample_astro = {
        "sun": {"sign": "Aries"},
        "moon": {"sign": "Cancer"}
    }

    manager = get_optimized_rag_manager()

    # Run async fetch in sync context
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        # Already in async context, skip prewarm
        return

    result = loop.run_until_complete(
        manager.fetch_all(sample_saju, sample_astro, "chat", "ko", use_cache=False)
    )

    logger.debug(f"  Prewarm query completed in {result.get('prefetch_time_ms', 0)}ms")


def auto_warmup_if_enabled():
    """Auto-warmup on import if WARMUP_ON_START is set (for Gunicorn/production)"""
    if os.getenv("WARMUP_ON_START", "").lower() in ("1", "true", "yes"):
        # Use optimized warmup if enabled
        if os.getenv("WARMUP_OPTIMIZED", "").lower() in ("1", "true", "yes"):
            warmup_optimized()
        else:
            warmup_models()


def warmup_parallel():
    """
    Parallel warmup using thread pool for faster startup.
    Loads independent systems concurrently.
    """
    logger.info("🔥 Starting parallel warmup...")
    start = time.time()

    results: Dict[str, Any] = {}

    def load_model():
        from backend_ai.app.loaders import get_model, HAS_GRAPH_RAG
        if HAS_GRAPH_RAG:
            model = get_model()
            return ("model", True, model.get_sentence_embedding_dimension())
        return ("model", False, None)

    def load_graph_rag():
        from backend_ai.app.loaders import get_graph_rag, HAS_GRAPH_RAG
        if HAS_GRAPH_RAG:
            rag = get_graph_rag()
            return ("graph_rag", True, len(rag.graph.nodes()))
        return ("graph_rag", False, None)

    def load_corpus_rag():
        from backend_ai.app.loaders import get_corpus_rag, HAS_CORPUS_RAG
        if HAS_CORPUS_RAG:
            corpus = get_corpus_rag()
            return ("corpus_rag", True, None)
        return ("corpus_rag", False, None)

    def load_persona_rag():
        from backend_ai.app.loaders import get_persona_embed_rag, HAS_PERSONA_EMBED
        if HAS_PERSONA_EMBED:
            persona = get_persona_embed_rag()
            return ("persona_rag", True, None)
        return ("persona_rag", False, None)

    def load_cross_analysis():
        from backend_ai.app.services.cross_analysis_service import _load_cross_analysis_cache
        _load_cross_analysis_cache()
        return ("cross_analysis", True, None)

    def load_redis():
        from backend_ai.app.redis_cache import get_cache
        cache = get_cache()
        return ("redis", cache.enabled, None)

    # Execute all loaders in parallel
    with ThreadPoolExecutor(max_workers=6, thread_name_prefix="warmup") as executor:
        # Submit all tasks - model must be first as others depend on it
        futures = {
            executor.submit(load_model): "model",
            executor.submit(load_cross_analysis): "cross_analysis",
            executor.submit(load_redis): "redis",
        }

        # Wait for model to complete first
        for future in as_completed(futures):
            name, success, info = future.result()
            results[name] = success
            if success:
                if info:
                    logger.info(f"  ✅ {name}: {info}")
                else:
                    logger.info(f"  ✅ {name}")
            else:
                logger.warning(f"  ⚠️ {name}: not available")

            # After model is loaded, submit RAG loaders
            if name == "model" and success:
                futures[executor.submit(load_graph_rag)] = "graph_rag"
                futures[executor.submit(load_corpus_rag)] = "corpus_rag"
                futures[executor.submit(load_persona_rag)] = "persona_rag"

    elapsed = time.time() - start
    logger.info(f"🔥 Parallel warmup completed in {elapsed:.2f}s")
    logger.info(f"   Ready: {sum(1 for v in results.values() if v)}/{len(results)}")

    return results
