"""
Unit tests for Compatibility samjae_yongsin module.

Tests:
- analyze_samjae_compatibility: 삼재 궁합 분석
- analyze_yongsin_interaction: 용신/기신 상호작용 분석
"""
import pytest
from unittest.mock import patch, MagicMock


class TestAnalyzeSamjaeCompatibility:
    """Tests for analyze_samjae_compatibility function."""

    def test_samjae_compatibility_basic(self):
        """Basic samjae compatibility should work."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_samjae_compatibility

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

        result = analyze_samjae_compatibility(person1, person2)

        assert "person1_year_branch" in result
        assert "person2_year_branch" in result
        assert "score" in result
        assert "summary" in result

    def test_samjae_no_year_branch(self):
        """Missing year branch should return appropriate message."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_samjae_compatibility

        person1 = {"saju": {"pillars": {}}}
        person2 = {"saju": {"pillars": {"year": "戊辰"}}}

        result = analyze_samjae_compatibility(person1, person2)

        assert "년지 정보가 없어" in result["summary"]

    def test_samjae_same_group(self):
        """Same samjae group should be detected."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_samjae_compatibility

        # Both 子 year - same group
        person1 = {"saju": {"pillars": {"year": "甲子"}}}
        person2 = {"saju": {"pillars": {"year": "丙子"}}}

        result = analyze_samjae_compatibility(person1, person2)

        assert result["interaction"] == "same_group" or result["person1_year_branch"] == result["person2_year_branch"]

    def test_samjae_different_group_safe(self):
        """Different group without clash should be safe."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_samjae_compatibility

        person1 = {"saju": {"pillars": {"year": "甲子"}}}
        person2 = {"saju": {"pillars": {"year": "戊辰"}}}

        result = analyze_samjae_compatibility(person1, person2)

        assert result["person1_year_branch"] != result["person2_year_branch"]
        assert isinstance(result["score"], int)

    def test_samjae_summary_levels(self):
        """Summary should reflect score levels."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_samjae_compatibility

        person1 = {"saju": {"pillars": {"year": "甲寅"}}}
        person2 = {"saju": {"pillars": {"year": "戊申"}}}

        result = analyze_samjae_compatibility(person1, person2)

        assert "summary" in result
        assert any(keyword in result["summary"] for keyword in
                   ["안전한", "보통", "주의"])


class TestAnalyzeYongsinInteraction:
    """Tests for analyze_yongsin_interaction function."""

    def test_yongsin_interaction_basic(self):
        """Basic yongsin interaction should work."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_yongsin_interaction

        person1 = {
            "saju": {
                "yongsin": "木",
                "gisin": "金"
            }
        }
        person2 = {
            "saju": {
                "yongsin": "火",
                "gisin": "水"
            }
        }

        result = analyze_yongsin_interaction(person1, person2)

        assert "person1_yongsin" in result
        assert "person2_yongsin" in result
        assert "score" in result
        assert "summary" in result

    def test_yongsin_same_yongsin(self):
        """Same yongsin should add bonus."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_yongsin_interaction

        person1 = {"saju": {"yongsin": "木", "gisin": "金"}}
        person2 = {"saju": {"yongsin": "木", "gisin": "水"}}

        result = analyze_yongsin_interaction(person1, person2)

        assert result["interaction_type"] == "same_yongsin"
        assert result["score"] > 0

    def test_yongsin_generates_partner(self):
        """Yongsin generating partner's yongsin should be positive."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_yongsin_interaction

        # 木 generates 火
        person1 = {"saju": {"yongsin": "木"}}
        person2 = {"saju": {"yongsin": "火"}}

        result = analyze_yongsin_interaction(person1, person2)

        assert result["mutual_support"] == True
        has_generates = any(d.get("type") == "yongsin_generates" for d in result["compatibility_details"])
        assert has_generates

    def test_yongsin_controls_partner(self):
        """Yongsin controlling partner's yongsin should be cautioned."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_yongsin_interaction

        # 木 controls 土
        person1 = {"saju": {"yongsin": "木"}}
        person2 = {"saju": {"yongsin": "土"}}

        result = analyze_yongsin_interaction(person1, person2)

        assert result["potential_conflict"] == True
        has_controls = any(d.get("type") == "yongsin_controls" for d in result["compatibility_details"])
        assert has_controls

    def test_yongsin_is_partner_gisin(self):
        """My yongsin being partner's gisin should be negative."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_yongsin_interaction

        person1 = {"saju": {"yongsin": "木", "gisin": "金"}}
        person2 = {"saju": {"yongsin": "火", "gisin": "木"}}  # My yongsin is partner's gisin

        result = analyze_yongsin_interaction(person1, person2)

        assert result["potential_conflict"] == True
        has_conflict = any(d.get("type") == "my_yongsin_partner_gisin" for d in result["compatibility_details"])
        assert has_conflict

    def test_yongsin_no_data(self):
        """Missing yongsin data should return appropriate message."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_yongsin_interaction

        person1 = {"saju": {}}
        person2 = {"saju": {"yongsin": "火"}}

        result = analyze_yongsin_interaction(person1, person2)

        assert "용신 정보가 없어" in result["summary"]

    def test_yongsin_alternative_keys(self):
        """Should handle alternative keys for yongsin."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_yongsin_interaction

        person1 = {"saju": {"용신": "木"}}
        person2 = {"saju": {"use_god": "火"}}

        result = analyze_yongsin_interaction(person1, person2)

        assert result["person1_yongsin"] == "木"
        assert result["person2_yongsin"] == "火"

    def test_yongsin_summary_levels(self):
        """Summary should reflect score levels."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_yongsin_interaction

        person1 = {"saju": {"yongsin": "木"}}
        person2 = {"saju": {"yongsin": "水"}}

        result = analyze_yongsin_interaction(person1, person2)

        assert "summary" in result
        assert any(keyword in result["summary"] for keyword in
                   ["최상", "좋습니다", "보통", "주의", "충돌"])

    def test_yongsin_score_clamped(self):
        """Score should be clamped between -10 and 15."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_yongsin_interaction

        person1 = {"saju": {"yongsin": "木", "gisin": "金"}}
        person2 = {"saju": {"yongsin": "火", "gisin": "水"}}

        result = analyze_yongsin_interaction(person1, person2)

        assert -10 <= result["score"] <= 15


class TestModuleExports:
    """Tests for module exports."""

    def test_analyze_samjae_compatibility_importable(self):
        """analyze_samjae_compatibility should be importable."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_samjae_compatibility
        assert callable(analyze_samjae_compatibility)

    def test_analyze_yongsin_interaction_importable(self):
        """analyze_yongsin_interaction should be importable."""
        from backend_ai.app.compatibility.analysis.samjae_yongsin import analyze_yongsin_interaction
        assert callable(analyze_yongsin_interaction)
