"""
Feature Loaders - Lazy loading for feature modules
Prevents loading heavy dependencies on startup
"""

# ============================================================================
# I-CHING RAG (I-Ching Hexagram Interpretation)
# ============================================================================
HAS_ICHING = True
_iching_rag_module = None

def _get_iching_rag():
    """Lazy load iching_rag module."""
    global _iching_rag_module, HAS_ICHING
    if _iching_rag_module is None:
        try:
            from backend_ai.app import iching_rag as _ir
            _iching_rag_module = _ir
        except ImportError:
            HAS_ICHING = False
            print("[loaders] I-Ching RAG not available (lazy load)")
            return None
    return _iching_rag_module

def cast_hexagram(*args, **kwargs):
    m = _get_iching_rag()
    return m.cast_hexagram(*args, **kwargs) if m else None

def get_hexagram_interpretation(*args, **kwargs):
    m = _get_iching_rag()
    return m.get_hexagram_interpretation(*args, **kwargs) if m else None

def perform_iching_reading(*args, **kwargs):
    m = _get_iching_rag()
    return m.perform_iching_reading(*args, **kwargs) if m else None

def search_iching_wisdom(*args, **kwargs):
    m = _get_iching_rag()
    return m.search_iching_wisdom(*args, **kwargs) if m else None

def get_all_hexagrams_summary(*args, **kwargs):
    m = _get_iching_rag()
    return m.get_all_hexagrams_summary(*args, **kwargs) if m else None


# ============================================================================
# TAROT HYBRID RAG (Tarot Card Interpretation)
# ============================================================================
HAS_TAROT = True
_tarot_hybrid_rag_module = None

def _get_tarot_hybrid_rag_module():
    global _tarot_hybrid_rag_module, HAS_TAROT
    if _tarot_hybrid_rag_module is None:
        try:
            from backend_ai.app import tarot_hybrid_rag as _thr
            _tarot_hybrid_rag_module = _thr
        except ImportError:
            HAS_TAROT = False
            return None
    return _tarot_hybrid_rag_module

def get_tarot_hybrid_rag(*args, **kwargs):
    m = _get_tarot_hybrid_rag_module()
    return m.get_tarot_hybrid_rag(*args, **kwargs) if m else None


# ============================================================================
# COMPATIBILITY MODULE (Saju + Astrology Compatibility)
# ============================================================================
HAS_COMPATIBILITY = True
_compatibility_logic_module = None

def _get_compatibility_module():
    global _compatibility_logic_module, HAS_COMPATIBILITY
    if _compatibility_logic_module is None:
        try:
            from backend_ai.app import compatibility as _compat
            _compatibility_logic_module = _compat
        except ImportError:
            HAS_COMPATIBILITY = False
            print("[loaders] Compatibility module not available (lazy load)")
            return None
    return _compatibility_logic_module

def interpret_compatibility(*args, **kwargs):
    m = _get_compatibility_module()
    return m.interpret_compatibility(*args, **kwargs) if m else None

def interpret_compatibility_group(*args, **kwargs):
    m = _get_compatibility_module()
    return m.interpret_compatibility_group(*args, **kwargs) if m else None


# ============================================================================
# HYBRID RAG (Vector + BM25 + Graph + Rerank)
# ============================================================================
HAS_HYBRID_RAG = True
_hybrid_rag_module = None

def _get_hybrid_rag_module():
    global _hybrid_rag_module, HAS_HYBRID_RAG
    if _hybrid_rag_module is None:
        try:
            from backend_ai.app import hybrid_rag as _hr
            _hybrid_rag_module = _hr
        except ImportError:
            HAS_HYBRID_RAG = False
            print("[loaders] Hybrid RAG not available (lazy load)")
            return None
    return _hybrid_rag_module

def hybrid_search(*args, **kwargs):
    m = _get_hybrid_rag_module()
    return m.hybrid_search(*args, **kwargs) if m else None

def build_rag_context(*args, **kwargs):
    m = _get_hybrid_rag_module()
    return m.build_rag_context(*args, **kwargs) if m else None


# ============================================================================
# AGENTIC RAG (Next-Level Multi-Agent System)
# ============================================================================
HAS_AGENTIC = True
_agentic_rag_module = None

def _get_agentic_rag():
    """Lazy load agentic_rag module."""
    global _agentic_rag_module, HAS_AGENTIC
    if _agentic_rag_module is None:
        try:
            from backend_ai.app import agentic_rag as _ar
            _agentic_rag_module = _ar
        except ImportError:
            HAS_AGENTIC = False
            print("[loaders] Agentic RAG not available (lazy load)")
            return None
    return _agentic_rag_module

def agentic_query(*args, **kwargs):
    """Lazy wrapper for agentic_query."""
    m = _get_agentic_rag()
    return m.agentic_query(*args, **kwargs) if m else None

def get_agent_orchestrator(*args, **kwargs):
    """Lazy wrapper for get_agent_orchestrator."""
    m = _get_agentic_rag()
    return m.get_agent_orchestrator(*args, **kwargs) if m else None

def get_entity_extractor(*args, **kwargs):
    """Lazy wrapper for get_entity_extractor."""
    m = _get_agentic_rag()
    return m.get_entity_extractor(*args, **kwargs) if m else None

def get_deep_traversal(*args, **kwargs):
    """Lazy wrapper for get_deep_traversal."""
    m = _get_agentic_rag()
    return m.get_deep_traversal(*args, **kwargs) if m else None

# Classes are accessed as properties
EntityExtractor = property(lambda self: _get_agentic_rag().EntityExtractor if _get_agentic_rag() else None)
DeepGraphTraversal = property(lambda self: _get_agentic_rag().DeepGraphTraversal if _get_agentic_rag() else None)
AgentOrchestrator = property(lambda self: _get_agentic_rag().AgentOrchestrator if _get_agentic_rag() else None)


# ============================================================================
# COUNSELING ENGINE (Jungian Psychotherapy)
# ============================================================================
HAS_COUNSELING = True
_counseling_engine_module = None

def _get_counseling_engine_module():
    global _counseling_engine_module, HAS_COUNSELING
    if _counseling_engine_module is None:
        try:
            from backend_ai.app import counseling_engine as _ce
            _counseling_engine_module = _ce
        except ImportError:
            HAS_COUNSELING = False
            print("[loaders] Counseling engine not available (lazy load)")
            return None
    return _counseling_engine_module

def get_counseling_engine(*args, **kwargs):
    m = _get_counseling_engine_module()
    return m.get_counseling_engine(*args, **kwargs) if m else None

def _get_crisis_detector():
    """Get CrisisDetector class from counseling engine module."""
    m = _get_counseling_engine_module()
    return m.CrisisDetector if m else None

# Proxy class that forwards calls to the actual CrisisDetector
class _CrisisDetectorProxy:
    @staticmethod
    def detect_crisis(text):
        detector = _get_crisis_detector()
        if detector:
            return detector.detect_crisis(text)
        return {"is_crisis": False, "max_severity": "none", "detections": [], "requires_immediate_action": False}

    @staticmethod
    def get_crisis_response(severity, locale="ko"):
        detector = _get_crisis_detector()
        if detector:
            return detector.get_crisis_response(severity, locale)
        return {"immediate_message": "", "follow_up": "", "closing": ""}

CrisisDetector = _CrisisDetectorProxy
