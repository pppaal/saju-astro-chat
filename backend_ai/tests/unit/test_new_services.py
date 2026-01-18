"""
Unit tests for newly created services.

Tests for:
- jung_service: Jung psychology data and guidance
- cache_service: Session cache management
- normalizer_service: Data normalization
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


class TestNormalizerService:
    """Tests for normalizer_service.py"""

    def test_normalize_birth_date_valid_formats(self):
        """Test various valid date formats."""
        from backend_ai.app.services.normalizer_service import _normalize_birth_date

        # YYYY-MM-DD format
        assert _normalize_birth_date("1990-01-15") == "1990-01-15"
        assert _normalize_birth_date("2000-12-31") == "2000-12-31"

        # YYYYMMDD format
        assert _normalize_birth_date("19900115") == "1990-01-15"
        assert _normalize_birth_date("20001231") == "2000-12-31"

        # With dots
        assert _normalize_birth_date("1990.01.15") == "1990-01-15"

        # With slashes
        assert _normalize_birth_date("1990/01/15") == "1990-01-15"

        # Without leading zeros
        assert _normalize_birth_date("1990-1-5") == "1990-01-05"

    def test_normalize_birth_date_invalid_formats(self):
        """Test invalid date formats return None."""
        from backend_ai.app.services.normalizer_service import _normalize_birth_date

        assert _normalize_birth_date(None) is None
        assert _normalize_birth_date("") is None
        assert _normalize_birth_date("invalid") is None
        assert _normalize_birth_date("1990-13-01") is None  # Invalid month
        assert _normalize_birth_date("1990-02-30") is None  # Invalid day
        assert _normalize_birth_date("90-01-15") is None  # 2-digit year

    def test_normalize_birth_date_numeric_input(self):
        """Test numeric input conversion."""
        from backend_ai.app.services.normalizer_service import _normalize_birth_date

        assert _normalize_birth_date(19900115) == "1990-01-15"
        assert _normalize_birth_date(19900115.0) == "1990-01-15"

    def test_normalize_birth_time_valid_formats(self):
        """Test various valid time formats."""
        from backend_ai.app.services.normalizer_service import _normalize_birth_time

        # HH:MM format
        assert _normalize_birth_time("12:30") == "12:30"
        assert _normalize_birth_time("00:00") == "00:00"
        assert _normalize_birth_time("23:59") == "23:59"

        # HH:MM:SS format
        assert _normalize_birth_time("12:30:45") == "12:30:45"

        # With dots
        assert _normalize_birth_time("12.30") == "12:30"

        # HHMM format
        assert _normalize_birth_time("1230") == "12:30"
        assert _normalize_birth_time("0800") == "08:00"
        assert _normalize_birth_time("800") == "08:00"

    def test_normalize_birth_time_invalid_formats(self):
        """Test invalid time formats return None."""
        from backend_ai.app.services.normalizer_service import _normalize_birth_time

        assert _normalize_birth_time(None) is None
        assert _normalize_birth_time("") is None
        assert _normalize_birth_time("invalid") is None
        assert _normalize_birth_time("25:00") is None  # Invalid hour
        assert _normalize_birth_time("12:60") is None  # Invalid minute

    def test_normalize_day_master_string_input(self):
        """Test normalizing dayMaster from string input."""
        from backend_ai.app.services.normalizer_service import normalize_day_master

        # Hanja input
        result = normalize_day_master({"dayMaster": "庚"})
        assert result["dayMaster"]["name"] == "庚"
        assert result["dayMaster"]["element"] == "금"

        # Korean input
        result = normalize_day_master({"dayMaster": "경"})
        assert result["dayMaster"]["name"] == "경"
        assert result["dayMaster"]["element"] == "금"

    def test_normalize_day_master_nested_structure(self):
        """Test normalizing dayMaster from nested structure."""
        from backend_ai.app.services.normalizer_service import normalize_day_master

        nested = {
            "dayMaster": {
                "heavenlyStem": {"name": "庚", "element": "금"}
            }
        }
        result = normalize_day_master(nested)
        assert result["dayMaster"]["name"] == "庚"
        assert result["dayMaster"]["element"] == "금"

    def test_normalize_day_master_flat_structure(self):
        """Test normalizing dayMaster from flat structure."""
        from backend_ai.app.services.normalizer_service import normalize_day_master

        flat = {
            "dayMaster": {
                "heavenlyStem": "庚",
                "element": "금"
            }
        }
        result = normalize_day_master(flat)
        assert result["dayMaster"]["name"] == "庚"
        assert result["dayMaster"]["element"] == "금"

    def test_normalize_day_master_empty_input(self):
        """Test normalizing empty or None input."""
        from backend_ai.app.services.normalizer_service import normalize_day_master

        assert normalize_day_master(None) is None
        assert normalize_day_master({}) == {}
        assert normalize_day_master({"dayMaster": None}) == {"dayMaster": None}

    def test_normalize_birth_payload(self):
        """Test normalizing birth payload from various structures."""
        from backend_ai.app.services.normalizer_service import _normalize_birth_payload

        # Nested structure
        data = {
            "birth": {
                "date": "1990-01-15",
                "time": "12:30",
                "gender": "M",
                "city": "Seoul"
            }
        }
        result = _normalize_birth_payload(data)
        assert result["date"] == "1990-01-15"
        assert result["time"] == "12:30"
        assert result["gender"] == "M"
        assert result["city"] == "Seoul"

    def test_normalize_birth_payload_legacy_fields(self):
        """Test normalizing from legacy field names."""
        from backend_ai.app.services.normalizer_service import _normalize_birth_payload

        data = {
            "birthdate": "1990-01-15",
            "birthtime": "12:30",
            "sex": "M",
            "birthplace": "Seoul"
        }
        result = _normalize_birth_payload(data)
        assert result["date"] == "1990-01-15"
        assert result["time"] == "12:30"
        assert result["gender"] == "M"
        assert result["city"] == "Seoul"

    def test_normalize_birth_payload_coordinates(self):
        """Test normalizing coordinates."""
        from backend_ai.app.services.normalizer_service import _normalize_birth_payload

        data = {
            "birth": {
                "date": "1990-01-15",
                "lat": "37.5665",
                "lon": "126.9780"
            }
        }
        result = _normalize_birth_payload(data)
        assert result["lat"] == 37.5665
        assert result["lon"] == 126.9780
        assert result["latitude"] == 37.5665
        assert result["longitude"] == 126.9780


class TestCacheService:
    """Tests for cache_service.py"""

    def test_set_and_get_session_cache(self):
        """Test basic cache set and get."""
        from backend_ai.app.services.cache_service import (
            get_session_rag_cache,
            set_session_rag_cache,
            clear_session_cache
        )

        # Clear any existing cache
        clear_session_cache()

        # Set cache
        test_data = {"key": "value", "nested": {"a": 1}}
        set_session_rag_cache("test-session-1", test_data)

        # Get cache
        result = get_session_rag_cache("test-session-1")
        assert result == test_data

    def test_get_nonexistent_session(self):
        """Test getting non-existent session returns None."""
        from backend_ai.app.services.cache_service import (
            get_session_rag_cache,
            clear_session_cache
        )

        clear_session_cache()
        result = get_session_rag_cache("nonexistent-session")
        assert result is None

    def test_cache_stats(self):
        """Test cache statistics."""
        from backend_ai.app.services.cache_service import (
            set_session_rag_cache,
            get_cache_stats,
            clear_session_cache
        )

        clear_session_cache()

        # Add some entries
        set_session_rag_cache("session-1", {"data": 1})
        set_session_rag_cache("session-2", {"data": 2})

        stats = get_cache_stats()
        # Updated field names for Redis-backed cache
        assert stats["total_entries"] >= 2  # May include Redis entries
        assert stats["memory_entries"] == 2 or stats.get("redis_entries", 0) >= 2
        assert "backend" in stats

    def test_clear_session_cache(self):
        """Test clearing all cache."""
        from backend_ai.app.services.cache_service import (
            set_session_rag_cache,
            get_cache_stats,
            clear_session_cache
        )

        # Add entries
        set_session_rag_cache("session-1", {"data": 1})
        set_session_rag_cache("session-2", {"data": 2})

        # Clear
        count = clear_session_cache()
        assert count == 2

        # Verify empty
        stats = get_cache_stats()
        assert stats["total_entries"] == 0


class TestJungService:
    """Tests for jung_service.py"""

    def test_get_lifespan_guidance_childhood(self):
        """Test lifespan guidance for childhood age."""
        from backend_ai.app.services.jung_service import get_lifespan_guidance

        current_year = datetime.now().year
        birth_year = current_year - 10  # 10 years old

        result = get_lifespan_guidance(birth_year)
        assert result["age"] == 10
        # Should be childhood stage (age <= 12)

    def test_get_lifespan_guidance_adolescence(self):
        """Test lifespan guidance for adolescence age."""
        from backend_ai.app.services.jung_service import get_lifespan_guidance

        current_year = datetime.now().year
        birth_year = current_year - 18  # 18 years old

        result = get_lifespan_guidance(birth_year)
        assert result["age"] == 18
        # Should be adolescence stage (13-22)

    def test_get_lifespan_guidance_early_adulthood(self):
        """Test lifespan guidance for early adulthood."""
        from backend_ai.app.services.jung_service import get_lifespan_guidance

        current_year = datetime.now().year
        birth_year = current_year - 30  # 30 years old

        result = get_lifespan_guidance(birth_year)
        assert result["age"] == 30
        # Should be early_adulthood stage (23-35)

    def test_get_lifespan_guidance_midlife(self):
        """Test lifespan guidance for midlife."""
        from backend_ai.app.services.jung_service import get_lifespan_guidance

        current_year = datetime.now().year
        birth_year = current_year - 45  # 45 years old

        result = get_lifespan_guidance(birth_year)
        assert result["age"] == 45
        # Should be midlife stage (36-55)

    def test_get_lifespan_guidance_mature_adulthood(self):
        """Test lifespan guidance for mature adulthood."""
        from backend_ai.app.services.jung_service import get_lifespan_guidance

        current_year = datetime.now().year
        birth_year = current_year - 65  # 65 years old

        result = get_lifespan_guidance(birth_year)
        assert result["age"] == 65
        # Should be mature_adulthood stage (56-70)

    def test_get_lifespan_guidance_elder(self):
        """Test lifespan guidance for elder."""
        from backend_ai.app.services.jung_service import get_lifespan_guidance

        current_year = datetime.now().year
        birth_year = current_year - 75  # 75 years old

        result = get_lifespan_guidance(birth_year)
        assert result["age"] == 75
        # Should be elder stage (71+)

    def test_get_active_imagination_prompts_dream(self):
        """Test active imagination prompts for dream context."""
        from backend_ai.app.services.jung_service import get_active_imagination_prompts

        result = get_active_imagination_prompts("꿈에서 새를 봤어요")
        assert "opening" in result
        assert "deepening" in result
        assert "integration" in result

    def test_get_active_imagination_prompts_saju(self):
        """Test active imagination prompts for saju context."""
        from backend_ai.app.services.jung_service import get_active_imagination_prompts

        result = get_active_imagination_prompts("사주 분석 결과")
        assert "opening" in result
        assert "deepening" in result
        assert "integration" in result

    def test_get_active_imagination_prompts_astro(self):
        """Test active imagination prompts for astrology context."""
        from backend_ai.app.services.jung_service import get_active_imagination_prompts

        result = get_active_imagination_prompts("점성술 차트 분석")
        assert "opening" in result
        assert "deepening" in result
        assert "integration" in result

    def test_get_crisis_resources(self):
        """Test crisis resources retrieval."""
        from backend_ai.app.services.jung_service import get_crisis_resources

        result = get_crisis_resources("ko")
        assert "resources" in result
        assert "limitations" in result
        assert "deescalation" in result


class TestStemToElementMapping:
    """Tests for STEM_TO_ELEMENT constant."""

    def test_all_stems_have_elements(self):
        """Test all 10 stems map to elements."""
        from backend_ai.app.services.normalizer_service import STEM_TO_ELEMENT

        # 10 Hanja stems
        hanja_stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
        for stem in hanja_stems:
            assert stem in STEM_TO_ELEMENT

        # 10 Korean stems
        korean_stems = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
        for stem in korean_stems:
            assert stem in STEM_TO_ELEMENT

    def test_element_values_are_valid(self):
        """Test all element values are valid."""
        from backend_ai.app.services.normalizer_service import STEM_TO_ELEMENT

        valid_elements = {"목", "화", "토", "금", "수"}
        for element in STEM_TO_ELEMENT.values():
            assert element in valid_elements

    def test_stem_element_pairs(self):
        """Test specific stem-element pairs."""
        from backend_ai.app.services.normalizer_service import STEM_TO_ELEMENT

        # Wood stems
        assert STEM_TO_ELEMENT["甲"] == "목"
        assert STEM_TO_ELEMENT["乙"] == "목"

        # Fire stems
        assert STEM_TO_ELEMENT["丙"] == "화"
        assert STEM_TO_ELEMENT["丁"] == "화"

        # Earth stems
        assert STEM_TO_ELEMENT["戊"] == "토"
        assert STEM_TO_ELEMENT["己"] == "토"

        # Metal stems
        assert STEM_TO_ELEMENT["庚"] == "금"
        assert STEM_TO_ELEMENT["辛"] == "금"

        # Water stems
        assert STEM_TO_ELEMENT["壬"] == "수"
        assert STEM_TO_ELEMENT["癸"] == "수"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
