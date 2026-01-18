# backend_ai/app/routers/tarot/__init__.py
"""
Tarot Routes Package
====================
Modular tarot API routes with interpretation, chat, and discovery endpoints.

Package Structure:
- dependencies.py: Lazy-loaded services and utilities
- context_detector.py: Question context detection for interpretation guidance
- prompt_builder.py: Prompt construction utilities
- interpret.py: /interpret and /prefetch routes
- chat.py: /chat and /chat-stream routes
- discovery.py: /themes, /search, /detect-topic routes
"""

from flask import Blueprint

from .interpret import register_interpret_routes
from .chat import register_chat_routes
from .discovery import register_discovery_routes

# Re-export dependencies for backward compatibility
from .dependencies import (
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
)

# Re-export context detector utilities
from .context_detector import (
    detect_question_context,
    is_playful_question,
    is_yes_no_question,
    get_conclusion_instruction,
)


def create_tarot_blueprint() -> Blueprint:
    """Create and configure the tarot blueprint with all routes."""
    bp = Blueprint('tarot', __name__, url_prefix='/api/tarot')

    # Register all route groups
    register_interpret_routes(bp)
    register_chat_routes(bp)
    register_discovery_routes(bp)

    return bp


# Create default blueprint instance
tarot_bp = create_tarot_blueprint()


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
]
