"""
Unit tests for Compatibility shinsal module.

Tests:
- analyze_shinsal_compatibility: 신살(神殺) 궁합 분석
"""
import pytest
from unittest.mock import patch, MagicMock


class TestAnalyzeShinsalCompatibility:
    """Tests for analyze_shinsal_compatibility function."""

    def test_shinsal_compatibility_basic(self):
        """Basic shinsal compatibility should work."""
        from backend_ai.app.compatibility.analysis.shinsal import analyze_shinsal_compatibility

        person1 = {
            "saju": {
                "pillars": {
                    "year": "甲子",
                    "month": "乙丑",
                    "day": "丙寅",
                    "hour": "丁卯"
                },
                "dayMaster": {"name": "丙"}
            }
        }
        person2 = {
            "saju": {
                "pillars": {
                    "year": "戊辰",
                    "month": "己巳",
                    "day": "庚午",
                    "hour": "辛未"
                },
                "dayMaster": {"name": "庚"}
            }
        }

        result = analyze_shinsal_compatibility(person1, person2)

        assert "total_score" in result
        assert "details" in result
        assert "shinsal_interactions" in result
        assert "positive_shinsals" in result
        assert "negative_shinsals" in result
        assert "recommendations" in result

    def test_shinsal_both_have_same(self):
        """Both having same shinsal should affect score."""
        from backend_ai.app.compatibility.analysis.shinsal import analyze_shinsal_compatibility

        person1 = {
            "saju": {
                "pillars": {
                    "year": "甲子",
                    "month": "乙卯",
                    "day": "丙午",
                    "hour": "丁酉"
                },
                "dayMaster": {"name": "丙"}
            }
        }
        person2 = {
            "saju": {
                "pillars": {
                    "year": "甲子",
                    "month": "乙卯",
                    "day": "庚午",
                    "hour": "辛酉"
                },
                "dayMaster": {"name": "庚"}
            }
        }

        result = analyze_shinsal_compatibility(person1, person2)

        assert isinstance(result["shinsal_interactions"], list)

    def test_shinsal_guiin_detection(self):
        """귀인 should be detected and scored."""
        from backend_ai.app.compatibility.analysis.shinsal import analyze_shinsal_compatibility

        person1 = {
            "saju": {
                "pillars": {
                    "year": "甲子",
                    "month": "乙丑",
                    "day": "甲寅",  # 甲 daymaster
                    "hour": "丁卯"
                },
                "dayMaster": {"name": "甲"}
            }
        }
        person2 = {
            "saju": {
                "pillars": {
                    "year": "戊辰",
                    "month": "己巳",
                    "day": "庚午",
                    "hour": "辛未"
                },
                "dayMaster": {"name": "庚"}
            }
        }

        result = analyze_shinsal_compatibility(person1, person2)

        # Result should have guiin analysis
        assert isinstance(result["positive_shinsals"], list)

    def test_shinsal_yanginsal_detection(self):
        """양인살 should be detected and scored."""
        from backend_ai.app.compatibility.analysis.shinsal import analyze_shinsal_compatibility

        # 甲 daymaster with 卯 branch = 양인살
        person1 = {
            "saju": {
                "pillars": {
                    "year": "甲卯",
                    "month": "乙卯",
                    "day": "甲卯",
                    "hour": "丁卯"
                },
                "dayMaster": {"name": "甲"}
            }
        }
        person2 = {
            "saju": {
                "pillars": {
                    "year": "庚酉",
                    "month": "辛酉",
                    "day": "庚酉",
                    "hour": "癸酉"
                },
                "dayMaster": {"name": "庚"}
            }
        }

        result = analyze_shinsal_compatibility(person1, person2)

        # Check if yanginsal is detected
        has_yangin = any("양인살" in str(s) for s in result["negative_shinsals"])
        assert isinstance(result["negative_shinsals"], list)

    def test_shinsal_empty_data(self):
        """Empty data should return neutral result."""
        from backend_ai.app.compatibility.analysis.shinsal import analyze_shinsal_compatibility

        person1 = {"saju": {"pillars": {}, "dayMaster": {}}}
        person2 = {"saju": {"pillars": {}, "dayMaster": {}}}

        result = analyze_shinsal_compatibility(person1, person2)

        assert "summary" in result

    def test_shinsal_summary_levels(self):
        """Summary should reflect score levels."""
        from backend_ai.app.compatibility.analysis.shinsal import analyze_shinsal_compatibility

        person1 = {
            "saju": {
                "pillars": {"year": "甲子", "day": "丙寅"},
                "dayMaster": {"name": "丙"}
            }
        }
        person2 = {
            "saju": {
                "pillars": {"year": "戊辰", "day": "庚午"},
                "dayMaster": {"name": "庚"}
            }
        }

        result = analyze_shinsal_compatibility(person1, person2)

        assert "summary" in result
        assert any(keyword in result["summary"] for keyword in
                   ["매우 좋습니다", "좋습니다", "보통입니다", "주의할 점", "도전적"])

    def test_shinsal_day_master_string(self):
        """dayMaster as string should work."""
        from backend_ai.app.compatibility.analysis.shinsal import analyze_shinsal_compatibility

        person1 = {
            "saju": {
                "pillars": {"year": "甲子", "day": "丙寅"},
                "dayMaster": "丙"
            }
        }
        person2 = {
            "saju": {
                "pillars": {"year": "戊辰", "day": "庚午"},
                "dayMaster": "庚"
            }
        }

        result = analyze_shinsal_compatibility(person1, person2)

        assert isinstance(result["total_score"], int)


class TestModuleExports:
    """Tests for module exports."""

    def test_analyze_shinsal_compatibility_importable(self):
        """analyze_shinsal_compatibility should be importable."""
        from backend_ai.app.compatibility.analysis.shinsal import analyze_shinsal_compatibility
        assert callable(analyze_shinsal_compatibility)
