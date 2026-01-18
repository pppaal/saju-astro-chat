"""
Model Loaders - Lazy loading for ML models
Prevents OOM on limited memory environments
"""

import os

# ============================================================================
# FUSION GENERATE (GPT-4 + SentenceTransformer)
# ============================================================================
_fusion_generate_module = None

def _get_fusion_generate():
    """Lazy load fusion_generate module to save memory."""
    global _fusion_generate_module
    if _fusion_generate_module is None:
        from backend_ai.model import fusion_generate as _fg
        _fusion_generate_module = _fg
    return _fusion_generate_module

def _generate_with_gpt4(*args, **kwargs):
    """Lazy wrapper for _generate_with_gpt4."""
    return _get_fusion_generate()._generate_with_gpt4(*args, **kwargs)

def refine_with_gpt5mini(*args, **kwargs):
    """Lazy wrapper for refine_with_gpt5mini."""
    return _get_fusion_generate().refine_with_gpt5mini(*args, **kwargs)


# ============================================================================
# GRAPHRAG SYSTEM (Saju + Astrology Knowledge Graph)
# ============================================================================
RAG_DISABLED = os.getenv("RAG_DISABLE") == "1"
HAS_GRAPH_RAG = not RAG_DISABLED
_saju_astro_rag_module = None

def _get_saju_astro_rag_module():
    global _saju_astro_rag_module, HAS_GRAPH_RAG
    if _saju_astro_rag_module is None:
        try:
            from backend_ai.app import saju_astro_rag as _sar
            _saju_astro_rag_module = _sar
        except ImportError:
            HAS_GRAPH_RAG = False
            print("[loaders] GraphRAG not available (lazy load)")
            return None
    return _saju_astro_rag_module

def get_graph_rag(*args, **kwargs):
    m = _get_saju_astro_rag_module()
    return m.get_graph_rag(*args, **kwargs) if m else None

def get_model(*args, **kwargs):
    m = _get_saju_astro_rag_module()
    return m.get_model(*args, **kwargs) if m else None


# ============================================================================
# CORPUS RAG (Document Retrieval)
# ============================================================================
HAS_CORPUS_RAG = not RAG_DISABLED
_corpus_rag_module = None

def _get_corpus_rag_module():
    global _corpus_rag_module, HAS_CORPUS_RAG
    if _corpus_rag_module is None:
        try:
            from backend_ai.app import corpus_rag as _cr
            _corpus_rag_module = _cr
        except ImportError:
            HAS_CORPUS_RAG = False
            print("[loaders] CorpusRAG not available (lazy load)")
            return None
    return _corpus_rag_module

def get_corpus_rag(*args, **kwargs):
    m = _get_corpus_rag_module()
    return m.get_corpus_rag(*args, **kwargs) if m else None


# ============================================================================
# PERSONA EMBEDDINGS (User Personality Profiling)
# ============================================================================
HAS_PERSONA_EMBED = not RAG_DISABLED
_persona_embed_module = None

def _get_persona_embed_module():
    global _persona_embed_module, HAS_PERSONA_EMBED
    if _persona_embed_module is None:
        try:
            from backend_ai.app import persona_embeddings as _pe
            _persona_embed_module = _pe
        except ImportError:
            HAS_PERSONA_EMBED = False
            return None
    return _persona_embed_module

def get_persona_embed_rag(*args, **kwargs):
    m = _get_persona_embed_module()
    return m.get_persona_embed_rag(*args, **kwargs) if m else None


# ============================================================================
# DOMAIN RAG (Domain-specific Knowledge)
# ============================================================================
HAS_DOMAIN_RAG = not RAG_DISABLED
DOMAIN_RAG_DOMAINS = []
_domain_rag_module = None

def _get_domain_rag_module():
    global _domain_rag_module, HAS_DOMAIN_RAG, DOMAIN_RAG_DOMAINS
    if _domain_rag_module is None:
        try:
            from backend_ai.app import domain_rag as _dr
            _domain_rag_module = _dr
            DOMAIN_RAG_DOMAINS = _dr.DOMAINS
        except ImportError:
            HAS_DOMAIN_RAG = False
            print("[loaders] DomainRAG not available (lazy load)")
            return None
    return _domain_rag_module

def get_domain_rag(*args, **kwargs):
    m = _get_domain_rag_module()
    return m.get_domain_rag(*args, **kwargs) if m else None
