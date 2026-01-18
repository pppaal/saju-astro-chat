# backend_ai/app/routers/tarot/dependencies.py
"""
Lazy-loaded dependencies for Tarot routes.
Centralizes all service and module loaders to avoid circular imports.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ===============================================================
# TarotService
# ===============================================================
_tarot_service_instance = None


def get_tarot_service():
    """Lazy load TarotService to avoid circular imports."""
    global _tarot_service_instance
    if _tarot_service_instance is None:
        from backend_ai.services.tarot_service import TarotService
        _tarot_service_instance = TarotService()
    return _tarot_service_instance


def generate_dynamic_followup_questions(
    interpretation: str,
    cards: list,
    category: str,
    user_question: str = "",
    language: str = "ko",
    static_questions: list = None
) -> list:
    """Wrapper for TarotService.generate_dynamic_followup_questions()."""
    return get_tarot_service().generate_dynamic_followup_questions(
        interpretation=interpretation,
        cards=cards,
        category=category,
        user_question=user_question,
        language=language,
        static_questions=static_questions
    )


def detect_tarot_topic(text: str) -> dict:
    """Wrapper for TarotService.detect_tarot_topic()."""
    return get_tarot_service().detect_tarot_topic(text)


# ===============================================================
# Tarot Hybrid RAG
# ===============================================================
_tarot_hybrid_rag_module = None


def _get_tarot_hybrid_rag_module():
    """Lazy load tarot_hybrid_rag module."""
    global _tarot_hybrid_rag_module
    if _tarot_hybrid_rag_module is None:
        try:
            from backend_ai.app import tarot_hybrid_rag as _thr
            _tarot_hybrid_rag_module = _thr
        except ImportError:
            try:
                from .. import tarot_hybrid_rag as _thr
                _tarot_hybrid_rag_module = _thr
            except ImportError as e:
                logger.warning(f"[TAROT] Could not import tarot_hybrid_rag: {e}")
                return None
    return _tarot_hybrid_rag_module


def get_tarot_hybrid_rag():
    """Get tarot hybrid RAG instance."""
    mod = _get_tarot_hybrid_rag_module()
    if mod is None:
        return None
    return mod.get_tarot_hybrid_rag()


def has_tarot() -> bool:
    """Check if tarot module is available."""
    return get_tarot_hybrid_rag() is not None


# ===============================================================
# Corpus RAG
# ===============================================================
_corpus_rag_module = None


def _get_corpus_rag_module():
    """Lazy load corpus_rag module."""
    global _corpus_rag_module
    if _corpus_rag_module is None:
        try:
            from backend_ai.app import corpus_rag as _cr
            _corpus_rag_module = _cr
        except ImportError:
            try:
                from .. import corpus_rag as _cr
                _corpus_rag_module = _cr
            except ImportError:
                return None
    return _corpus_rag_module


def get_corpus_rag():
    """Get corpus RAG instance."""
    mod = _get_corpus_rag_module()
    if mod is None:
        return None
    return mod.get_corpus_rag()


def has_corpus_rag() -> bool:
    """Check if corpus RAG is available."""
    return get_corpus_rag() is not None


# ===============================================================
# Fusion Generate (GPT-4)
# ===============================================================
_fusion_generate_module = None


def _get_fusion_generate():
    """Lazy load fusion_generate module."""
    global _fusion_generate_module
    if _fusion_generate_module is None:
        try:
            from backend_ai.model import fusion_generate as _fg
            _fusion_generate_module = _fg
        except ImportError:
            from ...model import fusion_generate as _fg
            _fusion_generate_module = _fg
    return _fusion_generate_module


def generate_with_gpt4(*args, **kwargs):
    """Lazy wrapper for GPT-4 generation."""
    return _get_fusion_generate()._generate_with_gpt4(*args, **kwargs)


# ===============================================================
# OpenAI Client (for streaming)
# ===============================================================
_openai_client = None


def get_openai_client():
    """Get OpenAI client for streaming."""
    global _openai_client
    if _openai_client is None:
        try:
            from openai import OpenAI
            _openai_client = OpenAI()
        except Exception:
            return None
    return _openai_client


def is_openai_available() -> bool:
    """Check if OpenAI is available."""
    return get_openai_client() is not None


# ===============================================================
# Redis Cache
# ===============================================================
_redis_cache_module = None


def _get_redis_cache_module():
    """Lazy load redis_cache module."""
    global _redis_cache_module
    if _redis_cache_module is None:
        try:
            from backend_ai.app import redis_cache as _rc
            _redis_cache_module = _rc
        except ImportError:
            from .. import redis_cache as _rc
            _redis_cache_module = _rc
    return _redis_cache_module


def get_cache():
    """Get cache instance."""
    return _get_redis_cache_module().get_cache()


# ===============================================================
# Sanitizer
# ===============================================================
_sanitizer_module = None


def _get_sanitizer_module():
    """Lazy load sanitizer module."""
    global _sanitizer_module
    if _sanitizer_module is None:
        try:
            from backend_ai.app import sanitizer as _s
            _sanitizer_module = _s
        except ImportError:
            from .. import sanitizer as _s
            _sanitizer_module = _s
    return _sanitizer_module


def sanitize_user_input(text: str, max_length: int = 2000) -> str:
    """Sanitize user input."""
    return _get_sanitizer_module().sanitize_user_input(text, max_length=max_length)


def is_suspicious_input(text: str) -> bool:
    """Check if input is suspicious."""
    return _get_sanitizer_module().is_suspicious_input(text)


def sanitize_messages(messages: list, max_content_length: int = 2000) -> list:
    """Sanitize a list of messages."""
    sanitized = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if isinstance(content, str):
            content = sanitize_user_input(content, max_length=max_content_length)
        sanitized.append({"role": role, "content": content})
    return sanitized
