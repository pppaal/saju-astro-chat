"""
Centralized Lazy Loading System for Backend AI

Railway free tier (512MB) requires lazy loading of heavy modules
like SentenceTransformer to avoid OOM (Out of Memory).

This module provides a unified lazy loading system to replace
15+ duplicated lazy loading patterns in app.py.

Usage:
    from backend_ai.app.utils.lazy_loader import FUSION_GENERATE, get_capabilities

    # Direct usage
    result = FUSION_GENERATE.refine_with_gpt5mini(text)

    # Check availability
    if FUSION_GENERATE.available:
        result = FUSION_GENERATE.some_function()

    # Get all capabilities
    caps = get_capabilities()
"""
import os
from typing import Callable, Optional, TypeVar, Any, Dict
from functools import wraps
import logging

T = TypeVar('T')

logger = logging.getLogger(__name__)

# Check if RAG is disabled globally
RAG_DISABLED = os.getenv("RAG_DISABLE") == "1"


class LazyModule:
    """
    Lazy module loader with feature flag support.

    Loads heavy modules only when first accessed, reducing memory footprint.
    Tracks availability via feature flags.
    """

    def __init__(
        self,
        import_path: str,
        module_name: str = None,
        feature_name: str = None,
        assume_available: bool = True,
        disabled_if_rag_disabled: bool = False
    ):
        """
        Initialize lazy module loader.

        Args:
            import_path: Import path (e.g., "backend_ai.app.iching_rag")
            module_name: Module attribute name (defaults to last part of import_path)
            feature_name: Human-readable feature name for logging
            assume_available: Assume available until load fails (optimistic)
            disabled_if_rag_disabled: Disable if RAG_DISABLE=1 env var is set
        """
        self.import_path = import_path
        self.module_name = module_name or import_path.split('.')[-1]
        self.feature_name = feature_name or self.module_name
        self._module = None
        self._assume_available = assume_available
        self._disabled_if_rag_disabled = disabled_if_rag_disabled

        # Check if disabled by env var
        if disabled_if_rag_disabled and RAG_DISABLED:
            self._available = False
            logger.info(f"[LazyLoader] {self.feature_name} disabled (RAG_DISABLE=1)")
        else:
            self._available = assume_available if assume_available else None

    @property
    def available(self) -> bool:
        """Check if module is available."""
        if self._available is None:
            # Not yet determined, try loading
            self.load()
        return self._available

    def load(self) -> Optional[Any]:
        """Load the module if not already loaded."""
        if self._module is None and self._available != False:
            try:
                # Import the module
                parts = self.import_path.split('.')
                module = __import__(self.import_path, fromlist=[parts[-1]])

                # Get the specific attribute if needed
                if self.module_name != parts[-1]:
                    self._module = getattr(module, self.module_name, module)
                else:
                    self._module = module

                self._available = True
                logger.info(f"[LazyLoader] ✓ Loaded: {self.feature_name}")

            except ImportError as e:
                self._available = False
                logger.warning(f"[LazyLoader] ✗ Failed to load {self.feature_name}: {e}")
                return None
            except Exception as e:
                self._available = False
                logger.error(f"[LazyLoader] ✗ Error loading {self.feature_name}: {e}")
                return None

        return self._module

    def get(self) -> Optional[Any]:
        """Get the loaded module (alias for load())."""
        return self.load()

    def __call__(self, *args, **kwargs):
        """Allow calling the module directly."""
        module = self.load()
        if module is None:
            raise ImportError(f"Module {self.feature_name} not available")
        if callable(module):
            return module(*args, **kwargs)
        raise TypeError(f"Module {self.feature_name} is not callable")

    def __getattr__(self, name):
        """Proxy attribute access to the loaded module."""
        if name.startswith('_'):
            # Avoid infinite recursion for private attributes
            raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")

        module = self.load()
        if module is None:
            raise ImportError(f"Module {self.feature_name} not available")
        return getattr(module, name)

    def __bool__(self):
        """Allow using in boolean context (e.g., if FUSION_GENERATE:)"""
        return self.available


class LazyModuleRegistry:
    """
    Central registry for all lazy-loaded modules.

    Manages feature flags and provides capability detection.
    """

    def __init__(self):
        self._modules: Dict[str, LazyModule] = {}

    def register(
        self,
        name: str,
        import_path: str,
        module_name: str = None,
        feature_name: str = None,
        assume_available: bool = True,
        disabled_if_rag_disabled: bool = False
    ) -> LazyModule:
        """
        Register a lazy module.

        Args:
            name: Registry key (e.g., 'fusion_generate')
            import_path: Import path
            module_name: Module attribute name
            feature_name: Human-readable name
            assume_available: Assume available until load fails
            disabled_if_rag_disabled: Disable if RAG_DISABLE=1

        Returns:
            LazyModule instance
        """
        if name in self._modules:
            logger.warning(f"[LazyRegistry] Module '{name}' already registered, overwriting")

        self._modules[name] = LazyModule(
            import_path=import_path,
            module_name=module_name,
            feature_name=feature_name or name,
            assume_available=assume_available,
            disabled_if_rag_disabled=disabled_if_rag_disabled
        )

        return self._modules[name]

    def get(self, name: str) -> Optional[LazyModule]:
        """Get a registered lazy module."""
        return self._modules.get(name)

    def is_available(self, name: str) -> bool:
        """Check if a module is available."""
        module = self.get(name)
        return module.available if module else False

    def capabilities(self) -> Dict[str, bool]:
        """Get all module availability status."""
        return {name: module.available for name, module in self._modules.items()}

    def load_all(self) -> None:
        """Load all modules (for warmup)."""
        logger.info("[LazyRegistry] Loading all modules...")
        for name, module in self._modules.items():
            module.load()
        logger.info(f"[LazyRegistry] Loaded {sum(self.capabilities().values())}/{len(self._modules)} modules")


# ============================================================================
# GLOBAL REGISTRY
# ============================================================================

_registry = LazyModuleRegistry()


# ============================================================================
# MODULE REGISTRATIONS
# ============================================================================

# AI Generation
FUSION_GENERATE = _registry.register(
    'fusion_generate',
    'backend_ai.model.fusion_generate',
    feature_name='AI Generation (GPT-4/5)',
    assume_available=True
)

# RAG Systems (disabled if RAG_DISABLE=1)
ICHING_RAG = _registry.register(
    'iching_rag',
    'backend_ai.app.iching_rag',
    feature_name='I-Ching RAG',
    assume_available=True,
    disabled_if_rag_disabled=True
)

PERSONA_EMBED = _registry.register(
    'persona_embeddings',
    'backend_ai.app.persona_embeddings',
    feature_name='Persona Embeddings (Jung/Stoic)',
    assume_available=True,
    disabled_if_rag_disabled=True
)

TAROT_HYBRID_RAG = _registry.register(
    'tarot_hybrid_rag',
    'backend_ai.app.tarot_hybrid_rag',
    feature_name='Tarot Hybrid RAG',
    assume_available=True
)

DOMAIN_RAG = _registry.register(
    'domain_rag',
    'backend_ai.app.domain_rag',
    feature_name='Domain RAG',
    assume_available=True,
    disabled_if_rag_disabled=True
)

COMPATIBILITY = _registry.register(
    'compatibility_logic',
    'backend_ai.app.compatibility_logic',
    feature_name='Compatibility Analysis',
    assume_available=True
)

HYBRID_RAG = _registry.register(
    'hybrid_rag',
    'backend_ai.app.hybrid_rag',
    feature_name='Hybrid RAG (BM25 + Vector)',
    assume_available=True
)

AGENTIC_RAG = _registry.register(
    'agentic_rag',
    'backend_ai.app.agentic_rag',
    feature_name='Agentic RAG (Multi-hop)',
    assume_available=True
)

COUNSELING = _registry.register(
    'counseling_engine',
    'backend_ai.app.counseling_engine',
    feature_name='Jungian Counseling Engine',
    assume_available=True
)

SAJU_ASTRO_RAG = _registry.register(
    'saju_astro_rag',
    'backend_ai.app.saju_astro_rag',
    feature_name='Saju/Astro Graph RAG',
    assume_available=True,
    disabled_if_rag_disabled=True
)

CORPUS_RAG = _registry.register(
    'corpus_rag',
    'backend_ai.app.corpus_rag',
    feature_name='Corpus RAG (Jung/Stoic Quotes)',
    assume_available=True,
    disabled_if_rag_disabled=True
)

# Optional Features (try-catch imports in original code)
REALTIME_ASTRO = _registry.register(
    'realtime_astro',
    'backend_ai.app.realtime_astro',
    feature_name='Realtime Astrology',
    assume_available=False  # Pessimistic (was try-catch)
)

CHART_GEN = _registry.register(
    'chart_generator',
    'backend_ai.app.chart_generator',
    feature_name='Chart Generation (SVG)',
    assume_available=False  # Pessimistic
)

USER_MEMORY = _registry.register(
    'user_memory',
    'backend_ai.app.user_memory',
    feature_name='User Memory (MOAT)',
    assume_available=False  # Pessimistic
)

BADGES = _registry.register(
    'badge_system',
    'backend_ai.app.badge_system',
    feature_name='Badge System',
    assume_available=True
)

RLHF = _registry.register(
    'feedback_learning',
    'backend_ai.app.feedback_learning',
    feature_name='RLHF Feedback Learning',
    assume_available=True
)

PREDICTION = _registry.register(
    'prediction_engine',
    'backend_ai.app.prediction_engine',
    feature_name='Prediction Engine',
    assume_available=True
)

THEME_FILTER = _registry.register(
    'theme_cross_filter',
    'backend_ai.app.theme_cross_filter',
    feature_name='Theme Cross Filter',
    assume_available=True
)

FORTUNE_SCORE = _registry.register(
    'fortune_score_engine',
    'backend_ai.app.fortune_score_engine',
    feature_name='Fortune Score Engine',
    assume_available=True
)


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def get_capabilities() -> Dict[str, bool]:
    """
    Get all module capabilities.

    Returns:
        Dict mapping feature names to availability status
    """
    return _registry.capabilities()


def warmup_modules() -> None:
    """
    Load all modules for warmup (e.g., on startup).

    This triggers all lazy loads to catch import errors early.
    """
    _registry.load_all()


def get_module(name: str) -> Optional[LazyModule]:
    """
    Get a lazy module by name.

    Args:
        name: Module name (e.g., 'fusion_generate')

    Returns:
        LazyModule instance or None
    """
    return _registry.get(name)


# ============================================================================
# LEGACY COMPATIBILITY (for gradual migration)
# ============================================================================

# Feature flags (HAS_* variables)
HAS_REALTIME = REALTIME_ASTRO
HAS_CHARTS = CHART_GEN
HAS_USER_MEMORY = USER_MEMORY
HAS_PERSONA_EMBED = PERSONA_EMBED
HAS_TAROT = TAROT_HYBRID_RAG
HAS_RLHF = RLHF
HAS_BADGES = BADGES
HAS_DOMAIN_RAG = DOMAIN_RAG
HAS_COMPATIBILITY = COMPATIBILITY
HAS_HYBRID_RAG = HYBRID_RAG
HAS_AGENTIC = AGENTIC_RAG
HAS_PREDICTION = PREDICTION
HAS_THEME_FILTER = THEME_FILTER
HAS_FORTUNE_SCORE = FORTUNE_SCORE
HAS_ICHING = ICHING_RAG
HAS_COUNSELING = COUNSELING
HAS_GRAPH_RAG = SAJU_ASTRO_RAG
HAS_CORPUS_RAG = CORPUS_RAG


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # Classes
    'LazyModule',
    'LazyModuleRegistry',

    # Main modules
    'FUSION_GENERATE',
    'ICHING_RAG',
    'PERSONA_EMBED',
    'TAROT_HYBRID_RAG',
    'DOMAIN_RAG',
    'COMPATIBILITY',
    'HYBRID_RAG',
    'AGENTIC_RAG',
    'COUNSELING',
    'SAJU_ASTRO_RAG',
    'CORPUS_RAG',
    'REALTIME_ASTRO',
    'CHART_GEN',
    'USER_MEMORY',
    'BADGES',
    'RLHF',
    'PREDICTION',
    'THEME_FILTER',
    'FORTUNE_SCORE',

    # Functions
    'get_capabilities',
    'warmup_modules',
    'get_module',

    # Legacy compatibility
    'HAS_REALTIME',
    'HAS_CHARTS',
    'HAS_USER_MEMORY',
    'HAS_PERSONA_EMBED',
    'HAS_TAROT',
    'HAS_RLHF',
    'HAS_BADGES',
    'HAS_DOMAIN_RAG',
    'HAS_COMPATIBILITY',
    'HAS_HYBRID_RAG',
    'HAS_AGENTIC',
    'HAS_PREDICTION',
    'HAS_THEME_FILTER',
    'HAS_FORTUNE_SCORE',
    'HAS_ICHING',
    'HAS_COUNSELING',
    'HAS_GRAPH_RAG',
    'HAS_CORPUS_RAG',
]
