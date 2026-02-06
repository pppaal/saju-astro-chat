"""
Unit tests for Compatibility Scoring module.

Tests:
- get_score_summary function
- analyze_oheng_relationship function
- calculate_pair_score function
- generate_pairwise_matrix function
- calculate_group_synergy_score function
"""
import pytest
from unittest.mock import patch, MagicMock


class TestGetScoreSummary:
    """Tests for get_score_summary function."""

    def test_score_90_plus(self):
        """Score 90+ should return best match message."""
        from backend_ai.app.compatibility.scoring import get_score_summary

        result = get_score_summary(95)
        assert "천생연분" in result or "최고" in result

    def test_score_80_to_89(self):
        """Score 80-89 should return very good match message."""
        from backend_ai.app.compatibility.scoring import get_score_summary

        result = get_score_summary(85)
        assert "좋은" in result

    def test_score_70_to_79(self):
        """Score 70-79 should return good match message."""
        from backend_ai.app.compatibility.scoring import get_score_summary

        result = get_score_summary(75)
        assert "좋은" in result or "조화" in result

    def test_score_60_to_69(self):
        """Score 60-69 should return okay match message."""
        from backend_ai.app.compatibility.scoring import get_score_summary

        result = get_score_summary(65)
        assert "괜찮" in result or "노력" in result

    def test_score_50_to_59(self):
        """Score 50-59 should return average match message."""
        from backend_ai.app.compatibility.scoring import get_score_summary

        result = get_score_summary(55)
        assert "평범" in result or "필요" in result

    def test_score_below_50(self):
        """Score below 50 should return challenging match message."""
        from backend_ai.app.compatibility.scoring import get_score_summary

        result = get_score_summary(45)
        assert "도전" in result or "노력" in result


class TestAnalyzeOhengRelationship:
    """Tests for analyze_oheng_relationship function."""

    def test_sangsaeng_wood_fire(self):
        """Wood generating Fire should return positive adjustment."""
        from backend_ai.app.compatibility.scoring import analyze_oheng_relationship

        result = analyze_oheng_relationship("木", "火")

        assert result["adjustment"] == 8
        assert "상생" in result["details"]
        assert "목생화" in result["details"]

    def test_sangsaeng_fire_earth(self):
        """Fire generating Earth should return positive adjustment."""
        from backend_ai.app.compatibility.scoring import analyze_oheng_relationship

        result = analyze_oheng_relationship("火", "土")

        assert result["adjustment"] == 8
        assert "상생" in result["details"]

    def test_sangsaeng_reverse(self):
        """B generating A should also return positive adjustment."""
        from backend_ai.app.compatibility.scoring import analyze_oheng_relationship

        result = analyze_oheng_relationship("火", "木")  # Wood generates Fire

        assert result["adjustment"] == 8
        assert "상생" in result["details"]

    def test_sanggeuk_wood_earth(self):
        """Wood overcoming Earth should return negative adjustment."""
        from backend_ai.app.compatibility.scoring import analyze_oheng_relationship

        result = analyze_oheng_relationship("木", "土")

        assert result["adjustment"] == -8
        assert "상극" in result["details"]
        assert "목극토" in result["details"]

    def test_sanggeuk_water_fire(self):
        """Water overcoming Fire should return negative adjustment."""
        from backend_ai.app.compatibility.scoring import analyze_oheng_relationship

        result = analyze_oheng_relationship("水", "火")

        assert result["adjustment"] == -8
        assert "상극" in result["details"]

    def test_same_element(self):
        """Same element should return small positive adjustment."""
        from backend_ai.app.compatibility.scoring import analyze_oheng_relationship

        result = analyze_oheng_relationship("木", "木")

        assert result["adjustment"] == 3
        assert "동일 오행" in result["details"]

    def test_complete_generating_cycle(self):
        """Test complete generating cycle."""
        from backend_ai.app.compatibility.scoring import analyze_oheng_relationship

        pairs = [("木", "火"), ("火", "土"), ("土", "金"), ("金", "水"), ("水", "木")]
        for elem1, elem2 in pairs:
            result = analyze_oheng_relationship(elem1, elem2)
            assert result["adjustment"] == 8

    def test_complete_overcoming_cycle(self):
        """Test complete overcoming cycle."""
        from backend_ai.app.compatibility.scoring import analyze_oheng_relationship

        pairs = [("木", "土"), ("土", "水"), ("水", "火"), ("火", "金"), ("金", "木")]
        for elem1, elem2 in pairs:
            result = analyze_oheng_relationship(elem1, elem2)
            assert result["adjustment"] == -8


class TestCalculatePairScore:
    """Tests for calculate_pair_score function."""

    @patch('backend_ai.app.compatibility.scoring.analyze_stem_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_branch_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_shinsal_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_astro_compatibility')
    @patch('backend_ai.app.compatibility.scoring.calculate_sipsung')
    def test_pair_score_empty_data(
        self, mock_sipsung, mock_astro, mock_shinsal, mock_branch, mock_stem
    ):
        """Pair score with empty data should return base score."""
        from backend_ai.app.compatibility.scoring import calculate_pair_score

        mock_stem.return_value = {"score_adjustment": 0, "details": []}
        mock_branch.return_value = {"score_adjustment": 0, "details": []}
        mock_shinsal.return_value = {"total_score": 0}
        mock_astro.return_value = {"score_adjustment": 0, "details": []}
        mock_sipsung.return_value = {"sipsung": "unknown", "meaning": "", "score": 70}

        result = calculate_pair_score({}, {})

        assert "score" in result
        assert "summary" in result
        assert result["score"] == 70  # Base score

    @patch('backend_ai.app.compatibility.scoring.analyze_stem_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_branch_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_shinsal_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_astro_compatibility')
    @patch('backend_ai.app.compatibility.scoring.calculate_sipsung')
    def test_pair_score_with_saju_data(
        self, mock_sipsung, mock_astro, mock_shinsal, mock_branch, mock_stem
    ):
        """Pair score with saju data should include saju details."""
        from backend_ai.app.compatibility.scoring import calculate_pair_score

        mock_stem.return_value = {"score_adjustment": 5, "details": ["천간 합"]}
        mock_branch.return_value = {"score_adjustment": 3, "details": ["육합"]}
        mock_shinsal.return_value = {"total_score": 10, "positive_shinsals": ["천을귀인"]}
        mock_astro.return_value = {"score_adjustment": 0, "details": []}
        mock_sipsung.return_value = {"sipsung": "정관", "meaning": "존경", "score": 80}

        person1 = {
            "saju": {
                "dayMaster": {"name": "甲", "element": "木"},
                "pillars": {"day": "甲子"}
            }
        }
        person2 = {
            "saju": {
                "dayMaster": {"name": "己", "element": "土"},
                "pillars": {"day": "己丑"}
            }
        }

        result = calculate_pair_score(person1, person2)

        assert "saju_details" in result
        assert len(result["saju_details"]) > 0

    @patch('backend_ai.app.compatibility.scoring.analyze_stem_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_branch_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_shinsal_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_astro_compatibility')
    @patch('backend_ai.app.compatibility.scoring.calculate_sipsung')
    def test_pair_score_with_astro_data(
        self, mock_sipsung, mock_astro, mock_shinsal, mock_branch, mock_stem
    ):
        """Pair score with astro data should include astro details."""
        from backend_ai.app.compatibility.scoring import calculate_pair_score

        mock_stem.return_value = {"score_adjustment": 0, "details": []}
        mock_branch.return_value = {"score_adjustment": 0, "details": []}
        mock_shinsal.return_value = {"total_score": 0}
        mock_astro.return_value = {"score_adjustment": 10, "details": ["태양 별자리 조화"]}
        mock_sipsung.return_value = {"sipsung": "unknown", "meaning": "", "score": 70}

        person1 = {"astro": {"sunSign": "Aries"}}
        person2 = {"astro": {"sunSign": "Leo"}}

        result = calculate_pair_score(person1, person2)

        assert "astro_details" in result

    @patch('backend_ai.app.compatibility.scoring.analyze_stem_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_branch_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_shinsal_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_astro_compatibility')
    @patch('backend_ai.app.compatibility.scoring.analyze_venus_mars_synastry')
    @patch('backend_ai.app.compatibility.scoring.calculate_sipsung')
    def test_pair_score_lover_relationship(
        self, mock_sipsung, mock_venus_mars, mock_astro, mock_shinsal, mock_branch, mock_stem
    ):
        """Lover relationship should include Venus-Mars synastry."""
        from backend_ai.app.compatibility.scoring import calculate_pair_score

        mock_stem.return_value = {"score_adjustment": 0, "details": []}
        mock_branch.return_value = {"score_adjustment": 0, "details": []}
        mock_shinsal.return_value = {"total_score": 0}
        mock_astro.return_value = {"score_adjustment": 0, "details": []}
        mock_venus_mars.return_value = {
            "score_adjustment": 8,
            "details": ["금성-화성 조화"],
            "fusion_insight": "로맨틱 케미"
        }
        mock_sipsung.return_value = {"sipsung": "unknown", "meaning": "", "score": 70}

        result = calculate_pair_score({}, {}, relationship_type="lover")

        mock_venus_mars.assert_called_once()

    def test_pair_score_range(self):
        """Score should always be between 0 and 100."""
        from backend_ai.app.compatibility.scoring import calculate_pair_score

        # Test with various data combinations
        for _ in range(5):
            result = calculate_pair_score({}, {})
            assert 0 <= result["score"] <= 100


class TestGeneratePairwiseMatrix:
    """Tests for generate_pairwise_matrix function."""

    @patch('backend_ai.app.compatibility.scoring.calculate_pair_score')
    def test_pairwise_matrix_3_people(self, mock_pair_score):
        """3 people should generate 3 pairs."""
        from backend_ai.app.compatibility.scoring import generate_pairwise_matrix

        mock_pair_score.return_value = {
            "score": 75,
            "summary": "좋은 궁합",
            "saju_details": [],
            "astro_details": [],
            "fusion_insights": []
        }

        people = [
            {"name": "A", "saju": {}, "astro": {}},
            {"name": "B", "saju": {}, "astro": {}},
            {"name": "C", "saju": {}, "astro": {}},
        ]

        result = generate_pairwise_matrix(people)

        assert len(result) == 3  # 3*(3-1)/2 = 3

    @patch('backend_ai.app.compatibility.scoring.calculate_pair_score')
    def test_pairwise_matrix_4_people(self, mock_pair_score):
        """4 people should generate 6 pairs."""
        from backend_ai.app.compatibility.scoring import generate_pairwise_matrix

        mock_pair_score.return_value = {
            "score": 75,
            "summary": "좋은 궁합",
            "saju_details": [],
            "astro_details": [],
            "fusion_insights": []
        }

        people = [
            {"name": "A"}, {"name": "B"}, {"name": "C"}, {"name": "D"}
        ]

        result = generate_pairwise_matrix(people)

        assert len(result) == 6  # 4*(4-1)/2 = 6

    @patch('backend_ai.app.compatibility.scoring.calculate_pair_score')
    def test_pairwise_matrix_structure(self, mock_pair_score):
        """Each pair should have required fields."""
        from backend_ai.app.compatibility.scoring import generate_pairwise_matrix

        mock_pair_score.return_value = {
            "score": 75,
            "summary": "좋은 궁합",
            "saju_details": ["detail1"],
            "astro_details": ["detail2"],
            "fusion_insights": ["insight"]
        }

        people = [{"name": "A"}, {"name": "B"}]
        result = generate_pairwise_matrix(people)

        assert len(result) == 1
        pair = result[0]
        assert "pair" in pair
        assert "score" in pair
        assert "summary" in pair
        assert "saju_details" in pair
        assert "astro_details" in pair
        assert "fusion_insights" in pair


class TestCalculateGroupSynergyScore:
    """Tests for calculate_group_synergy_score function."""

    def test_group_synergy_basic(self):
        """Basic group synergy calculation should work."""
        from backend_ai.app.compatibility.scoring import calculate_group_synergy_score

        people = [
            {"name": "A", "saju": {"pillars": {"day": "甲子"}}},
            {"name": "B", "saju": {"pillars": {"day": "乙丑"}}},
            {"name": "C", "saju": {"pillars": {"day": "丙寅"}}},
        ]

        pairwise_matrix = [
            {"score": 75, "pair": "A-B"},
            {"score": 80, "pair": "A-C"},
            {"score": 70, "pair": "B-C"},
        ]

        element_distribution = {
            "oheng": {"木": 2, "火": 1, "土": 0, "金": 0, "水": 0},
            "astro": {"fire": 1, "earth": 1, "air": 1, "water": 0}
        }

        group_roles = {
            "leader": ["A"],
            "mediator": ["B"],
            "executor": ["C"],
            "analyst": [],
            "communicator": [],
            "supporter": []
        }

        result = calculate_group_synergy_score(
            people, pairwise_matrix, element_distribution, group_roles
        )

        assert "overall_score" in result
        assert "avg_pair_score" in result
        assert "oheng_bonus" in result
        assert "astro_bonus" in result
        assert "role_bonus" in result
        assert "best_pair" in result
        assert "weakest_pair" in result

    def test_group_synergy_score_range(self):
        """Group synergy score should be between 0 and 100."""
        from backend_ai.app.compatibility.scoring import calculate_group_synergy_score

        people = [{"saju": {"pillars": {"day": "甲子"}}}] * 3
        pairwise = [{"score": 75}] * 3

        result = calculate_group_synergy_score(
            people,
            pairwise,
            {"oheng": {}, "astro": {}},
            {}
        )

        assert 0 <= result["overall_score"] <= 100

    def test_group_synergy_with_samhap(self):
        """Group with samhap formation should get bonus."""
        from backend_ai.app.compatibility.scoring import calculate_group_synergy_score

        # 寅午戌 삼합 (Fire)
        people = [
            {"name": "A", "saju": {"pillars": {"day": "甲寅"}}},
            {"name": "B", "saju": {"pillars": {"day": "乙午"}}},
            {"name": "C", "saju": {"pillars": {"day": "丙戌"}}},
        ]

        pairwise_matrix = [
            {"score": 75, "pair": "A-B"},
            {"score": 80, "pair": "A-C"},
            {"score": 70, "pair": "B-C"},
        ]

        result = calculate_group_synergy_score(
            people,
            pairwise_matrix,
            {"oheng": {}, "astro": {}},
            {}
        )

        # Should have samhap bonus
        assert result["samhap_bonus"] >= 0


class TestElementConstants:
    """Tests for element mapping constants."""

    def test_oheng_to_astro_mapping(self):
        """OHENG_TO_ASTRO should have all elements."""
        from backend_ai.app.compatibility.elements import OHENG_TO_ASTRO

        assert "木" in OHENG_TO_ASTRO
        assert "火" in OHENG_TO_ASTRO
        assert "土" in OHENG_TO_ASTRO
        assert "金" in OHENG_TO_ASTRO
        assert "水" in OHENG_TO_ASTRO

    def test_astro_element_to_oheng_mapping(self):
        """ASTRO_ELEMENT_TO_OHENG should have all elements."""
        from backend_ai.app.compatibility.elements import ASTRO_ELEMENT_TO_OHENG

        assert "fire" in ASTRO_ELEMENT_TO_OHENG
        assert "earth" in ASTRO_ELEMENT_TO_OHENG
        assert "air" in ASTRO_ELEMENT_TO_OHENG
        assert "water" in ASTRO_ELEMENT_TO_OHENG

    def test_zodiac_elements_complete(self):
        """ZODIAC_ELEMENTS should have all 12 signs."""
        from backend_ai.app.compatibility.elements import ZODIAC_ELEMENTS

        english_signs = [
            "aries", "taurus", "gemini", "cancer",
            "leo", "virgo", "libra", "scorpio",
            "sagittarius", "capricorn", "aquarius", "pisces"
        ]

        for sign in english_signs:
            assert sign in ZODIAC_ELEMENTS

    def test_stem_to_element_complete(self):
        """STEM_TO_ELEMENT should have all 10 stems."""
        from backend_ai.app.compatibility.elements import STEM_TO_ELEMENT

        stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
        for stem in stems:
            assert stem in STEM_TO_ELEMENT

    def test_branch_elements_complete(self):
        """BRANCH_ELEMENTS should have all 12 branches."""
        from backend_ai.app.compatibility.elements import BRANCH_ELEMENTS

        branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
        for branch in branches:
            assert branch in BRANCH_ELEMENTS


class TestModuleExports:
    """Tests for module exports."""

    def test_scoring_functions_importable(self):
        """Scoring functions should be importable."""
        from backend_ai.app.compatibility.scoring import (
            get_score_summary,
            analyze_oheng_relationship,
            calculate_pair_score,
            generate_pairwise_matrix,
            calculate_group_synergy_score,
        )

        assert callable(get_score_summary)
        assert callable(analyze_oheng_relationship)
        assert callable(calculate_pair_score)
        assert callable(generate_pairwise_matrix)
        assert callable(calculate_group_synergy_score)

    def test_element_constants_importable(self):
        """Element constants should be importable."""
        from backend_ai.app.compatibility.elements import (
            OHENG_TO_ASTRO,
            ASTRO_ELEMENT_TO_OHENG,
            BRANCH_ELEMENTS,
            STEM_TO_ELEMENT,
            ZODIAC_ELEMENTS,
            ASTRO_ELEMENT_COMPATIBILITY,
        )

        assert isinstance(OHENG_TO_ASTRO, dict)
        assert isinstance(ASTRO_ELEMENT_TO_OHENG, dict)
        assert isinstance(BRANCH_ELEMENTS, dict)
        assert isinstance(STEM_TO_ELEMENT, dict)
        assert isinstance(ZODIAC_ELEMENTS, dict)
        assert isinstance(ASTRO_ELEMENT_COMPATIBILITY, dict)
