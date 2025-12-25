"""
Advanced Monitoring and Observability System
Centralized logging, metrics collection, and alerting.
"""
import logging
import time
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
from functools import wraps
from collections import defaultdict
import threading

# Thread-safe metrics storage
_metrics_lock = threading.Lock()
_metrics = defaultdict(lambda: {
    "count": 0,
    "total_time": 0.0,
    "errors": 0,
    "last_error": None,
    "avg_time": 0.0,
    "min_time": float('inf'),
    "max_time": 0.0
})


class StructuredLogger:
    """Structured logging with JSON output for better parsing."""

    def __init__(self, name: str, log_file: Optional[str] = None):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)

        # Console handler with structured format
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)

        # File handler for persistent logs
        if log_file:
            file_handler = logging.FileHandler(log_file, encoding='utf-8')
            file_handler.setLevel(logging.DEBUG)
            self.logger.addHandler(file_handler)

        self.logger.addHandler(console_handler)

    def _log(self, level: str, message: str, **kwargs):
        """Log with structured data."""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message,
            **kwargs
        }

        log_method = getattr(self.logger, level.lower())
        try:
            # Try JSON format first
            log_method(json.dumps(log_data, ensure_ascii=False))
        except (TypeError, UnicodeEncodeError):
            # Fallback to simple format
            log_method(f"[{level}] {message} | {kwargs}")

    def info(self, message: str, **kwargs):
        self._log("INFO", message, **kwargs)

    def warning(self, message: str, **kwargs):
        self._log("WARNING", message, **kwargs)

    def error(self, message: str, **kwargs):
        self._log("ERROR", message, **kwargs)

    def debug(self, message: str, **kwargs):
        self._log("DEBUG", message, **kwargs)


class MetricsCollector:
    """Collect and aggregate application metrics."""

    @staticmethod
    def record_request(endpoint: str, duration: float, success: bool = True, error: Optional[str] = None):
        """Record API request metrics."""
        with _metrics_lock:
            metric = _metrics[endpoint]
            metric["count"] += 1
            metric["total_time"] += duration

            if not success:
                metric["errors"] += 1
                metric["last_error"] = {
                    "message": error,
                    "timestamp": datetime.utcnow().isoformat()
                }

            # Update timing stats
            metric["min_time"] = min(metric["min_time"], duration)
            metric["max_time"] = max(metric["max_time"], duration)
            metric["avg_time"] = metric["total_time"] / metric["count"]

    @staticmethod
    def get_metrics(endpoint: Optional[str] = None) -> Dict[str, Any]:
        """Get metrics for specific endpoint or all."""
        with _metrics_lock:
            if endpoint:
                return dict(_metrics.get(endpoint, {}))
            return {k: dict(v) for k, v in _metrics.items()}

    @staticmethod
    def reset_metrics():
        """Reset all metrics."""
        with _metrics_lock:
            _metrics.clear()


class PerformanceMonitor:
    """Monitor performance with decorators and context managers."""

    def __init__(self, logger: StructuredLogger):
        self.logger = logger

    def track(self, operation_name: str):
        """Decorator to track function performance."""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                error = None
                result = None

                try:
                    result = func(*args, **kwargs)
                    return result

                except Exception as e:
                    error = str(e)
                    raise

                finally:
                    duration = time.time() - start_time
                    success = error is None

                    # Record metrics
                    MetricsCollector.record_request(
                        endpoint=operation_name,
                        duration=duration,
                        success=success,
                        error=error
                    )

                    # Log performance
                    self.logger.info(
                        f"Operation completed: {operation_name}",
                        duration=round(duration, 3),
                        success=success,
                        error=error
                    )

            return wrapper
        return decorator


class AlertManager:
    """Manage alerts for critical issues."""

    def __init__(self, logger: StructuredLogger):
        self.logger = logger
        self.alert_thresholds = {
            "response_time_ms": 5000,  # 5 seconds
            "error_rate_percent": 10,   # 10% error rate
            "memory_usage_mb": 450      # 450MB (Railway free tier is 512MB)
        }

    def check_response_time(self, endpoint: str, duration_ms: float):
        """Alert if response time exceeds threshold."""
        if duration_ms > self.alert_thresholds["response_time_ms"]:
            self.logger.warning(
                f"Slow response detected",
                endpoint=endpoint,
                duration_ms=duration_ms,
                threshold=self.alert_thresholds["response_time_ms"]
            )

    def check_error_rate(self, endpoint: str):
        """Alert if error rate exceeds threshold."""
        metrics = MetricsCollector.get_metrics(endpoint)
        if metrics["count"] > 0:
            error_rate = (metrics["errors"] / metrics["count"]) * 100
            if error_rate > self.alert_thresholds["error_rate_percent"]:
                self.logger.error(
                    f"High error rate detected",
                    endpoint=endpoint,
                    error_rate=round(error_rate, 2),
                    threshold=self.alert_thresholds["error_rate_percent"]
                )

    def check_memory_usage(self):
        """Alert if memory usage is high."""
        try:
            import psutil
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024

            if memory_mb > self.alert_thresholds["memory_usage_mb"]:
                self.logger.warning(
                    "High memory usage detected",
                    memory_mb=round(memory_mb, 2),
                    threshold=self.alert_thresholds["memory_usage_mb"]
                )

        except ImportError:
            pass  # psutil not available


# Global instances
_log_dir = os.path.join(os.path.dirname(__file__), "..", "logs")
os.makedirs(_log_dir, exist_ok=True)

_log_file = os.path.join(_log_dir, f"backend_ai_{datetime.now().strftime('%Y%m%d')}.log")
app_logger = StructuredLogger("backend_ai", _log_file)
performance_monitor = PerformanceMonitor(app_logger)
alert_manager = AlertManager(app_logger)


# Convenience functions
def get_logger(name: str = "backend_ai") -> StructuredLogger:
    """Get a structured logger instance."""
    return StructuredLogger(name, _log_file)


def track_performance(operation_name: str):
    """Decorator for tracking performance."""
    return performance_monitor.track(operation_name)


def get_all_metrics() -> Dict[str, Any]:
    """Get all collected metrics."""
    return MetricsCollector.get_metrics()


def get_endpoint_metrics(endpoint: str) -> Dict[str, Any]:
    """Get metrics for specific endpoint."""
    return MetricsCollector.get_metrics(endpoint)


def reset_all_metrics():
    """Reset all metrics."""
    MetricsCollector.reset_metrics()


# Health check helper
def get_system_health() -> Dict[str, Any]:
    """Get comprehensive system health status."""
    metrics = get_all_metrics()

    # Calculate aggregate stats
    total_requests = sum(m["count"] for m in metrics.values())
    total_errors = sum(m["errors"] for m in metrics.values())
    error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0

    # Get slowest endpoints
    slowest_endpoints = sorted(
        [(k, v["avg_time"]) for k, v in metrics.items()],
        key=lambda x: x[1],
        reverse=True
    )[:5]

    health_status = {
        "status": "healthy" if error_rate < 5 else "degraded" if error_rate < 10 else "critical",
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": {
            "total_requests": total_requests,
            "total_errors": total_errors,
            "error_rate_percent": round(error_rate, 2)
        },
        "slowest_endpoints": [
            {"endpoint": ep, "avg_time_ms": round(time * 1000, 2)}
            for ep, time in slowest_endpoints
        ],
        "all_endpoints": metrics
    }

    # Check memory
    try:
        import psutil
        process = psutil.Process()
        memory_mb = process.memory_info().rss / 1024 / 1024
        health_status["memory_mb"] = round(memory_mb, 2)
    except ImportError:
        pass

    return health_status
