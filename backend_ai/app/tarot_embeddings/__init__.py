# backend_ai/app/tarot_embeddings/__init__.py
"""
Tarot Advanced Embeddings Package
=================================
Modular implementation of TarotAdvancedEmbeddings with mixins.

Package Structure:
- search_methods.py: Search functionality (search, search_batch, search_hybrid)
- cache_methods.py: Cache and embedding management (export/import)
- status_methods.py: System status and benchmarking

The main class TarotAdvancedEmbeddings combines all mixins.
"""

import os
import json
import logging
import threading
from typing import Optional

logger = logging.getLogger(__name__)

# Import utilities from tarot package
try:
    from backend_ai.app.tarot import (
        SearchMetrics,
        LRUCache,
        detect_best_device,
        MODEL_OPTIONS,
        DEFAULT_MODEL,
    )
    from backend_ai.app.tarot_extractors import FILE_HANDLERS
except ImportError:
    from backend_ai.app.tarot import (
        SearchMetrics,
        LRUCache,
        detect_best_device,
        MODEL_OPTIONS,
        DEFAULT_MODEL,
    )
    from backend_ai.app.tarot_extractors import FILE_HANDLERS

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print("[TarotAdvancedEmbeddings] sentence-transformers not installed. Semantic search disabled.")

# Import mixins
from .search_methods import SearchMethodsMixin
from .cache_methods import CacheMethodsMixin
from .status_methods import StatusMethodsMixin


class TarotAdvancedEmbeddings(SearchMethodsMixin, CacheMethodsMixin, StatusMethodsMixin):
    """
    Advanced tarot rules embedding and semantic search (v3.0 - Enterprise).

    Combines functionality from:
    - SearchMethodsMixin: search, search_batch, search_hybrid
    - CacheMethodsMixin: cache management, export/import
    - StatusMethodsMixin: status, health check, benchmark
    """

    def __init__(
        self,
        rules_dir: str = None,
        model_quality: str = DEFAULT_MODEL,
        device: str = 'auto',
        use_float16: bool = False,
        cache_queries: bool = True,
        query_cache_size: int = 128,
        verbose: bool = True
    ):
        """
        Initialize TarotAdvancedEmbeddings.

        Args:
            rules_dir: Path to advanced rules directory
            model_quality: 'high', 'medium', or 'fast' (default: 'high')
            device: Device for inference - 'auto', 'cuda', 'mps', or 'cpu' (default: 'auto')
            use_float16: Use float16 for embeddings to save memory (default: False)
            cache_queries: Enable query result caching (default: True)
            query_cache_size: Max cached queries (default: 128)
            verbose: Print status messages (default: True)
        """
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            rules_dir = os.path.join(base_dir, "data", "graph", "rules", "tarot", "advanced")

        self.rules_dir = rules_dir
        self.embed_cache_path = os.path.join(rules_dir, "advanced_embeds.pt")
        self.model_quality = model_quality
        self.model_name = MODEL_OPTIONS.get(model_quality, MODEL_OPTIONS['high'])
        self.use_float16 = use_float16
        self.verbose = verbose

        # Device selection (GPU auto-detection)
        if device == 'auto':
            self.device = detect_best_device()
        else:
            self.device = device
        self._log(f"Using device: {self.device}")

        # Data storage
        self.entries = []  # [{category, subcategory, text, data, ...}]
        self.embeddings = None
        self._data_hash = None  # Hash for cache invalidation

        # Query result cache
        self._query_cache = LRUCache(maxsize=query_cache_size) if cache_queries else None

        # Lazy model
        self._model = None
        self._model_load_failed = False
        self._is_warmed_up = False

        # Thread safety (v3.0)
        self._lock = threading.RLock()

        # Metrics tracking (v3.0)
        self._metrics = SearchMetrics()

        # Load and embed
        self._load_all_rules()
        self._prepare_embeddings()

    def _log(self, message: str, level: str = 'info'):
        """Conditional logging."""
        if self.verbose:
            prefix = "[TarotAdvancedEmbeddings]"
            if level == 'error':
                logger.error(f"{prefix} {message}")
                print(f"{prefix} ERROR: {message}")
            elif level == 'warning':
                logger.warning(f"{prefix} {message}")
                print(f"{prefix} WARNING: {message}")
            else:
                logger.info(f"{prefix} {message}")
                print(f"{prefix} {message}")

    @property
    def model(self):
        """Lazy load SentenceTransformer model - uses shared model from model_manager."""
        if self._model is None and not self._model_load_failed:
            if not SENTENCE_TRANSFORMERS_AVAILABLE:
                self._model_load_failed = True
                return None

            # OPTIMIZATION: Use shared model from model_manager to save memory (~400MB)
            try:
                from backend_ai.app.rag.model_manager import get_shared_model
                self._model = get_shared_model()
                if self._model is not None:
                    self._log(f"Using shared model from model_manager (memory optimized)")
                    return self._model
                else:
                    self._log("Shared model not available, falling back to local load", level='warning')
            except ImportError as e:
                self._log(f"model_manager not available: {e}, using local model", level='warning')

            # Fallback: Load model locally (only if shared model fails)
            os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

            # Model loading attempts (with fallback)
            models_to_try = [
                self.model_name,
                MODEL_OPTIONS['medium'],
                MODEL_OPTIONS['fast']
            ]
            # Remove duplicates
            models_to_try = list(dict.fromkeys(models_to_try))

            for model_name in models_to_try:
                try:
                    self._log(f"Loading model locally: {model_name} on {self.device}...")
                    self._model = SentenceTransformer(model_name, device=self.device)
                    self.model_name = model_name
                    self._log(f"Model loaded successfully: {model_name} (device: {self.device})")
                    break
                except Exception as e:
                    self._log(f"Failed to load {model_name}: {e}", level='warning')
                    # Fallback to CPU if GPU fails
                    if self.device != 'cpu':
                        try:
                            self._log(f"Retrying {model_name} on CPU...")
                            self._model = SentenceTransformer(model_name, device='cpu')
                            self.device = 'cpu'
                            self.model_name = model_name
                            self._log(f"Model loaded on CPU fallback: {model_name}")
                            break
                        except Exception as e2:
                            self._log(f"CPU fallback also failed: {e2}", level='warning')
                    continue

            if self._model is None:
                self._log("All model loading attempts failed", level='error')
                self._model_load_failed = True

        return self._model

    def _load_all_rules(self):
        """Load all advanced rule JSON files and extract searchable entries."""
        if not os.path.exists(self.rules_dir):
            print(f"[TarotAdvancedEmbeddings] Rules directory not found: {self.rules_dir}")
            return

        # Use extractors from tarot_extractors module
        for filename, handler in FILE_HANDLERS.items():
            path = os.path.join(self.rules_dir, filename)
            if os.path.exists(path):
                try:
                    with open(path, encoding='utf-8') as f:
                        data = json.load(f)
                        handler(self.entries, data, filename)
                        print(f"[TarotAdvancedEmbeddings] Extracted from {filename}")
                except Exception as e:
                    print(f"[TarotAdvancedEmbeddings] Failed to load {filename}: {e}")

        print(f"[TarotAdvancedEmbeddings] Total entries: {len(self.entries)}")


# Singleton instance
_tarot_advanced_embeddings = None


def get_tarot_advanced_embeddings() -> TarotAdvancedEmbeddings:
    """Get or create singleton instance."""
    global _tarot_advanced_embeddings
    if _tarot_advanced_embeddings is None:
        _tarot_advanced_embeddings = TarotAdvancedEmbeddings()
    return _tarot_advanced_embeddings


__all__ = [
    "TarotAdvancedEmbeddings",
    "get_tarot_advanced_embeddings",
    "SearchMethodsMixin",
    "CacheMethodsMixin",
    "StatusMethodsMixin",
]
