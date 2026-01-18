# backend_ai/app/dream_logic/__init__.py
"""
Dream Logic Package
===================
Modular implementation of dream interpretation logic.

Package Structure:
- prompt_builder.py: Build prompts for GPT-4 dream analysis
- utils.py: Helper functions for merging, fallbacks, caching
- interpreter.py: Main interpret_dream() function with parallel processing

Usage:
    from backend_ai.app.dream_logic import interpret_dream, build_dream_prompt
"""

from .interpreter import interpret_dream
from .prompt_builder import build_dream_prompt
from .utils import (
    merge_unique,
    get_fallback_interpretations,
    create_cache_key,
    build_system_instruction,
    parse_json_response,
)

# Backward compatibility aliases (underscore prefix versions)
_merge_unique = merge_unique
_get_fallback_interpretations = get_fallback_interpretations
_create_cache_key = create_cache_key


# Re-export lazy loaders for backward compatibility
def get_dream_embed_rag():
    """Lazy wrapper for dream_embeddings.get_dream_embed_rag."""
    from .interpreter import _get_dream_embed_rag
    return _get_dream_embed_rag()


def refine_with_gpt5mini(*args, **kwargs):
    """Lazy wrapper for refine_with_gpt5mini."""
    from .interpreter import _refine_with_gpt5mini
    return _refine_with_gpt5mini(*args, **kwargs)


__all__ = [
    # Main function
    "interpret_dream",
    # Prompt builder
    "build_dream_prompt",
    # Utilities
    "merge_unique",
    "get_fallback_interpretations",
    "create_cache_key",
    "build_system_instruction",
    "parse_json_response",
    # Backward compatibility (underscore prefix versions)
    "_merge_unique",
    "_get_fallback_interpretations",
    "_create_cache_key",
    # Backward compatibility
    "get_dream_embed_rag",
    "refine_with_gpt5mini",
]
