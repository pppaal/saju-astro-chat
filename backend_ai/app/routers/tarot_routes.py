# backend_ai/app/routers/tarot_routes.py
"""
Tarot Reading API Routes - Backward Compatibility Shim
======================================================
This module has been refactored into the tarot/ package.
All functionality is now in:
- tarot/dependencies.py: Lazy-loaded services
- tarot/context_detector.py: Question context detection
- tarot/prompt_builder.py: Prompt construction
- tarot/interpret.py: /interpret, /prefetch routes
- tarot/chat.py: /chat, /chat-stream routes
- tarot/discovery.py: /themes, /search, /detect-topic routes

This file provides backward compatibility for existing imports.
"""

# Import everything from the new package for backward compatibility
from .tarot import (
    # Blueprint
    tarot_bp,
    create_tarot_blueprint,
    # Dependencies
    get_tarot_service,
    generate_dynamic_followup_questions,
    detect_tarot_topic,
    get_tarot_hybrid_rag,
    has_tarot,
    get_corpus_rag,
    has_corpus_rag,
    generate_with_gpt4,
    get_openai_client,
    is_openai_available,
    get_cache,
    sanitize_user_input,
    is_suspicious_input,
    sanitize_messages,
    # Context Detector
    detect_question_context,
    is_playful_question,
    is_yes_no_question,
    get_conclusion_instruction,
)

# Backward compatibility aliases
from .tarot_utils import map_tarot_theme, clean_ai_phrases
from .tarot_constants import WEEKDAY_NAMES_KO

# Legacy function aliases
_get_tarot_service = get_tarot_service
_clean_ai_phrases = clean_ai_phrases
_has_tarot = has_tarot
_has_corpus_rag = has_corpus_rag
_is_openai_available = is_openai_available
_generate_with_gpt4 = generate_with_gpt4
_get_openai_client = get_openai_client


__all__ = [
    # Blueprint
    "tarot_bp",
    "create_tarot_blueprint",
    # Dependencies
    "get_tarot_service",
    "generate_dynamic_followup_questions",
    "detect_tarot_topic",
    "get_tarot_hybrid_rag",
    "has_tarot",
    "get_corpus_rag",
    "has_corpus_rag",
    "generate_with_gpt4",
    "get_openai_client",
    "is_openai_available",
    "get_cache",
    "sanitize_user_input",
    "is_suspicious_input",
    "sanitize_messages",
    # Context Detector
    "detect_question_context",
    "is_playful_question",
    "is_yes_no_question",
    "get_conclusion_instruction",
    # Utils
    "map_tarot_theme",
    "clean_ai_phrases",
    "WEEKDAY_NAMES_KO",
    # Legacy aliases
    "_get_tarot_service",
    "_clean_ai_phrases",
    "_has_tarot",
    "_has_corpus_rag",
    "_is_openai_available",
    "_generate_with_gpt4",
    "_get_openai_client",
]
