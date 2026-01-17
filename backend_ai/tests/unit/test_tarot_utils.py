"""
Unit tests for Tarot Utils module.

Tests:
- SearchMetrics dataclass
- LRUCache class
- detect_best_device function
"""
import pytest
from unittest.mock import patch, MagicMock


class TestSearchMetricsDataclass:
    """Tests for SearchMetrics dataclass."""

    def test_search_metrics_exists(self):
        """SearchMetrics dataclass should exist."""
        from app.tarot.utils import SearchMetrics

        assert SearchMetrics is not None

    def test_search_metrics_instantiation(self):
        """SearchMetrics should be instantiable with defaults."""
        from app.tarot.utils import SearchMetrics

        metrics = SearchMetrics()

        assert metrics.total_searches == 0
        assert metrics.cache_hits == 0
        assert metrics.cache_misses == 0
        assert metrics.errors == 0

    def test_search_metrics_avg_latency(self):
        """avg_latency_ms property should calculate correctly."""
        from app.tarot.utils import SearchMetrics

        metrics = SearchMetrics()
        metrics.total_searches = 10
        metrics.total_latency_ms = 100.0

        assert metrics.avg_latency_ms == 10.0

    def test_search_metrics_avg_latency_zero_searches(self):
        """avg_latency_ms should return 0 when no searches."""
        from app.tarot.utils import SearchMetrics

        metrics = SearchMetrics()

        assert metrics.avg_latency_ms == 0.0

    def test_search_metrics_cache_hit_rate(self):
        """cache_hit_rate property should calculate correctly."""
        from app.tarot.utils import SearchMetrics

        metrics = SearchMetrics()
        metrics.cache_hits = 75
        metrics.cache_misses = 25

        assert metrics.cache_hit_rate == 0.75

    def test_search_metrics_cache_hit_rate_zero(self):
        """cache_hit_rate should return 0 when no cache operations."""
        from app.tarot.utils import SearchMetrics

        metrics = SearchMetrics()

        assert metrics.cache_hit_rate == 0.0

    def test_search_metrics_to_dict(self):
        """to_dict should return dict representation."""
        from app.tarot.utils import SearchMetrics

        metrics = SearchMetrics()
        metrics.total_searches = 5
        metrics.cache_hits = 3
        metrics.cache_misses = 2

        result = metrics.to_dict()

        assert isinstance(result, dict)
        assert result['total_searches'] == 5
        assert result['cache_hits'] == 3
        assert 'avg_latency_ms' in result

    def test_search_metrics_reset(self):
        """reset should clear all metrics."""
        from app.tarot.utils import SearchMetrics

        metrics = SearchMetrics()
        metrics.total_searches = 100
        metrics.cache_hits = 50
        metrics.errors = 5

        metrics.reset()

        assert metrics.total_searches == 0
        assert metrics.cache_hits == 0
        assert metrics.errors == 0


class TestDetectBestDevice:
    """Tests for detect_best_device function."""

    def test_detect_best_device_exists(self):
        """detect_best_device function should exist."""
        from app.tarot.utils import detect_best_device

        assert callable(detect_best_device)

    def test_detect_best_device_returns_string(self):
        """detect_best_device should return a string."""
        from app.tarot.utils import detect_best_device

        result = detect_best_device()

        assert isinstance(result, str)
        assert result in ['cpu', 'cuda', 'mps']

    @patch('torch.cuda.is_available', return_value=True)
    def test_detect_best_device_cuda(self, mock_cuda):
        """detect_best_device should return cuda when available."""
        from app.tarot.utils import detect_best_device

        result = detect_best_device()

        assert result == 'cuda'

    @patch('torch.cuda.is_available', return_value=False)
    def test_detect_best_device_cpu_fallback(self, mock_cuda):
        """detect_best_device should fallback to cpu."""
        from app.tarot.utils import detect_best_device

        # This test just verifies the function runs
        result = detect_best_device()

        assert result in ['cpu', 'mps']


class TestLRUCache:
    """Tests for LRUCache class."""

    def test_lru_cache_exists(self):
        """LRUCache class should exist."""
        from app.tarot.utils import LRUCache

        assert LRUCache is not None

    def test_lru_cache_instantiation(self):
        """LRUCache should be instantiable."""
        from app.tarot.utils import LRUCache

        cache = LRUCache(maxsize=100)

        assert cache is not None
        assert cache.maxsize == 100

    def test_lru_cache_default_maxsize(self):
        """LRUCache should have default maxsize of 128."""
        from app.tarot.utils import LRUCache

        cache = LRUCache()

        assert cache.maxsize == 128

    def test_lru_cache_get_miss(self):
        """get should return None for missing key."""
        from app.tarot.utils import LRUCache

        cache = LRUCache()

        result = cache.get("nonexistent")

        assert result is None

    def test_lru_cache_set_and_get(self):
        """set and get should work correctly."""
        from app.tarot.utils import LRUCache

        cache = LRUCache()
        cache.set("key1", "value1")

        result = cache.get("key1")

        assert result == "value1"

    def test_lru_cache_eviction(self):
        """LRU cache should evict oldest when full."""
        from app.tarot.utils import LRUCache

        cache = LRUCache(maxsize=2)
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")  # Should evict key1

        assert cache.get("key1") is None
        assert cache.get("key2") == "value2"
        assert cache.get("key3") == "value3"

    def test_lru_cache_access_updates_order(self):
        """Accessing an item should update its order."""
        from app.tarot.utils import LRUCache

        cache = LRUCache(maxsize=2)
        cache.set("key1", "value1")
        cache.set("key2", "value2")

        # Access key1 to make it most recently used
        cache.get("key1")

        # Add key3, should evict key2 (least recently used)
        cache.set("key3", "value3")

        assert cache.get("key1") == "value1"
        assert cache.get("key2") is None
        assert cache.get("key3") == "value3"


class TestModuleExports:
    """Tests for module exports."""

    def test_search_metrics_importable(self):
        """SearchMetrics should be importable."""
        from app.tarot.utils import SearchMetrics
        assert SearchMetrics is not None

    def test_lru_cache_importable(self):
        """LRUCache should be importable."""
        from app.tarot.utils import LRUCache
        assert LRUCache is not None

    def test_detect_best_device_importable(self):
        """detect_best_device should be importable."""
        from app.tarot.utils import detect_best_device
        assert callable(detect_best_device)
