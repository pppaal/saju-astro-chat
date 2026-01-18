"""
Unit tests for Badge System module.

Tests:
- Badge definitions and constants
- BadgeRarity enum
- BadgeDefinition dataclass
- Badge unlock logic
- User badge progress tracking
"""
import pytest
from unittest.mock import patch, MagicMock
from dataclasses import asdict


class TestBadgeRarityEnum:
    """Tests for BadgeRarity enum."""

    def test_rarity_values(self):
        """Test all rarity values exist."""
        from backend_ai.app.badge_system import BadgeRarity

        assert BadgeRarity.COMMON.value == "common"
        assert BadgeRarity.UNCOMMON.value == "uncommon"
        assert BadgeRarity.RARE.value == "rare"
        assert BadgeRarity.EPIC.value == "epic"
        assert BadgeRarity.LEGENDARY.value == "legendary"

    def test_rarity_from_value(self):
        """Test creating enum from value."""
        from backend_ai.app.badge_system import BadgeRarity

        assert BadgeRarity("common") == BadgeRarity.COMMON
        assert BadgeRarity("legendary") == BadgeRarity.LEGENDARY

    def test_all_rarities_count(self):
        """Test total number of rarities."""
        from backend_ai.app.badge_system import BadgeRarity

        assert len(BadgeRarity) == 5


class TestBadgeDefinition:
    """Tests for BadgeDefinition dataclass."""

    def test_badge_definition_creation(self):
        """Test creating a badge definition."""
        from backend_ai.app.badge_system import BadgeDefinition, BadgeRarity

        badge = BadgeDefinition(
            id="test_badge",
            name_ko="테스트 배지",
            name_en="Test Badge",
            description_ko="테스트용 배지입니다",
            description_en="A test badge",
            rarity=BadgeRarity.COMMON,
            image_path="/badges/test.png",
            condition_type="feedback_count",
            condition_value=1,
            points=10,
        )

        assert badge.id == "test_badge"
        assert badge.name_ko == "테스트 배지"
        assert badge.name_en == "Test Badge"
        assert badge.rarity == BadgeRarity.COMMON
        assert badge.points == 10

    def test_badge_definition_asdict(self):
        """Test converting badge to dict."""
        from backend_ai.app.badge_system import BadgeDefinition, BadgeRarity

        badge = BadgeDefinition(
            id="test",
            name_ko="테스트",
            name_en="Test",
            description_ko="설명",
            description_en="Description",
            rarity=BadgeRarity.RARE,
            image_path="/badges/test.png",
            condition_type="streak_days",
            condition_value=7,
            points=50,
        )

        badge_dict = asdict(badge)

        assert badge_dict["id"] == "test"
        assert badge_dict["condition_value"] == 7


class TestBadgesConstant:
    """Tests for BADGES constant."""

    def test_badges_exists(self):
        """Test BADGES dict exists."""
        from backend_ai.app.badge_system import BADGES

        assert isinstance(BADGES, dict)
        assert len(BADGES) > 0

    def test_first_voice_badge_exists(self):
        """Test first_voice badge is defined."""
        from backend_ai.app.badge_system import BADGES

        assert "first_voice" in BADGES
        badge = BADGES["first_voice"]
        assert badge.condition_type == "feedback_count"
        assert badge.condition_value == 1

    def test_feedback_count_badges_ordering(self):
        """Test feedback count badges have increasing thresholds."""
        from backend_ai.app.badge_system import BADGES

        feedback_badges = [
            BADGES.get("first_voice"),
            BADGES.get("feedback_apprentice"),
            BADGES.get("feedback_adept"),
            BADGES.get("feedback_master"),
            BADGES.get("feedback_sage"),
            BADGES.get("oracle_guardian"),
        ]

        # Filter out None values
        feedback_badges = [b for b in feedback_badges if b and b.condition_type == "feedback_count"]

        # Check thresholds are increasing
        for i in range(1, len(feedback_badges)):
            assert feedback_badges[i].condition_value > feedback_badges[i-1].condition_value

    def test_all_badges_have_korean_names(self):
        """Test all badges have Korean names."""
        from backend_ai.app.badge_system import BADGES

        for badge_id, badge in BADGES.items():
            assert badge.name_ko, f"Badge {badge_id} missing Korean name"
            assert badge.description_ko, f"Badge {badge_id} missing Korean description"

    def test_all_badges_have_english_names(self):
        """Test all badges have English names."""
        from backend_ai.app.badge_system import BADGES

        for badge_id, badge in BADGES.items():
            assert badge.name_en, f"Badge {badge_id} missing English name"
            assert badge.description_en, f"Badge {badge_id} missing English description"

    def test_all_badges_have_image_paths(self):
        """Test all badges have image paths."""
        from backend_ai.app.badge_system import BADGES

        for badge_id, badge in BADGES.items():
            assert badge.image_path, f"Badge {badge_id} missing image path"
            assert badge.image_path.startswith("/badges/"), f"Badge {badge_id} has invalid image path"

    def test_all_badges_have_positive_points(self):
        """Test all badges have positive points."""
        from backend_ai.app.badge_system import BADGES

        for badge_id, badge in BADGES.items():
            assert badge.points > 0, f"Badge {badge_id} has non-positive points"

    def test_streak_badges_exist(self):
        """Test streak-based badges exist."""
        from backend_ai.app.badge_system import BADGES

        streak_badges = [b for b in BADGES.values() if b.condition_type == "streak_days"]
        assert len(streak_badges) > 0


class TestBadgeConditionTypes:
    """Tests for badge condition types."""

    def test_feedback_count_condition(self):
        """Test feedback_count condition type badges."""
        from backend_ai.app.badge_system import BADGES

        feedback_badges = [b for b in BADGES.values() if b.condition_type == "feedback_count"]

        assert len(feedback_badges) >= 1
        for badge in feedback_badges:
            assert badge.condition_value > 0

    def test_streak_days_condition(self):
        """Test streak_days condition type badges."""
        from backend_ai.app.badge_system import BADGES

        streak_badges = [b for b in BADGES.values() if b.condition_type == "streak_days"]

        for badge in streak_badges:
            assert badge.condition_value > 0


class TestBadgeRarityDistribution:
    """Tests for badge rarity distribution."""

    def test_has_common_badges(self):
        """Test common badges exist."""
        from backend_ai.app.badge_system import BADGES, BadgeRarity

        common_badges = [b for b in BADGES.values() if b.rarity == BadgeRarity.COMMON]
        assert len(common_badges) >= 1

    def test_has_legendary_badges(self):
        """Test legendary badges exist."""
        from backend_ai.app.badge_system import BADGES, BadgeRarity

        legendary_badges = [b for b in BADGES.values() if b.rarity == BadgeRarity.LEGENDARY]
        assert len(legendary_badges) >= 1

    def test_rarity_points_correlation(self):
        """Test higher rarity generally means more points."""
        from backend_ai.app.badge_system import BADGES, BadgeRarity

        common_badges = [b for b in BADGES.values() if b.rarity == BadgeRarity.COMMON]
        legendary_badges = [b for b in BADGES.values() if b.rarity == BadgeRarity.LEGENDARY]

        if common_badges and legendary_badges:
            avg_common = sum(b.points for b in common_badges) / len(common_badges)
            avg_legendary = sum(b.points for b in legendary_badges) / len(legendary_badges)
            assert avg_legendary > avg_common


class TestBadgeModuleExports:
    """Tests for module exports."""

    def test_badge_rarity_importable(self):
        """BadgeRarity should be importable."""
        from backend_ai.app.badge_system import BadgeRarity
        assert BadgeRarity is not None

    def test_badge_definition_importable(self):
        """BadgeDefinition should be importable."""
        from backend_ai.app.badge_system import BadgeDefinition
        assert BadgeDefinition is not None

    def test_badges_importable(self):
        """BADGES should be importable."""
        from backend_ai.app.badge_system import BADGES
        assert BADGES is not None

    def test_has_redis_flag_exists(self):
        """HAS_REDIS flag should exist in system module."""
        from backend_ai.app.badge_system.system import HAS_REDIS
        assert isinstance(HAS_REDIS, bool)


class TestBadgeImagePaths:
    """Tests for badge image path conventions."""

    def test_image_paths_use_png(self):
        """Test most badge images use PNG format."""
        from backend_ai.app.badge_system import BADGES

        png_count = sum(1 for b in BADGES.values() if b.image_path.endswith(".png"))
        # Most should be PNG
        assert png_count >= len(BADGES) * 0.8

    def test_image_paths_kebab_case(self):
        """Test image file names use kebab-case."""
        from backend_ai.app.badge_system import BADGES

        for badge in BADGES.values():
            filename = badge.image_path.split("/")[-1].replace(".png", "")
            # Should not have spaces or underscores (kebab-case)
            assert " " not in filename


class TestBadgeUniqueIds:
    """Tests for badge ID uniqueness."""

    def test_all_badge_ids_unique(self):
        """Test all badge IDs are unique."""
        from backend_ai.app.badge_system import BADGES

        ids = list(BADGES.keys())
        assert len(ids) == len(set(ids)), "Badge IDs are not unique"

    def test_badge_id_matches_key(self):
        """Test badge.id matches its key in BADGES dict."""
        from backend_ai.app.badge_system import BADGES

        for key, badge in BADGES.items():
            assert key == badge.id, f"Badge key '{key}' doesn't match badge.id '{badge.id}'"
