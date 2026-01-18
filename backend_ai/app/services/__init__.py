"""
Backend AI Services Package

Business logic services extracted from routes for better maintainability.

Services:
- validation_service: Input validation and sanitization
- rag_context_service: RAG context building and query processing
- streaming_service: SSE streaming utilities for real-time responses
- birth_data_service: Birth data normalization and validation
- chart_context_service: Chart context building for AI prompts
- jung_service: Jung psychology data and guidance
- cache_service: Session cache management with LRU eviction
- normalizer_service: Data normalization for birth and saju data
"""

# Export commonly used service classes and functions
from .validation_service import ValidationService, sanitize_user_input, validate_birth_data
from .rag_context_service import expand_tarot_query, get_fallback_tarot_queries, build_tarot_search_context
from .streaming_service import StreamingService, sse_error_response, sse_stream_response, format_sse_chunk
from .birth_data_service import BirthDataService, normalize_birth_data, extract_birth_data_from_request
from .chart_context_service import ChartContextService, build_saju_context, build_astrology_context, build_combined_context

# New services (Phase 5)
from .jung_service import (
    _load_jung_data,
    get_lifespan_guidance,
    get_active_imagination_prompts,
    get_crisis_resources,
)
from .cache_service import (
    get_session_rag_cache,
    set_session_rag_cache,
    clear_session_cache,
    get_cache_stats,
    _cleanup_expired_sessions,
    _evict_lru_sessions,
    SESSION_CACHE_MAX_SIZE,
    SESSION_CACHE_TTL_MINUTES,
)
from .normalizer_service import (
    normalize_day_master,
    _normalize_birth_date,
    _normalize_birth_time,
    _normalize_birth_payload,
    STEM_TO_ELEMENT,
)
from .rate_limit_service import (
    check_rate_limit,
    get_rate_limit_status,
    reset_rate_limit,
    get_rate_limit_stats,
    RATE_LIMIT,
    RATE_WINDOW_SECONDS,
)

__all__ = [
    # Classes
    "ValidationService",
    "StreamingService",
    "BirthDataService",
    "ChartContextService",

    # Validation functions
    "sanitize_user_input",
    "validate_birth_data",

    # RAG context functions
    "expand_tarot_query",
    "get_fallback_tarot_queries",
    "build_tarot_search_context",

    # Streaming functions
    "sse_error_response",
    "sse_stream_response",
    "format_sse_chunk",

    # Birth data functions
    "normalize_birth_data",
    "extract_birth_data_from_request",

    # Chart context functions
    "build_saju_context",
    "build_astrology_context",
    "build_combined_context",

    # Jung psychology functions
    "_load_jung_data",
    "get_lifespan_guidance",
    "get_active_imagination_prompts",
    "get_crisis_resources",

    # Cache functions
    "get_session_rag_cache",
    "set_session_rag_cache",
    "clear_session_cache",
    "get_cache_stats",
    "_cleanup_expired_sessions",
    "_evict_lru_sessions",
    "SESSION_CACHE_MAX_SIZE",
    "SESSION_CACHE_TTL_MINUTES",

    # Normalizer functions
    "normalize_day_master",
    "_normalize_birth_date",
    "_normalize_birth_time",
    "_normalize_birth_payload",
    "STEM_TO_ELEMENT",

    # Rate limiting functions
    "check_rate_limit",
    "get_rate_limit_status",
    "reset_rate_limit",
    "get_rate_limit_stats",
    "RATE_LIMIT",
    "RATE_WINDOW_SECONDS",
]
