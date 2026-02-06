"""
Unit tests for backend_ai/app/monitoring.py

Tests:
- StructuredLogger class
- MetricsCollector class
- PerformanceMonitor class
- AlertManager class
- System health functions
"""
import pytest
import time
import threading
from unittest.mock import patch, MagicMock


class TestStructuredLogger:
    """Tests for StructuredLogger class."""

    def test_create_logger(self):
        """Should create logger instance."""
        from backend_ai.app.monitoring import StructuredLogger

        logger = StructuredLogger("test_logger")
        assert logger is not None
        assert logger.logger is not None

    def test_log_info(self):
        """Should log info messages."""
        from backend_ai.app.monitoring import StructuredLogger

        logger = StructuredLogger("test_info")
        # Should not raise
        logger.info("Test message", key="value")

    def test_log_warning(self):
        """Should log warning messages."""
        from backend_ai.app.monitoring import StructuredLogger

        logger = StructuredLogger("test_warning")
        logger.warning("Warning message", code=123)

    def test_log_error(self):
        """Should log error messages."""
        from backend_ai.app.monitoring import StructuredLogger

        logger = StructuredLogger("test_error")
        logger.error("Error message", error="test_error")

    def test_log_debug(self):
        """Should log debug messages."""
        from backend_ai.app.monitoring import StructuredLogger

        logger = StructuredLogger("test_debug")
        logger.debug("Debug message", detail="test")

    def test_log_with_file(self):
        """Should create logger with file handler."""
        import tempfile
        import os
        from backend_ai.app.monitoring import StructuredLogger

        # Use tempfile.mktemp to avoid Windows file locking issues
        tmpdir = tempfile.gettempdir()
        log_file = os.path.join(tmpdir, f"test_monitoring_{id(self)}.log")
        try:
            logger = StructuredLogger("test_file", log_file=log_file)
            logger.info("File test")
            # File handler should be added
            assert len(logger.logger.handlers) >= 2
            # Close handlers to release file
            for handler in logger.logger.handlers[:]:
                handler.close()
                logger.logger.removeHandler(handler)
        finally:
            # Clean up log file if it exists
            if os.path.exists(log_file):
                try:
                    os.remove(log_file)
                except OSError:
                    pass  # Ignore cleanup errors on Windows


class TestMetricsCollector:
    """Tests for MetricsCollector class."""

    def test_record_request_success(self):
        """Should record successful request."""
        from backend_ai.app.monitoring import MetricsCollector, reset_all_metrics

        reset_all_metrics()

        MetricsCollector.record_request(
            endpoint="test/success",
            duration=0.5,
            success=True
        )

        metrics = MetricsCollector.get_metrics("test/success")
        assert metrics["count"] == 1
        assert metrics["errors"] == 0
        assert metrics["total_time"] == 0.5

    def test_record_request_failure(self):
        """Should record failed request."""
        from backend_ai.app.monitoring import MetricsCollector, reset_all_metrics

        reset_all_metrics()

        MetricsCollector.record_request(
            endpoint="test/failure",
            duration=0.3,
            success=False,
            error="Test error"
        )

        metrics = MetricsCollector.get_metrics("test/failure")
        assert metrics["count"] == 1
        assert metrics["errors"] == 1
        assert metrics["last_error"]["message"] == "Test error"

    def test_get_all_metrics(self):
        """Should get all metrics."""
        from backend_ai.app.monitoring import MetricsCollector, reset_all_metrics

        reset_all_metrics()

        MetricsCollector.record_request("ep1", 0.1, True)
        MetricsCollector.record_request("ep2", 0.2, True)

        all_metrics = MetricsCollector.get_metrics()
        assert "ep1" in all_metrics
        assert "ep2" in all_metrics

    def test_avg_time_calculation(self):
        """Should calculate average time correctly."""
        from backend_ai.app.monitoring import MetricsCollector, reset_all_metrics

        reset_all_metrics()

        MetricsCollector.record_request("test/avg", 0.1, True)
        MetricsCollector.record_request("test/avg", 0.3, True)
        MetricsCollector.record_request("test/avg", 0.2, True)

        metrics = MetricsCollector.get_metrics("test/avg")
        assert metrics["count"] == 3
        assert abs(metrics["avg_time"] - 0.2) < 0.01

    def test_min_max_time_tracking(self):
        """Should track min and max times."""
        from backend_ai.app.monitoring import MetricsCollector, reset_all_metrics

        reset_all_metrics()

        MetricsCollector.record_request("test/minmax", 0.1, True)
        MetricsCollector.record_request("test/minmax", 0.5, True)
        MetricsCollector.record_request("test/minmax", 0.3, True)

        metrics = MetricsCollector.get_metrics("test/minmax")
        assert metrics["min_time"] == 0.1
        assert metrics["max_time"] == 0.5

    def test_reset_metrics(self):
        """Should reset all metrics."""
        from backend_ai.app.monitoring import MetricsCollector, reset_all_metrics

        MetricsCollector.record_request("test/reset", 0.1, True)
        reset_all_metrics()

        all_metrics = MetricsCollector.get_metrics()
        assert len(all_metrics) == 0

    def test_thread_safety(self):
        """Should be thread-safe for concurrent recording."""
        from backend_ai.app.monitoring import MetricsCollector, reset_all_metrics

        reset_all_metrics()
        threads = []
        endpoint = "test/thread_safe"

        def record():
            for _ in range(100):
                MetricsCollector.record_request(endpoint, 0.01, True)

        for _ in range(10):
            t = threading.Thread(target=record)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        metrics = MetricsCollector.get_metrics(endpoint)
        assert metrics["count"] == 1000


class TestPerformanceMonitor:
    """Tests for PerformanceMonitor class."""

    def test_create_monitor(self):
        """Should create monitor instance."""
        from backend_ai.app.monitoring import PerformanceMonitor, StructuredLogger

        logger = StructuredLogger("perf_test")
        monitor = PerformanceMonitor(logger)
        assert monitor is not None

    def test_track_decorator(self):
        """Should track function performance with decorator."""
        from backend_ai.app.monitoring import (
            PerformanceMonitor, StructuredLogger, MetricsCollector, reset_all_metrics
        )

        reset_all_metrics()
        logger = StructuredLogger("track_test")
        monitor = PerformanceMonitor(logger)

        @monitor.track("test_operation")
        def test_func():
            time.sleep(0.01)
            return "done"

        result = test_func()
        assert result == "done"

        metrics = MetricsCollector.get_metrics("test_operation")
        assert metrics["count"] == 1
        assert metrics["errors"] == 0

    def test_track_decorator_with_exception(self):
        """Should track errors in decorated function."""
        from backend_ai.app.monitoring import (
            PerformanceMonitor, StructuredLogger, MetricsCollector, reset_all_metrics
        )

        reset_all_metrics()
        logger = StructuredLogger("error_track")
        monitor = PerformanceMonitor(logger)

        @monitor.track("error_operation")
        def error_func():
            raise ValueError("Test error")

        with pytest.raises(ValueError):
            error_func()

        metrics = MetricsCollector.get_metrics("error_operation")
        assert metrics["count"] == 1
        assert metrics["errors"] == 1


class TestAlertManager:
    """Tests for AlertManager class."""

    def test_create_alert_manager(self):
        """Should create alert manager instance."""
        from backend_ai.app.monitoring import AlertManager, StructuredLogger

        logger = StructuredLogger("alert_test")
        manager = AlertManager(logger)

        assert manager is not None
        assert "response_time_ms" in manager.alert_thresholds

    def test_default_thresholds(self):
        """Should have default thresholds."""
        from backend_ai.app.monitoring import AlertManager, StructuredLogger

        logger = StructuredLogger("thresholds")
        manager = AlertManager(logger)

        assert manager.alert_thresholds["response_time_ms"] == 700
        assert manager.alert_thresholds["error_rate_percent"] == 0.5
        assert manager.alert_thresholds["memory_usage_mb"] == 450

    def test_check_response_time(self):
        """Should alert on slow response."""
        from backend_ai.app.monitoring import AlertManager, StructuredLogger

        logger = StructuredLogger("response_time")
        manager = AlertManager(logger)

        # Should not raise, just log warning if slow
        manager.check_response_time("slow/endpoint", 1000)

    def test_check_error_rate(self):
        """Should check error rate."""
        from backend_ai.app.monitoring import (
            AlertManager, StructuredLogger, MetricsCollector, reset_all_metrics
        )

        reset_all_metrics()
        logger = StructuredLogger("error_rate")
        manager = AlertManager(logger)

        # Record some requests
        for _ in range(10):
            MetricsCollector.record_request("error/test", 0.1, False, "error")

        # Should log error for high error rate
        manager.check_error_rate("error/test")

    def test_check_memory_usage(self):
        """Should check memory usage without error."""
        from backend_ai.app.monitoring import AlertManager, StructuredLogger

        logger = StructuredLogger("memory")
        manager = AlertManager(logger)

        # Should not raise even if psutil not available
        manager.check_memory_usage()


class TestSystemHealth:
    """Tests for system health functions."""

    def test_get_system_health_structure(self):
        """Should return correct health structure."""
        from backend_ai.app.monitoring import get_system_health, reset_all_metrics

        reset_all_metrics()
        health = get_system_health()

        assert "status" in health
        assert "timestamp" in health
        assert "metrics" in health
        assert "slowest_endpoints" in health

    def test_health_status_healthy(self):
        """Should show healthy status with no errors."""
        from backend_ai.app.monitoring import get_system_health, reset_all_metrics

        reset_all_metrics()
        health = get_system_health()

        assert health["status"] == "healthy"

    def test_health_metrics_content(self):
        """Should include correct metrics."""
        from backend_ai.app.monitoring import (
            get_system_health, MetricsCollector, reset_all_metrics
        )

        reset_all_metrics()
        MetricsCollector.record_request("health/test", 0.1, True)
        MetricsCollector.record_request("health/test", 0.1, False, "error")

        health = get_system_health()

        assert health["metrics"]["total_requests"] == 2
        assert health["metrics"]["total_errors"] == 1
        assert health["metrics"]["error_rate_percent"] == 50.0

    def test_slowest_endpoints(self):
        """Should list slowest endpoints."""
        from backend_ai.app.monitoring import (
            get_system_health, MetricsCollector, reset_all_metrics
        )

        reset_all_metrics()
        MetricsCollector.record_request("slow/endpoint", 1.0, True)
        MetricsCollector.record_request("fast/endpoint", 0.1, True)

        health = get_system_health()

        assert len(health["slowest_endpoints"]) >= 2
        # Slow endpoint should be first
        assert health["slowest_endpoints"][0]["endpoint"] == "slow/endpoint"


class TestConvenienceFunctions:
    """Tests for convenience functions."""

    def test_get_logger(self):
        """Should return logger instance."""
        from backend_ai.app.monitoring import get_logger

        logger = get_logger("test")
        assert logger is not None

    def test_track_performance_decorator(self):
        """Should provide decorator."""
        from backend_ai.app.monitoring import track_performance

        assert callable(track_performance)

    def test_get_all_metrics_function(self):
        """Should return all metrics."""
        from backend_ai.app.monitoring import get_all_metrics, reset_all_metrics

        reset_all_metrics()
        metrics = get_all_metrics()
        assert isinstance(metrics, dict)

    def test_get_endpoint_metrics(self):
        """Should get specific endpoint metrics."""
        from backend_ai.app.monitoring import (
            get_endpoint_metrics, MetricsCollector, reset_all_metrics
        )

        reset_all_metrics()
        MetricsCollector.record_request("specific/ep", 0.1, True)

        metrics = get_endpoint_metrics("specific/ep")
        assert metrics["count"] == 1

    def test_reset_all_metrics_function(self):
        """Should reset all metrics."""
        from backend_ai.app.monitoring import (
            reset_all_metrics, get_all_metrics, MetricsCollector
        )

        MetricsCollector.record_request("reset/test", 0.1, True)
        reset_all_metrics()

        metrics = get_all_metrics()
        assert len(metrics) == 0


class TestGlobalInstances:
    """Tests for global instances."""

    def test_app_logger_exists(self):
        """Should have global app_logger."""
        from backend_ai.app.monitoring import app_logger

        assert app_logger is not None

    def test_performance_monitor_exists(self):
        """Should have global performance_monitor."""
        from backend_ai.app.monitoring import performance_monitor

        assert performance_monitor is not None

    def test_alert_manager_exists(self):
        """Should have global alert_manager."""
        from backend_ai.app.monitoring import alert_manager

        assert alert_manager is not None


class TestModuleExports:
    """Tests for module exports."""

    def test_structured_logger_importable(self):
        """StructuredLogger should be importable."""
        from backend_ai.app.monitoring import StructuredLogger
        assert callable(StructuredLogger)

    def test_metrics_collector_importable(self):
        """MetricsCollector should be importable."""
        from backend_ai.app.monitoring import MetricsCollector
        assert MetricsCollector is not None

    def test_performance_monitor_importable(self):
        """PerformanceMonitor should be importable."""
        from backend_ai.app.monitoring import PerformanceMonitor
        assert callable(PerformanceMonitor)

    def test_alert_manager_importable(self):
        """AlertManager should be importable."""
        from backend_ai.app.monitoring import AlertManager
        assert callable(AlertManager)

    def test_get_system_health_importable(self):
        """get_system_health should be importable."""
        from backend_ai.app.monitoring import get_system_health
        assert callable(get_system_health)

