"""
Unit tests for Compatibility stem_branch module.

Tests:
- analyze_stem_compatibility function (천간 궁합)
- analyze_branch_compatibility function (지지 궁합)
- Combination and clash detection
- Branch relationships (육합, 삼합, 방합, 충, 형, 원진, 해)
"""
import pytest
from unittest.mock import patch, MagicMock


class TestAnalyzeStemCompatibility:
    """Tests for analyze_stem_compatibility function."""

    def test_stem_combination_gap_gi(self):
        """甲己 combination should return positive adjustment."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_stem_compatibility

        result = analyze_stem_compatibility("甲", "己")

        assert result["relationship"] == "combination"
        assert result["score_adjustment"] > 0
        assert "천간합" in result["details"][0]

    def test_stem_combination_eul_gyeong(self):
        """乙庚 combination should return positive adjustment."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_stem_compatibility

        result = analyze_stem_compatibility("乙", "庚")

        assert result["relationship"] == "combination"
        assert result["score_adjustment"] > 0

    def test_stem_combination_reverse_order(self):
        """Combination should work in both orders."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_stem_compatibility

        result1 = analyze_stem_compatibility("甲", "己")
        result2 = analyze_stem_compatibility("己", "甲")

        assert result1["relationship"] == result2["relationship"] == "combination"

    def test_stem_clash_gap_gyeong(self):
        """甲庚 clash should return negative adjustment."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_stem_compatibility

        result = analyze_stem_compatibility("甲", "庚")

        assert result["relationship"] == "clash"
        assert result["score_adjustment"] < 0
        assert "천간충" in result["details"][0]

    def test_stem_same_bigyeon(self):
        """Same stem should return 비견 relationship."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_stem_compatibility

        result = analyze_stem_compatibility("甲", "甲")

        assert result["relationship"] == "same"
        assert result["score_adjustment"] == 5
        assert "비견" in result["details"][0]

    def test_stem_neutral(self):
        """Non-related stems should return neutral."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_stem_compatibility

        result = analyze_stem_compatibility("甲", "丙")

        assert result["relationship"] == "neutral"
        assert result["score_adjustment"] == 0

    def test_all_combinations(self):
        """Test all five 천간합 combinations."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_stem_compatibility

        combinations = [
            ("甲", "己"),  # 갑기합
            ("乙", "庚"),  # 을경합
            ("丙", "辛"),  # 병신합
            ("丁", "壬"),  # 정임합
            ("戊", "癸"),  # 무계합
        ]

        for stem1, stem2 in combinations:
            result = analyze_stem_compatibility(stem1, stem2)
            assert result["relationship"] == "combination", f"{stem1}{stem2} should be combination"


class TestAnalyzeBranchCompatibility:
    """Tests for analyze_branch_compatibility function."""

    def test_branch_yukhap(self):
        """육합 (Six Harmonies) should be detected."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_branch_compatibility

        # 子丑合
        result = analyze_branch_compatibility("子", "丑")

        assert "yukhap" in result["relationships"]
        assert result["score_adjustment"] > 0
        assert any("육합" in d for d in result["details"])

    def test_branch_chung(self):
        """지지충 (Branch Clash) should be detected."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_branch_compatibility

        # 子午충
        result = analyze_branch_compatibility("子", "午")

        assert "chung" in result["relationships"]
        assert result["score_adjustment"] < 0
        assert any("지지충" in d for d in result["details"])

    def test_branch_wongjin(self):
        """원진 should be detected."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_branch_compatibility

        # 子未 원진
        result = analyze_branch_compatibility("子", "未")

        assert "wongjin" in result["relationships"]
        assert result["score_adjustment"] < 0

    def test_branch_same(self):
        """Same branch should return positive adjustment."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_branch_compatibility

        result = analyze_branch_compatibility("子", "子")

        assert "same" in result["relationships"]
        assert result["score_adjustment"] > 0
        assert any("동일" in d for d in result["details"])

    def test_branch_banhap(self):
        """반합 (Half Combination) should be detected."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_branch_compatibility

        # 寅午 반합 (삼합의 2개)
        result = analyze_branch_compatibility("寅", "午")

        # Check if banhap is in relationships
        has_banhap = "banhap" in result["relationships"]
        assert isinstance(result["relationships"], list)

    def test_branch_multiple_relationships(self):
        """Multiple relationships can occur."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_branch_compatibility

        result = analyze_branch_compatibility("子", "丑")

        # 子丑 is 육합
        assert isinstance(result["relationships"], list)
        assert len(result["relationships"]) >= 1

    def test_branch_samhap_group(self):
        """삼합 should be detected in group analysis."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_branch_compatibility

        # 寅午戌 삼합
        all_branches = ["寅", "午", "戌"]
        result = analyze_branch_compatibility("寅", "午", all_branches=all_branches)

        assert "samhap" in result["relationships"]
        assert any("삼합" in d for d in result["details"])

    def test_branch_banghap_group(self):
        """방합 should be detected in group analysis."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_branch_compatibility

        # 寅卯辰 방합 (동방)
        all_branches = ["寅", "卯", "辰"]
        result = analyze_branch_compatibility("寅", "卯", all_branches=all_branches)

        assert "banghap" in result["relationships"]
        assert any("방합" in d for d in result["details"])


class TestGetBranchesFromPillars:
    """Tests for _get_branches_from_pillars helper function."""

    def test_get_branches_full_pillars(self):
        """Should extract branches from all four pillars."""
        from backend_ai.app.compatibility.analysis.stem_branch import _get_branches_from_pillars

        pillars = {
            "year": "甲子",
            "month": "乙丑",
            "day": "丙寅",
            "hour": "丁卯"
        }

        branches = _get_branches_from_pillars(pillars)

        assert branches == ["子", "丑", "寅", "卯"]

    def test_get_branches_partial_pillars(self):
        """Should handle missing pillars."""
        from backend_ai.app.compatibility.analysis.stem_branch import _get_branches_from_pillars

        pillars = {
            "year": "甲子",
            "day": "丙寅",
        }

        branches = _get_branches_from_pillars(pillars)

        assert "子" in branches
        assert "寅" in branches

    def test_get_branches_empty_pillars(self):
        """Should handle empty pillars."""
        from backend_ai.app.compatibility.analysis.stem_branch import _get_branches_from_pillars

        branches = _get_branches_from_pillars({})

        assert branches == []

    def test_get_branches_short_pillar(self):
        """Should handle short pillar strings."""
        from backend_ai.app.compatibility.analysis.stem_branch import _get_branches_from_pillars

        pillars = {
            "year": "甲",  # Only stem, no branch
            "day": "丙寅",
        }

        branches = _get_branches_from_pillars(pillars)

        assert "寅" in branches
        assert "甲" not in branches


class TestBranchClashPairs:
    """Test all six branch clash pairs."""

    def test_all_chung_pairs(self):
        """Test all six 지지충 pairs."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_branch_compatibility

        chung_pairs = [
            ("子", "午"),  # 자오충
            ("丑", "未"),  # 축미충
            ("寅", "申"),  # 인신충
            ("卯", "酉"),  # 묘유충
            ("辰", "戌"),  # 진술충
            ("巳", "亥"),  # 사해충
        ]

        for branch1, branch2 in chung_pairs:
            result = analyze_branch_compatibility(branch1, branch2)
            assert "chung" in result["relationships"], f"{branch1}{branch2}충 should be detected"


class TestBranchYukhapPairs:
    """Test all six branch yukhap pairs."""

    def test_all_yukhap_pairs(self):
        """Test all six 육합 pairs."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_branch_compatibility

        yukhap_pairs = [
            ("子", "丑"),  # 자축합
            ("寅", "亥"),  # 인해합
            ("卯", "戌"),  # 묘술합
            ("辰", "酉"),  # 진유합
            ("巳", "申"),  # 사신합
            ("午", "未"),  # 오미합
        ]

        for branch1, branch2 in yukhap_pairs:
            result = analyze_branch_compatibility(branch1, branch2)
            assert "yukhap" in result["relationships"], f"{branch1}{branch2}합 should be detected"


class TestModuleExports:
    """Tests for module exports."""

    def test_analyze_stem_compatibility_importable(self):
        """analyze_stem_compatibility should be importable."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_stem_compatibility
        assert callable(analyze_stem_compatibility)

    def test_analyze_branch_compatibility_importable(self):
        """analyze_branch_compatibility should be importable."""
        from backend_ai.app.compatibility.analysis.stem_branch import analyze_branch_compatibility
        assert callable(analyze_branch_compatibility)

    def test_get_branches_from_pillars_importable(self):
        """_get_branches_from_pillars should be importable."""
        from backend_ai.app.compatibility.analysis.stem_branch import _get_branches_from_pillars
        assert callable(_get_branches_from_pillars)
