# backend_ai/app/rag/model_manager.py
"""
Shared Embedding Model Manager
==============================
Singleton 패턴으로 SentenceTransformer 모델 공유

기존 saju_astro_rag.get_model() 함수를 wrapping하여
모든 RAG 모듈에서 동일한 모델 인스턴스를 사용하도록 함
"""

from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Global singleton
_shared_model = None
_model_loading = False


def get_shared_model():
    """
    Get shared SentenceTransformer model singleton.

    Uses existing get_model() from saju_astro_rag for backward compatibility.

    Returns:
        SentenceTransformer model or None if unavailable
    """
    global _shared_model, _model_loading

    if _shared_model is not None:
        return _shared_model

    if _model_loading:
        return None

    _model_loading = True

    try:
        # Try importing from saju_astro_rag first (maintains existing behavior)
        try:
            from backend_ai.app.saju_astro_rag import get_model
            _shared_model = get_model()
            logger.info("[ModelManager] Using model from saju_astro_rag")
            return _shared_model
        except ImportError:
            pass

        # Fallback: load directly
        try:
            from sentence_transformers import SentenceTransformer
            model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
            _shared_model = SentenceTransformer(model_name)
            logger.info(f"[ModelManager] Loaded model: {model_name}")
            return _shared_model
        except ImportError:
            logger.warning("[ModelManager] sentence_transformers not available")
            return None

    except Exception as e:
        logger.error(f"[ModelManager] Failed to load model: {e}")
        return None

    finally:
        _model_loading = False


def is_model_available() -> bool:
    """Check if embedding model is available."""
    return get_shared_model() is not None


def get_model_info() -> dict:
    """Get information about the loaded model."""
    model = get_shared_model()
    if model is None:
        return {"available": False}

    return {
        "available": True,
        "embedding_dimension": model.get_sentence_embedding_dimension(),
        "max_seq_length": getattr(model, "max_seq_length", None),
    }
