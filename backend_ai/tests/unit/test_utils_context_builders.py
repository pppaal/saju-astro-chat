"""
Unit tests for backend_ai/utils/context_builders.py

Tests:
- _build_saju_summary: 사주 요약 생성
- _pick_astro_planet: 점성술 행성 선택
- _pick_ascendant: ASC 선택
- _pick_astro_aspect: 점성술 애스펙트 선택
- _build_astro_summary: 점성술 요약 생성
- _build_detailed_saju: 상세 사주 컨텍스트
- _build_detailed_astro: 상세 점성술 컨텍스트
- _build_advanced_astro_context: 고급 점성술 컨텍스트
"""
import pytest


class TestBuildSajuSummary:
    """Tests for _build_saju_summary function."""

    def test_basic_saju_summary(self):
        """Basic saju summary should be generated."""
        from backend_ai.utils.context_builders import _build_saju_summary

        saju_data = {
            "dayMaster": {"heavenlyStem": "丙", "element": "火"},
            "yearPillar": {"heavenlyStem": "甲", "earthlyBranch": "子"},
            "monthPillar": {"heavenlyStem": "乙", "earthlyBranch": "丑"},
            "dominantElement": "火"
        }

        result = _build_saju_summary(saju_data)
        assert isinstance(result, str)
        assert len(result) > 0
        assert "SAJU:" in result

    def test_saju_summary_with_day_master(self):
        """Saju summary with day master."""
        from backend_ai.utils.context_builders import _build_saju_summary

        saju_data = {
            "dayMaster": {"name": "甲", "element": "木"}
        }

        result = _build_saju_summary(saju_data)
        assert "Day Master" in result

    def test_empty_saju_data(self):
        """Empty saju data should return empty string."""
        from backend_ai.utils.context_builders import _build_saju_summary

        result = _build_saju_summary({})
        assert result == ""

        result = _build_saju_summary(None)
        assert result == ""


class TestPickAstroPlanet:
    """Tests for _pick_astro_planet function."""

    def test_pick_sun(self):
        """Should pick sun sign."""
        from backend_ai.utils.context_builders import _pick_astro_planet

        astro_data = {
            "sun": {"sign": "Aries", "degree": 15.5},
            "moon": {"sign": "Taurus", "degree": 20.0}
        }

        result = _pick_astro_planet(astro_data, "sun")
        assert result is not None
        assert result.get("sign") == "Aries"

    def test_pick_moon(self):
        """Should pick moon sign."""
        from backend_ai.utils.context_builders import _pick_astro_planet

        astro_data = {
            "sun": {"sign": "Aries", "degree": 15.5},
            "moon": {"sign": "Taurus", "degree": 20.0}
        }

        result = _pick_astro_planet(astro_data, "moon")
        assert result is not None
        assert result.get("sign") == "Taurus"

    def test_missing_planet(self):
        """Missing planet should return None."""
        from backend_ai.utils.context_builders import _pick_astro_planet

        astro_data = {"sun": {"sign": "Aries"}}
        result = _pick_astro_planet(astro_data, "mars")
        assert result is None

    def test_empty_data(self):
        """Empty data should return None."""
        from backend_ai.utils.context_builders import _pick_astro_planet

        assert _pick_astro_planet({}, "sun") is None
        assert _pick_astro_planet(None, "sun") is None


class TestPickAscendant:
    """Tests for _pick_ascendant function."""

    def test_pick_ascendant_present(self):
        """Should pick ascendant when present."""
        from backend_ai.utils.context_builders import _pick_ascendant

        astro_data = {
            "ascendant": {"sign": "Leo", "degree": 10.0}
        }

        result = _pick_ascendant(astro_data)
        assert result is not None
        assert result.get("sign") == "Leo"

    def test_pick_asc_key(self):
        """Should handle 'asc' key."""
        from backend_ai.utils.context_builders import _pick_ascendant

        astro_data = {
            "asc": {"sign": "Leo", "degree": 10.0}
        }

        result = _pick_ascendant(astro_data)
        assert result is not None
        assert result.get("sign") == "Leo"

    def test_missing_ascendant(self):
        """Missing ascendant should return None."""
        from backend_ai.utils.context_builders import _pick_ascendant

        astro_data = {"sun": {"sign": "Aries"}}
        result = _pick_ascendant(astro_data)
        assert result is None


class TestPickAstroAspect:
    """Tests for _pick_astro_aspect function."""

    def test_pick_aspect(self):
        """Should pick aspect from aspects list."""
        from backend_ai.utils.context_builders import _pick_astro_aspect

        astro_data = {
            "aspects": [
                {"planet1": "Sun", "planet2": "Moon", "type": "conjunction", "score": 10},
                {"planet1": "Venus", "planet2": "Mars", "type": "trine", "score": 5}
            ]
        }

        result = _pick_astro_aspect(astro_data)
        assert result is not None
        # Should pick highest score
        assert result.get("score") == 10

    def test_empty_aspects(self):
        """Empty aspects list should return None."""
        from backend_ai.utils.context_builders import _pick_astro_aspect

        astro_data = {"aspects": []}
        result = _pick_astro_aspect(astro_data)
        assert result is None

    def test_missing_aspects(self):
        """Missing aspects key should return None."""
        from backend_ai.utils.context_builders import _pick_astro_aspect

        astro_data = {"sun": {"sign": "Aries"}}
        result = _pick_astro_aspect(astro_data)
        assert result is None


class TestBuildAstroSummary:
    """Tests for _build_astro_summary function."""

    def test_basic_astro_summary(self):
        """Basic astro summary should be generated."""
        from backend_ai.utils.context_builders import _build_astro_summary

        astro_data = {
            "sun": {"sign": "Aries", "degree": 15.5},
            "moon": {"sign": "Taurus", "degree": 20.0},
            "ascendant": {"sign": "Leo", "degree": 10.0}
        }

        result = _build_astro_summary(astro_data)
        assert isinstance(result, str)
        assert len(result) > 0
        assert "ASTRO:" in result

    def test_astro_summary_sun_only(self):
        """Astro summary with only sun."""
        from backend_ai.utils.context_builders import _build_astro_summary

        astro_data = {"sun": {"sign": "Aries"}}

        result = _build_astro_summary(astro_data)
        assert "Sun: Aries" in result

    def test_empty_astro_data(self):
        """Empty astro data should return empty string."""
        from backend_ai.utils.context_builders import _build_astro_summary

        result = _build_astro_summary({})
        assert result == ""

        result = _build_astro_summary(None)
        assert result == ""


class TestBuildDetailedSaju:
    """Tests for _build_detailed_saju function."""

    def test_detailed_saju_context(self):
        """Detailed saju context should include pillars."""
        from backend_ai.utils.context_builders import _build_detailed_saju

        saju_data = {
            "dayMaster": {"heavenlyStem": "丙", "element": "火"},
            "yearPillar": {"heavenlyStem": "甲", "earthlyBranch": "子"},
            "fiveElements": {"木": 2, "火": 3, "土": 1, "金": 1, "水": 1},
            "tenGods": {"비견": 1, "식신": 2}
        }

        result = _build_detailed_saju(saju_data)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_detailed_saju_with_dominant(self):
        """Detailed saju with dominant element."""
        from backend_ai.utils.context_builders import _build_detailed_saju

        saju_data = {
            "dayMaster": {"name": "甲"},
            "dominantElement": "木"
        }

        result = _build_detailed_saju(saju_data)
        assert "주요 기운" in result

    def test_empty_detailed_saju(self):
        """Empty data should return minimal message."""
        from backend_ai.utils.context_builders import _build_detailed_saju

        result = _build_detailed_saju({})
        assert "사주 정보" in result

        result = _build_detailed_saju(None)
        assert "사주 정보" in result


class TestBuildDetailedAstro:
    """Tests for _build_detailed_astro function."""

    def test_detailed_astro_context(self):
        """Detailed astro context should include planets."""
        from backend_ai.utils.context_builders import _build_detailed_astro

        astro_data = {
            "sun": {"sign": "Aries", "degree": 15.5, "house": 1},
            "moon": {"sign": "Taurus", "degree": 20.0, "house": 2},
            "ascendant": {"sign": "Leo", "degree": 10.0}
        }

        result = _build_detailed_astro(astro_data)
        assert isinstance(result, str)
        assert len(result) > 0
        assert "태양" in result

    def test_detailed_astro_with_houses(self):
        """Detailed astro with houses."""
        from backend_ai.utils.context_builders import _build_detailed_astro

        astro_data = {
            "sun": {"sign": "Aries"},
            "houses": {
                "1": {"sign": "Leo"},
                "7": {"sign": "Aquarius"},
                "10": {"sign": "Taurus"}
            }
        }

        result = _build_detailed_astro(astro_data)
        assert "하우스" in result

    def test_empty_detailed_astro(self):
        """Empty data should return minimal message."""
        from backend_ai.utils.context_builders import _build_detailed_astro

        result = _build_detailed_astro({})
        assert "점성술 정보" in result

        result = _build_detailed_astro(None)
        assert "점성술 정보" in result


class TestBuildAdvancedAstroContext:
    """Tests for _build_advanced_astro_context function."""

    def test_advanced_astro_draconic(self):
        """Advanced astro with draconic chart."""
        from backend_ai.utils.context_builders import _build_advanced_astro_context

        astro_data = {
            "draconic": {
                "sun": "Taurus",
                "moon": "Cancer",
                "insights": "Soul-level connection to earth energy"
            }
        }

        result = _build_advanced_astro_context(astro_data)
        assert isinstance(result, str)
        assert "드라코닉" in result

    def test_advanced_astro_progressions(self):
        """Advanced astro with progressions."""
        from backend_ai.utils.context_builders import _build_advanced_astro_context

        astro_data = {
            "progressions": {
                "secondary": "Sun moved to Taurus",
                "moonPhase": "Full Moon"
            }
        }

        result = _build_advanced_astro_context(astro_data)
        assert "프로그레션" in result

    def test_advanced_astro_transits(self):
        """Advanced astro with transits."""
        from backend_ai.utils.context_builders import _build_advanced_astro_context

        astro_data = {
            "transits": [
                {"aspect": "Saturn conjunct Sun", "interpretation": "Time of responsibility"}
            ]
        }

        result = _build_advanced_astro_context(astro_data)
        assert "트랜짓" in result

    def test_empty_advanced_context(self):
        """Empty data should return empty string."""
        from backend_ai.utils.context_builders import _build_advanced_astro_context

        result = _build_advanced_astro_context({})
        assert result == ""

        result = _build_advanced_astro_context(None)
        assert result == ""


class TestModuleExports:
    """Tests for module imports."""

    def test_build_saju_summary_importable(self):
        """_build_saju_summary should be importable."""
        from backend_ai.utils.context_builders import _build_saju_summary
        assert callable(_build_saju_summary)

    def test_pick_astro_planet_importable(self):
        """_pick_astro_planet should be importable."""
        from backend_ai.utils.context_builders import _pick_astro_planet
        assert callable(_pick_astro_planet)

    def test_pick_ascendant_importable(self):
        """_pick_ascendant should be importable."""
        from backend_ai.utils.context_builders import _pick_ascendant
        assert callable(_pick_ascendant)

    def test_pick_astro_aspect_importable(self):
        """_pick_astro_aspect should be importable."""
        from backend_ai.utils.context_builders import _pick_astro_aspect
        assert callable(_pick_astro_aspect)

    def test_build_astro_summary_importable(self):
        """_build_astro_summary should be importable."""
        from backend_ai.utils.context_builders import _build_astro_summary
        assert callable(_build_astro_summary)

    def test_build_detailed_saju_importable(self):
        """_build_detailed_saju should be importable."""
        from backend_ai.utils.context_builders import _build_detailed_saju
        assert callable(_build_detailed_saju)

    def test_build_detailed_astro_importable(self):
        """_build_detailed_astro should be importable."""
        from backend_ai.utils.context_builders import _build_detailed_astro
        assert callable(_build_detailed_astro)

    def test_build_advanced_astro_context_importable(self):
        """_build_advanced_astro_context should be importable."""
        from backend_ai.utils.context_builders import _build_advanced_astro_context
        assert callable(_build_advanced_astro_context)
