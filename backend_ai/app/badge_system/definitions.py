# backend_ai/app/badge_system/definitions.py
"""
Badge definitions and data classes.
Contains BadgeRarity enum, BadgeDefinition dataclass, and all badge definitions.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum


class BadgeRarity(Enum):
    """Badge rarity levels."""
    COMMON = "common"          # Easy to get
    UNCOMMON = "uncommon"      # Some effort
    RARE = "rare"              # Dedicated users
    EPIC = "epic"              # Very dedicated
    LEGENDARY = "legendary"    # Top contributors


@dataclass
class BadgeDefinition:
    """Badge definition with unlock conditions."""
    id: str
    name_ko: str
    name_en: str
    description_ko: str
    description_en: str
    rarity: BadgeRarity
    image_path: str  # e.g., "/badges/first-voice.png"
    condition_type: str  # feedback_count, streak, theme_expert, etc.
    condition_value: int  # threshold to unlock
    points: int  # gamification points


@dataclass
class UserBadge:
    """User's earned badge."""
    badge_id: str
    earned_at: str
    progress_when_earned: int  # The value when badge was earned


@dataclass
class BadgeProgress:
    """User's progress toward badges."""
    feedback_count: int = 0
    positive_count: int = 0
    streak_days: int = 0
    last_feedback_date: Optional[str] = None
    text_feedback_count: int = 0
    theme_counts: Dict[str, int] = None
    service_counts: Dict[str, int] = None

    def __post_init__(self):
        if self.theme_counts is None:
            self.theme_counts = {}
        if self.service_counts is None:
            self.service_counts = {}


# ===============================================================
# BADGE DEFINITIONS
# ===============================================================
BADGES: Dict[str, BadgeDefinition] = {
    # === Feedback Count Badges ===
    "first_voice": BadgeDefinition(
        id="first_voice",
        name_ko="첫 피드백",
        name_en="First Feedback",
        description_ko="첫 번째 피드백을 남겼습니다",
        description_en="Left your first feedback",
        rarity=BadgeRarity.COMMON,
        image_path="/badges/first-voice.png",
        condition_type="feedback_count",
        condition_value=1,
        points=10,
    ),
    "feedback_apprentice": BadgeDefinition(
        id="feedback_apprentice",
        name_ko="피드백 견습생",
        name_en="Feedback Apprentice",
        description_ko="5개의 피드백을 남겼습니다",
        description_en="Left 5 feedbacks",
        rarity=BadgeRarity.COMMON,
        image_path="/badges/feedback-apprentice.png",
        condition_type="feedback_count",
        condition_value=5,
        points=25,
    ),
    "feedback_adept": BadgeDefinition(
        id="feedback_adept",
        name_ko="피드백 숙련자",
        name_en="Feedback Adept",
        description_ko="10개의 피드백을 남겼습니다",
        description_en="Left 10 feedbacks",
        rarity=BadgeRarity.UNCOMMON,
        image_path="/badges/feedback-adept.png",
        condition_type="feedback_count",
        condition_value=10,
        points=50,
    ),
    "feedback_master": BadgeDefinition(
        id="feedback_master",
        name_ko="피드백 마스터",
        name_en="Feedback Master",
        description_ko="25개의 피드백을 남겼습니다",
        description_en="Left 25 feedbacks",
        rarity=BadgeRarity.RARE,
        image_path="/badges/feedback-master.png",
        condition_type="feedback_count",
        condition_value=25,
        points=100,
    ),
    "feedback_sage": BadgeDefinition(
        id="feedback_sage",
        name_ko="피드백 고수",
        name_en="Feedback Sage",
        description_ko="50개의 피드백을 남겼습니다",
        description_en="Left 50 feedbacks",
        rarity=BadgeRarity.EPIC,
        image_path="/badges/feedback-sage.png",
        condition_type="feedback_count",
        condition_value=50,
        points=200,
    ),
    "oracle_guardian": BadgeDefinition(
        id="oracle_guardian",
        name_ko="피드백 레전드",
        name_en="Feedback Legend",
        description_ko="100개의 피드백을 남겼습니다",
        description_en="Left 100 feedbacks",
        rarity=BadgeRarity.LEGENDARY,
        image_path="/badges/oracle-guardian.png",
        condition_type="feedback_count",
        condition_value=100,
        points=500,
    ),

    # === Streak Badges (연속 피드백) ===
    "devoted_seeker_3": BadgeDefinition(
        id="devoted_seeker_3",
        name_ko="3일 연속",
        name_en="3-Day Streak",
        description_ko="3일 연속 피드백을 남겼습니다",
        description_en="Left feedback for 3 consecutive days",
        rarity=BadgeRarity.UNCOMMON,
        image_path="/badges/devoted-seeker.png",
        condition_type="streak_days",
        condition_value=3,
        points=30,
    ),
    "weekly_oracle": BadgeDefinition(
        id="weekly_oracle",
        name_ko="일주일 연속",
        name_en="Weekly Streak",
        description_ko="7일 연속 피드백을 남겼습니다",
        description_en="Left feedback for 7 consecutive days",
        rarity=BadgeRarity.RARE,
        image_path="/badges/weekly-oracle.png",
        condition_type="streak_days",
        condition_value=7,
        points=75,
    ),
    "monthly_mystic": BadgeDefinition(
        id="monthly_mystic",
        name_ko="한달 연속",
        name_en="Monthly Streak",
        description_ko="30일 연속 피드백을 남겼습니다",
        description_en="Left feedback for 30 consecutive days",
        rarity=BadgeRarity.LEGENDARY,
        image_path="/badges/monthly-mystic.png",
        condition_type="streak_days",
        condition_value=30,
        points=300,
    ),

    # === Positive Feedback Badges ===
    "positive_soul": BadgeDefinition(
        id="positive_soul",
        name_ko="좋아요 10개",
        name_en="10 Likes",
        description_ko="10개의 좋아요(4점 이상)를 남겼습니다",
        description_en="Left 10 positive feedbacks (4+ stars)",
        rarity=BadgeRarity.UNCOMMON,
        image_path="/badges/positive-soul.png",
        condition_type="positive_count",
        condition_value=10,
        points=40,
    ),
    "light_bringer": BadgeDefinition(
        id="light_bringer",
        name_ko="좋아요 25개",
        name_en="25 Likes",
        description_ko="25개의 좋아요를 남겼습니다",
        description_en="Left 25 positive feedbacks",
        rarity=BadgeRarity.RARE,
        image_path="/badges/light-bringer.png",
        condition_type="positive_count",
        condition_value=25,
        points=100,
    ),

    # === Theme Expert Badges ===
    "love_oracle": BadgeDefinition(
        id="love_oracle",
        name_ko="연애 전문가",
        name_en="Love Expert",
        description_ko="연애 테마에서 10개의 피드백을 남겼습니다",
        description_en="Left 10 feedbacks on love theme",
        rarity=BadgeRarity.UNCOMMON,
        image_path="/badges/love-oracle.png",
        condition_type="theme_count:love",
        condition_value=10,
        points=50,
    ),
    "career_oracle": BadgeDefinition(
        id="career_oracle",
        name_ko="커리어 전문가",
        name_en="Career Expert",
        description_ko="커리어 테마에서 10개의 피드백을 남겼습니다",
        description_en="Left 10 feedbacks on career theme",
        rarity=BadgeRarity.UNCOMMON,
        image_path="/badges/career-oracle.png",
        condition_type="theme_count:career",
        condition_value=10,
        points=50,
    ),
    "life_oracle": BadgeDefinition(
        id="life_oracle",
        name_ko="인생 전문가",
        name_en="Life Expert",
        description_ko="인생 테마에서 10개의 피드백을 남겼습니다",
        description_en="Left 10 feedbacks on life_path theme",
        rarity=BadgeRarity.UNCOMMON,
        image_path="/badges/life-oracle.png",
        condition_type="theme_count:life_path",
        condition_value=10,
        points=50,
    ),

    # === Special Badges ===
    "early_adopter": BadgeDefinition(
        id="early_adopter",
        name_ko="얼리 어답터",
        name_en="Early Adopter",
        description_ko="서비스 초기에 피드백을 남긴 선구자",
        description_en="Pioneer who left feedback in early days",
        rarity=BadgeRarity.EPIC,
        image_path="/badges/early-adopter.png",
        condition_type="special:early_adopter",
        condition_value=1,
        points=150,
    ),
    "detailed_reviewer": BadgeDefinition(
        id="detailed_reviewer",
        name_ko="상세 리뷰어",
        name_en="Detailed Reviewer",
        description_ko="10개의 텍스트 피드백을 남겼습니다",
        description_en="Left 10 feedbacks with text comments",
        rarity=BadgeRarity.RARE,
        image_path="/badges/detailed-reviewer.png",
        condition_type="text_feedback_count",
        condition_value=10,
        points=75,
    ),
    "multi_service": BadgeDefinition(
        id="multi_service",
        name_ko="만능 탐험가",
        name_en="Multi-Service Explorer",
        description_ko="4개 이상의 서비스에서 피드백을 남겼습니다",
        description_en="Left feedback on 4+ different services",
        rarity=BadgeRarity.RARE,
        image_path="/badges/multi-service.png",
        condition_type="service_variety",
        condition_value=4,
        points=80,
    ),
}
