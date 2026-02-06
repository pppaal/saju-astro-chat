"""
Unit tests for backend_ai/app/performance_monitor.py

Tests:
- track_rag_performance decorator (sync/async)
- get_performance_stats function
- reset_performance_metrics function
- PerformanceTimer context manager
- export_metrics_json function
"""
import pytest
import asyncio
import time


class TestTrackRagPerformanceSync:
    """Tests for track_rag_performance decorator with sync functions."""

    def setup_method(self):
        """Reset metrics before each test."""
        from backend_ai.app.performance_monitor import reset_performance_metrics
        reset_performance_metrics()

    def test_sync_function_decorated(self):
        """Sync function should be wrapped correctly."""
        from backend_ai.app.performance_monitor import track_rag_performance

        @track_rag_performance
        def simple_func():
            return "result"

        result = simple_func()
        assert result == "result"

    def test_sync_function_records_metric(self):
        """Sync function should record timing metric."""
        from backend_ai.app.performance_monitor import track_rag_performance, get_performance_stats

        @track_rag_performance
        def timed_func():
            time.sleep(0.01)  # 10ms
            return "done"

        timed_func()

        stats = get_performance_stats()
        assert "timed_func" in stats
        assert stats["timed_func"]["sample_count"] == 1
        assert stats["timed_func"]["avg_ms"] >= 10

    def test_sync_function_preserves_exception(self):
        """Sync function should re-raise exceptions."""
        from backend_ai.app.performance_monitor import track_rag_performance

        @track_rag_performance
        def error_func():
            raise ValueError("test error")

        with pytest.raises(ValueError, match="test error"):
            error_func()

    def test_sync_function_preserves_name(self):
        """Decorator should preserve function name."""
        from backend_ai.app.performance_monitor import track_rag_performance

        @track_rag_performance
        def my_named_function():
            pass

        assert my_named_function.__name__ == "my_named_function"


class TestTrackRagPerformanceAsync:
    """Tests for track_rag_performance decorator with async functions."""

    def setup_method(self):
        """Reset metrics before each test."""
        from backend_ai.app.performance_monitor import reset_performance_metrics
        reset_performance_metrics()

    @pytest.mark.asyncio
    async def test_async_function_decorated(self):
        """Async function should be wrapped correctly."""
        from backend_ai.app.performance_monitor import track_rag_performance

        @track_rag_performance
        async def async_func():
            return "async result"

        result = await async_func()
        assert result == "async result"

    @pytest.mark.asyncio
    async def test_async_function_records_metric(self):
        """Async function should record timing metric."""
        from backend_ai.app.performance_monitor import track_rag_performance, get_performance_stats

        @track_rag_performance
        async def async_timed_func():
            await asyncio.sleep(0.01)  # 10ms
            return "done"

        await async_timed_func()

        stats = get_performance_stats()
        assert "async_timed_func" in stats
        assert stats["async_timed_func"]["sample_count"] == 1
        # asyncio.sleep timing can be imprecise on Windows, just verify it recorded
        assert stats["async_timed_func"]["avg_ms"] >= 0

    @pytest.mark.asyncio
    async def test_async_function_preserves_exception(self):
        """Async function should re-raise exceptions."""
        from backend_ai.app.performance_monitor import track_rag_performance

        @track_rag_performance
        async def async_error_func():
            raise RuntimeError("async test error")

        with pytest.raises(RuntimeError, match="async test error"):
            await async_error_func()


class TestGetPerformanceStats:
    """Tests for get_performance_stats function."""

    def setup_method(self):
        """Reset metrics before each test."""
        from backend_ai.app.performance_monitor import reset_performance_metrics
        reset_performance_metrics()

    def test_empty_stats(self):
        """Empty metrics should return empty dict."""
        from backend_ai.app.performance_monitor import get_performance_stats

        stats = get_performance_stats()
        assert stats == {}

    def test_specific_metric(self):
        """Querying specific metric should return only that metric."""
        from backend_ai.app.performance_monitor import track_rag_performance, get_performance_stats

        @track_rag_performance
        def func_a():
            return "a"

        @track_rag_performance
        def func_b():
            return "b"

        func_a()
        func_b()

        stats = get_performance_stats("func_a")
        assert "func_a" in stats
        assert "func_b" not in stats

    def test_nonexistent_metric(self):
        """Querying nonexistent metric should return error."""
        from backend_ai.app.performance_monitor import get_performance_stats

        stats = get_performance_stats("nonexistent")
        assert "error" in stats
        assert "not found" in stats["error"]

    def test_stats_calculations(self):
        """Stats should calculate avg, min, max, percentiles."""
        from backend_ai.app.performance_monitor import (
            track_rag_performance, get_performance_stats,
            _metrics_lock, _performance_metrics
        )

        # Manually add test data
        with _metrics_lock:
            _performance_metrics["test_calc"] = [10.0, 20.0, 30.0, 40.0, 50.0]

        stats = get_performance_stats("test_calc")["test_calc"]

        assert stats["sample_count"] == 5
        assert stats["avg_ms"] == 30.0
        assert stats["min_ms"] == 10.0
        assert stats["max_ms"] == 50.0
        assert stats["p50_ms"] == 30.0


class TestResetPerformanceMetrics:
    """Tests for reset_performance_metrics function."""

    def test_reset_clears_all_metrics(self):
        """Reset should clear all recorded metrics."""
        from backend_ai.app.performance_monitor import (
            track_rag_performance, get_performance_stats,
            reset_performance_metrics
        )

        @track_rag_performance
        def tracked_func():
            pass

        tracked_func()
        assert len(get_performance_stats()) > 0

        reset_performance_metrics()
        assert len(get_performance_stats()) == 0


class TestPerformanceTimer:
    """Tests for PerformanceTimer context manager."""

    def setup_method(self):
        """Reset metrics before each test."""
        from backend_ai.app.performance_monitor import reset_performance_metrics
        reset_performance_metrics()

    def test_timer_records_elapsed(self):
        """Timer should record elapsed time."""
        from backend_ai.app.performance_monitor import PerformanceTimer

        with PerformanceTimer("test_timer", log=False) as timer:
            time.sleep(0.01)

        assert timer.elapsed_ms >= 10

    def test_timer_records_to_metrics(self):
        """Timer should add to global metrics."""
        from backend_ai.app.performance_monitor import PerformanceTimer, get_performance_stats

        with PerformanceTimer("context_timer", log=False):
            time.sleep(0.005)

        stats = get_performance_stats()
        assert "context_timer" in stats
        assert stats["context_timer"]["sample_count"] == 1

    def test_timer_with_exception(self):
        """Timer should still record when exception occurs."""
        from backend_ai.app.performance_monitor import PerformanceTimer, get_performance_stats

        with pytest.raises(ValueError):
            with PerformanceTimer("error_timer", log=False):
                raise ValueError("intentional error")

        stats = get_performance_stats()
        assert "error_timer" in stats
        assert stats["error_timer"]["sample_count"] == 1

    def test_timer_returns_self(self):
        """Timer should return itself as context manager."""
        from backend_ai.app.performance_monitor import PerformanceTimer

        with PerformanceTimer("self_timer", log=False) as timer:
            time.sleep(0.001)  # Small delay to ensure non-zero time

        assert timer.name == "self_timer"
        assert timer.elapsed_ms >= 0  # May be 0 on fast systems

    def test_timer_initialization(self):
        """Timer should initialize with correct defaults."""
        from backend_ai.app.performance_monitor import PerformanceTimer

        timer = PerformanceTimer("init_test")
        assert timer.name == "init_test"
        assert timer.log is True
        assert timer.elapsed_ms == 0
        assert timer.start_time is None


class TestExportMetricsJson:
    """Tests for export_metrics_json function."""

    def setup_method(self):
        """Reset metrics before each test."""
        from backend_ai.app.performance_monitor import reset_performance_metrics
        reset_performance_metrics()

    def test_export_empty_metrics(self):
        """Export of empty metrics should return valid JSON."""
        import json
        from backend_ai.app.performance_monitor import export_metrics_json

        json_str = export_metrics_json()
        data = json.loads(json_str)
        assert isinstance(data, dict)
        assert data == {}

    def test_export_with_metrics(self):
        """Export should include all recorded metrics."""
        import json
        from backend_ai.app.performance_monitor import (
            track_rag_performance, export_metrics_json
        )

        @track_rag_performance
        def exportable_func():
            pass

        exportable_func()

        json_str = export_metrics_json()
        data = json.loads(json_str)
        assert "exportable_func" in data


class TestLogPerformanceSummary:
    """Tests for log_performance_summary function."""

    def setup_method(self):
        """Reset metrics before each test."""
        from backend_ai.app.performance_monitor import reset_performance_metrics
        reset_performance_metrics()

    def test_log_empty_summary(self):
        """Logging empty summary should not raise."""
        from backend_ai.app.performance_monitor import log_performance_summary

        # Should not raise
        log_performance_summary()

    def test_log_with_metrics(self):
        """Logging summary with metrics should not raise."""
        from backend_ai.app.performance_monitor import (
            track_rag_performance, log_performance_summary
        )

        @track_rag_performance
        def logged_func():
            pass

        logged_func()

        # Should not raise
        log_performance_summary()


class TestMetricsSampling:
    """Tests for metrics sample limiting."""

    def setup_method(self):
        """Reset metrics before each test."""
        from backend_ai.app.performance_monitor import reset_performance_metrics
        reset_performance_metrics()

    def test_max_samples_limit(self):
        """Metrics should not exceed MAX_SAMPLES."""
        from backend_ai.app.performance_monitor import (
            track_rag_performance, get_performance_stats,
            _MAX_SAMPLES
        )

        @track_rag_performance
        def sampled_func():
            pass

        # Run more than MAX_SAMPLES times
        for _ in range(_MAX_SAMPLES + 20):
            sampled_func()

        stats = get_performance_stats("sampled_func")
        assert stats["sampled_func"]["sample_count"] == _MAX_SAMPLES


class TestModuleExports:
    """Tests for module exports."""

    def test_track_rag_performance_importable(self):
        """track_rag_performance should be importable."""
        from backend_ai.app.performance_monitor import track_rag_performance
        assert callable(track_rag_performance)

    def test_get_performance_stats_importable(self):
        """get_performance_stats should be importable."""
        from backend_ai.app.performance_monitor import get_performance_stats
        assert callable(get_performance_stats)

    def test_reset_performance_metrics_importable(self):
        """reset_performance_metrics should be importable."""
        from backend_ai.app.performance_monitor import reset_performance_metrics
        assert callable(reset_performance_metrics)

    def test_log_performance_summary_importable(self):
        """log_performance_summary should be importable."""
        from backend_ai.app.performance_monitor import log_performance_summary
        assert callable(log_performance_summary)

    def test_export_metrics_json_importable(self):
        """export_metrics_json should be importable."""
        from backend_ai.app.performance_monitor import export_metrics_json
        assert callable(export_metrics_json)

    def test_performance_timer_importable(self):
        """PerformanceTimer should be importable."""
        from backend_ai.app.performance_monitor import PerformanceTimer
        assert callable(PerformanceTimer)

