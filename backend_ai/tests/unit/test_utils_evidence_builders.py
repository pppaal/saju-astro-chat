"""
Unit tests for backend_ai/utils/evidence_builders.py

Tests:
- _summarize_five_elements: 오행 요약
- _summarize_five_elements_en: 오행 요약 (영문)
- _pick_sibsin: 십신 선택
- _planet_ko_name: 행성 한글 이름
- _planet_en_name: 행성 영문 이름
- _pick_any_planet: 임의 행성 선택
- _build_saju_evidence_sentence: 사주 근거 문장
- _build_saju_evidence_sentence_en: 사주 근거 문장 (영문)
- _build_astro_evidence_sentence: 점성술 근거 문장
- _build_astro_evidence_sentence_en: 점성술 근거 문장 (영문)
- _build_missing_requirements_addendum: 누락 요소 부록
- _build_rag_debug_addendum: RAG 디버그 부록
"""
import pytest
from datetime import date


class TestSummarizeFiveElements:
    """Tests for _summarize_five_elements function."""

    def test_basic_five_elements(self):
        """Basic five elements summary."""
        from backend_ai.utils.evidence_builders import _summarize_five_elements

        saju_data = {"fiveElements": {"木": 3, "火": 2, "土": 1, "金": 1, "水": 1}}
        result = _summarize_five_elements(saju_data)
        assert isinstance(result, str)
        assert len(result) > 0
        assert "木" in result or "기운" in result

    def test_balanced_elements(self):
        """Balanced five elements."""
        from backend_ai.utils.evidence_builders import _summarize_five_elements

        saju_data = {"fiveElements": {"木": 2, "火": 2, "土": 2, "金": 2, "水": 2}}
        result = _summarize_five_elements(saju_data)
        assert "고르게" in result

    def test_empty_elements(self):
        """Empty elements dict."""
        from backend_ai.utils.evidence_builders import _summarize_five_elements

        result = _summarize_five_elements({})
        assert result == ""

        result = _summarize_five_elements({"fiveElements": {}})
        assert result == ""


class TestSummarizeFiveElementsEn:
    """Tests for _summarize_five_elements_en function."""

    def test_basic_five_elements_en(self):
        """Basic five elements summary in English."""
        from backend_ai.utils.evidence_builders import _summarize_five_elements_en

        saju_data = {"fiveElements": {"木": 3, "火": 2, "土": 1, "金": 1, "水": 1}}
        result = _summarize_five_elements_en(saju_data)
        assert isinstance(result, str)

    def test_balanced_elements_en(self):
        """Balanced elements in English."""
        from backend_ai.utils.evidence_builders import _summarize_five_elements_en

        saju_data = {"fiveElements": {"wood": 2, "fire": 2, "earth": 2, "metal": 2, "water": 2}}
        result = _summarize_five_elements_en(saju_data)
        assert "balanced" in result.lower()


class TestPickSibsin:
    """Tests for _pick_sibsin function."""

    def test_pick_sibsin_from_pillar(self):
        """Pick sibsin from pillar data."""
        from backend_ai.utils.evidence_builders import _pick_sibsin

        saju_data = {
            "pillars": {
                "day": {
                    "heavenlyStem": {"sibsin": "비견"},
                    "earthlyBranch": {}
                }
            }
        }

        result = _pick_sibsin(saju_data)
        assert result == "비견"

    def test_empty_sibsin(self):
        """Empty data should return empty string."""
        from backend_ai.utils.evidence_builders import _pick_sibsin

        result = _pick_sibsin({})
        assert result == ""


class TestPlanetKoName:
    """Tests for _planet_ko_name function."""

    def test_sun_korean(self):
        """Sun should return Korean name."""
        from backend_ai.utils.evidence_builders import _planet_ko_name

        assert _planet_ko_name("sun") == "태양"

    def test_moon_korean(self):
        """Moon should return Korean name."""
        from backend_ai.utils.evidence_builders import _planet_ko_name

        assert _planet_ko_name("moon") == "달"

    def test_planets_korean(self):
        """Other planets should return Korean names."""
        from backend_ai.utils.evidence_builders import _planet_ko_name

        assert _planet_ko_name("mercury") == "수성"
        assert _planet_ko_name("venus") == "금성"
        assert _planet_ko_name("mars") == "화성"

    def test_unknown_planet(self):
        """Unknown planet should return original."""
        from backend_ai.utils.evidence_builders import _planet_ko_name

        assert _planet_ko_name("unknown") == "unknown"

    def test_empty_name(self):
        """Empty name should return empty string."""
        from backend_ai.utils.evidence_builders import _planet_ko_name

        assert _planet_ko_name("") == ""


class TestPlanetEnName:
    """Tests for _planet_en_name function."""

    def test_sun_english(self):
        """Sun should return English name."""
        from backend_ai.utils.evidence_builders import _planet_en_name

        assert _planet_en_name("sun") == "Sun"

    def test_moon_english(self):
        """Moon should return English name."""
        from backend_ai.utils.evidence_builders import _planet_en_name

        assert _planet_en_name("moon") == "Moon"

    def test_planets_english(self):
        """Other planets should return English names."""
        from backend_ai.utils.evidence_builders import _planet_en_name

        assert _planet_en_name("mercury") == "Mercury"
        assert _planet_en_name("venus") == "Venus"


class TestPickAnyPlanet:
    """Tests for _pick_any_planet function."""

    def test_pick_from_planets(self):
        """Should pick a planet from astro data."""
        from backend_ai.utils.evidence_builders import _pick_any_planet

        astro_data = {
            "sun": {"sign": "Aries"},
            "moon": {"sign": "Taurus"}
        }

        result = _pick_any_planet(astro_data)
        assert result is not None

    def test_empty_planets(self):
        """Empty data should return None."""
        from backend_ai.utils.evidence_builders import _pick_any_planet

        result = _pick_any_planet({})
        assert result is None


class TestBuildSajuEvidenceSentence:
    """Tests for _build_saju_evidence_sentence function."""

    def test_basic_evidence(self):
        """Basic saju evidence sentence."""
        from backend_ai.utils.evidence_builders import _build_saju_evidence_sentence

        saju_data = {
            "dayMaster": {"heavenlyStem": "甲", "element": "木"},
            "fiveElements": {"木": 2, "火": 3, "土": 1, "金": 1, "水": 1}
        }

        result = _build_saju_evidence_sentence(saju_data)
        assert isinstance(result, str)
        assert len(result) > 0
        assert "사주" in result

    def test_empty_saju_data(self):
        """Empty saju data should return empty string."""
        from backend_ai.utils.evidence_builders import _build_saju_evidence_sentence

        result = _build_saju_evidence_sentence({})
        assert result == "" or "사주" in result


class TestBuildSajuEvidenceSentenceEn:
    """Tests for _build_saju_evidence_sentence_en function."""

    def test_english_evidence(self):
        """English saju evidence sentence."""
        from backend_ai.utils.evidence_builders import _build_saju_evidence_sentence_en

        saju_data = {
            "dayMaster": {"heavenlyStem": "甲", "element": "木"},
            "fiveElements": {"木": 2, "火": 3, "土": 1, "金": 1, "水": 1}
        }

        result = _build_saju_evidence_sentence_en(saju_data)
        assert isinstance(result, str)
        assert "Four Pillars" in result or "Day Master" in result


class TestBuildAstroEvidenceSentence:
    """Tests for _build_astro_evidence_sentence function."""

    def test_basic_astro_evidence(self):
        """Basic astro evidence sentence."""
        from backend_ai.utils.evidence_builders import _build_astro_evidence_sentence

        astro_data = {
            "sun": {"sign": "Aries", "name": "sun"},
            "moon": {"sign": "Taurus", "name": "moon"},
            "ascendant": {"sign": "Leo"}
        }

        result = _build_astro_evidence_sentence(astro_data)
        assert isinstance(result, str)
        assert len(result) > 0
        assert "점성" in result

    def test_empty_astro_data(self):
        """Empty astro data should return empty string."""
        from backend_ai.utils.evidence_builders import _build_astro_evidence_sentence

        result = _build_astro_evidence_sentence({})
        assert result == ""


class TestBuildAstroEvidenceSentenceEn:
    """Tests for _build_astro_evidence_sentence_en function."""

    def test_english_astro_evidence(self):
        """English astro evidence sentence."""
        from backend_ai.utils.evidence_builders import _build_astro_evidence_sentence_en

        astro_data = {
            "sun": {"sign": "Aries", "name": "sun"},
            "moon": {"sign": "Taurus", "name": "moon"}
        }

        result = _build_astro_evidence_sentence_en(astro_data)
        assert isinstance(result, str)


class TestBuildMissingRequirementsAddendum:
    """Tests for _build_missing_requirements_addendum function."""

    def test_missing_saju_ko(self):
        """Missing saju requirements in Korean."""
        from backend_ai.utils.evidence_builders import _build_missing_requirements_addendum

        text = "오늘의 운세입니다."
        saju_data = {"dayMaster": {"name": "甲"}}
        astro_data = {}
        now = date(2024, 3, 15)

        result = _build_missing_requirements_addendum(
            text, "ko", saju_data, astro_data, now,
            require_saju=True, require_astro=False,
            require_timing=True, require_caution=True
        )
        assert isinstance(result, str)

    def test_missing_both_en(self):
        """Missing both requirements in English."""
        from backend_ai.utils.evidence_builders import _build_missing_requirements_addendum

        text = "Today's fortune."
        saju_data = {}
        astro_data = {}
        now = date(2024, 3, 15)

        result = _build_missing_requirements_addendum(
            text, "en", saju_data, astro_data, now,
            require_saju=True, require_astro=True,
            require_timing=True, require_caution=True
        )
        assert isinstance(result, str)

    def test_empty_text(self):
        """Empty text should return empty string."""
        from backend_ai.utils.evidence_builders import _build_missing_requirements_addendum

        result = _build_missing_requirements_addendum(
            "", "ko", {}, {}, date(2024, 3, 15)
        )
        assert result == ""


class TestBuildRagDebugAddendum:
    """Tests for _build_rag_debug_addendum function."""

    def test_rag_debug_enabled(self):
        """RAG debug info when enabled."""
        from backend_ai.utils.evidence_builders import _build_rag_debug_addendum

        meta = {
            "enabled": True,
            "theme": "career",
            "question": "운세",
            "graph_nodes": 5,
            "corpus_quotes": 3,
            "persona_jung": 2,
            "persona_stoic": 1,
            "cross_analysis": True,
            "theme_fusion": True,
            "model": "gpt-4",
            "temperature": 0.7
        }

        result = _build_rag_debug_addendum(meta, "ko")
        assert isinstance(result, str)
        assert "[RAG" in result
        assert "career" in result

    def test_rag_debug_disabled(self):
        """RAG debug info when disabled."""
        from backend_ai.utils.evidence_builders import _build_rag_debug_addendum

        meta = {"enabled": False}
        result = _build_rag_debug_addendum(meta, "ko")
        assert result == ""

    def test_rag_debug_none(self):
        """None or empty meta should return empty string."""
        from backend_ai.utils.evidence_builders import _build_rag_debug_addendum

        assert _build_rag_debug_addendum(None, "ko") == ""
        assert _build_rag_debug_addendum({}, "ko") == ""

    def test_rag_debug_english(self):
        """RAG debug in English."""
        from backend_ai.utils.evidence_builders import _build_rag_debug_addendum

        meta = {
            "enabled": True,
            "theme": "love",
            "question": "romance"
        }

        result = _build_rag_debug_addendum(meta, "en")
        assert "[RAG Evidence" in result


class TestModuleExports:
    """Tests for module imports."""

    def test_summarize_five_elements_importable(self):
        """_summarize_five_elements should be importable."""
        from backend_ai.utils.evidence_builders import _summarize_five_elements
        assert callable(_summarize_five_elements)

    def test_summarize_five_elements_en_importable(self):
        """_summarize_five_elements_en should be importable."""
        from backend_ai.utils.evidence_builders import _summarize_five_elements_en
        assert callable(_summarize_five_elements_en)

    def test_pick_sibsin_importable(self):
        """_pick_sibsin should be importable."""
        from backend_ai.utils.evidence_builders import _pick_sibsin
        assert callable(_pick_sibsin)

    def test_planet_ko_name_importable(self):
        """_planet_ko_name should be importable."""
        from backend_ai.utils.evidence_builders import _planet_ko_name
        assert callable(_planet_ko_name)

    def test_planet_en_name_importable(self):
        """_planet_en_name should be importable."""
        from backend_ai.utils.evidence_builders import _planet_en_name
        assert callable(_planet_en_name)

    def test_pick_any_planet_importable(self):
        """_pick_any_planet should be importable."""
        from backend_ai.utils.evidence_builders import _pick_any_planet
        assert callable(_pick_any_planet)

    def test_build_saju_evidence_sentence_importable(self):
        """_build_saju_evidence_sentence should be importable."""
        from backend_ai.utils.evidence_builders import _build_saju_evidence_sentence
        assert callable(_build_saju_evidence_sentence)

    def test_build_saju_evidence_sentence_en_importable(self):
        """_build_saju_evidence_sentence_en should be importable."""
        from backend_ai.utils.evidence_builders import _build_saju_evidence_sentence_en
        assert callable(_build_saju_evidence_sentence_en)

    def test_build_astro_evidence_sentence_importable(self):
        """_build_astro_evidence_sentence should be importable."""
        from backend_ai.utils.evidence_builders import _build_astro_evidence_sentence
        assert callable(_build_astro_evidence_sentence)

    def test_build_astro_evidence_sentence_en_importable(self):
        """_build_astro_evidence_sentence_en should be importable."""
        from backend_ai.utils.evidence_builders import _build_astro_evidence_sentence_en
        assert callable(_build_astro_evidence_sentence_en)

    def test_build_missing_requirements_addendum_importable(self):
        """_build_missing_requirements_addendum should be importable."""
        from backend_ai.utils.evidence_builders import _build_missing_requirements_addendum
        assert callable(_build_missing_requirements_addendum)

    def test_build_rag_debug_addendum_importable(self):
        """_build_rag_debug_addendum should be importable."""
        from backend_ai.utils.evidence_builders import _build_rag_debug_addendum
        assert callable(_build_rag_debug_addendum)
