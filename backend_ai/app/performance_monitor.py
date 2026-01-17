# backend_ai/app/performance_monitor.py
"""
Performance Monitoring for RAG Operations
==========================================
Tracks timing and metrics for RAG parallel execution.

Usage:
    from backend_ai.app.performance_monitor import track_rag_performance

    @track_rag_performance
    async def my_rag_function():
        ...
"""

import time
import logging
from functools import wraps
from typing import Dict, List, Optional
from collections import defaultdict
from threading import Lock
import json

logger = logging.getLogger(__name__)

# Performance metrics storage
_metrics_lock = Lock()
_performance_metrics: Dict[str, List[float]] = defaultdict(list)
_MAX_SAMPLES = 100  # Keep last 100 samples per metric


def track_rag_performance(func):
    """
    Decorator to track performance of RAG operations.

    Records execution time and stores metrics for analysis.
    """
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        func_name = func.__name__

        try:
            result = await func(*args, **kwargs)
            elapsed_ms = (time.time() - start_time) * 1000

            # Record metric
            with _metrics_lock:
                _performance_metrics[func_name].append(elapsed_ms)
                # Keep only last N samples
                if len(_performance_metrics[func_name]) > _MAX_SAMPLES:
                    _performance_metrics[func_name] = _performance_metrics[func_name][-_MAX_SAMPLES:]

            logger.info(f"[PERF] {func_name}: {elapsed_ms:.2f}ms")
            return result
        except Exception as e:
            elapsed_ms = (time.time() - start_time) * 1000
            logger.error(f"[PERF] {func_name} FAILED after {elapsed_ms:.2f}ms: {e}")
            raise

    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        func_name = func.__name__

        try:
            result = func(*args, **kwargs)
            elapsed_ms = (time.time() - start_time) * 1000

            # Record metric
            with _metrics_lock:
                _performance_metrics[func_name].append(elapsed_ms)
                if len(_performance_metrics[func_name]) > _MAX_SAMPLES:
                    _performance_metrics[func_name] = _performance_metrics[func_name][-_MAX_SAMPLES:]

            logger.info(f"[PERF] {func_name}: {elapsed_ms:.2f}ms")
            return result
        except Exception as e:
            elapsed_ms = (time.time() - start_time) * 1000
            logger.error(f"[PERF] {func_name} FAILED after {elapsed_ms:.2f}ms: {e}")
            raise

    # Detect if function is async or sync
    import asyncio
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper


def get_performance_stats(metric_name: Optional[str] = None) -> Dict:
    """
    Get performance statistics for RAG operations.

    Args:
        metric_name: Optional specific metric to query. If None, returns all.

    Returns:
        Dict with performance statistics (avg, min, max, p50, p95, p99)
    """
    with _metrics_lock:
        if metric_name:
            if metric_name not in _performance_metrics:
                return {"error": f"Metric '{metric_name}' not found"}
            metrics = {metric_name: _performance_metrics[metric_name]}
        else:
            metrics = dict(_performance_metrics)

    stats = {}
    for name, values in metrics.items():
        if not values:
            stats[name] = {"sample_count": 0}
            continue

        sorted_values = sorted(values)
        count = len(sorted_values)

        stats[name] = {
            "sample_count": count,
            "avg_ms": sum(sorted_values) / count,
            "min_ms": sorted_values[0],
            "max_ms": sorted_values[-1],
            "p50_ms": sorted_values[int(count * 0.5)],
            "p95_ms": sorted_values[int(count * 0.95)],
            "p99_ms": sorted_values[int(count * 0.99)],
        }

    return stats


def reset_performance_metrics():
    """Reset all performance metrics (useful for testing)."""
    with _metrics_lock:
        _performance_metrics.clear()
    logger.info("[PERF] Performance metrics reset")


def log_performance_summary():
    """Log a summary of all performance metrics."""
    stats = get_performance_stats()
    if not stats:
        logger.info("[PERF] No performance metrics recorded yet")
        return

    logger.info("[PERF] ===== Performance Summary =====")
    for metric_name, metric_stats in stats.items():
        if metric_stats.get("sample_count", 0) == 0:
            continue
        logger.info(
            f"[PERF] {metric_name}: "
            f"avg={metric_stats['avg_ms']:.1f}ms, "
            f"p95={metric_stats['p95_ms']:.1f}ms, "
            f"samples={metric_stats['sample_count']}"
        )
    logger.info("[PERF] ================================")


def export_metrics_json() -> str:
    """Export performance metrics as JSON string."""
    stats = get_performance_stats()
    return json.dumps(stats, indent=2)


class PerformanceTimer:
    """
    Context manager for timing code blocks.

    Usage:
        with PerformanceTimer("my_operation") as timer:
            # ... do work ...
            pass
        print(f"Elapsed: {timer.elapsed_ms}ms")
    """

    def __init__(self, name: str, log: bool = True):
        """
        Initialize timer.

        Args:
            name: Name for this timed operation
            log: Whether to log the elapsed time
        """
        self.name = name
        self.log = log
        self.start_time = None
        self.elapsed_ms = 0

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed_ms = (time.time() - self.start_time) * 1000

        if self.log:
            if exc_type is None:
                logger.info(f"[PERF] {self.name}: {self.elapsed_ms:.2f}ms")
            else:
                logger.error(f"[PERF] {self.name} FAILED after {self.elapsed_ms:.2f}ms")

        # Record in global metrics
        with _metrics_lock:
            _performance_metrics[self.name].append(self.elapsed_ms)
            if len(_performance_metrics[self.name]) > _MAX_SAMPLES:
                _performance_metrics[self.name] = _performance_metrics[self.name][-_MAX_SAMPLES:]

        return False  # Don't suppress exceptions


# Example usage in RAG operations
if __name__ == "__main__":
    import asyncio

    @track_rag_performance
    async def example_rag_operation():
        await asyncio.sleep(0.1)
        return {"result": "success"}

    async def main():
        # Run operation multiple times
        for _ in range(10):
            await example_rag_operation()

        # Print stats
        log_performance_summary()
        print(export_metrics_json())

    asyncio.run(main())
