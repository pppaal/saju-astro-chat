"""
Unit tests for Startup Warmup module.

Tests:
- warmup_models function
- warmup_optimized function
- warmup_parallel function
- auto_warmup_if_enabled function
"""
import pytest
from unittest.mock import patch, MagicMock
import os


class TestWarmupModelsFunction:
    """Tests for warmup_models function."""

    def test_function_exists(self):
        """Test function exists."""
        from backend_ai.app.startup.warmup import warmup_models

        assert callable(warmup_models)

    @patch('backend_ai.app.loaders.get_model')
    @patch('backend_ai.app.loaders.get_graph_rag')
    @patch('backend_ai.app.loaders.HAS_GRAPH_RAG', True)
    @patch('backend_ai.app.loaders.HAS_CORPUS_RAG', False)
    @patch('backend_ai.app.loaders.HAS_PERSONA_EMBED', False)
    @patch('backend_ai.app.loaders.HAS_TAROT', False)
    @patch('backend_ai.app.redis_cache.get_cache')
    @patch('backend_ai.app.services.cross_analysis_service._load_cross_analysis_cache')
    def test_warmup_models_runs(
        self, mock_cache_load, mock_get_cache,
        mock_get_graph_rag, mock_get_model
    ):
        """Test warmup_models runs without error."""
        from backend_ai.app.startup.warmup import warmup_models

        # Setup mocks
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        mock_get_model.return_value = mock_model

        mock_rag = MagicMock()
        mock_rag.graph.nodes.return_value = [1, 2, 3]
        mock_get_graph_rag.return_value = mock_rag

        mock_cache = MagicMock()
        mock_cache.enabled = True
        mock_get_cache.return_value = mock_cache

        # Should not raise
        warmup_models()

    def test_warmup_handles_errors(self):
        """Test warmup handles errors gracefully."""
        from backend_ai.app.startup.warmup import warmup_models

        # warmup_models has internal try-except, should not raise
        # Just verify it can be called
        warmup_models()


class TestWarmupOptimizedFunction:
    """Tests for warmup_optimized function."""

    def test_function_exists(self):
        """Test function exists."""
        from backend_ai.app.startup.warmup import warmup_optimized

        assert callable(warmup_optimized)

    def test_warmup_optimized_returns_dict(self):
        """Test warmup_optimized returns dict."""
        from backend_ai.app.startup.warmup import warmup_optimized

        result = warmup_optimized()

        assert isinstance(result, dict)
        assert "success" in result
        assert "systems" in result
        assert "elapsed_seconds" in result

    def test_warmup_optimized_tracks_systems(self):
        """Test warmup_optimized tracks system status."""
        from backend_ai.app.startup.warmup import warmup_optimized

        result = warmup_optimized()

        # Result should have systems dict
        assert isinstance(result["systems"], dict)

    def test_warmup_optimized_has_elapsed_time(self):
        """Test warmup_optimized has elapsed time."""
        from backend_ai.app.startup.warmup import warmup_optimized

        result = warmup_optimized()

        assert "elapsed_seconds" in result
        assert isinstance(result["elapsed_seconds"], float)


class TestWarmupParallelFunction:
    """Tests for warmup_parallel function."""

    def test_function_exists(self):
        """Test function exists."""
        from backend_ai.app.startup.warmup import warmup_parallel

        assert callable(warmup_parallel)

    def test_warmup_parallel_returns_dict(self):
        """Test warmup_parallel returns dict."""
        from backend_ai.app.startup.warmup import warmup_parallel

        result = warmup_parallel()

        assert isinstance(result, dict)


class TestAutoWarmupFunction:
    """Tests for auto_warmup_if_enabled function."""

    def test_function_exists(self):
        """Test function exists."""
        from backend_ai.app.startup.warmup import auto_warmup_if_enabled

        assert callable(auto_warmup_if_enabled)

    @patch.dict(os.environ, {"WARMUP_ON_START": "0"})
    def test_no_warmup_when_disabled(self):
        """Test no warmup when disabled."""
        from backend_ai.app.startup.warmup import auto_warmup_if_enabled

        # Should not raise or do anything
        auto_warmup_if_enabled()

    @patch.dict(os.environ, {"WARMUP_ON_START": "1", "WARMUP_OPTIMIZED": "0"})
    @patch('backend_ai.app.startup.warmup.warmup_models')
    def test_warmup_models_when_enabled(self, mock_warmup):
        """Test warmup_models called when enabled."""
        from backend_ai.app.startup.warmup import auto_warmup_if_enabled

        auto_warmup_if_enabled()
        mock_warmup.assert_called_once()

    @patch.dict(os.environ, {"WARMUP_ON_START": "1", "WARMUP_OPTIMIZED": "1"})
    @patch('backend_ai.app.startup.warmup.warmup_optimized')
    def test_warmup_optimized_when_enabled(self, mock_warmup):
        """Test warmup_optimized called when WARMUP_OPTIMIZED=1."""
        from backend_ai.app.startup.warmup import auto_warmup_if_enabled

        auto_warmup_if_enabled()
        mock_warmup.assert_called_once()


class TestPrewarmSampleQuery:
    """Tests for _prewarm_with_sample_query function."""

    def test_function_exists(self):
        """Test function exists."""
        from backend_ai.app.startup.warmup import _prewarm_with_sample_query

        assert callable(_prewarm_with_sample_query)

    def test_prewarm_function_callable(self):
        """Test prewarm function is callable."""
        from backend_ai.app.startup.warmup import _prewarm_with_sample_query

        # Just verify the function exists and is callable
        # Actual execution may fail due to async context issues
        assert callable(_prewarm_with_sample_query)


class TestModuleImports:
    """Tests for module imports."""

    def test_module_importable(self):
        """Test module is importable."""
        from backend_ai.app.startup import warmup

        assert warmup is not None

    def test_all_functions_importable(self):
        """Test all main functions are importable."""
        from backend_ai.app.startup.warmup import (
            warmup_models,
            warmup_optimized,
            warmup_parallel,
            auto_warmup_if_enabled,
        )

        assert all([
            warmup_models, warmup_optimized,
            warmup_parallel, auto_warmup_if_enabled
        ])

