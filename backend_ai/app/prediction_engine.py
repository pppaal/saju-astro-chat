"""
Prediction Engine v5.2
사주 대운/세운 + 점성술 트랜짓 통합 예측 시스템 + RAG

Features:
- 대운/세운 기반 장기 예측
- 트랜짓 기반 이벤트 타이밍
- '언제가 좋을까?' 질문 답변
- 사주-점성술 크로스 분석
- GraphRAG 연동으로 풍부한 해석 컨텍스트 제공

v5.2 Updates:
- 병렬 처리로 성능 개선 (ThreadPoolExecutor)
- 예측 결과 캐싱 추가
- AI 해석 프롬프트 최적화 (토큰 절약)
- 모듈화: prediction/ 패키지로 분리
"""

import json
import os
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed
import math
import logging

# 한국 시간대 (UTC+9)
KST = timezone(timedelta(hours=9))

logger = logging.getLogger(__name__)

# Import from refactored modules
from backend_ai.app.prediction import (
    TimingQuality,
    EventType,
    TimingWindow,
    LuckPeriod,
    DataLoader,
    LuckCyclePredictor,
    TransitTimingEngine,
    ElectionalEngine,
)

# OpenAI for AI-enhanced predictions
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OpenAI = None
    OPENAI_AVAILABLE = False

# GraphRAG for rich interpretation context
try:
    from backend_ai.app.saju_astro_rag import get_graph_rag, search_graphs
    GRAPH_RAG_AVAILABLE = True
except ImportError:
    try:
        from .saju_astro_rag import get_graph_rag, search_graphs
        GRAPH_RAG_AVAILABLE = True
    except ImportError:
        GRAPH_RAG_AVAILABLE = False
        logger.warning("[PredictionEngine] GraphRAG not available")

# Note: TimingQuality, EventType, TimingWindow, LuckPeriod, DataLoader,
# LuckCyclePredictor, TransitTimingEngine, ElectionalEngine
# have been moved to backend_ai/app/prediction/ package

class UnifiedPredictionEngine:
    """
    통합 예측 엔진 v5.2

    사주 + 점성술 + 타로를 통합하여
    종합적인 예측과 타이밍 조언 제공
    + GraphRAG로 풍부한 해석 컨텍스트 제공

    v5.2 Updates:
    - 예측 결과 캐싱 (메모리 + TTL)
    - 병렬 처리로 성능 개선
    """

    # 캐시 TTL (초)
    CACHE_TTL = 3600  # 1시간

    def __init__(self, api_key: str = None):
        self.data_loader = DataLoader()
        self.luck_predictor = LuckCyclePredictor(self.data_loader)
        self.transit_engine = TransitTimingEngine(self.data_loader)

        # v5.2: 예측 결과 캐시 (메모리)
        self._prediction_cache: Dict[str, Any] = {}
        self._cache_timestamps: Dict[str, datetime] = {}

        # AI 해석을 위한 OpenAI 클라이언트 (먼저 초기화)
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = None
        if OPENAI_AVAILABLE and self.api_key:
            import httpx
            self.client = OpenAI(
                api_key=self.api_key,
                timeout=httpx.Timeout(30.0, connect=5.0)  # v5.2: 타임아웃 축소
            )
            logger.info("[PredictionEngine] OpenAI client initialized for AI event detection")

        # ElectionalEngine에 OpenAI 클라이언트 전달 (AI 기반 질문 의도 파악)
        self.electional_engine = ElectionalEngine(self.data_loader, openai_client=self.client)

        # GraphRAG for rich context
        self.graph_rag = None
        if GRAPH_RAG_AVAILABLE:
            try:
                self.graph_rag = get_graph_rag()
                logger.info("[PredictionEngine] GraphRAG loaded successfully")
            except Exception as e:
                logger.warning(f"[PredictionEngine] GraphRAG init failed: {e}")

    def _is_cache_valid(self, key: str) -> bool:
        """캐시 유효성 검사"""
        if key not in self._cache_timestamps:
            return False
        age = (datetime.now(KST) - self._cache_timestamps[key]).total_seconds()
        return age < self.CACHE_TTL

    def clear_cache(self):
        """캐시 초기화"""
        self._prediction_cache.clear()
        self._cache_timestamps.clear()
        logger.info("[PredictionEngine] Cache cleared")

    def search_rag_context(
        self,
        query: str,
        domain: str = "saju",
        top_k: int = 8
    ) -> Dict:
        """
        GraphRAG에서 관련 해석 컨텍스트 검색

        Args:
            query: 검색 쿼리 (예: "정관 대운 직장 승진")
            domain: 도메인 우선순위 (saju, astro, fusion)
            top_k: 검색 결과 수

        Returns:
            RAG 검색 결과 (matched_nodes, context_text, rule_summary 등)
        """
        if not self.graph_rag:
            return {"context_text": "", "matched_nodes": [], "error": "GraphRAG not available"}

        try:
            # GraphRAG query는 facts dict를 받음
            facts = {"query": query, "domain": domain}
            result = self.graph_rag.query(facts, top_k=top_k, domain_priority=domain)
            return result
        except Exception as e:
            logger.error(f"[PredictionEngine] RAG search failed: {e}")
            return {"context_text": "", "matched_nodes": [], "error": str(e)}

    def get_sipsin_rag_context(self, sipsin: str, event_type: str = None) -> str:
        """
        특정 십신에 대한 RAG 컨텍스트 검색

        Args:
            sipsin: 십신 이름 (정관, 편재 등)
            event_type: 이벤트 유형 (career, relationship 등)

        Returns:
            RAG 검색 결과 텍스트
        """
        if not GRAPH_RAG_AVAILABLE:
            return ""

        # 검색 쿼리 구성
        query_parts = [sipsin, "대운", "운세"]
        if event_type:
            event_ko = {
                "career": "직장 사업 취업",
                "relationship": "연애 결혼 인연",
                "finance": "재물 투자 돈",
                "health": "건강",
                "education": "학업 시험 공부",
                "travel": "여행 이사",
                "contract": "계약 협상"
            }.get(event_type, "")
            if event_ko:
                query_parts.append(event_ko)

        query = " ".join(query_parts)

        try:
            results = search_graphs(query, top_k=6)
            if results:
                context_lines = []
                for r in results:
                    label = r.get("label", "")
                    desc = r.get("description", "")
                    if desc:
                        context_lines.append(f"[{label}] {desc[:200]}")
                return "\n".join(context_lines)
        except Exception as e:
            logger.warning(f"[PredictionEngine] sipsin RAG search failed: {e}")

        return ""

    def get_timing_rag_context(self, event_type: str, date: datetime = None) -> str:
        """
        타이밍/택일 관련 RAG 컨텍스트 검색

        Args:
            event_type: 이벤트 유형
            date: 대상 날짜

        Returns:
            RAG 검색 결과 텍스트
        """
        if not GRAPH_RAG_AVAILABLE:
            return ""

        # 이벤트 유형별 검색 키워드
        event_queries = {
            "career": "직장 사업 승진 취업 좋은 시기",
            "relationship": "연애 결혼 인연 좋은 날",
            "finance": "투자 재물 재테크 좋은 시기",
            "health": "건강 수술 치료 좋은 날",
            "education": "시험 합격 공부 좋은 시기",
            "travel": "여행 이사 이동 좋은 날",
            "contract": "계약 협상 서명 좋은 시기",
            "general": "길일 좋은 날 택일"
        }

        query = event_queries.get(event_type, event_queries["general"])

        try:
            results = search_graphs(query, top_k=5)
            if results:
                context_lines = []
                for r in results:
                    desc = r.get("description", "")
                    if desc:
                        context_lines.append(desc[:150])
                return "\n".join(context_lines)
        except Exception as e:
            logger.warning(f"[PredictionEngine] timing RAG search failed: {e}")

        return ""

    def _make_cache_key(self, prefix: str, data: Dict) -> str:
        """캐시 키 생성"""
        serialized = json.dumps(data, sort_keys=True)
        hash_digest = hashlib.sha256(serialized.encode()).hexdigest()[:16]
        return f"prediction:{prefix}:{hash_digest}"

    def get_comprehensive_forecast(
        self,
        birth_info: Dict,
        question: str = None,
        include_timing: bool = True
    ) -> Dict:
        """
        종합 예측 (RAG 컨텍스트 포함) - v5.2 병렬 처리 + 캐싱

        Args:
            birth_info: {"year": int, "month": int, "day": int, "hour": int, "gender": str}
            question: 특정 질문 (선택)
            include_timing: 타이밍 추천 포함 여부
        """
        # 캐시 체크 (AI 해석 제외한 기본 예측)
        cache_key = self._make_cache_key("forecast", {
            **birth_info,
            "year_now": datetime.now(KST).year
        })

        # 캐시된 기본 결과가 있으면 AI 해석만 추가
        cached = self._prediction_cache.get(cache_key)
        if cached and self._is_cache_valid(cache_key):
            logger.info(f"[Forecast] Cache HIT: {cache_key[:30]}...")
            result = cached.copy()
            result["predictions"] = cached["predictions"].copy()
            result["rag_context"] = cached.get("rag_context", {}).copy()

            # AI 해석만 새로 생성 (질문이 있을 때)
            if self.client and question:
                try:
                    ai_interpretation = self._generate_ai_interpretation_fast(result, question)
                    result["ai_interpretation"] = ai_interpretation
                except Exception as e:
                    result["ai_interpretation"] = {"error": str(e)}

            return result

        result = {
            "birth_info": birth_info,
            "generated_at": datetime.now(KST).isoformat(),
            "predictions": {},
            "rag_context": {}
        }

        current_year = datetime.now(KST).year
        daeun_sipsin = None
        seun_sipsin = None

        # ========== 병렬 처리: 대운/세운/5년예측 동시 실행 ==========
        def calc_daeun():
            return self.luck_predictor.calculate_daeun(
                birth_info["year"],
                birth_info["month"],
                birth_info.get("day", 15),
                birth_info.get("hour", 12),
                birth_info.get("gender", "unknown")
            )

        def calc_seun():
            return self.luck_predictor.calculate_seun(
                birth_info["year"],
                birth_info["month"],
                current_year
            )

        def calc_long_term():
            return self.luck_predictor.get_long_term_forecast(
                birth_info["year"],
                birth_info["month"],
                birth_info.get("day", 15),
                birth_info.get("hour", 12),
                birth_info.get("gender", "unknown"),
                years_ahead=5
            )

        with ThreadPoolExecutor(max_workers=3) as executor:
            future_daeun = executor.submit(calc_daeun)
            future_seun = executor.submit(calc_seun)
            future_long = executor.submit(calc_long_term)

            # 대운 결과
            try:
                daeun = future_daeun.result(timeout=5)
                daeun_sipsin = daeun.dominant_god
                result["predictions"]["current_daeun"] = {
                    "period": f"{daeun.start_year}-{daeun.end_year}",
                    "dominant_god": daeun.dominant_god,
                    "element": daeun.element,
                    "themes": daeun.themes,
                    "opportunities": daeun.opportunities,
                    "challenges": daeun.challenges,
                    "overall_rating": round(daeun.overall_rating, 1)
                }
            except Exception as e:
                result["predictions"]["current_daeun"] = {"error": str(e)}

            # 세운 결과
            try:
                seun = future_seun.result(timeout=5)
                seun_sipsin = seun.dominant_god
                result["predictions"]["current_seun"] = {
                    "year": current_year,
                    "dominant_god": seun.dominant_god,
                    "element": seun.element,
                    "themes": seun.themes,
                    "opportunities": seun.opportunities,
                    "challenges": seun.challenges,
                    "overall_rating": round(seun.overall_rating, 1)
                }
            except Exception as e:
                result["predictions"]["current_seun"] = {"error": str(e)}

            # 5년 예측 결과
            try:
                long_term = future_long.result(timeout=5)
                result["predictions"]["five_year_outlook"] = long_term
            except Exception as e:
                result["predictions"]["five_year_outlook"] = {"error": str(e)}

        # ========== RAG 컨텍스트 (간소화) ==========
        # 대운+세운 십신이 같으면 하나만 검색
        if daeun_sipsin:
            daeun_context = self.get_sipsin_rag_context(daeun_sipsin)
            if daeun_context:
                result["rag_context"]["daeun"] = daeun_context

        if seun_sipsin and seun_sipsin != daeun_sipsin:
            seun_context = self.get_sipsin_rag_context(seun_sipsin)
            if seun_context:
                result["rag_context"]["seun"] = seun_context

        # 조합 컨텍스트는 스킵 (속도 우선)

        # ========== 택일 분석 (질문이 있을 때만) ==========
        if question and include_timing:
            try:
                timing = self.electional_engine.find_best_time(
                    question,
                    birth_info,
                    days_range=90
                )
                result["predictions"]["timing_recommendation"] = timing
            except Exception as e:
                result["predictions"]["timing_recommendation"] = {"error": str(e)}

        # ========== 결과 캐싱 (AI 해석 제외) ==========
        self._prediction_cache[cache_key] = {
            "birth_info": result["birth_info"],
            "generated_at": result["generated_at"],
            "predictions": result["predictions"],
            "rag_context": result.get("rag_context", {})
        }
        self._cache_timestamps[cache_key] = datetime.now(KST)

        # ========== AI 해석 (최적화된 버전) ==========
        if self.client and question:
            try:
                ai_interpretation = self._generate_ai_interpretation_fast(result, question)
                result["ai_interpretation"] = ai_interpretation
            except Exception as e:
                result["ai_interpretation"] = {"error": str(e)}

        return result

    def answer_timing_question(self, question: str, birth_info: Dict = None) -> Dict:
        """
        '언제가 좋을까?' 질문에 직접 답변
        """
        timing = self.electional_engine.find_best_time(
            question,
            birth_info,
            days_range=90
        )

        # AI로 자연스러운 답변 생성
        if self.client:
            try:
                natural_answer = self._generate_natural_answer(question, timing)
                timing["natural_answer"] = natural_answer
            except Exception:
                pass

        return timing

    def _generate_ai_interpretation_fast(self, data: Dict, question: str) -> str:
        """
        AI 해석 생성 - 최적화 버전 v5.2
        - 프롬프트 간소화 (토큰 50% 절감)
        - max_tokens 축소 (600 -> 400)
        - 불필요한 RAG 컨텍스트 생략
        """
        predictions = data.get('predictions', {})

        # 핵심 정보만 추출
        daeun = predictions.get('current_daeun', {})
        seun = predictions.get('current_seun', {})

        summary = f"""대운: {daeun.get('dominant_god', '?')} ({daeun.get('period', '?')}) - {', '.join(daeun.get('themes', [])[:2])}
세운: {seun.get('dominant_god', '?')} ({seun.get('year', '?')}) - {', '.join(seun.get('themes', [])[:2])}
기회: {', '.join(daeun.get('opportunities', [])[:2] + seun.get('opportunities', [])[:2])}
주의: {', '.join(daeun.get('challenges', [])[:1] + seun.get('challenges', [])[:1])}"""

        prompt = f"""[운세 데이터]
{summary}

[질문] {question}

위 운세 흐름을 바탕으로 친근하고 희망적인 조언을 300자 이내로 작성하세요."""

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "운세 상담사. 따뜻하고 구체적인 조언 제공."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=400
        )

        return response.choices[0].message.content

    def _generate_ai_interpretation(self, data: Dict, question: str) -> str:
        """AI를 통한 자연스러운 해석 생성 (RAG 컨텍스트 활용) - 레거시"""
        # v5.2: 최적화 버전으로 대체
        return self._generate_ai_interpretation_fast(data, question)

    def _generate_natural_answer(self, question: str, timing_data: Dict) -> str:
        """자연스러운 타이밍 답변 생성"""

        recommendations = timing_data.get("recommendations", [])
        if not recommendations:
            return "분석 결과를 생성할 수 없습니다."

        best = recommendations[0]

        prompt = f"""사용자 질문: {question}

분석 결과:
- 최적 기간: {best['start_date']} ~ {best['end_date']}
- 품질: {best['quality_display']}
- 점수: {best['score']}점
- 이유: {', '.join(best['reasons'].get('astro', []) + best['reasons'].get('saju', []))}

위 정보를 바탕으로 친근하고 자연스러운 답변을 200자 내외로 작성해주세요.
구체적인 날짜와 이유를 포함하세요."""

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 친근한 운세 상담사입니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=300
        )

        return response.choices[0].message.content


# 싱글톤 인스턴스
_prediction_engine: Optional[UnifiedPredictionEngine] = None


def get_prediction_engine(api_key: str = None) -> UnifiedPredictionEngine:
    """예측 엔진 싱글톤 반환"""
    global _prediction_engine
    if _prediction_engine is None:
        _prediction_engine = UnifiedPredictionEngine(api_key)
    return _prediction_engine


# 편의 함수들
def predict_luck(birth_info: Dict, years_ahead: int = 5) -> List[Dict]:
    """운세 예측"""
    engine = get_prediction_engine()
    return engine.luck_predictor.get_long_term_forecast(
        birth_info["year"],
        birth_info["month"],
        birth_info.get("day", 15),
        birth_info.get("hour", 12),
        birth_info.get("gender", "unknown"),
        years_ahead
    )


def find_best_date(question: str, birth_info: Dict = None) -> Dict:
    """최적 날짜 찾기"""
    engine = get_prediction_engine()
    return engine.answer_timing_question(question, birth_info)


def get_full_forecast(birth_info: Dict, question: str = None) -> Dict:
    """전체 예측"""
    engine = get_prediction_engine()
    return engine.get_comprehensive_forecast(birth_info, question)
