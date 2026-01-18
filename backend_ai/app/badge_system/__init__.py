# backend_ai/app/badge_system/__init__.py
"""
Badge System Package
====================
Gamification badge system for RLHF feedback participation.

Package Structure:
- definitions.py: Badge definitions, dataclasses (BadgeRarity, BadgeDefinition, etc.)
- prompts.py: Midjourney prompts for badge image generation
- system.py: BadgeSystem class with storage, progress tracking, feedback processing

Usage:
    from backend_ai.app.badge_system import get_badge_system, BadgeDefinition, BADGES
"""

from .definitions import (
    BadgeRarity,
    BadgeDefinition,
    UserBadge,
    BadgeProgress,
    BADGES,
)

from .prompts import (
    MIDJOURNEY_PROMPTS,
    get_midjourney_prompts,
    get_prompt_for_badge,
)

from .system import (
    BadgeSystem,
    get_badge_system,
)

__all__ = [
    # Data classes
    "BadgeRarity",
    "BadgeDefinition",
    "UserBadge",
    "BadgeProgress",
    # Badge definitions
    "BADGES",
    # Prompts
    "MIDJOURNEY_PROMPTS",
    "get_midjourney_prompts",
    "get_prompt_for_badge",
    # System
    "BadgeSystem",
    "get_badge_system",
]
