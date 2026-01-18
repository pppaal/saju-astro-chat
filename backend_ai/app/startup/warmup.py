"""
Startup Warmup - Preload models and caches
Reduces first request latency by loading models on startup
"""

import os
import time
import logging

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


def auto_warmup_if_enabled():
    """Auto-warmup on import if WARMUP_ON_START is set (for Gunicorn/production)"""
    if os.getenv("WARMUP_ON_START", "").lower() in ("1", "true", "yes"):
        warmup_models()
