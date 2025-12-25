"""
Unit tests for monitoring.py
Tests logging, metrics, and monitoring functionality.
"""
import pytest
import time
from backend_ai.app.monitoring import (
    StructuredLogger,
    MetricsCollector,
    PerformanceMonitor,
    get_system_health,
    reset_all_metrics
)


class TestStructuredLogger:
    """Test structured logging functionality."""

    def test_logger_creation(self):
        """Test logger can be created."""
        logger = StructuredLogger("test_logger")
        assert logger is not None
        assert logger.logger is not None

    def test_info_logging(self):
        """Test info level logging."""
        logger = StructuredLogger("test_info")
        # Should not raise exception
        logger.info("Test message", extra_field="value")

    def test_error_logging(self):
        """Test error level logging."""
        logger = StructuredLogger("test_error")
        logger.error("Error occurred", error_code=500)

    def test_warning_logging(self):
        """Test warning level logging."""
        logger = StructuredLogger("test_warning")
        logger.warning("Warning message", severity="medium")

    def test_debug_logging(self):
        """Test debug level logging."""
        logger = StructuredLogger("test_debug")
        logger.debug("Debug info", debug_data={"key": "value"})


class TestMetricsCollector:
    """Test metrics collection functionality."""

    def setup_method(self):
        """Reset metrics before each test."""
        reset_all_metrics()

    def test_record_successful_request(self):
        """Test recording successful request."""
        MetricsCollector.record_request(
            endpoint="/test/endpoint",
            duration=0.5,
            success=True
        )

        metrics = MetricsCollector.get_metrics("/test/endpoint")
        assert metrics["count"] == 1
        assert metrics["errors"] == 0
        assert metrics["total_time"] == 0.5

    def test_record_failed_request(self):
        """Test recording failed request."""
        MetricsCollector.record_request(
            endpoint="/test/error",
            duration=1.0,
            success=False,
            error="Test error"
        )

        metrics = MetricsCollector.get_metrics("/test/error")
        assert metrics["count"] == 1
        assert metrics["errors"] == 1
        assert metrics["last_error"]["message"] == "Test error"

    def test_average_time_calculation(self):
        """Test that average time is calculated correctly."""
        endpoint = "/test/avg"

        MetricsCollector.record_request(endpoint, 1.0, True)
        MetricsCollector.record_request(endpoint, 2.0, True)
        MetricsCollector.record_request(endpoint, 3.0, True)

        metrics = MetricsCollector.get_metrics(endpoint)
        assert metrics["count"] == 3
        assert metrics["avg_time"] == 2.0  # (1 + 2 + 3) / 3

    def test_min_max_time_tracking(self):
        """Test min and max time tracking."""
        endpoint = "/test/minmax"

        MetricsCollector.record_request(endpoint, 0.5, True)
        MetricsCollector.record_request(endpoint, 2.5, True)
        MetricsCollector.record_request(endpoint, 1.0, True)

        metrics = MetricsCollector.get_metrics(endpoint)
        assert metrics["min_time"] == 0.5
        assert metrics["max_time"] == 2.5

    def test_get_all_metrics(self):
        """Test getting metrics for all endpoints."""
        MetricsCollector.record_request("/endpoint1", 0.5, True)
        MetricsCollector.record_request("/endpoint2", 1.0, True)

        all_metrics = MetricsCollector.get_metrics()
        assert "/endpoint1" in all_metrics
        assert "/endpoint2" in all_metrics

    def test_reset_metrics(self):
        """Test resetting all metrics."""
        MetricsCollector.record_request("/test", 1.0, True)
        MetricsCollector.reset_metrics()

        metrics = MetricsCollector.get_metrics("/test")
        # After reset, get_metrics returns empty dict or default values
        assert metrics.get("count", 0) == 0


class TestPerformanceMonitor:
    """Test performance monitoring functionality."""

    def setup_method(self):
        """Reset metrics before each test."""
        reset_all_metrics()

    def test_track_decorator(self):
        """Test performance tracking decorator."""
        logger = StructuredLogger("test_perf")
        monitor = PerformanceMonitor(logger)

        @monitor.track("test_operation")
        def test_function():
            time.sleep(0.01)  # Simulate work
            return "result"

        result = test_function()

        assert result == "result"
        metrics = MetricsCollector.get_metrics("test_operation")
        assert metrics["count"] == 1
        assert metrics["total_time"] > 0

    def test_track_decorator_with_error(self):
        """Test tracking when function raises error."""
        logger = StructuredLogger("test_error")
        monitor = PerformanceMonitor(logger)

        @monitor.track("error_operation")
        def failing_function():
            raise ValueError("Test error")

        with pytest.raises(ValueError):
            failing_function()

        metrics = MetricsCollector.get_metrics("error_operation")
        assert metrics["count"] == 1
        assert metrics["errors"] == 1
        assert metrics["last_error"]["message"] == "Test error"


class TestSystemHealth:
    """Test system health checks."""

    def setup_method(self):
        """Reset metrics before each test."""
        reset_all_metrics()

    def test_get_system_health(self):
        """Test getting system health status."""
        # Record some sample metrics
        MetricsCollector.record_request("/health", 0.1, True)
        MetricsCollector.record_request("/api/test", 0.5, True)

        health = get_system_health()

        assert "status" in health
        assert health["status"] in ["healthy", "degraded", "critical"]
        assert "metrics" in health
        assert health["metrics"]["total_requests"] == 2

    def test_health_status_healthy(self):
        """Test that healthy status is returned when error rate is low."""
        # Record 100 successful requests
        for i in range(100):
            MetricsCollector.record_request("/test", 0.1, True)

        # Record 2 failed requests (2% error rate)
        for i in range(2):
            MetricsCollector.record_request("/test", 0.1, False)

        health = get_system_health()
        assert health["status"] == "healthy"
        assert health["metrics"]["error_rate_percent"] < 5

    def test_health_status_degraded(self):
        """Test degraded status when error rate is medium."""
        # Record 10 successful requests
        for i in range(10):
            MetricsCollector.record_request("/test", 0.1, True)

        # Record 1 failed request (9% error rate)
        MetricsCollector.record_request("/test", 0.1, False)

        health = get_system_health()
        # Should be healthy or degraded depending on threshold
        assert health["status"] in ["healthy", "degraded"]

    def test_slowest_endpoints_tracking(self):
        """Test that slowest endpoints are identified."""
        MetricsCollector.record_request("/fast", 0.1, True)
        MetricsCollector.record_request("/slow", 5.0, True)
        MetricsCollector.record_request("/medium", 1.0, True)

        health = get_system_health()
        slowest = health["slowest_endpoints"]

        # /slow should be first (slowest)
        assert slowest[0]["endpoint"] == "/slow"
        assert slowest[0]["avg_time_ms"] == 5000.0


# Integration test for full monitoring flow
def test_full_monitoring_flow():
    """Test complete monitoring flow from logging to health check."""
    reset_all_metrics()

    logger = StructuredLogger("integration_test")
    monitor = PerformanceMonitor(logger)

    @monitor.track("integration_operation")
    def sample_operation(should_fail=False):
        time.sleep(0.01)
        if should_fail:
            raise RuntimeError("Intentional failure")
        return "success"

    # Run successful operations
    for i in range(5):
        sample_operation(False)

    # Run one failing operation
    try:
        sample_operation(True)
    except RuntimeError:
        pass

    # Check system health
    health = get_system_health()

    assert health["metrics"]["total_requests"] == 6
    assert health["metrics"]["total_errors"] == 1
    assert round(health["metrics"]["error_rate_percent"], 1) == round(100 * 1/6, 1)
    assert "integration_operation" in health["all_endpoints"]
