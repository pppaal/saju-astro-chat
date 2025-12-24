# backend_ai/app/badge_system.py
"""
Badge Reward System for Feedback Participation
===============================================
Awards badges to users who participate in the RLHF feedback loop.
Gamification to encourage more feedback and improve the Oracle.

Badge images should be placed in: public/badges/
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

# Storage backend (same as user_memory)
try:
    import redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    _redis_client.ping()
    HAS_REDIS = True
except Exception:
    HAS_REDIS = False
    _redis_client = None

_badge_store: Dict[str, Any] = {}


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


class BadgeSystem:
    """
    Badge management system.

    Tracks user progress and awards badges for feedback participation.
    """

    def __init__(self):
        self._prefix = "badges"

    # ===============================================================
    # STORAGE
    # ===============================================================
    def _store(self, key: str, data: Any, ttl_days: int = 365):
        full_key = f"{self._prefix}:{key}"
        json_data = json.dumps(data, ensure_ascii=False, default=str)

        if HAS_REDIS:
            _redis_client.setex(full_key, timedelta(days=ttl_days), json_data)
        else:
            _badge_store[full_key] = {
                "data": json_data,
                "expires": datetime.now() + timedelta(days=ttl_days)
            }

    def _retrieve(self, key: str) -> Optional[Any]:
        full_key = f"{self._prefix}:{key}"

        if HAS_REDIS:
            data = _redis_client.get(full_key)
            return json.loads(data) if data else None
        else:
            entry = _badge_store.get(full_key)
            if entry and entry["expires"] > datetime.now():
                return json.loads(entry["data"])
            return None

    # ===============================================================
    # PROGRESS TRACKING
    # ===============================================================
    def get_progress(self, user_id: str) -> BadgeProgress:
        """Get user's badge progress."""
        data = self._retrieve(f"progress:{user_id}")
        if data:
            return BadgeProgress(**data)
        return BadgeProgress()

    def _save_progress(self, user_id: str, progress: BadgeProgress):
        """Save user's badge progress."""
        self._store(f"progress:{user_id}", asdict(progress))

    def get_user_badges(self, user_id: str) -> List[UserBadge]:
        """Get user's earned badges."""
        data = self._retrieve(f"earned:{user_id}")
        if data:
            return [UserBadge(**b) for b in data]
        return []

    def _save_user_badges(self, user_id: str, badges: List[UserBadge]):
        """Save user's earned badges."""
        self._store(f"earned:{user_id}", [asdict(b) for b in badges])

    # ===============================================================
    # FEEDBACK PROCESSING
    # ===============================================================
    def process_feedback(
        self,
        user_id: str,
        rating: int,
        theme: str,
        service_type: str,
        feedback_text: str = "",
    ) -> List[BadgeDefinition]:
        """
        Process a feedback event and award any new badges.

        Returns list of newly earned badges.
        """
        progress = self.get_progress(user_id)
        earned_badges = self.get_user_badges(user_id)
        earned_ids = {b.badge_id for b in earned_badges}

        today = datetime.utcnow().date().isoformat()

        # Update progress
        progress.feedback_count += 1

        if rating >= 4:
            progress.positive_count += 1

        if feedback_text and len(feedback_text.strip()) > 10:
            progress.text_feedback_count += 1

        # Update streak
        if progress.last_feedback_date:
            last_date = datetime.fromisoformat(progress.last_feedback_date).date()
            today_date = datetime.fromisoformat(today)
            diff = (today_date - last_date).days

            if diff == 1:
                progress.streak_days += 1
            elif diff > 1:
                progress.streak_days = 1  # Reset streak
            # diff == 0: same day, don't change streak
        else:
            progress.streak_days = 1

        progress.last_feedback_date = today

        # Update theme counts
        if theme:
            progress.theme_counts[theme] = progress.theme_counts.get(theme, 0) + 1

        # Update service counts
        if service_type:
            progress.service_counts[service_type] = progress.service_counts.get(service_type, 0) + 1

        # Save progress
        self._save_progress(user_id, progress)

        # Check for new badges
        new_badges = []

        for badge_id, badge in BADGES.items():
            if badge_id in earned_ids:
                continue  # Already earned

            if self._check_badge_condition(badge, progress):
                # Award badge!
                user_badge = UserBadge(
                    badge_id=badge_id,
                    earned_at=datetime.utcnow().isoformat(),
                    progress_when_earned=self._get_condition_value(badge, progress),
                )
                earned_badges.append(user_badge)
                new_badges.append(badge)
                print(f"[BadgeSystem] User {user_id[:8]}... earned badge: {badge.name_en}")

        # Save earned badges
        if new_badges:
            self._save_user_badges(user_id, earned_badges)

        return new_badges

    def _check_badge_condition(self, badge: BadgeDefinition, progress: BadgeProgress) -> bool:
        """Check if a badge condition is met."""
        cond_type = badge.condition_type
        cond_value = badge.condition_value

        if cond_type == "feedback_count":
            return progress.feedback_count >= cond_value

        elif cond_type == "positive_count":
            return progress.positive_count >= cond_value

        elif cond_type == "streak_days":
            return progress.streak_days >= cond_value

        elif cond_type == "text_feedback_count":
            return progress.text_feedback_count >= cond_value

        elif cond_type == "service_variety":
            return len(progress.service_counts) >= cond_value

        elif cond_type.startswith("theme_count:"):
            theme = cond_type.split(":")[1]
            return progress.theme_counts.get(theme, 0) >= cond_value

        elif cond_type == "special:early_adopter":
            # Special condition: first 1000 users
            # This should be checked differently in production
            return progress.feedback_count == 1  # First feedback = early adopter

        return False

    def _get_condition_value(self, badge: BadgeDefinition, progress: BadgeProgress) -> int:
        """Get current value for a badge condition."""
        cond_type = badge.condition_type

        if cond_type == "feedback_count":
            return progress.feedback_count
        elif cond_type == "positive_count":
            return progress.positive_count
        elif cond_type == "streak_days":
            return progress.streak_days
        elif cond_type == "text_feedback_count":
            return progress.text_feedback_count
        elif cond_type == "service_variety":
            return len(progress.service_counts)
        elif cond_type.startswith("theme_count:"):
            theme = cond_type.split(":")[1]
            return progress.theme_counts.get(theme, 0)

        return 0

    # ===============================================================
    # API HELPERS
    # ===============================================================
    def get_all_badges(self, locale: str = "ko") -> List[Dict]:
        """Get all badge definitions."""
        result = []
        for badge in BADGES.values():
            result.append({
                "id": badge.id,
                "name": badge.name_ko if locale == "ko" else badge.name_en,
                "description": badge.description_ko if locale == "ko" else badge.description_en,
                "rarity": badge.rarity.value,
                "image_path": badge.image_path,
                "points": badge.points,
                "condition_type": badge.condition_type,
                "condition_value": badge.condition_value,
            })
        return result

    def get_user_badge_summary(self, user_id: str, locale: str = "ko") -> Dict:
        """Get comprehensive badge summary for a user."""
        progress = self.get_progress(user_id)
        earned_badges = self.get_user_badges(user_id)
        earned_ids = {b.badge_id for b in earned_badges}

        total_points = sum(
            BADGES[b.badge_id].points
            for b in earned_badges
            if b.badge_id in BADGES
        )

        # Build earned badges list
        earned_list = []
        for ub in earned_badges:
            if ub.badge_id in BADGES:
                badge = BADGES[ub.badge_id]
                earned_list.append({
                    "id": badge.id,
                    "name": badge.name_ko if locale == "ko" else badge.name_en,
                    "description": badge.description_ko if locale == "ko" else badge.description_en,
                    "rarity": badge.rarity.value,
                    "image_path": badge.image_path,
                    "points": badge.points,
                    "earned_at": ub.earned_at,
                })

        # Build next badges (closest to earning)
        next_badges = []
        for badge_id, badge in BADGES.items():
            if badge_id in earned_ids:
                continue

            current = self._get_condition_value(badge, progress)
            target = badge.condition_value
            percent = min(100, int(current / target * 100)) if target > 0 else 0

            next_badges.append({
                "id": badge.id,
                "name": badge.name_ko if locale == "ko" else badge.name_en,
                "rarity": badge.rarity.value,
                "image_path": badge.image_path,
                "points": badge.points,
                "progress_current": current,
                "progress_target": target,
                "progress_percent": percent,
            })

        # Sort by progress percentage (closest to earning first)
        next_badges.sort(key=lambda x: x["progress_percent"], reverse=True)

        return {
            "user_id": user_id,
            "total_points": total_points,
            "badges_earned": len(earned_badges),
            "badges_total": len(BADGES),
            "earned_badges": earned_list,
            "next_badges": next_badges[:5],  # Top 5 closest
            "progress": {
                "feedback_count": progress.feedback_count,
                "positive_count": progress.positive_count,
                "streak_days": progress.streak_days,
                "text_feedback_count": progress.text_feedback_count,
                "services_used": len(progress.service_counts),
            },
        }


# ===============================================================
# SINGLETON
# ===============================================================
_badge_system_instance: Optional[BadgeSystem] = None


def get_badge_system() -> BadgeSystem:
    """Get singleton BadgeSystem instance."""
    global _badge_system_instance
    if _badge_system_instance is None:
        _badge_system_instance = BadgeSystem()
    return _badge_system_instance


# ===============================================================
# MIDJOURNEY PROMPTS FOR BADGE IMAGES
# ===============================================================
MIDJOURNEY_PROMPTS = {
    "first_voice": """
A mystical golden badge with an open mouth speaking cosmic energy,
glowing oracle eye in center, ethereal light rays,
fantasy game achievement icon style,
dark purple gradient background,
metallic gold trim, magical sparkles,
--ar 1:1 --s 750 --v 6
""",

    "feedback_apprentice": """
A bronze circular badge with an apprentice wizard holding a glowing scroll,
mystical runes around the edge,
fantasy RPG achievement style,
warm amber tones, magical particles,
dark mystical background,
--ar 1:1 --s 750 --v 6
""",

    "feedback_adept": """
A silver badge with a wise sage meditating under starlight,
celestial symbols orbiting, crystal ball glowing,
fantasy achievement icon, polished silver metal texture,
deep blue cosmic background,
--ar 1:1 --s 750 --v 6
""",

    "feedback_master": """
A golden badge with a master oracle on a throne of wisdom,
ancient books and scrolls floating, third eye glowing,
epic fantasy achievement style, ornate gold details,
purple and gold color scheme, magical aura,
--ar 1:1 --s 750 --v 6
""",

    "feedback_sage": """
A platinum badge with an enlightened sage surrounded by cosmic knowledge,
galaxies and constellations swirling, all-seeing eye,
legendary achievement icon style, platinum and diamond textures,
deep space background with nebula,
--ar 1:1 --s 750 --v 6
""",

    "oracle_guardian": """
A legendary diamond badge with a divine guardian protecting an oracle temple,
wings of light, celestial armor, sacred geometry patterns,
ultimate achievement icon, rainbow prismatic effects,
heavenly golden light background,
--ar 1:1 --s 750 --v 6
""",

    "devoted_seeker_3": """
A badge with a determined seeker walking a mystical path,
three glowing waypoints behind them, compass rose,
adventure achievement style, bronze and turquoise,
misty forest background,
--ar 1:1 --s 750 --v 6
""",

    "weekly_oracle": """
A badge with seven glowing moons in a circle,
oracle crystal in center, weekly calendar motif,
rare achievement style, silver and moonlight blue,
starry night background,
--ar 1:1 --s 750 --v 6
""",

    "monthly_mystic": """
A legendary badge with a mystic figure holding a moon cycle,
30 phases of the moon spiraling, cosmic calendar,
ultimate achievement icon, platinum and lunar silver,
deep space with full moon background,
--ar 1:1 --s 750 --v 6
""",

    "positive_soul": """
A radiant badge with a heart made of pure light,
positive energy rays, smiling soul essence,
uplifting achievement style, warm gold and pink,
sunrise gradient background,
--ar 1:1 --s 750 --v 6
""",

    "light_bringer": """
An epic badge with a figure carrying a lantern of eternal light,
dispelling darkness, hope and positivity symbols,
heroic achievement icon, golden and white radiance,
dawn breaking through clouds background,
--ar 1:1 --s 750 --v 6
""",

    "love_oracle": """
A romantic badge with intertwined hearts and cupid's arrow,
rose petals floating, love constellation,
love theme achievement, rose gold and ruby red,
dreamy pink clouds background,
--ar 1:1 --s 750 --v 6
""",

    "career_oracle": """
A professional badge with a golden ladder reaching stars,
briefcase with wings, success crown,
career achievement style, royal blue and gold,
cityscape with rising sun background,
--ar 1:1 --s 750 --v 6
""",

    "life_oracle": """
A profound badge with the tree of life,
roots in earth, branches in stars, life cycle symbols,
wisdom achievement icon, green and cosmic purple,
universe meets nature background,
--ar 1:1 --s 750 --v 6
""",

    "early_adopter": """
A vintage-style badge with a pioneer astronaut planting a flag,
"First!" ribbon, rocket ship, stars,
exclusive achievement icon, retro gold and space blue,
constellation map background,
--ar 1:1 --s 750 --v 6
""",

    "detailed_reviewer": """
A scholarly badge with a quill writing on magical parchment,
detailed scrollwork, magnifying glass, ink bottle,
reviewer achievement style, antique bronze and cream,
old library background,
--ar 1:1 --s 750 --v 6
""",

    "multi_service": """
A versatile badge with four elemental symbols combined,
tarot card, crystal ball, zodiac wheel, I Ching coins,
explorer achievement icon, rainbow metallic,
cosmic portal background,
--ar 1:1 --s 750 --v 6
""",
}


def get_midjourney_prompts() -> Dict[str, str]:
    """Get Midjourney prompts for all badges."""
    return MIDJOURNEY_PROMPTS


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    print("Testing Badge System...")

    bs = get_badge_system()

    # Simulate feedbacks
    user_id = "test_user_123"

    for i in range(12):
        rating = 5 if i % 2 == 0 else 3
        theme = "love" if i < 5 else "career"

        new_badges = bs.process_feedback(
            user_id=user_id,
            rating=rating,
            theme=theme,
            service_type="fusion",
            feedback_text="Great reading!" if i < 3 else "",
        )

        if new_badges:
            for b in new_badges:
                print(f"  NEW BADGE: {b.name_en} ({b.rarity.value})")

    # Get summary
    summary = bs.get_user_badge_summary(user_id, "ko")
    print(f"\nBadge Summary:")
    print(f"  Total Points: {summary['total_points']}")
    print(f"  Badges Earned: {summary['badges_earned']}/{summary['badges_total']}")
    print(f"\nEarned Badges:")
    for b in summary['earned_badges']:
        print(f"  - {b['name']} ({b['rarity']})")
    print(f"\nNext Badges:")
    for b in summary['next_badges'][:3]:
        print(f"  - {b['name']}: {b['progress_current']}/{b['progress_target']} ({b['progress_percent']}%)")

    # Print Midjourney prompts
    print("\n\n=== MIDJOURNEY PROMPTS ===")
    for badge_id, prompt in MIDJOURNEY_PROMPTS.items():
        print(f"\n[{badge_id}]")
        print(prompt.strip())
