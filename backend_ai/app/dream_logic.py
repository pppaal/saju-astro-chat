# backend_ai/app/dream_logic.py
"""
Dream Logic - Backward Compatibility Shim
=========================================
This module has been refactored into the dream_logic/ package.
This file provides backward compatibility for existing imports.

New imports should use:
    from backend_ai.app.dream_logic import interpret_dream, build_dream_prompt
"""

# Re-export everything from the new package
from backend_ai.app.dream_logic import (
    interpret_dream,
    build_dream_prompt,
    merge_unique,
    get_fallback_interpretations,
    create_cache_key,
    build_system_instruction,
    parse_json_response,
    get_dream_embed_rag,
    refine_with_gpt5mini,
)

# For backward compatibility with internal names
_merge_unique = merge_unique
_get_fallback_interpretations = get_fallback_interpretations
_create_cache_key = create_cache_key

__all__ = [
    "interpret_dream",
    "build_dream_prompt",
    "get_dream_embed_rag",
    "refine_with_gpt5mini",
    # Internal names for backward compatibility
    "_merge_unique",
    "_get_fallback_interpretations",
    "_create_cache_key",
]
