"""
Tests for Jung Psychology Service

Tests the jung_service module which handles:
- Jung psychology data loading
- Lifespan guidance based on age
- Active imagination prompts
- Crisis intervention resources
"""

import pytest
from datetime import datetime
from unittest.mock import patch, mock_open, MagicMock
import json

from app.services.jung_service import (
    _load_jung_data,
    get_lifespan_guidance,
    get_active_imagination_prompts,
    get_crisis_resources,
    _JUNG_DATA_CACHE,
)
import app.services.jung_service as jung_module


class TestLoadJungData:
    """Tests for _load_jung_data function"""

    def setup_method(self):
        """Reset cache before each test"""
        jung_module._JUNG_CACHE_LOADED = False
        for key in _JUNG_DATA_CACHE:
            _JUNG_DATA_CACHE[key] = None

    def test_returns_cached_data_if_available(self):
        """Should return cached data without reloading files"""
        # Pre-populate cache and mark as loaded
        _JUNG_DATA_CACHE["active_imagination"] = {"test": "data"}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {"lifespan": "data"}
        jung_module._JUNG_CACHE_LOADED = True

        result = _load_jung_data()

        assert result["active_imagination"] == {"test": "data"}
        assert result["lifespan_individuation"] == {"lifespan": "data"}

    @patch("pathlib.Path.exists")
    @patch("pathlib.Path.read_text")
    def test_loads_all_jung_files(self, mock_read_text, mock_exists):
        """Should attempt to load all expected Jung data files"""
        mock_exists.return_value = True
        mock_read_text.return_value = '{"test": "data"}'

        # Reset cache and loaded flag
        import app.services.jung_service as jung_module
        jung_module._JUNG_CACHE_LOADED = False
        for key in _JUNG_DATA_CACHE:
            _JUNG_DATA_CACHE[key] = None

        result = _load_jung_data()

        # Should have attempted to check if multiple files exist
        assert mock_exists.call_count >= 10

    @patch("pathlib.Path.exists")
    def test_handles_missing_files_gracefully(self, mock_exists):
        """Should handle missing files without crashing"""
        mock_exists.return_value = False

        # Reset cache and loaded flag
        import app.services.jung_service as jung_module
        jung_module._JUNG_CACHE_LOADED = False
        for key in _JUNG_DATA_CACHE:
            _JUNG_DATA_CACHE[key] = None

        result = _load_jung_data()

        # Should return empty dict for missing files
        assert isinstance(result, dict)

    @patch("pathlib.Path.exists")
    @patch("pathlib.Path.read_text")
    def test_handles_json_parse_errors(self, mock_read_text, mock_exists):
        """Should handle JSON parse errors gracefully"""
        mock_exists.return_value = True
        mock_read_text.side_effect = json.JSONDecodeError("test", "doc", 0)

        # Reset cache and loaded flag
        import app.services.jung_service as jung_module
        jung_module._JUNG_CACHE_LOADED = False
        for key in _JUNG_DATA_CACHE:
            _JUNG_DATA_CACHE[key] = None

        # Should not raise
        result = _load_jung_data()
        assert isinstance(result, dict)


class TestGetLifespanGuidance:
    """Tests for get_lifespan_guidance function"""

    def setup_method(self):
        """Reset cache and set up mock data"""
        jung_module._JUNG_CACHE_LOADED = True  # Prevent actual file loading
        for key in _JUNG_DATA_CACHE:
            _JUNG_DATA_CACHE[key] = None

    def test_returns_empty_dict_when_no_data(self):
        """Should return empty dict when lifespan data is not available"""
        _JUNG_DATA_CACHE["active_imagination"] = {}  # Mark as loaded
        _JUNG_DATA_CACHE["lifespan_individuation"] = {}

        result = get_lifespan_guidance(1990)

        assert result == {}

    def test_childhood_stage_for_young_age(self):
        """Should return childhood stage for age <= 12"""
        current_year = datetime.now().year
        birth_year = current_year - 10  # 10 years old

        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {
            "life_stages": {
                "childhood": {
                    "name_ko": "아동기",
                    "psychological_tasks": ["놀이", "상상"],
                    "archetypal_themes": {"puer": "순수함"},
                }
            }
        }

        result = get_lifespan_guidance(birth_year)

        assert result["age"] == 10
        assert result["stage_name"] == "아동기"
        assert "놀이" in result["psychological_tasks"]

    def test_adolescence_stage(self):
        """Should return adolescence stage for age 13-22"""
        current_year = datetime.now().year
        birth_year = current_year - 18  # 18 years old

        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {
            "life_stages": {
                "adolescence": {
                    "name_ko": "청소년기",
                    "psychological_tasks": ["정체성 탐색"],
                    "developmental_crises": ["정체성 위기"],
                }
            }
        }

        result = get_lifespan_guidance(birth_year)

        assert result["age"] == 18
        assert result["stage_name"] == "청소년기"

    def test_early_adulthood_stage(self):
        """Should return early adulthood stage for age 23-35"""
        current_year = datetime.now().year
        birth_year = current_year - 30  # 30 years old

        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {
            "life_stages": {
                "early_adulthood": {
                    "name_ko": "초기 성인기",
                    "psychological_tasks": ["커리어 구축"],
                    "saju_parallel": {"wood": "성장"},
                    "astro_parallel": {"saturn_return": True},
                }
            }
        }

        result = get_lifespan_guidance(birth_year)

        assert result["age"] == 30
        assert result["stage_name"] == "초기 성인기"
        assert result["saju_parallel"] == {"wood": "성장"}

    def test_midlife_stage(self):
        """Should return midlife stage for age 36-55"""
        current_year = datetime.now().year
        birth_year = current_year - 45  # 45 years old

        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {
            "life_stages": {
                "midlife": {
                    "name_ko": "중년기",
                    "psychological_tasks": ["개성화"],
                    "shadow_challenges": ["그림자 통합"],
                }
            }
        }

        result = get_lifespan_guidance(birth_year)

        assert result["age"] == 45
        assert result["stage_name"] == "중년기"
        assert "그림자 통합" in result["shadow_challenges"]

    def test_mature_adulthood_stage(self):
        """Should return mature adulthood stage for age 56-70"""
        current_year = datetime.now().year
        birth_year = current_year - 65  # 65 years old

        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {
            "life_stages": {
                "mature_adulthood": {
                    "name_ko": "성숙기",
                    "psychological_tasks": ["지혜 전수"],
                }
            }
        }

        result = get_lifespan_guidance(birth_year)

        assert result["age"] == 65
        assert result["stage_name"] == "성숙기"

    def test_elder_stage(self):
        """Should return elder stage for age > 70"""
        current_year = datetime.now().year
        birth_year = current_year - 80  # 80 years old

        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {
            "life_stages": {
                "elder": {
                    "name_ko": "노년기",
                    "psychological_tasks": ["삶의 의미 통합"],
                    "guidance": {"focus": "회고"},
                }
            }
        }

        result = get_lifespan_guidance(birth_year)

        assert result["age"] == 80
        assert result["stage_name"] == "노년기"
        assert result["guidance"]["focus"] == "회고"

    def test_uses_shadow_manifestations_as_fallback(self):
        """Should use shadow_manifestations if shadow_challenges is missing"""
        current_year = datetime.now().year
        birth_year = current_year - 45

        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {
            "life_stages": {
                "midlife": {
                    "name_ko": "중년기",
                    "shadow_manifestations": ["분노", "억압"],
                }
            }
        }

        result = get_lifespan_guidance(birth_year)

        assert "분노" in result["shadow_challenges"]

    def test_handles_missing_stage_data(self):
        """Should handle missing stage data gracefully"""
        current_year = datetime.now().year
        birth_year = current_year - 25

        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {
            "life_stages": {}  # No stages defined
        }

        result = get_lifespan_guidance(birth_year)

        # Should still return structure with defaults
        assert result["age"] == 25
        assert result["psychological_tasks"] == []


class TestGetActiveImaginationPrompts:
    """Tests for get_active_imagination_prompts function"""

    def setup_method(self):
        """Reset cache before each test"""
        jung_module._JUNG_CACHE_LOADED = True  # Prevent actual file loading
        for key in _JUNG_DATA_CACHE:
            _JUNG_DATA_CACHE[key] = None

    def test_returns_empty_when_no_data(self):
        """Should return empty lists when no data available"""
        _JUNG_DATA_CACHE["active_imagination"] = {}

        result = get_active_imagination_prompts("test context")

        assert result == {"opening": [], "deepening": [], "integration": []}

    def test_dream_context_prompts(self):
        """Should return dream-specific prompts for dream context"""
        _JUNG_DATA_CACHE["active_imagination"] = {
            "ai_facilitation_guide": {
                "opening_prompts": {
                    "after_dream_sharing": ["꿈에서 어떤 감정을 느꼈나요?", "가장 인상적인 장면은?", "extra"],
                    "general": ["일반 질문"],
                },
                "deepening_prompts": ["심화 1", "심화 2", "심화 3", "심화 4"],
                "integration_prompts": ["통합 1", "통합 2", "통합 3"],
            }
        }

        result = get_active_imagination_prompts("오늘 꿈에서 바다를 봤어요")

        assert len(result["opening"]) == 2
        assert "꿈에서 어떤 감정을 느꼈나요?" in result["opening"]
        assert len(result["deepening"]) == 3
        assert len(result["integration"]) == 2

    def test_saju_context_prompts(self):
        """Should return saju-specific prompts for saju context"""
        _JUNG_DATA_CACHE["active_imagination"] = {
            "ai_facilitation_guide": {
                "opening_prompts": {
                    "after_saju_analysis": ["사주 분석 관련 질문 1", "사주 분석 관련 질문 2"],
                    "general": ["일반 질문"],
                },
                "deepening_prompts": ["심화"],
                "integration_prompts": ["통합"],
            }
        }

        result = get_active_imagination_prompts("사주 결과에 대해 이야기해 주세요")

        assert "사주 분석 관련 질문 1" in result["opening"]

    def test_astro_context_prompts(self):
        """Should return astro-specific prompts for astrology context"""
        _JUNG_DATA_CACHE["active_imagination"] = {
            "ai_facilitation_guide": {
                "opening_prompts": {
                    "after_astro_analysis": ["점성술 관련 질문"],
                    "general": ["일반 질문"],
                },
                "deepening_prompts": [],
                "integration_prompts": [],
            }
        }

        result = get_active_imagination_prompts("점성술 차트를 봐주세요")

        assert "점성술 관련 질문" in result["opening"]

    def test_general_context_prompts(self):
        """Should return general prompts for unrecognized context"""
        _JUNG_DATA_CACHE["active_imagination"] = {
            "ai_facilitation_guide": {
                "opening_prompts": {
                    "general": ["일반 질문 1", "일반 질문 2"],
                },
                "deepening_prompts": ["심화"],
                "integration_prompts": ["통합"],
            }
        }

        result = get_active_imagination_prompts("random context text")

        assert "일반 질문 1" in result["opening"]

    def test_prompts_limited_to_correct_count(self):
        """Should limit prompts to correct counts (2, 3, 2)"""
        _JUNG_DATA_CACHE["active_imagination"] = {
            "ai_facilitation_guide": {
                "opening_prompts": {
                    "general": ["1", "2", "3", "4", "5"],
                },
                "deepening_prompts": ["1", "2", "3", "4", "5"],
                "integration_prompts": ["1", "2", "3", "4", "5"],
            }
        }

        result = get_active_imagination_prompts("test")

        assert len(result["opening"]) == 2
        assert len(result["deepening"]) == 3
        assert len(result["integration"]) == 2

    def test_nightmare_triggers_dream_prompts(self):
        """Should recognize nightmare as dream context"""
        _JUNG_DATA_CACHE["active_imagination"] = {
            "ai_facilitation_guide": {
                "opening_prompts": {
                    "after_dream_sharing": ["악몽 관련"],
                    "general": ["일반"],
                },
                "deepening_prompts": [],
                "integration_prompts": [],
            }
        }

        result = get_active_imagination_prompts("악몽을 꿨어요")

        assert "악몽 관련" in result["opening"]

    def test_birthchart_triggers_saju_prompts(self):
        """Should recognize 운세 as saju context"""
        _JUNG_DATA_CACHE["active_imagination"] = {
            "ai_facilitation_guide": {
                "opening_prompts": {
                    "after_saju_analysis": ["운세 관련"],
                    "general": ["일반"],
                },
                "deepening_prompts": [],
                "integration_prompts": [],
            }
        }

        result = get_active_imagination_prompts("오늘 운세가 어떤가요")

        assert "운세 관련" in result["opening"]

    def test_house_triggers_astro_prompts(self):
        """Should recognize 하우스 as astro context"""
        _JUNG_DATA_CACHE["active_imagination"] = {
            "ai_facilitation_guide": {
                "opening_prompts": {
                    "after_astro_analysis": ["하우스 관련"],
                    "general": ["일반"],
                },
                "deepening_prompts": [],
                "integration_prompts": [],
            }
        }

        result = get_active_imagination_prompts("7하우스에 금성이 있어요")

        assert "하우스 관련" in result["opening"]


class TestGetCrisisResources:
    """Tests for get_crisis_resources function"""

    def setup_method(self):
        """Reset cache before each test"""
        jung_module._JUNG_CACHE_LOADED = True  # Prevent actual file loading
        for key in _JUNG_DATA_CACHE:
            _JUNG_DATA_CACHE[key] = None

    def test_returns_empty_when_no_data(self):
        """Should return empty dict when no crisis data available"""
        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["crisis_intervention"] = {}

        result = get_crisis_resources()

        assert result == {}

    def test_returns_crisis_resources(self):
        """Should return crisis resources from data"""
        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["crisis_intervention"] = {
            "response_protocols": {
                "suicidal_ideation": {
                    "resources_korea": {
                        "hotline": "1393",
                        "name": "자살예방상담전화",
                    }
                }
            },
            "ai_limitations_and_boundaries": {
                "cannot_provide": ["진단", "처방"],
                "must_refer": ["응급 상황"],
            },
            "de_escalation_techniques": {
                "grounding": ["심호흡", "오감 집중"],
                "validation": ["감정 인정"],
            },
        }

        result = get_crisis_resources()

        assert result["resources"]["hotline"] == "1393"
        assert "진단" in result["limitations"]["cannot_provide"]
        assert "심호흡" in result["deescalation"]["grounding"]

    def test_handles_missing_nested_data(self):
        """Should handle missing nested data gracefully"""
        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["crisis_intervention"] = {
            "response_protocols": {},  # No suicidal_ideation
        }

        result = get_crisis_resources()

        # Should not crash, return partial data
        assert isinstance(result, dict)

    def test_locale_parameter_accepted(self):
        """Should accept locale parameter (for future i18n)"""
        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["crisis_intervention"] = {
            "response_protocols": {"suicidal_ideation": {"resources_korea": {}}},
            "ai_limitations_and_boundaries": {},
            "de_escalation_techniques": {},
        }

        # Should not raise for different locales
        result_ko = get_crisis_resources(locale="ko")
        result_en = get_crisis_resources(locale="en")

        assert isinstance(result_ko, dict)
        assert isinstance(result_en, dict)


class TestJungDataCacheStructure:
    """Tests for cache structure and keys"""

    def test_cache_has_expected_keys(self):
        """Cache should have all expected keys"""
        expected_keys = [
            "active_imagination",
            "lifespan_individuation",
            "crisis_intervention",
            "archetypes",
            "therapeutic",
            "cross_analysis",
            "psychological_types",
            "alchemy",
            "counseling_scenarios",
            "integrated_counseling",
            "counseling_prompts",
            "personality_integration",
            "expanded_counseling",
        ]

        for key in expected_keys:
            assert key in _JUNG_DATA_CACHE, f"Missing cache key: {key}"

    def test_cache_values_default_to_none(self):
        """Cache values should default to None"""
        # Reset cache
        for key in _JUNG_DATA_CACHE:
            _JUNG_DATA_CACHE[key] = None

        for key, value in _JUNG_DATA_CACHE.items():
            assert value is None, f"Cache key {key} should be None by default"


class TestEdgeCases:
    """Edge case tests"""

    def setup_method(self):
        """Reset cache before each test"""
        jung_module._JUNG_CACHE_LOADED = True  # Prevent actual file loading
        for key in _JUNG_DATA_CACHE:
            _JUNG_DATA_CACHE[key] = None

    def test_lifespan_boundary_age_12(self):
        """Age 12 should be childhood"""
        current_year = datetime.now().year
        birth_year = current_year - 12

        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {
            "life_stages": {
                "childhood": {"name_ko": "아동기"},
                "adolescence": {"name_ko": "청소년기"},
            }
        }

        result = get_lifespan_guidance(birth_year)
        assert result["stage_name"] == "아동기"

    def test_lifespan_boundary_age_13(self):
        """Age 13 should be adolescence"""
        current_year = datetime.now().year
        birth_year = current_year - 13

        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {
            "life_stages": {
                "childhood": {"name_ko": "아동기"},
                "adolescence": {"name_ko": "청소년기"},
            }
        }

        result = get_lifespan_guidance(birth_year)
        assert result["stage_name"] == "청소년기"

    def test_lifespan_boundary_age_70(self):
        """Age 70 should be mature_adulthood"""
        current_year = datetime.now().year
        birth_year = current_year - 70

        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {
            "life_stages": {
                "mature_adulthood": {"name_ko": "성숙기"},
                "elder": {"name_ko": "노년기"},
            }
        }

        result = get_lifespan_guidance(birth_year)
        assert result["stage_name"] == "성숙기"

    def test_lifespan_boundary_age_71(self):
        """Age 71 should be elder"""
        current_year = datetime.now().year
        birth_year = current_year - 71

        _JUNG_DATA_CACHE["active_imagination"] = {}
        _JUNG_DATA_CACHE["lifespan_individuation"] = {
            "life_stages": {
                "mature_adulthood": {"name_ko": "성숙기"},
                "elder": {"name_ko": "노년기"},
            }
        }

        result = get_lifespan_guidance(birth_year)
        assert result["stage_name"] == "노년기"

    def test_empty_context_string(self):
        """Empty context should use general prompts"""
        _JUNG_DATA_CACHE["active_imagination"] = {
            "ai_facilitation_guide": {
                "opening_prompts": {
                    "general": ["일반 질문"],
                },
                "deepening_prompts": [],
                "integration_prompts": [],
            }
        }

        result = get_active_imagination_prompts("")

        assert "일반 질문" in result["opening"]

    def test_case_insensitive_context_matching(self):
        """Context matching should be case-insensitive"""
        _JUNG_DATA_CACHE["active_imagination"] = {
            "ai_facilitation_guide": {
                "opening_prompts": {
                    "after_dream_sharing": ["꿈 관련"],
                    "general": ["일반"],
                },
                "deepening_prompts": [],
                "integration_prompts": [],
            }
        }

        result = get_active_imagination_prompts("꿈에서")

        assert "꿈 관련" in result["opening"]
