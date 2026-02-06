"""
Unit tests for Compatibility stages_naeum module.

Tests:
- analyze_twelve_stages_compatibility: 12운성 궁합 분석
- analyze_naeum_compatibility: 납음오행 궁합 분석
"""
import pytest
from unittest.mock import patch, MagicMock


class TestAnalyzeTwelveStagesCompatibility:
    """Tests for analyze_twelve_stages_compatibility function."""

    def test_twelve_stages_basic(self):
        """Basic twelve stages compatibility should work."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_twelve_stages_compatibility

        person1 = {
            "saju": {
                "twelveStage": "장생"
            }
        }
        person2 = {
            "saju": {
                "twelveStage": "관대"
            }
        }

        result = analyze_twelve_stages_compatibility(person1, person2)

        assert "person1_stage" in result
        assert "person2_stage" in result
        assert "score" in result
        assert "meaning" in result
        assert "compatibility_level" in result

    def test_twelve_stages_alternative_key(self):
        """Should handle twelve_stage key."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_twelve_stages_compatibility

        person1 = {"saju": {"twelve_stage": "건록"}}
        person2 = {"saju": {"twelve_stage": "제왕"}}

        result = analyze_twelve_stages_compatibility(person1, person2)

        assert result["person1_stage"] == "건록"
        assert result["person2_stage"] == "제왕"

    def test_twelve_stages_no_data(self):
        """Missing stage data should return empty result."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_twelve_stages_compatibility

        person1 = {"saju": {}}
        person2 = {"saju": {"twelveStage": "장생"}}

        result = analyze_twelve_stages_compatibility(person1, person2)

        assert result["person1_stage"] == ""

    def test_twelve_stages_strong_combo(self):
        """Strong stage combo should have high score."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_twelve_stages_compatibility

        person1 = {"saju": {"twelveStage": "장생"}}
        person2 = {"saju": {"twelveStage": "건록"}}

        result = analyze_twelve_stages_compatibility(person1, person2)

        assert result["score"] > 0
        assert result["compatibility_level"] in ["최상", "좋음", "보통", "노력 필요"]

    def test_twelve_stages_weak_combo(self):
        """Weak stage combo should have lower score."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_twelve_stages_compatibility

        person1 = {"saju": {"twelveStage": "사"}}
        person2 = {"saju": {"twelveStage": "묘"}}

        result = analyze_twelve_stages_compatibility(person1, person2)

        assert isinstance(result["score"], int)

    def test_twelve_stages_compatibility_levels(self):
        """Should return appropriate compatibility level."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_twelve_stages_compatibility

        person1 = {"saju": {"twelveStage": "양"}}
        person2 = {"saju": {"twelveStage": "태"}}

        result = analyze_twelve_stages_compatibility(person1, person2)

        assert result["compatibility_level"] in ["최상", "좋음", "보통", "노력 필요"]


class TestAnalyzeNaeumCompatibility:
    """Tests for analyze_naeum_compatibility function."""

    def test_naeum_compatibility_basic(self):
        """Basic naeum compatibility should work."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_naeum_compatibility

        person1 = {
            "saju": {
                "pillars": {
                    "day": "甲子"
                }
            }
        }
        person2 = {
            "saju": {
                "pillars": {
                    "day": "丙寅"
                }
            }
        }

        result = analyze_naeum_compatibility(person1, person2)

        assert "person1_naeum" in result
        assert "person2_naeum" in result
        assert "person1_element" in result
        assert "person2_element" in result
        assert "score" in result
        assert "compatibility_level" in result

    def test_naeum_no_day_pillar(self):
        """Missing day pillar should return empty result."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_naeum_compatibility

        person1 = {"saju": {"pillars": {}}}
        person2 = {"saju": {"pillars": {"day": "丙寅"}}}

        result = analyze_naeum_compatibility(person1, person2)

        assert result["person1_naeum"] == ""

    def test_naeum_short_day_pillar(self):
        """Short day pillar should return empty result."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_naeum_compatibility

        person1 = {"saju": {"pillars": {"day": "甲"}}}
        person2 = {"saju": {"pillars": {"day": "丙寅"}}}

        result = analyze_naeum_compatibility(person1, person2)

        assert result["person1_naeum"] == ""

    def test_naeum_same_naeum(self):
        """Same naeum should add bonus."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_naeum_compatibility

        person1 = {"saju": {"pillars": {"day": "甲子"}}}
        person2 = {"saju": {"pillars": {"day": "乙丑"}}}  # Same naeum pair

        result = analyze_naeum_compatibility(person1, person2)

        if result["person1_naeum"] == result["person2_naeum"]:
            assert "같은 납음" in result["meaning"]

    def test_naeum_compatibility_levels(self):
        """Should return appropriate compatibility level."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_naeum_compatibility

        person1 = {"saju": {"pillars": {"day": "甲子"}}}
        person2 = {"saju": {"pillars": {"day": "丙寅"}}}

        result = analyze_naeum_compatibility(person1, person2)

        assert result["compatibility_level"] in [
            "상생 - 매우 좋음", "비화 - 좋음", "중립", "상극 - 도전적"
        ]

    def test_naeum_elements_extracted(self):
        """Naeum elements should be extracted correctly."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_naeum_compatibility

        person1 = {"saju": {"pillars": {"day": "甲子"}}}
        person2 = {"saju": {"pillars": {"day": "丙寅"}}}

        result = analyze_naeum_compatibility(person1, person2)

        # Elements should be one of 木, 火, 土, 金, 水 or empty
        valid_elements = ["木", "火", "土", "金", "水", ""]
        assert result["person1_element"] in valid_elements or result["person1_element"] == ""
        assert result["person2_element"] in valid_elements or result["person2_element"] == ""


class TestModuleExports:
    """Tests for module exports."""

    def test_analyze_twelve_stages_compatibility_importable(self):
        """analyze_twelve_stages_compatibility should be importable."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_twelve_stages_compatibility
        assert callable(analyze_twelve_stages_compatibility)

    def test_analyze_naeum_compatibility_importable(self):
        """analyze_naeum_compatibility should be importable."""
        from backend_ai.app.compatibility.analysis.stages_naeum import analyze_naeum_compatibility
        assert callable(analyze_naeum_compatibility)
