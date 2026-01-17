"""
Unit tests for Fortune Score Engine module.

Tests:
- ScoreBreakdown dataclass
- FortuneScoreEngine class
- Saju scoring methods
- Astrology scoring methods
- Cross-reference bonus calculation
- Element relationship helpers
- Singleton pattern and factory functions
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime


class TestScoreBreakdownDataclass:
    """Tests for ScoreBreakdown dataclass."""

    def test_score_breakdown_creation(self):
        """Test creating a ScoreBreakdown."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown()
        assert breakdown.saju_iljin == 0.0
        assert breakdown.astro_transit == 0.0
        assert breakdown.cross_bonus == 0.0
        assert breakdown.alerts == []

    def test_saju_total_calculation(self):
        """Test saju total calculation."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown(
            saju_iljin=10.0,
            saju_wolun=8.0,
            saju_yongsin=7.0,
            saju_geokguk=6.0,
            saju_sibsin=4.0,
            saju_hyeongchung=3.0,
        )

        assert breakdown.saju_total == 38.0

    def test_saju_total_capped_at_50(self):
        """Test saju total is capped at 50."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown(
            saju_iljin=20.0,
            saju_wolun=20.0,
            saju_yongsin=20.0,
            saju_geokguk=20.0,
            saju_sibsin=20.0,
            saju_hyeongchung=20.0,
        )

        assert breakdown.saju_total == 50.0

    def test_astro_total_calculation(self):
        """Test astro total calculation."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown(
            astro_transit=10.0,
            astro_moon=8.0,
            astro_planetary_hour=6.0,
            astro_voc=0.0,
            astro_retrograde=0.0,
            astro_aspects=5.0,
            astro_progression=4.0,
        )

        assert breakdown.astro_total == 33.0

    def test_astro_total_capped_at_50(self):
        """Test astro total is capped at 50."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown(
            astro_transit=30.0,
            astro_moon=30.0,
            astro_planetary_hour=30.0,
        )

        assert breakdown.astro_total == 50.0

    def test_total_calculation(self):
        """Test total score calculation."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown(
            saju_iljin=12.0,
            saju_wolun=10.0,
            astro_transit=15.0,
            astro_moon=10.0,
            cross_bonus=5.0,
        )

        total = breakdown.total
        assert isinstance(total, int)
        assert 0 <= total <= 100

    def test_total_capped_at_100(self):
        """Test total is capped at 100."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown(
            saju_iljin=50.0,
            astro_transit=50.0,
            cross_bonus=50.0,
        )

        assert breakdown.total == 100

    def test_total_min_is_0(self):
        """Test total minimum is 0."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown(
            saju_hyeongchung=-50.0,
            astro_retrograde=-50.0,
            cross_bonus=-50.0,
        )

        assert breakdown.total == 0

    def test_to_dict(self):
        """Test converting to dictionary."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown

        breakdown = ScoreBreakdown(
            saju_iljin=10.0,
            astro_transit=5.0,
            cross_bonus=2.0,
            alerts=[{"type": "info", "msg": "Test"}],
        )

        result = breakdown.to_dict()

        assert "total" in result
        assert "saju" in result
        assert "astro" in result
        assert "cross_bonus" in result
        assert "alerts" in result
        assert result["saju"]["iljin"] == 10.0


class TestFortuneScoreEngineConstants:
    """Tests for FortuneScoreEngine constants."""

    def test_elements_mapping(self):
        """Test ELEMENTS mapping."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        assert FortuneScoreEngine.ELEMENTS["木"] == "wood"
        assert FortuneScoreEngine.ELEMENTS["wood"] == "木"
        assert FortuneScoreEngine.ELEMENTS["水"] == "water"

    def test_zodiac_elements_mapping(self):
        """Test ZODIAC_ELEMENTS mapping."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        assert FortuneScoreEngine.ZODIAC_ELEMENTS["Aries"] == "fire"
        assert FortuneScoreEngine.ZODIAC_ELEMENTS["Taurus"] == "earth"
        assert FortuneScoreEngine.ZODIAC_ELEMENTS["Cancer"] == "water"
        assert FortuneScoreEngine.ZODIAC_ELEMENTS["Gemini"] == "air"

    def test_branch_zodiac_mapping(self):
        """Test BRANCH_ZODIAC mapping."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        assert FortuneScoreEngine.BRANCH_ZODIAC["子"] == "Capricorn"
        assert FortuneScoreEngine.BRANCH_ZODIAC["午"] == "Gemini"

    def test_sibsin_weights(self):
        """Test SIBSIN_WEIGHTS values."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        assert FortuneScoreEngine.SIBSIN_WEIGHTS["정관"] == 0.5
        assert FortuneScoreEngine.SIBSIN_WEIGHTS["겁재"] == -0.5

    def test_transit_weights(self):
        """Test TRANSIT_WEIGHTS structure."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        assert "Jupiter" in FortuneScoreEngine.TRANSIT_WEIGHTS
        assert FortuneScoreEngine.TRANSIT_WEIGHTS["Jupiter"]["trine"] == 2

    def test_moon_phase_scores(self):
        """Test MOON_PHASE_SCORES values."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        assert FortuneScoreEngine.MOON_PHASE_SCORES["Full Moon"] == 10
        assert FortuneScoreEngine.MOON_PHASE_SCORES["New Moon"] == 8

    def test_planetary_hour_scores(self):
        """Test PLANETARY_HOUR_SCORES values."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        assert FortuneScoreEngine.PLANETARY_HOUR_SCORES["Jupiter"] == 8
        assert FortuneScoreEngine.PLANETARY_HOUR_SCORES["Saturn"] == 3


class TestFortuneScoreEngineInit:
    """Tests for FortuneScoreEngine initialization."""

    def test_engine_creation(self):
        """Test engine creation."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert hasattr(engine, "cross_mappings")


class TestElementHelpers:
    """Tests for element relationship helper methods."""

    def test_is_generating_wood_fire(self):
        """Test wood generates fire."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert engine._is_generating("木", "火") is True
        assert engine._is_generating("wood", "fire") is True

    def test_is_generating_fire_earth(self):
        """Test fire generates earth."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert engine._is_generating("火", "土") is True
        assert engine._is_generating("fire", "earth") is True

    def test_is_generating_wrong_order(self):
        """Test wrong generation order returns false."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert engine._is_generating("火", "木") is False

    def test_is_controlling_wood_earth(self):
        """Test wood controls earth."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert engine._is_controlling("木", "土") is True
        assert engine._is_controlling("wood", "earth") is True

    def test_is_controlling_wrong_order(self):
        """Test wrong control order returns false."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert engine._is_controlling("土", "木") is False

    def test_is_liu_he_zi_chou(self):
        """Test 子丑 liu he."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert engine._is_liu_he("子", "丑") is True
        assert engine._is_liu_he("丑", "子") is True

    def test_is_liu_he_yin_hai(self):
        """Test 寅亥 liu he."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert engine._is_liu_he("寅", "亥") is True

    def test_is_liu_he_not_matching(self):
        """Test non-liu he pair."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert engine._is_liu_he("子", "午") is False

    def test_is_chong_zi_wu(self):
        """Test 子午 clash."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert engine._is_chong("子", "午") is True
        assert engine._is_chong("午", "子") is True

    def test_is_chong_mao_you(self):
        """Test 卯酉 clash."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert engine._is_chong("卯", "酉") is True

    def test_is_chong_not_matching(self):
        """Test non-clash pair."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        assert engine._is_chong("子", "丑") is False


class TestSajuScoring:
    """Tests for Saju scoring methods."""

    def test_score_iljin_empty(self):
        """Test iljin score with empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        score = engine._score_iljin({}, datetime.now())
        assert score == 6.0  # Base score

    def test_score_wolun_empty(self):
        """Test wolun score with empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        score = engine._score_wolun({}, datetime.now())
        assert score == 5.0  # Base score

    def test_score_yongsin_empty(self):
        """Test yongsin score with empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        score = engine._score_yongsin({}, datetime.now())
        assert score == 5.0  # Base score

    def test_score_geokguk_empty(self):
        """Test geokguk score with empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        score = engine._score_geokguk({})
        assert score == 4.0  # Base score

    def test_score_geokguk_with_grade(self):
        """Test geokguk score with grade."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        saju = {"advancedAnalysis": {"geokguk": {"grade": "상"}}}
        score = engine._score_geokguk(saju)
        assert score == 8.0  # Base 4 + 4 for "상"

    def test_score_sibsin_empty(self):
        """Test sibsin score with empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        score = engine._score_sibsin({})
        assert score == 2.5  # Base score

    def test_score_hyeongchung_empty(self):
        """Test hyeongchung score with empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        score = engine._score_hyeongchung({})
        assert score == 0.0  # Neutral base

    def test_score_hyeongchung_with_hap(self):
        """Test hyeongchung score with combinations."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        saju = {"advancedAnalysis": {"hyeongchung": {"hap": [{}], "samhap": [{}]}}}
        score = engine._score_hyeongchung(saju)
        assert score > 0  # Positive from combinations


class TestAstroScoring:
    """Tests for Astrology scoring methods."""

    def test_score_transits_empty(self):
        """Test transit score with empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        score = engine._score_transits({})
        assert score == 5.0  # Base score

    def test_score_transits_jupiter_trine(self):
        """Test transit score with Jupiter trine."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        astro = {"transits": [{"planet": "Jupiter", "aspect": "trine"}]}
        score = engine._score_transits(astro)
        assert score == 7.0  # Base 5 + 2 for Jupiter trine

    def test_score_moon_empty(self):
        """Test moon score with empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        score = engine._score_moon({})
        assert score == 5.0  # Base score

    def test_score_moon_full_moon(self):
        """Test moon score with full moon."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        astro = {"electional": {"moonPhase": {"phase": "Full Moon"}}}
        score = engine._score_moon(astro)
        assert score == 10.0

    def test_score_planetary_hour_empty(self):
        """Test planetary hour score with empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        score = engine._score_planetary_hour({})
        assert score == 4.0  # Base score

    def test_score_planetary_hour_jupiter(self):
        """Test planetary hour score with Jupiter."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        astro = {"electional": {"planetaryHour": {"planet": "Jupiter"}}}
        score = engine._score_planetary_hour(astro)
        assert score == 8.0

    def test_score_voc_not_void(self):
        """Test VOC score when not void."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine, ScoreBreakdown

        engine = FortuneScoreEngine()
        breakdown = ScoreBreakdown()
        astro = {"electional": {"voidOfCourse": {"isVoid": False}}}
        score = engine._score_voc(astro, breakdown)
        assert score == 0.0

    def test_score_voc_is_void(self):
        """Test VOC score when void."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine, ScoreBreakdown

        engine = FortuneScoreEngine()
        breakdown = ScoreBreakdown()
        astro = {"electional": {"voidOfCourse": {"isVoid": True}}}
        score = engine._score_voc(astro, breakdown)
        assert score == -4.0
        assert len(breakdown.alerts) > 0

    def test_score_retrograde_empty(self):
        """Test retrograde score with no retrogrades."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine, ScoreBreakdown

        engine = FortuneScoreEngine()
        breakdown = ScoreBreakdown()
        astro = {"electional": {"retrograde": []}}
        score = engine._score_retrograde(astro, breakdown)
        assert score == 0.0

    def test_score_retrograde_mercury(self):
        """Test retrograde score with Mercury retrograde."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine, ScoreBreakdown

        engine = FortuneScoreEngine()
        breakdown = ScoreBreakdown()
        astro = {"electional": {"retrograde": ["Mercury"]}}
        score = engine._score_retrograde(astro, breakdown)
        assert score == -2.0
        assert len(breakdown.alerts) > 0

    def test_score_aspects_empty(self):
        """Test aspects score with empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        score = engine._score_aspects({})
        assert score == 2.5  # Base score

    def test_score_progressions(self):
        """Test progressions score."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()
        score = engine._score_progressions({})
        assert score == 3.5  # Base score


class TestCalculateScore:
    """Tests for main calculate_score method."""

    def test_calculate_score_empty(self):
        """Test calculate score with empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine, ScoreBreakdown

        engine = FortuneScoreEngine()
        result = engine.calculate_score({}, {})

        assert isinstance(result, ScoreBreakdown)
        assert result.total >= 0
        assert result.total <= 100

    def test_calculate_score_with_data(self):
        """Test calculate score with mock data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine

        engine = FortuneScoreEngine()

        saju = {
            "dayMaster": {"name": "甲", "element": "木"},
            "pillars": {"day": "甲午"},
            "unse": {"iljin": [{"gan": "乙", "ji": "亥", "element": "水"}]},
        }

        astro = {
            "planets": [{"name": "Sun", "sign": "Sagittarius"}],
            "transits": [{"planet": "Jupiter", "aspect": "trine"}],
            "electional": {
                "moonPhase": {"phase": "Full Moon"},
                "planetaryHour": {"planet": "Jupiter"},
            },
        }

        result = engine.calculate_score(saju, astro)

        assert result.total > 0
        assert result.saju_total >= 0
        assert result.astro_total >= 0


class TestCrossBonus:
    """Tests for cross-reference bonus calculation."""

    def test_cross_bonus_empty(self):
        """Test cross bonus with empty data."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine, ScoreBreakdown

        engine = FortuneScoreEngine()
        breakdown = ScoreBreakdown()
        bonus = engine._calculate_cross_bonus({}, {}, breakdown)

        assert bonus >= -10
        assert bonus <= 10

    def test_cross_bonus_element_harmony(self):
        """Test cross bonus with element harmony."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine, ScoreBreakdown

        engine = FortuneScoreEngine()
        breakdown = ScoreBreakdown()

        saju = {"dayMaster": {"element": "火"}}
        astro = {"planets": [{"name": "Sun", "sign": "Aries"}]}  # Fire sign

        bonus = engine._calculate_cross_bonus(saju, astro, breakdown)
        assert bonus > 0


class TestSingletonAndFactory:
    """Tests for singleton pattern and factory functions."""

    def test_get_fortune_score_engine(self):
        """Test get_fortune_score_engine returns instance."""
        import backend_ai.app.fortune_score_engine as module
        module._engine_instance = None

        from backend_ai.app.fortune_score_engine import get_fortune_score_engine, FortuneScoreEngine

        engine = get_fortune_score_engine()
        assert isinstance(engine, FortuneScoreEngine)

    def test_get_fortune_score_engine_singleton(self):
        """Test get_fortune_score_engine returns same instance."""
        import backend_ai.app.fortune_score_engine as module
        module._engine_instance = None

        from backend_ai.app.fortune_score_engine import get_fortune_score_engine

        engine1 = get_fortune_score_engine()
        engine2 = get_fortune_score_engine()
        assert engine1 is engine2

    def test_calculate_fortune_score_function(self):
        """Test convenience function calculate_fortune_score."""
        from backend_ai.app.fortune_score_engine import calculate_fortune_score

        result = calculate_fortune_score({}, {})

        assert isinstance(result, dict)
        assert "total" in result
        assert "saju" in result
        assert "astro" in result


class TestModuleExports:
    """Tests for module exports."""

    def test_score_breakdown_importable(self):
        """ScoreBreakdown should be importable."""
        from backend_ai.app.fortune_score_engine import ScoreBreakdown
        assert ScoreBreakdown is not None

    def test_fortune_score_engine_importable(self):
        """FortuneScoreEngine should be importable."""
        from backend_ai.app.fortune_score_engine import FortuneScoreEngine
        assert FortuneScoreEngine is not None

    def test_get_fortune_score_engine_importable(self):
        """get_fortune_score_engine should be importable."""
        from backend_ai.app.fortune_score_engine import get_fortune_score_engine
        assert get_fortune_score_engine is not None

    def test_calculate_fortune_score_importable(self):
        """calculate_fortune_score should be importable."""
        from backend_ai.app.fortune_score_engine import calculate_fortune_score
        assert calculate_fortune_score is not None
