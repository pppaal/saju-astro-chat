"""
Refactor app.py - Remove lazy loaders and use new packages
"""

import re

def refactor_app_py():
    with open("app/app.py", "r", encoding="utf-8") as f:
        content = f.read()

    original_lines = len(content.split('\n'))

    # 1. Remove lazy loader sections (lines 102-525)
    # Find and remove all lazy loader function definitions
    patterns_to_remove = [
        (r'# Lazy import fusion_generate.*?\ndef _generate_with_gpt4.*?\n    return.*?\n\n', ''),
        (r'def refine_with_gpt5mini.*?\n    """.*?""".*?\n    return.*?\n\n', ''),
        (r'# I-Ching RAG - Lazy loaded.*?\ndef get_all_hexagrams_summary.*?\n    return.*?\n\n', ''),
        (r'# Persona Embeddings - Lazy loaded.*?\ndef get_persona_embed_rag.*?\n    return.*?\n\n', ''),
        (r'# Tarot Hybrid RAG - Lazy loaded.*?\ndef get_tarot_hybrid_rag.*?\n    return.*?\n\n', ''),
        (r'# Domain RAG - Lazy loaded.*?\ndef get_domain_rag.*?\n    return.*?\n\n', ''),
        (r'# Compatibility.*?- Lazy loaded.*?\ndef interpret_compatibility_group.*?\n    return.*?\n\n', ''),
        (r'# Hybrid RAG.*?- Lazy loaded.*?\ndef build_rag_context.*?\n    return.*?\n\n', ''),
        (r'# Agentic RAG.*?- Lazy loaded.*?\nAgentOrchestrator = property.*?\n\n', ''),
        (r'# Jungian Counseling Engine - Lazy loaded.*?\nCrisisDetector = _CrisisDetectorProxy\n\n', ''),
        (r'# GraphRAG System - Lazy loaded.*?\ndef get_model.*?\n    return.*?\n\n', ''),
        (r'# CorpusRAG System - Lazy loaded.*?\ndef get_corpus_rag.*?\n    return.*?\n\n', ''),
    ]

    # 2. Add new imports at the top (after existing utils imports)
    new_imports = '''
# Lazy loaders moved to loaders package
from backend_ai.app.loaders import (
    # Model loaders
    _generate_with_gpt4,
    refine_with_gpt5mini,
    get_graph_rag,
    get_model,
    get_corpus_rag,
    get_persona_embed_rag,
    get_domain_rag,
    HAS_GRAPH_RAG,
    HAS_CORPUS_RAG,
    HAS_PERSONA_EMBED,
    HAS_DOMAIN_RAG,
    DOMAIN_RAG_DOMAINS,
    # Feature loaders
    cast_hexagram,
    get_hexagram_interpretation,
    perform_iching_reading,
    search_iching_wisdom,
    get_all_hexagrams_summary,
    HAS_ICHING,
    get_tarot_hybrid_rag,
    HAS_TAROT,
    interpret_compatibility,
    interpret_compatibility_group,
    HAS_COMPATIBILITY,
    hybrid_search,
    build_rag_context,
    HAS_HYBRID_RAG,
    agentic_query,
    get_agent_orchestrator,
    get_entity_extractor,
    get_deep_traversal,
    HAS_AGENTIC,
    get_counseling_engine,
    CrisisDetector,
    HAS_COUNSELING,
)

# Service functions
from backend_ai.app.services.sanitizer_service import sanitize_messages, mask_sensitive_data
from backend_ai.app.services.integration_service import get_integration_context, get_integration_data
from backend_ai.app.services.cross_analysis_service import get_cross_analysis_cache

# Startup
from backend_ai.app.startup import warmup_models, auto_warmup_if_enabled
'''

    # Insert after env_utils import
    content = content.replace(
        ')\n# Lazy import fusion_generate',
        f')\n{new_imports}\n# Removed lazy loaders - now imported from loaders package\n'
    )

    # 3. Remove helper functions that are now in services
    content = re.sub(
        r'# ===============================================================\n# 🛡️ INPUT SANITIZATION HELPERS\n# ===============================================================\n\ndef sanitize_messages.*?\n    return text\n\n',
        '# Sanitization helpers moved to services/sanitizer_service.py\n\n',
        content,
        flags=re.DOTALL
    )

    # 4. Remove integration data functions
    content = re.sub(
        r'# ===============================================================\n# 🔗 INTEGRATION ENGINE CACHE.*?\n    return result\n\n',
        '# Integration data loading moved to services/integration_service.py\n\n',
        content,
        flags=re.DOTALL
    )

    # 5. Remove cross-analysis cache loading
    content = re.sub(
        r'# ===============================================================\n# 🚀 CROSS-ANALYSIS CACHE.*?\n    return _CROSS_ANALYSIS_CACHE\n\n',
        '# Cross-analysis cache moved to services/cross_analysis_service.py\n\n',
        content,
        flags=re.DOTALL
    )

    # 6. Replace warmup_models function
    content = re.sub(
        r'# ===============================================================\n# 🚀 MODEL WARMUP.*?\n# Auto-warmup on import.*?\n    warmup_models\(\)\n',
        '# Model warmup moved to startup/warmup.py\nauto_warmup_if_enabled()\n',
        content,
        flags=re.DOTALL
    )

    final_lines = len(content.split('\n'))
    removed_lines = original_lines - final_lines

    # Write back
    with open("app/app.py", "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✅ Refactoring complete!")
    print(f"   Original: {original_lines} lines")
    print(f"   Final: {final_lines} lines")
    print(f"   Removed: {removed_lines} lines")
    print(f"   Reduction: {removed_lines / original_lines * 100:.1f}%")

if __name__ == "__main__":
    refactor_app_py()
