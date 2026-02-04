# app/rag/tracing.py
"""
RAG 파이프라인 관측성 & 트레이싱 (Phase 7c)
=============================================
LangSmith / Langfuse 연동으로 RAG 파이프라인 전 구간 추적.

Features:
- RAG 검색 latency 추적 (per-source, total)
- 검색 결과 품질 로깅 (score 분포, top-k)
- LLM 호출 추적 (token 사용량, latency)
- 에러 / 폴백 이벤트 추적
- 대시보드용 메트릭 집계

Providers:
- LangSmith: LANGCHAIN_API_KEY + LANGCHAIN_TRACING_V2=true
- Langfuse: LANGFUSE_SECRET_KEY + LANGFUSE_PUBLIC_KEY
- Local: 파일 기반 JSON 로깅 (기본, 항상 활성)

USE_TRACING=1 환경변수로 외부 트레이싱 활성화.
"""

import json
import logging
import os
import time
from collections import deque
from dataclasses import dataclass, field, asdict
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

# Feature flags
USE_TRACING = os.environ.get("USE_TRACING", "0") == "1"
_HAS_LANGSMITH = False
_HAS_LANGFUSE = False

try:
    from langsmith import traceable, Client as LangSmithClient
    _HAS_LANGSMITH = bool(os.environ.get("LANGCHAIN_API_KEY"))
except ImportError:
    traceable = None
    LangSmithClient = None

try:
    from langfuse import Langfuse
    _HAS_LANGFUSE = bool(
        os.environ.get("LANGFUSE_SECRET_KEY")
        and os.environ.get("LANGFUSE_PUBLIC_KEY")
    )
except ImportError:
    Langfuse = None


@dataclass
class RAGTraceEvent:
    """단일 RAG 파이프라인 이벤트."""
    event_type: str          # "search", "rerank", "hyde", "llm", "error"
    source: str              # "graph_rag", "corpus_rag", "reranker", ...
    duration_ms: float = 0.0
    result_count: int = 0
    top_score: float = 0.0
    avg_score: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    error: Optional[str] = None


@dataclass
class RAGTrace:
    """전체 RAG 파이프라인 트레이스."""
    trace_id: str
    query: str
    domain: str = ""
    events: List[RAGTraceEvent] = field(default_factory=list)
    total_duration_ms: float = 0.0
    final_result_count: int = 0
    timestamp: float = field(default_factory=time.time)

    def add_event(self, event: RAGTraceEvent):
        """이벤트 추가."""
        self.events.append(event)

    def to_dict(self) -> Dict:
        """직렬화."""
        return {
            "trace_id": self.trace_id,
            "query": self.query,
            "domain": self.domain,
            "total_duration_ms": self.total_duration_ms,
            "final_result_count": self.final_result_count,
            "events": [asdict(e) for e in self.events],
            "timestamp": self.timestamp,
        }


class RAGTracer:
    """RAG 파이프라인 트레이서.

    3가지 모드:
    1. Local: 메모리 + JSON 파일 로깅 (항상 활성)
    2. LangSmith: LANGCHAIN_API_KEY 설정 시 활성
    3. Langfuse: LANGFUSE_SECRET_KEY 설정 시 활성
    """

    def __init__(
        self,
        max_traces: int = 1000,
        log_dir: str = "data/traces",
    ):
        self._traces: deque = deque(maxlen=max_traces)
        self._log_dir = log_dir
        self._lock = Lock()

        # 외부 트레이싱 클라이언트
        self._langsmith_client = None
        self._langfuse_client = None

        if USE_TRACING:
            self._init_external_tracers()

    def _init_external_tracers(self):
        """외부 트레이싱 클라이언트 초기화."""
        if _HAS_LANGSMITH and LangSmithClient:
            try:
                self._langsmith_client = LangSmithClient()
                logger.info("[Tracing] LangSmith 연결됨")
            except Exception as e:
                logger.warning("[Tracing] LangSmith 연결 실패: %s", e)

        if _HAS_LANGFUSE and Langfuse:
            try:
                self._langfuse_client = Langfuse()
                logger.info("[Tracing] Langfuse 연결됨")
            except Exception as e:
                logger.warning("[Tracing] Langfuse 연결 실패: %s", e)

    def start_trace(self, query: str, domain: str = "") -> RAGTrace:
        """새 트레이스 시작."""
        trace_id = f"rag_{int(time.time() * 1000)}_{id(query) % 10000}"
        trace = RAGTrace(
            trace_id=trace_id,
            query=query,
            domain=domain,
        )
        return trace

    def record_search(
        self,
        trace: RAGTrace,
        source: str,
        duration_ms: float,
        results: List = None,
        **metadata,
    ):
        """검색 이벤트 기록."""
        scores = []
        if results:
            for r in results:
                if isinstance(r, dict):
                    s = r.get("score", 0.0)
                elif hasattr(r, "score"):
                    s = r.score
                else:
                    s = 0.0
                scores.append(float(s))

        event = RAGTraceEvent(
            event_type="search",
            source=source,
            duration_ms=duration_ms,
            result_count=len(results) if results else 0,
            top_score=max(scores) if scores else 0.0,
            avg_score=sum(scores) / len(scores) if scores else 0.0,
            metadata=metadata,
        )
        trace.add_event(event)

    def record_rerank(
        self,
        trace: RAGTrace,
        duration_ms: float,
        input_count: int,
        output_count: int,
        top_score: float = 0.0,
        **metadata,
    ):
        """재순위화 이벤트 기록."""
        event = RAGTraceEvent(
            event_type="rerank",
            source="cross_encoder",
            duration_ms=duration_ms,
            result_count=output_count,
            top_score=top_score,
            metadata={"input_count": input_count, **metadata},
        )
        trace.add_event(event)

    def record_hyde(
        self,
        trace: RAGTrace,
        duration_ms: float,
        hypothesis_length: int = 0,
        used_llm: bool = False,
        **metadata,
    ):
        """HyDE 이벤트 기록."""
        event = RAGTraceEvent(
            event_type="hyde",
            source="hyde_generator",
            duration_ms=duration_ms,
            metadata={
                "hypothesis_length": hypothesis_length,
                "used_llm": used_llm,
                **metadata,
            },
        )
        trace.add_event(event)

    def record_error(
        self,
        trace: RAGTrace,
        source: str,
        error: str,
        **metadata,
    ):
        """에러 이벤트 기록."""
        event = RAGTraceEvent(
            event_type="error",
            source=source,
            error=error,
            metadata=metadata,
        )
        trace.add_event(event)

    def finish_trace(self, trace: RAGTrace):
        """트레이스 완료 및 저장."""
        trace.total_duration_ms = (time.time() - trace.timestamp) * 1000

        with self._lock:
            self._traces.append(trace)

        # 외부 트레이싱
        if USE_TRACING:
            self._send_to_external(trace)

        logger.debug(
            "[Tracing] %s: %.0fms, %d events",
            trace.trace_id, trace.total_duration_ms, len(trace.events),
        )

    def _send_to_external(self, trace: RAGTrace):
        """외부 트레이싱 서비스에 전송."""
        if self._langfuse_client:
            try:
                langfuse_trace = self._langfuse_client.trace(
                    name=f"rag_query",
                    input={"query": trace.query, "domain": trace.domain},
                    metadata={"trace_id": trace.trace_id},
                )
                for event in trace.events:
                    langfuse_trace.event(
                        name=f"{event.event_type}:{event.source}",
                        input=event.metadata,
                        output={
                            "duration_ms": event.duration_ms,
                            "result_count": event.result_count,
                            "top_score": event.top_score,
                        },
                    )
            except Exception as e:
                logger.warning("[Tracing] Langfuse 전송 실패: %s", e)

    def get_metrics(self, last_n: int = 100) -> Dict:
        """최근 N개 트레이스의 집계 메트릭."""
        with self._lock:
            recent = list(self._traces)[-last_n:]

        if not recent:
            return {
                "total_traces": 0,
                "avg_duration_ms": 0.0,
                "p50_duration_ms": 0.0,
                "p95_duration_ms": 0.0,
                "error_rate": 0.0,
            }

        durations = sorted([t.total_duration_ms for t in recent])
        error_count = sum(
            1 for t in recent
            if any(e.event_type == "error" for e in t.events)
        )

        n = len(durations)
        return {
            "total_traces": n,
            "avg_duration_ms": round(sum(durations) / n, 1),
            "p50_duration_ms": round(durations[n // 2], 1),
            "p95_duration_ms": round(durations[int(n * 0.95)], 1) if n > 1 else round(durations[0], 1),
            "max_duration_ms": round(max(durations), 1),
            "error_rate": round(error_count / n, 3),
            "avg_events_per_trace": round(
                sum(len(t.events) for t in recent) / n, 1
            ),
        }

    def get_source_metrics(self, last_n: int = 100) -> Dict[str, Dict]:
        """소스별 성능 메트릭."""
        with self._lock:
            recent = list(self._traces)[-last_n:]

        source_data: Dict[str, List[float]] = {}
        for trace in recent:
            for event in trace.events:
                if event.event_type == "search":
                    if event.source not in source_data:
                        source_data[event.source] = []
                    source_data[event.source].append(event.duration_ms)

        metrics = {}
        for source, durations in source_data.items():
            n = len(durations)
            sorted_d = sorted(durations)
            metrics[source] = {
                "count": n,
                "avg_ms": round(sum(sorted_d) / n, 1),
                "p95_ms": round(sorted_d[int(n * 0.95)], 1) if n > 1 else round(sorted_d[0], 1),
                "max_ms": round(max(sorted_d), 1),
            }

        return metrics

    def save_traces(self, output_path: str = None):
        """트레이스를 JSON 파일로 저장."""
        if output_path is None:
            output_path = os.path.join(self._log_dir, "rag_traces.json")

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with self._lock:
            traces = [t.to_dict() for t in self._traces]

        with open(path, "w", encoding="utf-8") as f:
            json.dump(traces, f, ensure_ascii=False, indent=2, default=str)

        logger.info("[Tracing] %d 트레이스 저장: %s", len(traces), output_path)


# ─── 싱글톤 ─────────────────────────────────────

_tracer: Optional[RAGTracer] = None
_tracer_lock = Lock()


def get_rag_tracer() -> RAGTracer:
    """싱글톤 RAGTracer 반환."""
    global _tracer
    if _tracer is None:
        with _tracer_lock:
            if _tracer is None:
                _tracer = RAGTracer()
    return _tracer
