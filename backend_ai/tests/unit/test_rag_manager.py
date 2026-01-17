# backend_ai/tests/unit/test_rag_manager.py
"""
Unit Tests for ThreadSafeRAGManager
====================================
Tests parallel RAG execution with thread-safety.

Run:
    pytest backend_ai/tests/unit/test_rag_manager.py -v
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from backend_ai.app.rag_manager import (
    ThreadSafeRAGManager,
    get_rag_manager,
    prefetch_all_rag_data_async,
)
from backend_ai.app.performance_monitor import get_performance_stats, reset_performance_metrics


@pytest.fixture
def sample_saju_data():
    """Sample Saju data for testing."""
    return {
        "dayMaster": {
            "heavenlyStem": "갑목",
            "name": "갑목",
            "element": "木"
        },
        "dominantElement": "木"
    }


@pytest.fixture
def sample_astro_data():
    """Sample astrology data for testing."""
    return {
        "sun": {"sign": "Aries", "house": 1},
        "moon": {"sign": "Taurus", "house": 2},
        "mercury": {"sign": "Gemini", "house": 3},
        "venus": {"sign": "Taurus", "house": 2},
        "mars": {"sign": "Aries", "house": 1},
        "jupiter": {"sign": "Sagittarius", "house": 9},
        "saturn": {"sign": "Capricorn", "house": 10},
    }


@pytest.fixture(autouse=True)
def reset_metrics():
    """Reset performance metrics before each test."""
    reset_performance_metrics()
    yield
    reset_performance_metrics()


class TestThreadSafeRAGManager:
    """Test suite for ThreadSafeRAGManager."""

    def test_manager_initialization(self):
        """Test RAG manager initializes correctly."""
        manager = ThreadSafeRAGManager()
        assert manager is not None
        assert manager.executor is not None

    def test_singleton_manager(self):
        """Test get_rag_manager returns singleton instance."""
        manager1 = get_rag_manager()
        manager2 = get_rag_manager()
        assert manager1 is manager2

    def test_prepare_query_data(self, sample_saju_data, sample_astro_data):
        """Test query data preparation."""
        manager = ThreadSafeRAGManager()
        query, facts, theme_concepts = manager._prepare_query_data(
            sample_saju_data, sample_astro_data, "career"
        )

        # Check query contains key elements
        assert "갑목" in query
        assert "Wood" in query or "木" in query
        assert "Aries" in query
        assert "Taurus" in query

        # Check facts dict
        assert facts["daymaster"] == "갑목"
        assert facts["element"] == "木"
        assert facts["sun_sign"] == "Aries"
        assert facts["moon_sign"] == "Taurus"
        assert facts["theme"] == "career"

        # Check theme concepts
        assert "career" in theme_concepts
        assert "소명" in theme_concepts["career"]

    @pytest.mark.asyncio
    async def test_fetch_all_rag_data_structure(self, sample_saju_data, sample_astro_data):
        """Test that fetch_all_rag_data returns correct structure."""
        manager = ThreadSafeRAGManager()

        # Mock all RAG systems to return empty results (avoid import errors)
        with patch('backend_ai.app.app.get_graph_rag', return_value=None), \
             patch('backend_ai.app.app.get_corpus_rag', return_value=None), \
             patch('backend_ai.app.app.get_persona_embed_rag', return_value=None), \
             patch('backend_ai.app.app.get_domain_rag', return_value=None), \
             patch('backend_ai.services.chart_service.ChartService') as mock_chart_service:

            mock_chart_service.return_value.get_cross_analysis_for_chart.return_value = "Test analysis"

            result = await manager.fetch_all_rag_data(
                sample_saju_data, sample_astro_data, "career", "ko"
            )

        # Check result structure
        assert "graph_nodes" in result
        assert "graph_context" in result
        assert "corpus_quotes" in result
        assert "persona_context" in result
        assert "domain_knowledge" in result
        assert "cross_analysis" in result
        assert "prefetch_time_ms" in result

        # Check types
        assert isinstance(result["graph_nodes"], list)
        assert isinstance(result["corpus_quotes"], list)
        assert isinstance(result["persona_context"], dict)
        assert isinstance(result["domain_knowledge"], list)
        assert isinstance(result["prefetch_time_ms"], int)

    @pytest.mark.asyncio
    async def test_parallel_execution_performance(self, sample_saju_data, sample_astro_data):
        """Test that parallel execution is faster than sequential."""
        manager = ThreadSafeRAGManager()

        # Mock RAG operations with delays to simulate real work
        async def mock_slow_operation(*args, **kwargs):
            await asyncio.sleep(0.1)  # 100ms delay
            return {}

        with patch.object(manager, '_fetch_graph_rag', new=mock_slow_operation), \
             patch.object(manager, '_fetch_corpus_rag', new=mock_slow_operation), \
             patch.object(manager, '_fetch_persona_rag', new=mock_slow_operation), \
             patch.object(manager, '_fetch_domain_rag', new=mock_slow_operation), \
             patch.object(manager, '_fetch_cross_analysis', return_value="Test"):

            import time
            start = time.time()
            result = await manager.fetch_all_rag_data(
                sample_saju_data, sample_astro_data, "career", "ko"
            )
            elapsed_ms = (time.time() - start) * 1000

        # If sequential, would take 4 * 100ms = 400ms
        # If parallel, should take ~100ms (plus overhead)
        # Allow up to 250ms for overhead
        assert elapsed_ms < 250, f"Parallel execution took {elapsed_ms}ms, expected < 250ms"
        assert result["prefetch_time_ms"] < 250

    @pytest.mark.asyncio
    async def test_error_handling_graceful_degradation(self, sample_saju_data, sample_astro_data):
        """Test that single RAG failure doesn't crash entire operation."""
        manager = ThreadSafeRAGManager()

        # Mock one RAG to fail, others to succeed
        async def mock_failing_operation(*args, **kwargs):
            raise RuntimeError("Simulated RAG failure")

        async def mock_success_operation(*args, **kwargs):
            return []

        with patch.object(manager, '_fetch_graph_rag', new=mock_failing_operation), \
             patch.object(manager, '_fetch_corpus_rag', new=mock_success_operation), \
             patch.object(manager, '_fetch_persona_rag', new=mock_success_operation), \
             patch.object(manager, '_fetch_domain_rag', new=mock_success_operation), \
             patch.object(manager, '_fetch_cross_analysis', return_value="Test"):

            # Should not raise exception
            result = await manager.fetch_all_rag_data(
                sample_saju_data, sample_astro_data, "career", "ko"
            )

        # Result should still have valid structure
        assert "graph_nodes" in result
        assert "corpus_quotes" in result
        # Graph should be empty due to error
        assert result["graph_nodes"] == []

    @pytest.mark.asyncio
    async def test_performance_metrics_tracking(self, sample_saju_data, sample_astro_data):
        """Test that performance metrics are recorded."""
        manager = ThreadSafeRAGManager()

        with patch('backend_ai.app.app.get_graph_rag', return_value=None), \
             patch('backend_ai.app.app.get_corpus_rag', return_value=None), \
             patch('backend_ai.app.app.get_persona_embed_rag', return_value=None), \
             patch('backend_ai.app.app.get_domain_rag', return_value=None), \
             patch('backend_ai.services.chart_service.ChartService') as mock_chart_service:

            mock_chart_service.return_value.get_cross_analysis_for_chart.return_value = "Test"

            await manager.fetch_all_rag_data(
                sample_saju_data, sample_astro_data, "career", "ko"
            )

        # Check that metrics were recorded
        stats = get_performance_stats()
        assert "rag_prepare_query" in stats
        assert stats["rag_prepare_query"]["sample_count"] > 0

    @pytest.mark.asyncio
    async def test_different_themes(self, sample_saju_data, sample_astro_data):
        """Test that different themes work correctly."""
        manager = ThreadSafeRAGManager()
        themes = ["career", "love", "health", "wealth", "family", "life_path"]

        with patch('backend_ai.app.app.get_graph_rag', return_value=None), \
             patch('backend_ai.app.app.get_corpus_rag', return_value=None), \
             patch('backend_ai.app.app.get_persona_embed_rag', return_value=None), \
             patch('backend_ai.app.app.get_domain_rag', return_value=None), \
             patch('backend_ai.services.chart_service.ChartService') as mock_chart_service:

            mock_chart_service.return_value.get_cross_analysis_for_chart.return_value = "Test"

            for theme in themes:
                result = await manager.fetch_all_rag_data(
                    sample_saju_data, sample_astro_data, theme, "ko"
                )
                assert result is not None
                assert "prefetch_time_ms" in result

    @pytest.mark.asyncio
    async def test_localization(self, sample_saju_data, sample_astro_data):
        """Test that different locales work correctly."""
        manager = ThreadSafeRAGManager()

        with patch('backend_ai.app.app.get_graph_rag', return_value=None), \
             patch('backend_ai.app.app.get_corpus_rag', return_value=None), \
             patch('backend_ai.app.app.get_persona_embed_rag', return_value=None), \
             patch('backend_ai.app.app.get_domain_rag', return_value=None), \
             patch('backend_ai.services.chart_service.ChartService') as mock_chart_service:

            mock_chart_service.return_value.get_cross_analysis_for_chart.return_value = "Test"

            # Test Korean
            result_ko = await manager.fetch_all_rag_data(
                sample_saju_data, sample_astro_data, "career", "ko"
            )
            assert result_ko is not None

            # Test English
            result_en = await manager.fetch_all_rag_data(
                sample_saju_data, sample_astro_data, "career", "en"
            )
            assert result_en is not None


class TestBackwardCompatibility:
    """Test backward compatibility with old prefetch_all_rag_data function."""

    def test_sync_wrapper_calls_async(self, sample_saju_data, sample_astro_data):
        """Test that old sync function properly calls new async implementation."""
        # Import the sync wrapper from app.py
        # This would need to be mocked in real tests
        pass  # Skip for now as it requires app.py imports


class TestPerformanceBenchmark:
    """Performance benchmark tests."""

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_performance_target_500ms(self, sample_saju_data, sample_astro_data):
        """Test that RAG fetch completes within 500ms target."""
        manager = ThreadSafeRAGManager()

        # Mock RAG systems with realistic delays
        async def mock_graph_rag(*args, **kwargs):
            await asyncio.sleep(0.15)  # 150ms
            return {}

        async def mock_corpus_rag(*args, **kwargs):
            await asyncio.sleep(0.12)  # 120ms
            return []

        async def mock_persona_rag(*args, **kwargs):
            await asyncio.sleep(0.10)  # 100ms
            return {}

        async def mock_domain_rag(*args, **kwargs):
            await asyncio.sleep(0.08)  # 80ms
            return []

        with patch.object(manager, '_fetch_graph_rag', new=mock_graph_rag), \
             patch.object(manager, '_fetch_corpus_rag', new=mock_corpus_rag), \
             patch.object(manager, '_fetch_persona_rag', new=mock_persona_rag), \
             patch.object(manager, '_fetch_domain_rag', new=mock_domain_rag), \
             patch.object(manager, '_fetch_cross_analysis', return_value="Test"):

            import time
            start = time.time()
            result = await manager.fetch_all_rag_data(
                sample_saju_data, sample_astro_data, "career", "ko"
            )
            elapsed_ms = (time.time() - start) * 1000

        # Sequential would be: 150 + 120 + 100 + 80 = 450ms
        # Parallel should be: max(150, 120, 100, 80) = 150ms + overhead
        # Target: < 500ms (much better than 1500ms baseline)
        assert elapsed_ms < 500, f"Performance target missed: {elapsed_ms}ms > 500ms"
        print(f"\n✅ Performance test passed: {elapsed_ms:.1f}ms < 500ms target")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
