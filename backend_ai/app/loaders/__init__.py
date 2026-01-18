"""
Loaders Package - Lazy loading for ML models and feature modules
Prevents OOM on limited memory environments
"""

from .model_loaders import (
    # Fusion Generate
    _get_fusion_generate,
    _generate_with_gpt4,
    refine_with_gpt5mini,
    # GraphRAG
    _get_saju_astro_rag_module,
    get_graph_rag,
    get_model,
    HAS_GRAPH_RAG,
    # CorpusRAG
    _get_corpus_rag_module,
    get_corpus_rag,
    HAS_CORPUS_RAG,
    # Persona
    _get_persona_embed_module,
    get_persona_embed_rag,
    HAS_PERSONA_EMBED,
    # Domain RAG
    _get_domain_rag_module,
    get_domain_rag,
    HAS_DOMAIN_RAG,
    DOMAIN_RAG_DOMAINS,
)

from .feature_loaders import (
    # I-Ching
    _get_iching_rag,
    cast_hexagram,
    get_hexagram_interpretation,
    perform_iching_reading,
    search_iching_wisdom,
    get_all_hexagrams_summary,
    HAS_ICHING,
    # Tarot
    _get_tarot_hybrid_rag_module,
    get_tarot_hybrid_rag,
    HAS_TAROT,
    # Compatibility
    _get_compatibility_module,
    interpret_compatibility,
    interpret_compatibility_group,
    HAS_COMPATIBILITY,
    # Hybrid RAG
    _get_hybrid_rag_module,
    hybrid_search,
    build_rag_context,
    HAS_HYBRID_RAG,
    # Agentic RAG
    _get_agentic_rag,
    agentic_query,
    get_agent_orchestrator,
    get_entity_extractor,
    get_deep_traversal,
    EntityExtractor,
    DeepGraphTraversal,
    AgentOrchestrator,
    HAS_AGENTIC,
    # Counseling
    _get_counseling_engine_module,
    get_counseling_engine,
    _get_crisis_detector,
    CrisisDetector,
    HAS_COUNSELING,
)

__all__ = [
    # Model loaders
    "_get_fusion_generate",
    "_generate_with_gpt4",
    "refine_with_gpt5mini",
    "_get_saju_astro_rag_module",
    "get_graph_rag",
    "get_model",
    "HAS_GRAPH_RAG",
    "_get_corpus_rag_module",
    "get_corpus_rag",
    "HAS_CORPUS_RAG",
    "_get_persona_embed_module",
    "get_persona_embed_rag",
    "HAS_PERSONA_EMBED",
    "_get_domain_rag_module",
    "get_domain_rag",
    "HAS_DOMAIN_RAG",
    "DOMAIN_RAG_DOMAINS",
    # Feature loaders
    "_get_iching_rag",
    "cast_hexagram",
    "get_hexagram_interpretation",
    "perform_iching_reading",
    "search_iching_wisdom",
    "get_all_hexagrams_summary",
    "HAS_ICHING",
    "_get_tarot_hybrid_rag_module",
    "get_tarot_hybrid_rag",
    "HAS_TAROT",
    "_get_compatibility_module",
    "interpret_compatibility",
    "interpret_compatibility_group",
    "HAS_COMPATIBILITY",
    "_get_hybrid_rag_module",
    "hybrid_search",
    "build_rag_context",
    "HAS_HYBRID_RAG",
    "_get_agentic_rag",
    "agentic_query",
    "get_agent_orchestrator",
    "get_entity_extractor",
    "get_deep_traversal",
    "EntityExtractor",
    "DeepGraphTraversal",
    "AgentOrchestrator",
    "HAS_AGENTIC",
    "_get_counseling_engine_module",
    "get_counseling_engine",
    "_get_crisis_detector",
    "CrisisDetector",
    "HAS_COUNSELING",
]
