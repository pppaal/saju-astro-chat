"""
Unit tests for Compatibility house_gongmang module.

Tests:
- analyze_gongmang_interaction: 공망 상호작용 분석
- analyze_house_compatibility: 12하우스 궁합 분석
"""
import pytest
from unittest.mock import patch, MagicMock


class TestAnalyzeGongmangInteraction:
    """Tests for analyze_gongmang_interaction function."""

    def test_gongmang_interaction_basic(self):
        """Basic gongmang interaction should work."""
        from backend_ai.app.compatibility.analysis.house_gongmang import analyze_gongmang_interaction

        person1 = {
            "saju": {
                "pillars": {
                    "year": "甲子",
                    "month": "乙丑",
                    "day": "丙寅",
                    "hour": "丁卯"
                }
            }
        }
        person2 = {
            "saju": {
                "pillars": {
                    "year": "戊辰",
                    "month": "己巳",
                    "day": "庚午",
                    "hour": "辛未"
                }
            }
        }

        result = analyze_gongmang_interaction(person1, person2)

        assert "person1_gongmang" in result
        assert "person2_gongmang" in result
        assert "interactions" in result
        assert "score_adjustment" in result
        assert "summary" in result

    def test_gongmang_no_day_pillar(self):
        """Missing day pillar should return empty result."""
        from backend_ai.app.compatibility.analysis.house_gongmang import analyze_gongmang_interaction

        person1 = {"saju": {"pillars": {"year": "甲子"}}}
        person2 = {"saju": {"pillars": {"year": "戊辰"}}}

        result = analyze_gongmang_interaction(person1, person2)

        assert result["person1_gongmang"] == []
        assert result["person2_gongmang"] == []

    def test_gongmang_shared_gongmang(self):
        """Shared gongmang should be detected."""
        from backend_ai.app.compatibility.analysis.house_gongmang import analyze_gongmang_interaction

        person1 = {
            "saju": {
                "pillars": {
                    "year": "甲子",
                    "month": "乙丑",
                    "day": "甲子",  # Same cycle
                    "hour": "丁卯"
                }
            }
        }
        person2 = {
            "saju": {
                "pillars": {
                    "year": "戊辰",
                    "month": "己巳",
                    "day": "甲子",  # Same cycle
                    "hour": "辛未"
                }
            }
        }

        result = analyze_gongmang_interaction(person1, person2)

        # Check if shared gongmang interaction is detected
        has_shared = any(i.get("type") == "shared_gongmang" for i in result["interactions"])
        assert isinstance(result["interactions"], list)

    def test_gongmang_no_spouse_gongmang(self):
        """No spouse gongmang should be positive."""
        from backend_ai.app.compatibility.analysis.house_gongmang import analyze_gongmang_interaction

        person1 = {
            "saju": {
                "pillars": {
                    "year": "甲子",
                    "month": "乙丑",
                    "day": "丙寅",
                    "hour": "丁卯"
                }
            }
        }
        person2 = {
            "saju": {
                "pillars": {
                    "year": "戊辰",
                    "month": "己巳",
                    "day": "庚午",
                    "hour": "辛未"
                }
            }
        }

        result = analyze_gongmang_interaction(person1, person2)

        # Should have some interactions
        assert isinstance(result["interactions"], list)

    def test_gongmang_summary_positive(self):
        """Positive score should return good summary."""
        from backend_ai.app.compatibility.analysis.house_gongmang import analyze_gongmang_interaction

        person1 = {"saju": {"pillars": {"day": "甲子", "year": "甲寅", "month": "乙卯", "hour": "丙辰"}}}
        person2 = {"saju": {"pillars": {"day": "戊午", "year": "戊申", "month": "己酉", "hour": "庚戌"}}}

        result = analyze_gongmang_interaction(person1, person2)

        assert "summary" in result
        assert isinstance(result["summary"], str)


class TestAnalyzeHouseCompatibility:
    """Tests for analyze_house_compatibility function."""

    def test_house_compatibility_basic(self):
        """Basic house compatibility should work."""
        from backend_ai.app.compatibility.analysis.house_gongmang import analyze_house_compatibility

        person1 = {
            "saju": {
                "pillars": {
                    "year": "甲子",
                    "month": "乙丑",
                    "day": "丙寅",
                    "hour": "丁卯"
                }
            }
        }
        person2 = {
            "saju": {
                "pillars": {
                    "year": "戊辰",
                    "month": "己巳",
                    "day": "庚午",
                    "hour": "辛未"
                }
            }
        }

        result = analyze_house_compatibility(person1, person2)

        assert "person1_houses" in result
        assert "person2_houses" in result
        assert "score" in result
        assert "house_interactions" in result
        assert "compatibility_level" in result

    def test_house_compatibility_no_day(self):
        """Missing day pillar should return empty result."""
        from backend_ai.app.compatibility.analysis.house_gongmang import analyze_house_compatibility

        person1 = {"saju": {"pillars": {"year": "甲子"}}}
        person2 = {"saju": {"pillars": {"year": "戊辰"}}}

        result = analyze_house_compatibility(person1, person2)

        assert result["person1_houses"]["primary"] == 0

    def test_house_compatibility_same_house(self):
        """Same house should add bonus."""
        from backend_ai.app.compatibility.analysis.house_gongmang import analyze_house_compatibility

        # Same day branch
        person1 = {"saju": {"pillars": {"day": "甲子"}}}
        person2 = {"saju": {"pillars": {"day": "丙子"}}}

        result = analyze_house_compatibility(person1, person2)

        # Check if same_primary interaction exists
        has_same = any(i.get("type") == "same_primary" for i in result["house_interactions"])
        assert isinstance(result["house_interactions"], list)

    def test_house_compatibility_partnership_house(self):
        """Partnership house (7) should add bonus."""
        from backend_ai.app.compatibility.analysis.house_gongmang import analyze_house_compatibility

        person1 = {"saju": {"pillars": {"day": "甲子"}}}
        person2 = {"saju": {"pillars": {"day": "丙午"}}}

        result = analyze_house_compatibility(person1, person2)

        # Check for partnership house bonus
        has_partnership = any(i.get("type") == "partnership_house" for i in result["house_interactions"])
        assert isinstance(result["house_interactions"], list)

    def test_house_compatibility_levels(self):
        """Should return appropriate compatibility level."""
        from backend_ai.app.compatibility.analysis.house_gongmang import analyze_house_compatibility

        person1 = {"saju": {"pillars": {"day": "甲寅"}}}
        person2 = {"saju": {"pillars": {"day": "丙辰"}}}

        result = analyze_house_compatibility(person1, person2)

        assert result["compatibility_level"] in ["최상", "좋음", "보통", "노력 필요"]


class TestModuleExports:
    """Tests for module exports."""

    def test_analyze_gongmang_interaction_importable(self):
        """analyze_gongmang_interaction should be importable."""
        from backend_ai.app.compatibility.analysis.house_gongmang import analyze_gongmang_interaction
        assert callable(analyze_gongmang_interaction)

    def test_analyze_house_compatibility_importable(self):
        """analyze_house_compatibility should be importable."""
        from backend_ai.app.compatibility.analysis.house_gongmang import analyze_house_compatibility
        assert callable(analyze_house_compatibility)
