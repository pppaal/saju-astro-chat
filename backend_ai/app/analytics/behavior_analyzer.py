"""
Behavior Analyzer
=================
사용자 행동 분석 모듈.

Features:
- 코호트 리텐션 분석
- 리텐션 퍼널
- 이탈 예측 (휴리스틱 기반)
- 서비스별 참여도
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from threading import Lock

logger = logging.getLogger(__name__)


class BehaviorAnalyzer:
    """사용자 행동 분석기."""

    def __init__(self):
        self._lock = Lock()

    def calculate_cohort_retention(self, months: int = 6) -> Dict[str, Any]:
        """월별 코호트 리텐션 계산.

        Note: 이 메서드는 실제로는 Prisma/DB에서 데이터를 가져와야 함.
        여기서는 Next.js 프론트엔드에서 Prisma로 직접 조회하는 것을 권장.
        이 메서드는 샘플 구조를 반환.
        """
        # 샘플 데이터 구조 (실제로는 DB 조회 필요)
        cohorts = []
        now = datetime.utcnow()

        for i in range(months):
            month_date = now - timedelta(days=30 * i)
            period = month_date.strftime("%Y-%m")

            # 샘플 리텐션 데이터 (실제로는 DB 조회)
            # week1, week2, week3, week4 리텐션율
            retention_by_week = [
                100.0,  # week 0 (기준)
                max(0, 80 - i * 5),  # week 1
                max(0, 60 - i * 5),  # week 2
                max(0, 45 - i * 5),  # week 3
                max(0, 35 - i * 5),  # week 4
            ]

            cohorts.append({
                "period": period,
                "totalUsers": 100 + i * 10,  # 샘플
                "retentionByWeek": retention_by_week,
            })

        # 평균 리텐션율 계산 (week 4 기준)
        week4_rates = [c["retentionByWeek"][4] for c in cohorts if len(c["retentionByWeek"]) > 4]
        avg_retention = sum(week4_rates) / len(week4_rates) if week4_rates else 0

        return {
            "cohorts": cohorts,
            "avgRetentionRate": round(avg_retention, 1),
        }

    def build_retention_funnel(self) -> Dict[str, Any]:
        """리텐션 퍼널 구축.

        Note: 실제로는 Prisma/DB에서 각 단계별 사용자 수를 집계해야 함.
        """
        # 샘플 퍼널 데이터 (실제로는 DB 조회 필요)
        stages = [
            {"name": "signup", "label": "가입", "count": 10000},
            {"name": "first_reading", "label": "첫 리딩", "count": 6500},
            {"name": "paid", "label": "첫 결제", "count": 2000},
            {"name": "retained_7d", "label": "7일 유지", "count": 1500},
            {"name": "retained_30d", "label": "30일 유지", "count": 800},
        ]

        # 전환율 계산
        for i, stage in enumerate(stages):
            if i == 0:
                stage["conversionRate"] = 100.0
                stage["dropoffRate"] = 0.0
            else:
                prev_count = stages[i - 1]["count"]
                stage["conversionRate"] = round(stage["count"] / stages[0]["count"] * 100, 1)
                stage["dropoffRate"] = round((prev_count - stage["count"]) / prev_count * 100, 1) if prev_count > 0 else 0

        overall_conversion = stages[-1]["count"] / stages[0]["count"] * 100 if stages[0]["count"] > 0 else 0

        return {
            "stages": stages,
            "overallConversion": round(overall_conversion, 2),
        }

    def predict_churn(self, limit: int = 100) -> Dict[str, Any]:
        """이탈 예측 (휴리스틱 기반).

        위험 요인:
        - 7일 이상 미접속: 30점
        - 14일 이상 미접속: 50점
        - 30일 이상 미접속: 80점
        - 구독 취소 예정: 90점
        - 최근 14일 리딩 없음: 40점

        Note: 실제로는 Prisma/DB에서 사용자 활동 데이터 조회 필요.
        """
        # 샘플 이탈 위험 사용자 (실제로는 DB 조회 필요)
        at_risk_users = []
        now = datetime.utcnow()

        # 샘플 데이터 생성
        sample_users = [
            {
                "userId": "user_001",
                "email": "user1@example.com",
                "name": "김철수",
                "lastActive": (now - timedelta(days=35)).isoformat(),
                "daysSinceLastActivity": 35,
                "riskFactors": ["inactive_30d", "no_readings_14d"],
            },
            {
                "userId": "user_002",
                "email": "user2@example.com",
                "name": "이영희",
                "lastActive": (now - timedelta(days=20)).isoformat(),
                "daysSinceLastActivity": 20,
                "riskFactors": ["inactive_14d"],
            },
            {
                "userId": "user_003",
                "email": "user3@example.com",
                "name": "박민수",
                "lastActive": (now - timedelta(days=8)).isoformat(),
                "daysSinceLastActivity": 8,
                "riskFactors": ["inactive_7d", "cancelled_subscription"],
            },
        ]

        for user in sample_users[:limit]:
            risk_score = self._calculate_risk_score(user["riskFactors"])
            at_risk_users.append({
                **user,
                "riskScore": risk_score,
            })

        # 위험 점수 기준 내림차순 정렬
        at_risk_users.sort(key=lambda x: x["riskScore"], reverse=True)

        # 30일 내 예상 이탈 사용자 수 (위험 점수 70 이상)
        high_risk_count = len([u for u in at_risk_users if u["riskScore"] >= 70])

        return {
            "atRiskUsers": at_risk_users,
            "totalAtRisk": len(at_risk_users),
            "predictedChurnNext30Days": high_risk_count,
        }

    def _calculate_risk_score(self, risk_factors: List[str]) -> int:
        """위험 요인 기반 점수 계산."""
        factor_scores = {
            "inactive_7d": 30,
            "inactive_14d": 50,
            "inactive_30d": 80,
            "cancelled_subscription": 90,
            "no_readings_14d": 40,
            "subscription_expiring": 60,
        }

        # 가장 높은 점수 반환 (누적이 아닌 최고점)
        max_score = 0
        for factor in risk_factors:
            score = factor_scores.get(factor, 0)
            max_score = max(max_score, score)

        return min(max_score, 100)

    def get_service_engagement(self) -> List[Dict[str, Any]]:
        """서비스별 참여도.

        Note: 실제로는 Reading 테이블에서 type별로 집계 필요.
        """
        # 샘플 데이터 (실제로는 DB 조회 필요)
        services = [
            {
                "service": "destiny_map",
                "dailyActiveUsers": 1200,
                "weeklyActiveUsers": 5500,
                "monthlyActiveUsers": 12000,
                "totalReadings": 45000,
            },
            {
                "service": "tarot",
                "dailyActiveUsers": 2500,
                "weeklyActiveUsers": 8000,
                "monthlyActiveUsers": 18000,
                "totalReadings": 120000,
            },
            {
                "service": "dream",
                "dailyActiveUsers": 800,
                "weeklyActiveUsers": 3200,
                "monthlyActiveUsers": 8500,
                "totalReadings": 32000,
            },
            {
                "service": "compatibility",
                "dailyActiveUsers": 600,
                "weeklyActiveUsers": 2100,
                "monthlyActiveUsers": 5500,
                "totalReadings": 18000,
            },
            {
                "service": "numerology",
                "dailyActiveUsers": 400,
                "weeklyActiveUsers": 1500,
                "monthlyActiveUsers": 4000,
                "totalReadings": 12000,
            },
        ]

        return services

    def get_user_activity_summary(self) -> Dict[str, Any]:
        """사용자 활동 요약.

        Note: 실제로는 DB에서 집계 필요.
        """
        return {
            "totalActiveToday": 3500,
            "totalActiveThisWeek": 12000,
            "totalActiveThisMonth": 28000,
            "newUsersToday": 150,
        }

    def get_full_behavior_data(self) -> Dict[str, Any]:
        """전체 행동 분석 데이터 반환."""
        return {
            "cohortAnalysis": self.calculate_cohort_retention(),
            "retentionFunnel": self.build_retention_funnel(),
            "churnPrediction": self.predict_churn(),
            "engagementByService": self.get_service_engagement(),
            "userActivitySummary": self.get_user_activity_summary(),
        }


# 싱글톤
_analyzer: Optional[BehaviorAnalyzer] = None
_analyzer_lock = Lock()


def get_behavior_analyzer() -> BehaviorAnalyzer:
    """싱글톤 BehaviorAnalyzer 반환."""
    global _analyzer
    if _analyzer is None:
        with _analyzer_lock:
            if _analyzer is None:
                _analyzer = BehaviorAnalyzer()
    return _analyzer
