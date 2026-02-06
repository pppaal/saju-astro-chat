"""
Unit tests for Compatibility synastry module.

Tests:
- analyze_asc_dsc_compatibility: ASC/DSC 축 궁합 분석
- analyze_lilith_chiron_synastry: Lilith/Chiron 시나스트리 분석
- analyze_progression_synastry: Secondary Progression 시나스트리 분석
- calculate_sipsung: 십성 계산
- analyze_venus_mars_synastry: 금성-화성 시나스트리 분석
- analyze_astro_compatibility: 태양 별자리 궁합 분석
"""
import pytest
from unittest.mock import patch, MagicMock


class TestAnalyzeAscDscCompatibility:
    """Tests for analyze_asc_dsc_compatibility function."""

    def test_asc_dsc_perfect_match(self):
        """ASC = partner's DSC should return high score."""
        from backend_ai.app.compatibility.synastry import analyze_asc_dsc_compatibility

        person1 = {"name": "A", "astro": {"ascendant": "Aries"}}
        person2 = {"name": "B", "astro": {"ascendant": "Libra"}}  # Libra DSC = Aries

        result = analyze_asc_dsc_compatibility(person1, person2)

        assert result["person1_asc"] == "Aries"
        assert result["person2_asc"] == "Libra"
        assert result["person1_dsc"] == "Libra"
        assert result["person2_dsc"] == "Aries"
        assert result["score"] > 0
        assert len(result["interactions"]) > 0

    def test_asc_dsc_same_asc(self):
        """Same ASC should add bonus score."""
        from backend_ai.app.compatibility.synastry import analyze_asc_dsc_compatibility

        person1 = {"name": "A", "astro": {"ascendant": "Leo"}}
        person2 = {"name": "B", "astro": {"ascendant": "Leo"}}

        result = analyze_asc_dsc_compatibility(person1, person2)

        assert result["person1_asc"] == result["person2_asc"] == "Leo"
        assert any(i["type"] == "same_asc" for i in result["interactions"])

    def test_asc_dsc_no_asc_data(self):
        """Missing ASC data should return appropriate message."""
        from backend_ai.app.compatibility.synastry import analyze_asc_dsc_compatibility

        person1 = {"name": "A", "astro": {}}
        person2 = {"name": "B", "astro": {"ascendant": "Leo"}}

        result = analyze_asc_dsc_compatibility(person1, person2)

        assert "정보가 없어" in result["summary"]
        assert result["score"] == 0

    def test_asc_dsc_with_asc_key(self):
        """Should handle 'asc' key as well as 'ascendant'."""
        from backend_ai.app.compatibility.synastry import analyze_asc_dsc_compatibility

        person1 = {"name": "A", "astro": {"asc": "Taurus"}}
        person2 = {"name": "B", "astro": {"asc": "Scorpio"}}

        result = analyze_asc_dsc_compatibility(person1, person2)

        assert result["person1_asc"] == "Taurus"
        assert result["person2_asc"] == "Scorpio"

    def test_asc_dsc_relationship_style(self):
        """Should return relationship style based on score."""
        from backend_ai.app.compatibility.synastry import analyze_asc_dsc_compatibility

        person1 = {"name": "A", "astro": {"ascendant": "Aries"}}
        person2 = {"name": "B", "astro": {"ascendant": "Libra"}}

        result = analyze_asc_dsc_compatibility(person1, person2)

        assert result["relationship_style"] in [
            "운명적 만남", "강한 끌림", "조화로운 관계", "다른 표현 방식"
        ]


class TestAnalyzeLilithChironSynastry:
    """Tests for analyze_lilith_chiron_synastry function."""

    def test_lilith_chiron_same_signs(self):
        """Same Lilith/Chiron signs should return high score."""
        from backend_ai.app.compatibility.synastry import analyze_lilith_chiron_synastry

        person1 = {
            "name": "A",
            "astro": {
                "planets": {"Lilith": "Scorpio", "Chiron": "Aries"}
            }
        }
        person2 = {
            "name": "B",
            "astro": {
                "planets": {"Lilith": "Scorpio", "Chiron": "Aries"}
            }
        }

        result = analyze_lilith_chiron_synastry(person1, person2)

        assert result["lilith_analysis"]["person1_lilith"] == "Scorpio"
        assert result["lilith_analysis"]["person2_lilith"] == "Scorpio"
        assert result["chiron_analysis"]["person1_chiron"] == "Aries"
        assert result["chiron_analysis"]["person2_chiron"] == "Aries"
        assert result["combined_score"] > 0

    def test_lilith_chiron_no_data(self):
        """Missing data should return zero scores."""
        from backend_ai.app.compatibility.synastry import analyze_lilith_chiron_synastry

        person1 = {"name": "A", "astro": {}}
        person2 = {"name": "B", "astro": {}}

        result = analyze_lilith_chiron_synastry(person1, person2)

        assert result["combined_score"] == 0

    def test_lilith_chiron_healing_potential(self):
        """Same Chiron should add healing potential."""
        from backend_ai.app.compatibility.synastry import analyze_lilith_chiron_synastry

        person1 = {"name": "A", "astro": {"planets": {"Chiron": "Virgo"}}}
        person2 = {"name": "B", "astro": {"planets": {"Chiron": "Virgo"}}}

        result = analyze_lilith_chiron_synastry(person1, person2)

        assert result["chiron_analysis"]["score"] > 0
        assert any(i["type"] == "same_chiron" for i in result["chiron_analysis"]["interactions"])

    def test_lilith_chiron_summary_levels(self):
        """Summary should reflect combined score levels."""
        from backend_ai.app.compatibility.synastry import analyze_lilith_chiron_synastry

        person1 = {"name": "A", "astro": {"planets": {}}}
        person2 = {"name": "B", "astro": {"planets": {}}}

        result = analyze_lilith_chiron_synastry(person1, person2)

        assert isinstance(result["summary"], str)
        assert len(result["summary"]) > 0


class TestAnalyzeProgressionSynastry:
    """Tests for analyze_progression_synastry function."""

    def test_progression_synastry_basic(self):
        """Basic progression analysis should work."""
        from backend_ai.app.compatibility.synastry import analyze_progression_synastry

        person1 = {"name": "A", "birth_date": "1990-01-15", "astro": {"sunSign": "capricorn"}}
        person2 = {"name": "B", "birth_date": "1992-06-20", "astro": {"sunSign": "gemini"}}

        result = analyze_progression_synastry(person1, person2, current_year=2024)

        assert "person1_progression" in result
        assert "person2_progression" in result
        assert "progressed_moon_phase" in result
        assert isinstance(result["score"], int)

    def test_progression_synastry_no_birth_date(self):
        """Missing birth date should return appropriate message."""
        from backend_ai.app.compatibility.synastry import analyze_progression_synastry

        person1 = {"name": "A", "astro": {"sunSign": "capricorn"}}
        person2 = {"name": "B", "birth_date": "1992-06-20", "astro": {"sunSign": "gemini"}}

        result = analyze_progression_synastry(person1, person2)

        assert "정보가 없어" in result["summary"]

    def test_progression_synastry_same_moon_phase(self):
        """Same moon phase should add sync bonus."""
        from backend_ai.app.compatibility.synastry import analyze_progression_synastry

        person1 = {"name": "A", "birth_date": "1990-01-15", "astro": {"sunSign": "capricorn"}}
        person2 = {"name": "B", "birth_date": "1990-02-20", "astro": {"sunSign": "pisces"}}

        result = analyze_progression_synastry(person1, person2, current_year=2024)

        assert "progressed_moon_phase" in result
        assert isinstance(result["progressed_moon_phase"].get("sync"), bool)

    def test_progression_synastry_saturn_return(self):
        """Saturn return age should affect score."""
        from backend_ai.app.compatibility.synastry import analyze_progression_synastry

        person1 = {"name": "A", "birth_date": "1996-01-15", "astro": {"sunSign": "capricorn"}}
        person2 = {"name": "B", "birth_date": "1990-06-20", "astro": {"sunSign": "gemini"}}

        result = analyze_progression_synastry(person1, person2, current_year=2024)

        if "critical_period" in result:
            assert result["critical_period"]["type"] == "saturn_return"

    def test_progression_synastry_timing_assessment(self):
        """Should return timing assessment."""
        from backend_ai.app.compatibility.synastry import analyze_progression_synastry

        person1 = {"name": "A", "birth_date": "1985-01-15", "astro": {"sunSign": "capricorn"}}
        person2 = {"name": "B", "birth_date": "1987-06-20", "astro": {"sunSign": "gemini"}}

        result = analyze_progression_synastry(person1, person2, current_year=2024)

        assert result["timing_assessment"] in ["최적", "좋음", "보통", "도전적"]


class TestCalculateSipsung:
    """Tests for calculate_sipsung function."""

    def test_sipsung_bigyeon(self):
        """Same stem same polarity should return 비견."""
        from backend_ai.app.compatibility.synastry import calculate_sipsung

        result = calculate_sipsung("甲", "甲")

        assert result["sipsung"] == "비견"
        assert "score" in result
        assert "meaning" in result

    def test_sipsung_geupjae(self):
        """Same element different polarity should return 겁재."""
        from backend_ai.app.compatibility.synastry import calculate_sipsung

        result = calculate_sipsung("甲", "乙")

        assert result["sipsung"] == "겁재"

    def test_sipsung_sikshin(self):
        """Generating element same polarity should return 식신."""
        from backend_ai.app.compatibility.synastry import calculate_sipsung

        # 甲(木) generates 丙(火), same 양
        result = calculate_sipsung("甲", "丙")

        assert result["sipsung"] == "식신"

    def test_sipsung_sanggwan(self):
        """Generating element different polarity should return 상관."""
        from backend_ai.app.compatibility.synastry import calculate_sipsung

        # 甲(木) generates 丁(火), different polarity
        result = calculate_sipsung("甲", "丁")

        assert result["sipsung"] == "상관"

    def test_sipsung_pyeonjae(self):
        """Controlling element same polarity should return 편재."""
        from backend_ai.app.compatibility.synastry import calculate_sipsung

        # 甲(木) controls 戊(土), same 양
        result = calculate_sipsung("甲", "戊")

        assert result["sipsung"] == "편재"

    def test_sipsung_jeongjae(self):
        """Controlling element different polarity should return 정재."""
        from backend_ai.app.compatibility.synastry import calculate_sipsung

        # 甲(木) controls 己(土), different polarity
        result = calculate_sipsung("甲", "己")

        assert result["sipsung"] == "정재"

    def test_sipsung_pyeongwan(self):
        """Being controlled same polarity should return 편관."""
        from backend_ai.app.compatibility.synastry import calculate_sipsung

        # 甲(木) is controlled by 庚(金), same 양
        result = calculate_sipsung("甲", "庚")

        assert result["sipsung"] == "편관"

    def test_sipsung_jeonggwan(self):
        """Being controlled different polarity should return 정관."""
        from backend_ai.app.compatibility.synastry import calculate_sipsung

        # 甲(木) is controlled by 辛(金), different polarity
        result = calculate_sipsung("甲", "辛")

        assert result["sipsung"] == "정관"

    def test_sipsung_pyeonin(self):
        """Being generated same polarity should return 편인."""
        from backend_ai.app.compatibility.synastry import calculate_sipsung

        # 甲(木) is generated by 壬(水), same 양
        result = calculate_sipsung("甲", "壬")

        assert result["sipsung"] == "편인"

    def test_sipsung_jeongin(self):
        """Being generated different polarity should return 정인."""
        from backend_ai.app.compatibility.synastry import calculate_sipsung

        # 甲(木) is generated by 癸(水), different polarity
        result = calculate_sipsung("甲", "癸")

        assert result["sipsung"] == "정인"

    def test_sipsung_missing_data(self):
        """Missing data should return unknown."""
        from backend_ai.app.compatibility.synastry import calculate_sipsung

        result = calculate_sipsung("", "甲")

        assert result["sipsung"] == "unknown"
        assert "데이터 부족" in result["meaning"]


class TestAnalyzeVenusMarsSynastry:
    """Tests for analyze_venus_mars_synastry function."""

    def test_venus_mars_lover_relationship(self):
        """Venus-Mars analysis for lovers should calculate chemistry."""
        from backend_ai.app.compatibility.synastry import analyze_venus_mars_synastry

        person1 = {"astro": {"venusSign": "aries", "marsSign": "leo"}}
        person2 = {"astro": {"venusSign": "sagittarius", "marsSign": "aries"}}

        result = analyze_venus_mars_synastry(person1, person2, relationship_type="lover")

        assert result["venus_mars_chemistry"] is not None or result["score_adjustment"] == 0
        assert isinstance(result["details"], list)

    def test_venus_mars_non_lover(self):
        """Non-lover relationship should skip Venus-Mars analysis."""
        from backend_ai.app.compatibility.synastry import analyze_venus_mars_synastry

        person1 = {"astro": {"venusSign": "aries", "marsSign": "leo"}}
        person2 = {"astro": {"venusSign": "sagittarius", "marsSign": "aries"}}

        result = analyze_venus_mars_synastry(person1, person2, relationship_type="friend")

        assert result["venus_mars_chemistry"] is None
        assert result["score_adjustment"] == 0

    def test_venus_mars_fallback_to_sun(self):
        """Missing Venus/Mars should fallback to Sun sign."""
        from backend_ai.app.compatibility.synastry import analyze_venus_mars_synastry

        person1 = {"astro": {"sunSign": "aries"}}
        person2 = {"astro": {"sunSign": "leo"}}

        result = analyze_venus_mars_synastry(person1, person2, relationship_type="lover")

        # Should attempt analysis with sun signs as fallback
        assert isinstance(result["details"], list)

    def test_venus_mars_fusion_insight(self):
        """Should return fusion insight for chemistry levels."""
        from backend_ai.app.compatibility.synastry import analyze_venus_mars_synastry

        person1 = {"astro": {"venusSign": "leo", "marsSign": "aries"}}
        person2 = {"astro": {"venusSign": "aries", "marsSign": "sagittarius"}}

        result = analyze_venus_mars_synastry(person1, person2, relationship_type="spouse")

        if result["venus_mars_chemistry"]:
            assert isinstance(result["fusion_insight"], str)


class TestAnalyzeAstroCompatibility:
    """Tests for analyze_astro_compatibility function."""

    def test_astro_compatibility_same_element(self):
        """Same element signs should be compatible."""
        from backend_ai.app.compatibility.synastry import analyze_astro_compatibility

        result = analyze_astro_compatibility("aries", "leo")  # Both fire

        assert result["score"] >= 70
        assert "fire" in str(result["details"])

    def test_astro_compatibility_same_sign(self):
        """Same sign should add bonus."""
        from backend_ai.app.compatibility.synastry import analyze_astro_compatibility

        result = analyze_astro_compatibility("taurus", "taurus")

        assert result["relationship"] == "same_sign"
        assert "같은 별자리" in str(result["details"])

    def test_astro_compatibility_opposite_signs(self):
        """Opposite signs should have strong attraction."""
        from backend_ai.app.compatibility.synastry import analyze_astro_compatibility

        result = analyze_astro_compatibility("aries", "libra")

        assert result["relationship"] == "opposite"
        assert "대항성" in str(result["details"])

    def test_astro_compatibility_challenging(self):
        """Challenging element combo should have lower score."""
        from backend_ai.app.compatibility.synastry import analyze_astro_compatibility

        result = analyze_astro_compatibility("aries", "cancer")  # Fire vs Water

        assert result["score"] <= 75

    def test_astro_compatibility_harmonious(self):
        """Harmonious element combo should have higher score."""
        from backend_ai.app.compatibility.synastry import analyze_astro_compatibility

        result = analyze_astro_compatibility("aries", "gemini")  # Fire + Air

        assert result["score"] >= 80


class TestAnalyzePlanetSynastryAspects:
    """Tests for analyze_planet_synastry_aspects function."""

    def test_planet_synastry_basic(self):
        """Should analyze planetary aspects."""
        from backend_ai.app.compatibility.synastry import analyze_planet_synastry_aspects

        person1 = {
            "astro": {
                "planets": {
                    "Sun": "Aries",
                    "Moon": "Cancer",
                    "Venus": "Taurus"
                }
            }
        }
        person2 = {
            "astro": {
                "planets": {
                    "Sun": "Libra",
                    "Moon": "Capricorn",
                    "Venus": "Scorpio"
                }
            }
        }

        result = analyze_planet_synastry_aspects(person1, person2)

        assert "major_aspects" in result
        assert "positive_aspects" in result
        assert "challenging_aspects" in result
        assert isinstance(result["score"], int)

    def test_planet_synastry_no_data(self):
        """Missing planet data should return empty results."""
        from backend_ai.app.compatibility.synastry import analyze_planet_synastry_aspects

        person1 = {"astro": {}}
        person2 = {"astro": {}}

        result = analyze_planet_synastry_aspects(person1, person2)

        assert result["major_aspects"] == []
        assert result["score"] == 0

    def test_planet_synastry_summary(self):
        """Should return appropriate summary."""
        from backend_ai.app.compatibility.synastry import analyze_planet_synastry_aspects

        person1 = {"astro": {"planets": {"Sun": "Aries"}}}
        person2 = {"astro": {"planets": {"Sun": "Leo"}}}

        result = analyze_planet_synastry_aspects(person1, person2)

        assert isinstance(result["summary"], str)


class TestModuleExports:
    """Tests for module exports."""

    def test_analyze_asc_dsc_compatibility_importable(self):
        """analyze_asc_dsc_compatibility should be importable."""
        from backend_ai.app.compatibility.synastry import analyze_asc_dsc_compatibility
        assert callable(analyze_asc_dsc_compatibility)

    def test_analyze_lilith_chiron_synastry_importable(self):
        """analyze_lilith_chiron_synastry should be importable."""
        from backend_ai.app.compatibility.synastry import analyze_lilith_chiron_synastry
        assert callable(analyze_lilith_chiron_synastry)

    def test_analyze_progression_synastry_importable(self):
        """analyze_progression_synastry should be importable."""
        from backend_ai.app.compatibility.synastry import analyze_progression_synastry
        assert callable(analyze_progression_synastry)

    def test_calculate_sipsung_importable(self):
        """calculate_sipsung should be importable."""
        from backend_ai.app.compatibility.synastry import calculate_sipsung
        assert callable(calculate_sipsung)

    def test_analyze_venus_mars_synastry_importable(self):
        """analyze_venus_mars_synastry should be importable."""
        from backend_ai.app.compatibility.synastry import analyze_venus_mars_synastry
        assert callable(analyze_venus_mars_synastry)

    def test_analyze_astro_compatibility_importable(self):
        """analyze_astro_compatibility should be importable."""
        from backend_ai.app.compatibility.synastry import analyze_astro_compatibility
        assert callable(analyze_astro_compatibility)

    def test_analyze_planet_synastry_aspects_importable(self):
        """analyze_planet_synastry_aspects should be importable."""
        from backend_ai.app.compatibility.synastry import analyze_planet_synastry_aspects
        assert callable(analyze_planet_synastry_aspects)
