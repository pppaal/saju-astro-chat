# backend_ai/app/tarot_embeddings/status_methods.py
"""
Status and benchmark methods mixin for TarotAdvancedEmbeddings.
Contains system status, health check, and benchmark functionality.
"""

import os
import time
from typing import Dict, Any, List, Tuple


class StatusMethodsMixin:
    """Mixin providing status and benchmark functionality for TarotAdvancedEmbeddings."""

    def warm_up(self) -> bool:
        """
        Model preloading (call at server start).

        Returns:
            True if warm-up successful
        """
        if self._is_warmed_up:
            return True

        try:
            # Force model loading
            if self.model is None:
                return False

            # Warm up model with dummy query
            _ = self.model.encode("warm up query", convert_to_tensor=True)
            self._is_warmed_up = True
            self._log("Model warmed up successfully")
            return True
        except Exception as e:
            self._log(f"Warm-up failed: {e}", level='error')
            return False

    def get_status(self) -> Dict[str, Any]:
        """Return system status information."""
        status = {
            'version': '3.0',
            'total_entries': len(self.entries),
            'embeddings_loaded': self.embeddings is not None,
            'embeddings_shape': list(self.embeddings.shape) if self.embeddings is not None else None,
            'embeddings_dtype': str(self.embeddings.dtype) if self.embeddings is not None else None,
            'model_name': self.model_name,
            'model_quality': self.model_quality,
            'model_loaded': self._model is not None,
            'model_load_failed': self._model_load_failed,
            'is_warmed_up': self._is_warmed_up,
            'device': self.device,
            'cache_exists': os.path.exists(self.embed_cache_path),
            'cache_valid': self.is_cache_valid(),
            'data_hash': self._data_hash[:8] if self._data_hash else None,
            'categories': list(set(e['category'] for e in self.entries)),
            'use_float16': self.use_float16,
            'query_cache': self.get_query_cache_stats(),
            'metrics': self._metrics.to_dict(),
        }
        return status

    def get_metrics(self) -> Dict[str, Any]:
        """Return search performance metrics."""
        return self._metrics.to_dict()

    def reset_metrics(self):
        """Reset metrics."""
        self._metrics.reset()
        self._log("Metrics reset")

    def health_check(self) -> Tuple[bool, str]:
        """
        Check system health status.

        Returns:
            (is_healthy, message)
        """
        issues = []

        if len(self.entries) == 0:
            issues.append("No entries loaded")

        if self.embeddings is None:
            issues.append("Embeddings not generated")

        if self._model_load_failed:
            issues.append("Model loading failed")

        if issues:
            return False, f"Unhealthy: {', '.join(issues)}"

        return True, f"Healthy: {len(self.entries)} entries, model={self.model_name}"

    def get_categories_summary(self) -> Dict[str, int]:
        """Return entry count per category."""
        summary = {}
        for entry in self.entries:
            cat = entry['category']
            summary[cat] = summary.get(cat, 0) + 1
        return dict(sorted(summary.items()))

    # =========================================================================
    # Benchmark
    # =========================================================================
    def benchmark(
        self,
        queries: List[str] = None,
        iterations: int = 10,
        include_batch: bool = True,
        include_hybrid: bool = True
    ) -> Dict[str, Any]:
        """
        Run performance benchmark.

        Args:
            queries: Test query list (uses default if not provided)
            iterations: Number of iterations
            include_batch: Include batch search
            include_hybrid: Include hybrid search

        Returns:
            Benchmark results
        """
        if queries is None:
            queries = [
                "연애 운세 타이밍",
                "소울메이트 인연",
                "재물 금전 운",
                "직장 커리어",
                "건강 에너지",
            ]

        results = {
            'device': self.device,
            'model': self.model_name,
            'total_entries': len(self.entries),
            'iterations': iterations,
            'queries_count': len(queries),
            'benchmarks': {}
        }

        # 1. Single search benchmark
        single_times = []
        for _ in range(iterations):
            for q in queries:
                start = time.time()
                _ = self.search(q, use_cache=False)
                single_times.append((time.time() - start) * 1000)

        results['benchmarks']['single_search'] = {
            'avg_ms': round(sum(single_times) / len(single_times), 2),
            'min_ms': round(min(single_times), 2),
            'max_ms': round(max(single_times), 2),
            'total_queries': len(single_times)
        }

        # 2. Batch search benchmark
        if include_batch:
            batch_times = []
            for _ in range(iterations):
                start = time.time()
                _ = self.search_batch(queries)
                batch_times.append((time.time() - start) * 1000)

            results['benchmarks']['batch_search'] = {
                'avg_ms': round(sum(batch_times) / len(batch_times), 2),
                'min_ms': round(min(batch_times), 2),
                'max_ms': round(max(batch_times), 2),
                'queries_per_batch': len(queries)
            }

        # 3. Hybrid search benchmark
        if include_hybrid:
            hybrid_times = []
            for _ in range(iterations):
                for q in queries:
                    start = time.time()
                    _ = self.search_hybrid(q)
                    hybrid_times.append((time.time() - start) * 1000)

            results['benchmarks']['hybrid_search'] = {
                'avg_ms': round(sum(hybrid_times) / len(hybrid_times), 2),
                'min_ms': round(min(hybrid_times), 2),
                'max_ms': round(max(hybrid_times), 2),
                'total_queries': len(hybrid_times)
            }

        # 4. Throughput calculation (queries per second)
        total_time_s = sum(single_times) / 1000
        results['throughput'] = {
            'single_qps': round(len(single_times) / total_time_s, 1),
        }

        if include_batch and batch_times:
            batch_time_s = sum(batch_times) / 1000
            total_batch_queries = len(queries) * iterations
            results['throughput']['batch_qps'] = round(total_batch_queries / batch_time_s, 1)

        self._log(f"Benchmark complete: avg={results['benchmarks']['single_search']['avg_ms']:.1f}ms")
        return results
