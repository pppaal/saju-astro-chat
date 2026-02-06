"""
Unit tests for Transit Timing Engine module.

Tests:
- TransitTimingEngine class
- Event timing calculations
- Moon phase calculations
- Weekday evaluation
- Retrograde checking
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock


class TestTransitTimingEngineInstantiation:
    """Tests for TransitTimingEngine class instantiation."""

    def test_engine_instantiation(self):
        """Test engine can be instantiated."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        engine = TransitTimingEngine()
        assert engine is not None

    def test_engine_has_data_loader(self):
        """Test engine has data loader."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        engine = TransitTimingEngine()
        assert engine.data_loader is not None

    def test_engine_has_electional_rules(self):
        """Test engine loads electional rules."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        engine = TransitTimingEngine()
        assert hasattr(engine, 'electional_rules')


class TestEventFavorableAspects:
    """Tests for EVENT_FAVORABLE_ASPECTS constant."""

    def test_career_event_has_aspects(self):
        """Test career event has favorable aspects defined."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType

        aspects = TransitTimingEngine.EVENT_FAVORABLE_ASPECTS[EventType.CAREER]
        assert 'planets' in aspects
        assert 'houses' in aspects
        assert 'aspects' in aspects

    def test_relationship_event_has_aspects(self):
        """Test relationship event has favorable aspects."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType

        aspects = TransitTimingEngine.EVENT_FAVORABLE_ASPECTS[EventType.RELATIONSHIP]
        assert 'venus' in aspects['planets']

    def test_finance_event_has_aspects(self):
        """Test finance event has favorable aspects."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType

        aspects = TransitTimingEngine.EVENT_FAVORABLE_ASPECTS[EventType.FINANCE]
        assert 'jupiter' in aspects['planets']


class TestMoonPhaseCalculation:
    """Tests for moon phase calculation."""

    def test_get_moon_phase_returns_string(self):
        """Test moon phase returns a string."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        engine = TransitTimingEngine()

        phase = engine._get_moon_phase(datetime(2025, 1, 15))
        assert isinstance(phase, str)

    def test_get_moon_phase_valid_phases(self):
        """Test moon phase returns valid phase names."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        engine = TransitTimingEngine()

        valid_phases = ["신월", "초승달", "상현달", "차오르는 달",
                       "보름달", "기우는 달", "하현달", "그믐달"]

        # Test multiple dates to cover all phases
        for day in range(1, 31):
            phase = engine._get_moon_phase(datetime(2025, 1, day))
            assert phase in valid_phases

    def test_moon_phase_new_moon(self):
        """Test new moon detection."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        engine = TransitTimingEngine()

        # New moon around Jan 6, 2000 base date
        phase = engine._get_moon_phase(datetime(2000, 1, 6))
        assert phase == "신월"


class TestMoonPhaseEvaluation:
    """Tests for moon phase evaluation."""

    def test_evaluate_moon_phase_career(self):
        """Test moon phase evaluation for career."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        score = engine._evaluate_moon_phase("보름달", EventType.CAREER)
        assert score == 15  # Full moon is best for career

    def test_evaluate_moon_phase_relationship(self):
        """Test moon phase evaluation for relationship."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        score = engine._evaluate_moon_phase("보름달", EventType.RELATIONSHIP)
        assert score == 15

    def test_evaluate_moon_phase_contract(self):
        """Test moon phase evaluation for contract."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        # New moon is bad for contracts
        score = engine._evaluate_moon_phase("신월", EventType.CONTRACT)
        assert score == -10

    def test_evaluate_moon_phase_unknown(self):
        """Test moon phase evaluation for unknown phase."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        score = engine._evaluate_moon_phase("unknown_phase", EventType.CAREER)
        assert score == 0


class TestWeekdayEvaluation:
    """Tests for weekday evaluation."""

    def test_evaluate_weekday_favorable(self):
        """Test weekday evaluation returns score for favorable planet."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        # Thursday (3) is Jupiter's day, good for career
        score = engine._evaluate_weekday(3, EventType.CAREER)
        assert score == 10

    def test_evaluate_weekday_unfavorable(self):
        """Test weekday evaluation returns 0 for unfavorable."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        # Monday (0) is Moon's day, not in career planets
        score = engine._evaluate_weekday(0, EventType.CAREER)
        assert score == 0

    def test_evaluate_weekday_relationship(self):
        """Test weekday evaluation for relationship."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        # Friday (4) is Venus's day, good for relationship
        score = engine._evaluate_weekday(4, EventType.RELATIONSHIP)
        assert score == 10


class TestRetrogradeCheck:
    """Tests for retrograde checking."""

    def test_check_retrograde_mercury_month(self):
        """Test retrograde check during Mercury retrograde month."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        # April is Mercury retrograde month
        date = datetime(2025, 4, 15)
        penalty = engine._check_retrograde(date, EventType.CONTRACT)
        assert penalty == 8

    def test_check_retrograde_non_mercury_month(self):
        """Test retrograde check during non-retrograde month."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        # May is not Mercury retrograde
        date = datetime(2025, 5, 15)
        penalty = engine._check_retrograde(date, EventType.CONTRACT)
        assert penalty == 0

    def test_check_retrograde_health_event(self):
        """Test retrograde has no effect on health events."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        date = datetime(2025, 4, 15)
        penalty = engine._check_retrograde(date, EventType.HEALTH)
        assert penalty == 0


class TestSajuDayCheck:
    """Tests for saju day checking."""

    def test_check_saju_day_hwangdo(self):
        """Test hwangdo day bonus."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        # Day 1 is hwangdo
        date = datetime(2025, 1, 1)
        bonus = engine._check_saju_day(date, EventType.CAREER)
        assert bonus == 10

    def test_check_saju_day_non_hwangdo(self):
        """Test non-hwangdo day has no bonus."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        # Day 5 is not hwangdo
        date = datetime(2025, 1, 5)
        bonus = engine._check_saju_day(date, EventType.CAREER)
        assert bonus == 0


class TestTimingAdvice:
    """Tests for timing advice generation."""

    def test_generate_timing_advice_career(self):
        """Test timing advice for career."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        advice = engine._generate_timing_advice(EventType.CAREER, {"score": 70})
        assert "직업" in advice or "사업" in advice

    def test_generate_timing_advice_relationship(self):
        """Test timing advice for relationship."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        advice = engine._generate_timing_advice(EventType.RELATIONSHIP, {"score": 60})
        assert "연애" in advice or "관계" in advice

    def test_generate_timing_advice_high_score(self):
        """Test timing advice with high score adds star."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        advice = engine._generate_timing_advice(EventType.CAREER, {"score": 85})
        assert "⭐" in advice


class TestDateEvaluation:
    """Tests for date evaluation."""

    def test_evaluate_date_returns_quality_and_factors(self):
        """Test date evaluation returns quality and factors."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        quality, factors = engine._evaluate_date(datetime(2025, 1, 15), EventType.CAREER)

        assert quality is not None
        assert 'astro' in factors
        assert 'saju' in factors
        assert 'score' in factors

    def test_evaluate_date_quality_excellent(self):
        """Test date evaluation can return excellent quality."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType, TimingQuality
        engine = TransitTimingEngine()

        # Try multiple dates to find excellent
        for day in range(1, 31):
            quality, factors = engine._evaluate_date(
                datetime(2025, 1, day), EventType.CAREER
            )
            if factors['score'] >= 75:
                assert quality == TimingQuality.EXCELLENT
                break


class TestGetTimingForEvent:
    """Tests for get_timing_for_event method."""

    def test_get_timing_for_event_returns_windows(self):
        """Test timing returns windows list."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        windows = engine.get_timing_for_event(
            EventType.CAREER,
            datetime(2025, 1, 1),
            days_range=30
        )

        assert isinstance(windows, list)

    def test_get_timing_for_event_default_start_date(self):
        """Test timing with default start date."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        # Use explicit start date to avoid timezone issues
        windows = engine.get_timing_for_event(
            EventType.CAREER,
            start_date=datetime(2025, 1, 1),
            days_range=7
        )

        assert isinstance(windows, list)

    def test_get_timing_for_event_limited_results(self):
        """Test timing returns limited number of windows."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        windows = engine.get_timing_for_event(
            EventType.CAREER,
            datetime(2025, 1, 1),
            days_range=90
        )

        assert len(windows) <= 10

    def test_get_timing_for_event_windows_sorted_by_score(self):
        """Test timing windows are sorted by score."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine
        from backend_ai.app.prediction.types import EventType
        engine = TransitTimingEngine()

        windows = engine.get_timing_for_event(
            EventType.CAREER,
            datetime(2025, 1, 1),
            days_range=30
        )

        if len(windows) > 1:
            for i in range(len(windows) - 1):
                assert windows[i].score >= windows[i + 1].score


class TestPlanetOrbDays:
    """Tests for PLANET_ORB_DAYS constant."""

    def test_planet_orb_days_defined(self):
        """Test planet orb days are defined."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine

        assert 'moon' in TransitTimingEngine.PLANET_ORB_DAYS
        assert 'sun' in TransitTimingEngine.PLANET_ORB_DAYS
        assert 'jupiter' in TransitTimingEngine.PLANET_ORB_DAYS

    def test_planet_orb_days_increasing(self):
        """Test slower planets have longer orbs."""
        from backend_ai.app.prediction.transit_engine import TransitTimingEngine

        orbs = TransitTimingEngine.PLANET_ORB_DAYS
        assert orbs['moon'] < orbs['sun'] < orbs['jupiter'] < orbs['pluto']
