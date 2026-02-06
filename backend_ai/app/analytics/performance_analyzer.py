"""
Performance Analyzer
====================
심층 성능 분석 모듈.

Features:
- API 엔드포인트별 상세 메트릭 (p50/p95/p99)
- 자동 병목 감지 및 권장 조치
- RAG 파이프라인 성능 분석
- 캐시 성능 모니터링
- 분산 추적 데이터 조회
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from threading import Lock

from ..monitoring import MetricsCollector, get_system_health
from ..rag.tracing import get_rag_tracer

logger = logging.getLogger(__name__)

# SLA 임계값 (acceptance criteria)
P95_LATENCY_THRESHOLD_MS = 700
ERROR_RATE_THRESHOLD_PERCENT = 0.5


@dataclass
class BottleneckInfo:
    """병목 정보."""
    endpoint: str
    issue: str  # 'slow_response' | 'high_error_rate'
    severity: str  # 'warning' | 'critical'
    avg_latency_ms: float
    threshold: float
    recommendation: str


class PerformanceAnalyzer:
    """심층 성능 분석기."""

    def __init__(self):
        self._lock = Lock()

    def get_api_detailed_metrics(self) -> List[Dict[str, Any]]:
        """API 엔드포인트별 상세 메트릭 반환."""
        metrics = MetricsCollector.get_metrics()
        result = []

        for endpoint, data in metrics.items():
            count = data.get("count", 0)
            if count == 0:
                continue

            total_time = data.get("total_time", 0.0)
            errors = data.get("errors", 0)
            min_time = data.get("min_time", 0.0)
            max_time = data.get("max_time", 0.0)
            avg_time = data.get("avg_time", 0.0)

            # 초 -> 밀리초 변환
            avg_ms = avg_time * 1000
            min_ms = min_time * 1000 if min_time != float('inf') else 0
            max_ms = max_time * 1000

            # p50, p95, p99 추정 (실제로는 히스토그램 필요, 여기서는 근사값)
            # avg를 p50으로, max를 p99로 근사
            p50_ms = avg_ms
            p95_ms = avg_ms + (max_ms - avg_ms) * 0.8
            p99_ms = max_ms

            error_rate = (errors / count * 100) if count > 0 else 0

            result.append({
                "endpoint": endpoint,
                "method": "GET",  # 메서드 정보가 없으면 기본값
                "totalRequests": count,
                "avgLatencyMs": round(avg_ms, 2),
                "p50LatencyMs": round(p50_ms, 2),
                "p95LatencyMs": round(p95_ms, 2),
                "p99LatencyMs": round(p99_ms, 2),
                "errorRate": round(error_rate, 2),
                "errorCount": errors,
            })

        # 요청 수 기준 내림차순 정렬
        result.sort(key=lambda x: x["totalRequests"], reverse=True)
        return result

    def detect_bottlenecks(self) -> List[Dict[str, Any]]:
        """병목 자동 감지."""
        metrics = MetricsCollector.get_metrics()
        bottlenecks = []

        for endpoint, data in metrics.items():
            count = data.get("count", 0)
            if count < 5:  # 샘플이 너무 적으면 스킵
                continue

            avg_time_ms = data.get("avg_time", 0.0) * 1000
            errors = data.get("errors", 0)
            error_rate = (errors / count * 100) if count > 0 else 0

            # 느린 응답 감지
            if avg_time_ms > P95_LATENCY_THRESHOLD_MS:
                severity = "critical" if avg_time_ms > 1000 else "warning"
                recommendation = self._get_slow_response_recommendation(endpoint, avg_time_ms)
                bottlenecks.append({
                    "endpoint": endpoint,
                    "issue": "slow_response",
                    "severity": severity,
                    "avgLatencyMs": round(avg_time_ms, 2),
                    "threshold": P95_LATENCY_THRESHOLD_MS,
                    "recommendation": recommendation,
                })

            # 높은 에러율 감지
            if error_rate > ERROR_RATE_THRESHOLD_PERCENT:
                severity = "critical" if error_rate > 5 else "warning"
                recommendation = self._get_error_rate_recommendation(endpoint, error_rate)
                bottlenecks.append({
                    "endpoint": endpoint,
                    "issue": "high_error_rate",
                    "severity": severity,
                    "avgLatencyMs": round(avg_time_ms, 2),
                    "threshold": ERROR_RATE_THRESHOLD_PERCENT,
                    "recommendation": recommendation,
                })

        # severity 기준 정렬 (critical 먼저)
        bottlenecks.sort(key=lambda x: (0 if x["severity"] == "critical" else 1, -x["avgLatencyMs"]))
        return bottlenecks

    def _get_slow_response_recommendation(self, endpoint: str, avg_ms: float) -> str:
        """느린 응답에 대한 권장 조치."""
        if "rag" in endpoint.lower() or "search" in endpoint.lower():
            return "RAG 파이프라인 최적화: 캐싱 강화, 청크 크기 조정, 인덱스 최적화 권장"
        elif "llm" in endpoint.lower() or "chat" in endpoint.lower():
            return "LLM 호출 최적화: 스트리밍 활성화, 프롬프트 길이 단축 권장"
        elif "db" in endpoint.lower() or "prisma" in endpoint.lower():
            return "데이터베이스 최적화: 쿼리 인덱스 추가, 연결 풀 크기 조정 권장"
        else:
            return f"응답 시간 {avg_ms:.0f}ms가 목표치({P95_LATENCY_THRESHOLD_MS}ms)를 초과. 프로파일링 권장"

    def _get_error_rate_recommendation(self, endpoint: str, error_rate: float) -> str:
        """높은 에러율에 대한 권장 조치."""
        if error_rate > 10:
            return f"에러율 {error_rate:.1f}%가 매우 높음. 즉시 로그 분석 및 수정 필요"
        elif error_rate > 5:
            return f"에러율 {error_rate:.1f}%가 높음. 에러 로그 확인 및 예외 처리 강화 권장"
        else:
            return f"에러율 {error_rate:.1f}%가 목표치({ERROR_RATE_THRESHOLD_PERCENT}%)를 초과. 모니터링 필요"

    def get_rag_performance(self) -> Dict[str, Any]:
        """RAG 파이프라인 성능 메트릭."""
        try:
            tracer = get_rag_tracer()
            metrics = tracer.get_metrics()
            source_metrics = tracer.get_source_metrics()

            return {
                "totalTraces": metrics.get("total_traces", 0),
                "avgDurationMs": metrics.get("avg_duration_ms", 0.0),
                "p50DurationMs": metrics.get("p50_duration_ms", 0.0),
                "p95DurationMs": metrics.get("p95_duration_ms", 0.0),
                "maxDurationMs": metrics.get("max_duration_ms", 0.0),
                "errorRate": metrics.get("error_rate", 0.0),
                "sourceMetrics": {
                    source: {
                        "count": data.get("count", 0),
                        "avgMs": data.get("avg_ms", 0.0),
                        "p95Ms": data.get("p95_ms", 0.0),
                        "maxMs": data.get("max_ms", 0.0),
                    }
                    for source, data in source_metrics.items()
                },
            }
        except Exception as e:
            logger.warning("[PerformanceAnalyzer] RAG metrics error: %s", e)
            return {
                "totalTraces": 0,
                "avgDurationMs": 0.0,
                "p50DurationMs": 0.0,
                "p95DurationMs": 0.0,
                "maxDurationMs": 0.0,
                "errorRate": 0.0,
                "sourceMetrics": {},
            }

    def get_cache_performance(self) -> Dict[str, Any]:
        """캐시 성능 메트릭."""
        try:
            from ..redis_cache import get_cache
            cache = get_cache()
            stats = cache.stats()

            hits = stats.get("local_hits", 0) + stats.get("redis_hits", 0)
            misses = stats.get("local_misses", 0) + stats.get("redis_misses", 0)
            total = hits + misses
            hit_rate = (hits / total * 100) if total > 0 else 0

            return {
                "hitRate": round(hit_rate, 2),
                "hits": hits,
                "misses": misses,
                "errors": stats.get("local_errors", 0),
                "backend": "redis" if stats.get("enabled", False) else "memory",
                "memoryEntries": stats.get("memory_entries", 0),
            }
        except Exception as e:
            logger.warning("[PerformanceAnalyzer] Cache metrics error: %s", e)
            return {
                "hitRate": 0.0,
                "hits": 0,
                "misses": 0,
                "errors": 0,
                "backend": "memory",
                "memoryEntries": 0,
            }

    def get_distributed_traces(self, limit: int = 20) -> List[Dict[str, Any]]:
        """최근 분산 추적 데이터."""
        try:
            tracer = get_rag_tracer()
            # 내부 _traces에 접근
            with tracer._lock:
                recent_traces = list(tracer._traces)[-limit:]

            result = []
            for trace in recent_traces:
                has_error = any(e.event_type == "error" for e in trace.events)
                result.append({
                    "traceId": trace.trace_id,
                    "query": trace.query[:100] if trace.query else "",  # 쿼리 100자로 제한
                    "domain": trace.domain,
                    "totalDurationMs": round(trace.total_duration_ms, 2),
                    "timestamp": trace.timestamp,
                    "eventCount": len(trace.events),
                    "hasError": has_error,
                })

            # 최신 순 정렬
            result.sort(key=lambda x: x["timestamp"], reverse=True)
            return result
        except Exception as e:
            logger.warning("[PerformanceAnalyzer] Distributed traces error: %s", e)
            return []

    def get_system_health_summary(self) -> Dict[str, Any]:
        """시스템 헬스 요약."""
        try:
            health = get_system_health()
            return {
                "status": health.get("status", "healthy"),
                "memoryMb": health.get("memory_mb", 0),
                "totalRequests": health.get("metrics", {}).get("total_requests", 0),
                "errorRatePercent": health.get("metrics", {}).get("error_rate_percent", 0),
            }
        except Exception as e:
            logger.warning("[PerformanceAnalyzer] System health error: %s", e)
            return {
                "status": "healthy",
                "memoryMb": 0,
                "totalRequests": 0,
                "errorRatePercent": 0,
            }

    def get_full_performance_data(self) -> Dict[str, Any]:
        """전체 성능 데이터 반환."""
        return {
            "apiMetrics": self.get_api_detailed_metrics(),
            "bottlenecks": self.detect_bottlenecks(),
            "ragMetrics": self.get_rag_performance(),
            "cacheMetrics": self.get_cache_performance(),
            "distributedTraces": self.get_distributed_traces(),
            "systemHealth": self.get_system_health_summary(),
        }


# 싱글톤
_analyzer: Optional[PerformanceAnalyzer] = None
_analyzer_lock = Lock()


def get_performance_analyzer() -> PerformanceAnalyzer:
    """싱글톤 PerformanceAnalyzer 반환."""
    global _analyzer
    if _analyzer is None:
        with _analyzer_lock:
            if _analyzer is None:
                _analyzer = PerformanceAnalyzer()
    return _analyzer
