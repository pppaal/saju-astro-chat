"""
Unit tests for Electional Engine module.

Tests:
- ElectionalEngine class
- Event type detection
- Best time finding
- Yearly period analysis
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock


class TestElectionalEngineInstantiation:
    """Tests for ElectionalEngine instantiation."""

    def test_engine_instantiation(self):
        """Test engine can be instantiated."""
        from backend_ai.app.prediction.electional import ElectionalEngine

        engine = ElectionalEngine()
        assert engine is not None

    def test_engine_has_components(self):
        """Test engine has required components."""
        from backend_ai.app.prediction.electional import ElectionalEngine

        engine = ElectionalEngine()
        assert engine.data_loader is not None
        assert engine.luck_predictor is not None
        assert engine.transit_engine is not None


class TestDetectEventType:
    """Tests for _detect_event_type method."""

    def test_detect_career_keywords(self):
        """Test career event detection."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        assert engine._detect_event_type("취업하기 좋은 시기는?") == EventType.CAREER
        assert engine._detect_event_type("이직 언제가 좋을까요?") == EventType.CAREER
        assert engine._detect_event_type("사업 시작할 때는?") == EventType.CAREER

    def test_detect_relationship_keywords(self):
        """Test relationship event detection."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        assert engine._detect_event_type("결혼 시기") == EventType.RELATIONSHIP
        assert engine._detect_event_type("고백하기 좋은 날") == EventType.RELATIONSHIP
        assert engine._detect_event_type("연애 운") == EventType.RELATIONSHIP

    def test_detect_finance_keywords(self):
        """Test finance event detection."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        assert engine._detect_event_type("투자 시작할 때") == EventType.FINANCE
        assert engine._detect_event_type("주식 살 때") == EventType.FINANCE
        assert engine._detect_event_type("집 사야 할까요?") == EventType.FINANCE

    def test_detect_health_keywords(self):
        """Test health event detection."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        assert engine._detect_event_type("수술 날짜") == EventType.HEALTH
        assert engine._detect_event_type("다이어트 시작") == EventType.HEALTH

    def test_detect_education_keywords(self):
        """Test education event detection."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        assert engine._detect_event_type("시험 치기 좋은 날") == EventType.EDUCATION
        assert engine._detect_event_type("자격증 공부") == EventType.EDUCATION

    def test_detect_travel_keywords(self):
        """Test travel event detection."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        assert engine._detect_event_type("여행 가기 좋은 때") == EventType.TRAVEL
        assert engine._detect_event_type("이사 날짜") == EventType.TRAVEL

    def test_detect_contract_keywords(self):
        """Test contract event detection."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        assert engine._detect_event_type("계약하기 좋은 날") == EventType.CONTRACT
        assert engine._detect_event_type("협상 시기") == EventType.CONTRACT

    def test_detect_general_fallback(self):
        """Test general fallback for unknown questions."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        assert engine._detect_event_type("오늘 뭐하지?") == EventType.GENERAL


class TestIsPastQuestion:
    """Tests for _is_past_question method."""

    def test_past_question_detection(self):
        """Test past question detection."""
        from backend_ai.app.prediction.electional import ElectionalEngine

        engine = ElectionalEngine()

        assert engine._is_past_question("작년에 왜 힘들었을까요?") is True
        assert engine._is_past_question("그때 왜 안 됐을까?") is True

    def test_future_question_detection(self):
        """Test future question is not past."""
        from backend_ai.app.prediction.electional import ElectionalEngine

        engine = ElectionalEngine()

        assert engine._is_past_question("언제가 좋을까요?") is False
        assert engine._is_past_question("내년에 어떨까?") is False


class TestQualityToKorean:
    """Tests for _quality_to_korean method."""

    def test_quality_to_korean_excellent(self):
        """Test excellent quality translation."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import TimingQuality

        engine = ElectionalEngine()

        result = engine._quality_to_korean(TimingQuality.EXCELLENT)
        assert "최상" in result

    def test_quality_to_korean_good(self):
        """Test good quality translation."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import TimingQuality

        engine = ElectionalEngine()

        result = engine._quality_to_korean(TimingQuality.GOOD)
        assert "좋음" in result

    def test_quality_to_korean_avoid(self):
        """Test avoid quality translation."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import TimingQuality

        engine = ElectionalEngine()

        result = engine._quality_to_korean(TimingQuality.AVOID)
        assert "피함" in result


class TestEventToCategory:
    """Tests for _event_to_category method."""

    def test_event_to_category_career(self):
        """Test career event to category."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        assert engine._event_to_category(EventType.CAREER) == "career"

    def test_event_to_category_relationship(self):
        """Test relationship event to category."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        assert engine._event_to_category(EventType.RELATIONSHIP) == "relationship"

    def test_event_to_category_education(self):
        """Test education maps to career."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        # Education often maps to career for scoring
        assert engine._event_to_category(EventType.EDUCATION) == "career"


class TestEventToKorean:
    """Tests for _event_to_korean method."""

    def test_event_to_korean_career(self):
        """Test career to Korean."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        result = engine._event_to_korean(EventType.CAREER)
        assert "직업" in result or "사업" in result

    def test_event_to_korean_relationship(self):
        """Test relationship to Korean."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        result = engine._event_to_korean(EventType.RELATIONSHIP)
        assert "연애" in result or "결혼" in result


class TestGetGeneralAdvice:
    """Tests for _get_general_advice method."""

    def test_get_general_advice_career(self):
        """Test career advice."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        result = engine._get_general_advice(EventType.CAREER)

        assert "직업" in result or "사업" in result
        assert len(result) > 50

    def test_get_general_advice_relationship(self):
        """Test relationship advice."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        result = engine._get_general_advice(EventType.RELATIONSHIP)

        assert "연애" in result or "결혼" in result

    def test_get_general_advice_finance(self):
        """Test finance advice."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        result = engine._get_general_advice(EventType.FINANCE)

        assert "재물" in result or "투자" in result

    def test_get_general_advice_unknown(self):
        """Test unknown event type fallback."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        result = engine._get_general_advice(EventType.HEALTH)

        # Should return some advice
        assert len(result) > 0


class TestFindBestTime:
    """Tests for find_best_time method."""

    def test_find_best_time_basic(self):
        """Test basic best time finding."""
        from backend_ai.app.prediction.electional import ElectionalEngine

        engine = ElectionalEngine()

        result = engine.find_best_time(
            question="취업하기 좋은 시기는?",
            start_date=datetime(2025, 1, 1),
            days_range=30
        )

        assert "question" in result
        assert "event_type" in result
        assert "recommendations" in result or "periods" in result

    def test_find_best_time_with_birth_info(self):
        """Test best time with birth info."""
        from backend_ai.app.prediction.electional import ElectionalEngine

        engine = ElectionalEngine()

        result = engine.find_best_time(
            question="결혼하기 좋은 해는?",
            birth_info={"year": 1990, "month": 5}
        )

        assert "analysis_type" in result
        assert result["analysis_type"] == "yearly_saju"
        assert "periods" in result

    def test_find_best_time_result_structure(self):
        """Test result has expected structure."""
        from backend_ai.app.prediction.electional import ElectionalEngine

        engine = ElectionalEngine()

        result = engine.find_best_time(
            question="이직 시기",
            start_date=datetime(2025, 1, 1),
            days_range=30
        )

        assert "question" in result
        assert "event_type" in result
        assert "general_advice" in result


class TestAnalyzeYearlyPeriods:
    """Tests for _analyze_yearly_periods method."""

    def test_analyze_yearly_periods_basic(self):
        """Test basic yearly analysis."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        result = engine._analyze_yearly_periods(
            question="사업 시작",
            birth_info={"year": 1985, "month": 3},
            event_type=EventType.CAREER
        )

        assert "periods" in result
        assert len(result["periods"]) > 0

    def test_analyze_yearly_periods_has_recommendation(self):
        """Test yearly analysis has recommendation."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        result = engine._analyze_yearly_periods(
            question="결혼",
            birth_info={"year": 1990, "month": 6},
            event_type=EventType.RELATIONSHIP
        )

        assert "recommendation" in result
        assert "best_year" in result["recommendation"]
        assert "best_months" in result["recommendation"]

    def test_analyze_yearly_periods_sorted_by_score(self):
        """Test periods are sorted by score."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        result = engine._analyze_yearly_periods(
            question="투자",
            birth_info={"year": 1988, "month": 9},
            event_type=EventType.FINANCE
        )

        periods = result["periods"]
        if len(periods) > 1:
            for i in range(len(periods) - 1):
                assert periods[i]["score"] >= periods[i + 1]["score"]

    def test_analyze_yearly_periods_past_question(self):
        """Test past question includes past years."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()
        current_year = datetime.now().year

        result = engine._analyze_yearly_periods(
            question="왜 힘들었을까요?",
            birth_info={"year": 1990, "month": 5},
            event_type=EventType.CAREER
        )

        years = [p["year"] for p in result["periods"]]
        # Should include past years
        assert any(y < current_year for y in years)


class TestGetDatesToAvoid:
    """Tests for _get_dates_to_avoid method."""

    def test_get_dates_to_avoid_basic(self):
        """Test basic dates to avoid."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        result = engine._get_dates_to_avoid(
            EventType.CONTRACT,
            datetime(2025, 1, 1),
            60
        )

        assert isinstance(result, list)

    def test_get_dates_to_avoid_max_five(self):
        """Test dates to avoid limited to 5."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        result = engine._get_dates_to_avoid(
            EventType.CAREER,
            datetime(2025, 1, 1),
            365
        )

        assert len(result) <= 5

    def test_get_dates_to_avoid_has_reason(self):
        """Test avoided dates have reasons."""
        from backend_ai.app.prediction.electional import ElectionalEngine
        from backend_ai.app.prediction.types import EventType

        engine = ElectionalEngine()

        result = engine._get_dates_to_avoid(
            EventType.TRAVEL,
            datetime(2025, 1, 1),
            90
        )

        for avoid in result:
            assert "date" in avoid
            assert "reason" in avoid
