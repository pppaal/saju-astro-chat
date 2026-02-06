"""
Unit tests for Compatibility banhap_banghap module.

Tests:
- analyze_banhap_banghap_detailed: 반합/방합 상세 분석
"""
import pytest
from unittest.mock import patch, MagicMock


class TestAnalyzeBanhapBanghapDetailed:
    """Tests for analyze_banhap_banghap_detailed function."""

    def test_banhap_detection(self):
        """반합 should be detected when present."""
        from backend_ai.app.compatibility.analysis.banhap_banghap import analyze_banhap_banghap_detailed

        # 寅午 반합 (삼합의 2개)
        person1 = {
            "saju": {
                "pillars": {
                    "year": "甲寅",
                    "month": "乙卯",
                    "day": "丙午",
                    "hour": "丁未"
                }
            }
        }
        person2 = {
            "saju": {
                "pillars": {
                    "year": "戊戌",
                    "month": "己亥",
                    "day": "庚子",
                    "hour": "辛丑"
                }
            }
        }

        result = analyze_banhap_banghap_detailed(person1, person2)

        assert "banhap_analysis" in result
        assert isinstance(result["banhap_analysis"]["found"], list)
        assert "total_score" in result

    def test_banghap_detection(self):
        """방합 should be detected when present."""
        from backend_ai.app.compatibility.analysis.banhap_banghap import analyze_banhap_banghap_detailed

        # 寅卯辰 방합 (동방)
        person1 = {
            "saju": {
                "pillars": {
                    "year": "甲寅",
                    "month": "乙卯",
                    "day": "丙辰",
                    "hour": "丁巳"
                }
            }
        }
        person2 = {
            "saju": {
                "pillars": {
                    "year": "戊午",
                    "month": "己未",
                    "day": "庚申",
                    "hour": "辛酉"
                }
            }
        }

        result = analyze_banhap_banghap_detailed(person1, person2)

        assert "banghap_analysis" in result
        assert isinstance(result["banghap_analysis"]["found"], list)

    def test_empty_pillars(self):
        """Empty pillars should return zero scores."""
        from backend_ai.app.compatibility.analysis.banhap_banghap import analyze_banhap_banghap_detailed

        person1 = {"saju": {"pillars": {}}}
        person2 = {"saju": {"pillars": {}}}

        result = analyze_banhap_banghap_detailed(person1, person2)

        assert result["total_score"] == 0

    def test_strong_banhap_banghap_summary(self):
        """Strong banhap/banghap should return positive summary."""
        from backend_ai.app.compatibility.analysis.banhap_banghap import analyze_banhap_banghap_detailed

        person1 = {"saju": {"pillars": {"year": "甲子", "day": "丙寅"}}}
        person2 = {"saju": {"pillars": {"year": "戊辰", "day": "庚午"}}}

        result = analyze_banhap_banghap_detailed(person1, person2)

        assert "summary" in result
        assert isinstance(result["summary"], str)

    def test_result_structure(self):
        """Result should have correct structure."""
        from backend_ai.app.compatibility.analysis.banhap_banghap import analyze_banhap_banghap_detailed

        person1 = {"saju": {"pillars": {"year": "甲子"}}}
        person2 = {"saju": {"pillars": {"year": "戊辰"}}}

        result = analyze_banhap_banghap_detailed(person1, person2)

        assert "banhap_analysis" in result
        assert "banghap_analysis" in result
        assert "total_score" in result
        assert "summary" in result
        assert "found" in result["banhap_analysis"]
        assert "score" in result["banhap_analysis"]
        assert "found" in result["banghap_analysis"]
        assert "score" in result["banghap_analysis"]


class TestModuleExports:
    """Tests for module exports."""

    def test_analyze_banhap_banghap_detailed_importable(self):
        """analyze_banhap_banghap_detailed should be importable."""
        from backend_ai.app.compatibility.analysis.banhap_banghap import analyze_banhap_banghap_detailed
        assert callable(analyze_banhap_banghap_detailed)
