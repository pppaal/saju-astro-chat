"""
Lazy Loader Utility for Backend AI
Prevents OOM on memory-limited environments by loading heavy modules on-demand.
"""
import logging
from typing import Any, Optional, TypeVar, Generic

logger = logging.getLogger(__name__)

T = TypeVar('T')


class LazyModule(Generic[T]):
    """Lazy loader for modules that should only be imported on first use."""

    def __init__(self, import_path: str, module_name: str):
        self._import_path = import_path
        self._module_name = module_name
        self._module: Optional[T] = None
        self._available = True

    def get(self) -> Optional[T]:
        """Get the module, loading it if necessary."""
        if self._module is None and self._available:
            try:
                parts = self._import_path.rsplit('.', 1)
                if len(parts) == 2:
                    imported = __import__(self._import_path, fromlist=[parts[1]])
                else:
                    imported = __import__(self._import_path)
                self._module = imported
                logger.info(f"[LazyLoader] Loaded {self._module_name}")
            except ImportError as e:
                self._available = False
                logger.warning(f"[LazyLoader] {self._module_name} not available: {e}")
                return None
        return self._module

    @property
    def is_available(self) -> bool:
        if self._module is not None:
            return True
        if not self._available:
            return False
        return self.get() is not None


class LazyModules:
    """Collection of lazy-loaded modules."""
    iching_rag = LazyModule("backend_ai.app.iching_rag", "I-Ching RAG")
    persona_embeddings = LazyModule("backend_ai.app.persona_embeddings", "Persona Embeddings")
    tarot_hybrid_rag = LazyModule("backend_ai.app.tarot_hybrid_rag", "Tarot Hybrid RAG")
    domain_rag = LazyModule("backend_ai.app.domain_rag", "Domain RAG")
    compatibility = LazyModule("backend_ai.app.compatibility", "Compatibility")
    hybrid_rag = LazyModule("backend_ai.app.hybrid_rag", "Hybrid RAG")
    agentic_rag = LazyModule("backend_ai.app.agentic_rag", "Agentic RAG")
    counseling_engine = LazyModule("backend_ai.app.counseling_engine", "Counseling Engine")
    saju_astro_rag = LazyModule("backend_ai.app.saju_astro_rag", "Saju Astro RAG")
    corpus_rag = LazyModule("backend_ai.app.corpus_rag", "Corpus RAG")
    fusion_generate = LazyModule("backend_ai.model.fusion_generate", "Fusion Generate")
    prediction_engine = LazyModule("backend_ai.app.prediction_engine", "Prediction Engine")
    theme_cross_filter = LazyModule("backend_ai.app.theme_cross_filter", "Theme Cross Filter")
    fortune_score_engine = LazyModule("backend_ai.app.fortune_score_engine", "Fortune Score Engine")
    numerology_logic = LazyModule("backend_ai.app.numerology_logic", "Numerology Logic")
    icp_logic = LazyModule("backend_ai.app.icp_logic", "ICP Logic")
