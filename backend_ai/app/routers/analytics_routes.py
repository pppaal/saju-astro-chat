"""
Analytics Routes (Flask Blueprint)
===================================
고급 분석 API 엔드포인트.

Endpoints:
- GET /api/analytics/performance - 심층 성능 분석
- GET /api/analytics/behavior - 사용자 행동 분석
- GET /api/analytics/health - 헬스 체크
"""

import logging
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@analytics_bp.route("/performance", methods=["GET"])
def get_performance_metrics():
    """심층 성능 분석 데이터 반환.

    Returns:
        - apiMetrics: API 엔드포인트별 상세 메트릭
        - bottlenecks: 자동 감지된 병목
        - ragMetrics: RAG 파이프라인 성능
        - cacheMetrics: 캐시 성능
        - distributedTraces: 분산 추적 데이터
        - systemHealth: 시스템 헬스 요약
    """
    try:
        from backend_ai.app.analytics import get_performance_analyzer

        analyzer = get_performance_analyzer()
        data = analyzer.get_full_performance_data()

        return jsonify({
            "success": True,
            "data": data,
        })
    except Exception as e:
        logger.error("[Analytics] Performance metrics error: %s", e)
        return jsonify({
            "success": False,
            "error": {
                "code": "ANALYTICS_ERROR",
                "message": str(e),
            },
        }), 500


@analytics_bp.route("/behavior", methods=["GET"])
def get_behavior_metrics():
    """사용자 행동 분석 데이터 반환.

    Returns:
        - cohortAnalysis: 코호트 리텐션 분석
        - retentionFunnel: 리텐션 퍼널
        - churnPrediction: 이탈 예측
        - engagementByService: 서비스별 참여도
        - userActivitySummary: 사용자 활동 요약
    """
    try:
        from backend_ai.app.analytics import get_behavior_analyzer

        analyzer = get_behavior_analyzer()
        data = analyzer.get_full_behavior_data()

        return jsonify({
            "success": True,
            "data": data,
        })
    except Exception as e:
        logger.error("[Analytics] Behavior metrics error: %s", e)
        return jsonify({
            "success": False,
            "error": {
                "code": "ANALYTICS_ERROR",
                "message": str(e),
            },
        }), 500


@analytics_bp.route("/health", methods=["GET"])
def get_analytics_health():
    """Analytics 모듈 헬스 체크."""
    return jsonify({
        "status": "ok",
        "module": "analytics",
        "endpoints": [
            "/api/analytics/performance",
            "/api/analytics/behavior",
        ],
    })
