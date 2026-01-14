"""
Backend AI Services Package

Business logic services extracted from routes for better maintainability.

Services:
- validation_service: Input validation and sanitization
- rag_context_service: RAG context building and query processing
- streaming_service: SSE streaming utilities for real-time responses
- birth_data_service: Birth data normalization and validation
- chart_context_service: Chart context building for AI prompts
"""

# Export commonly used service classes and functions
from .validation_service import ValidationService, sanitize_user_input, validate_birth_data
from .rag_context_service import expand_tarot_query, get_fallback_tarot_queries, build_tarot_search_context
from .streaming_service import StreamingService, sse_error_response, sse_stream_response, format_sse_chunk
from .birth_data_service import BirthDataService, normalize_birth_data, extract_birth_data_from_request
from .chart_context_service import ChartContextService, build_saju_context, build_astrology_context, build_combined_context

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
]
