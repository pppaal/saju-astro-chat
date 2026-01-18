# backend_ai/app/badge_system/system.py
"""
Badge management system core logic.
Contains BadgeSystem class with storage, progress tracking, and feedback processing.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import asdict

from .definitions import (
    BadgeDefinition,
    BadgeRarity,
    UserBadge,
    BadgeProgress,
    BADGES,
)

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
