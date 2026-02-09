# backend_ai/app/services/parallel_streaming.py
"""
Parallel OpenAI Streaming Optimizer
====================================
Enables parallel execution of multiple OpenAI streaming requests
for 3x performance improvement.

Key Features:
- Parallel stream execution with threads
- Thread-safe response collection
- SSE (Server-Sent Events) formatting
- Graceful error handling
- Performance monitoring

Performance:
- Before: 3 streams x 650ms = 1950ms (sequential)
- After:  max(650ms, 650ms, 650ms) = ~650ms (parallel)
- Speedup: 3x faster
"""

import json
import logging
import queue
import time
import threading
from typing import Dict, List, Iterator, Any
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================
_EXECUTOR_MAX_WORKERS = 3  # Typically 3 streams max
_EXECUTOR_THREAD_PREFIX = "openai_stream"

# Default stream settings by complexity
_STREAM_PRESETS = {
    "simple": {
        "model": "gpt-4o-mini",
        "temperature": 0.5,
        "max_tokens": 300,
    },
    "medium": {
        "model": "gpt-4o",
        "temperature": 0.7,
        "max_tokens": 500,
    },
    "complex": {
        "model": "gpt-4o",
        "temperature": 0.8,
        "max_tokens": 800,
    },
}

# ============================================================================
# Global Executor (Singleton)
# ============================================================================
_async_executor: ThreadPoolExecutor | None = None
_executor_lock = threading.Lock()


def get_async_executor() -> ThreadPoolExecutor:
    """Get or create executor for async OpenAI streaming."""
    global _async_executor
    if _async_executor is None:
        with _executor_lock:
            if _async_executor is None:
                _async_executor = ThreadPoolExecutor(
                    max_workers=_EXECUTOR_MAX_WORKERS,
                    thread_name_prefix=_EXECUTOR_THREAD_PREFIX
                )
                logger.info(f"[ParallelStreaming] Executor created with {_EXECUTOR_MAX_WORKERS} workers")
    return _async_executor


# ============================================================================
# Data Classes
# ============================================================================
@dataclass
class StreamConfig:
    """Configuration for a single stream."""
    section_name: str  # e.g., "summary", "symbols"
    prompt: str
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 500


@dataclass
class StreamMetrics:
    """Performance metrics for a stream section."""
    count: int = 0
    total_time_ms: float = 0
    total_chars: int = 0


# ============================================================================
# Parallel Stream Manager
# ============================================================================
class ParallelStreamManager:
    """
    Manages parallel execution of multiple OpenAI streams.

    Example:
        >>> manager = ParallelStreamManager(openai_client)
        >>> streams = [
        ...     StreamConfig("summary", prompt1, max_tokens=400),
        ...     StreamConfig("symbols", prompt2, max_tokens=500),
        ... ]
        >>> for chunk in manager.execute_parallel_streams(streams):
        ...     yield chunk  # SSE formatted
    """

    def __init__(self, openai_client):
        """Initialize parallel stream manager."""
        self.client = openai_client
        self.executor = get_async_executor()

    def execute_parallel_streams(
        self,
        stream_configs: List[StreamConfig],
        format_sse: bool = True
    ) -> Iterator[str]:
        """
        Execute multiple OpenAI streams in parallel.

        Args:
            stream_configs: List of stream configurations
            format_sse: Whether to format output as SSE

        Yields:
            SSE formatted chunks or raw dicts
        """
        start_time = time.time()
        total_streams = len(stream_configs)
        done_streams = 0
        output_queue: "queue.Queue[object]" = queue.Queue()

        def _emit(payload: Dict[str, Any]) -> object:
            return self._format_sse(payload) if format_sse else payload

        def _worker(config: StreamConfig) -> None:
            section = config.section_name
            full_text = ""
            started = time.time()

            try:
                output_queue.put(_emit({"section": section, "status": "start"}))
                stream = self._create_stream_sync(config)

                for chunk in stream:
                    delta = getattr(chunk.choices[0].delta, "content", None)
                    if not delta:
                        continue
                    full_text += delta
                    output_queue.put(_emit({"section": section, "content": delta}))

                output_queue.put(
                    _emit({"section": section, "status": "done", "full_text": full_text})
                )
                logger.info(f"[ParallelStreaming] {section}: {len(full_text)} chars")
            except Exception as e:
                logger.error(f"[ParallelStreaming] {section} failed: {e}", exc_info=True)
                output_queue.put(
                    _emit({"section": section, "type": "error", "error": str(e)})
                )
            finally:
                elapsed_ms = (time.time() - started) * 1000
                try:
                    _performance_monitor.record_stream(section, elapsed_ms, len(full_text))
                except Exception:
                    pass
                output_queue.put(("__done__", section))

        futures = [self.executor.submit(_worker, config) for config in stream_configs]

        try:
            while done_streams < total_streams:
                item = output_queue.get()
                if isinstance(item, tuple) and item[0] == "__done__":
                    done_streams += 1
                    continue
                yield item
        except Exception as e:
            logger.error(f"[ParallelStreaming] Error: {e}", exc_info=True)
            error_chunk = {
                "type": "error",
                "error": str(e),
                "message": "Parallel streaming failed"
            }
            yield self._format_sse(error_chunk) if format_sse else error_chunk
        finally:
            for future in futures:
                if not future.done():
                    future.cancel()

            elapsed = time.time() - start_time
            logger.info(
                f"[ParallelStreaming] Completed {total_streams} streams in {elapsed:.2f}s"
            )

    def _create_stream_sync(self, config: StreamConfig):
        """Create OpenAI stream (synchronous, runs in executor)."""
        return self.client.chat.completions.create(
            model=config.model,
            messages=[{"role": "user", "content": config.prompt}],
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            stream=True
        )

    @staticmethod
    def _format_sse(data: Dict[str, Any]) -> str:
        """Format data as SSE chunk."""
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


# ============================================================================
# Performance Monitoring
# ============================================================================
class StreamPerformanceMonitor:
    """Monitor performance of parallel streaming."""

    def __init__(self):
        self._metrics: Dict[str, StreamMetrics] = {}
        self._lock = threading.Lock()

    def record_stream(self, section: str, elapsed_ms: float, char_count: int) -> None:
        """Record stream performance."""
        with self._lock:
            if section not in self._metrics:
                self._metrics[section] = StreamMetrics()

            metrics = self._metrics[section]
            metrics.count += 1
            metrics.total_time_ms += elapsed_ms
            metrics.total_chars += char_count

    def get_stats(self) -> Dict[str, Dict[str, float]]:
        """Get performance statistics."""
        with self._lock:
            stats = {}
            for section, metrics in self._metrics.items():
                if metrics.count > 0:
                    stats[section] = {
                        "avg_time_ms": metrics.total_time_ms / metrics.count,
                        "avg_chars": metrics.total_chars / metrics.count,
                        "count": metrics.count
                    }
            return stats


# Global monitor instance
_performance_monitor = StreamPerformanceMonitor()


def get_stream_performance_stats() -> Dict[str, Dict[str, float]]:
    """Get global streaming performance stats."""
    return _performance_monitor.get_stats()


# ============================================================================
# Convenience Functions
# ============================================================================
def create_parallel_stream(
    openai_client,
    stream_configs: List[StreamConfig]
) -> Iterator[str]:
    """
    Convenience function to create parallel streams.

    Args:
        openai_client: OpenAI client instance
        stream_configs: List of stream configurations

    Yields:
        SSE formatted chunks
    """
    manager = ParallelStreamManager(openai_client)
    yield from manager.execute_parallel_streams(stream_configs, format_sse=True)


def optimize_stream_config(
    section_name: str,
    prompt: str,
    complexity: str = "medium"
) -> StreamConfig:
    """
    Create optimized StreamConfig based on complexity.

    Args:
        section_name: Section identifier
        prompt: Prompt text
        complexity: "simple", "medium", or "complex"

    Returns:
        Optimized StreamConfig
    """
    preset = _STREAM_PRESETS.get(complexity, _STREAM_PRESETS["medium"])
    return StreamConfig(
        section_name=section_name,
        prompt=prompt,
        **preset
    )
