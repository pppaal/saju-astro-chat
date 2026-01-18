# backend_ai/app/badge_system.py
"""
Badge System - Backward Compatibility Shim
==========================================
This module has been refactored into the badge_system/ package.
This file provides backward compatibility for existing imports.

New imports should use:
    from backend_ai.app.badge_system import get_badge_system, BadgeDefinition, BADGES
"""

# Re-export everything from the new package
from backend_ai.app.badge_system import (
    # Data classes
    BadgeRarity,
    BadgeDefinition,
    UserBadge,
    BadgeProgress,
    # Badge definitions
    BADGES,
    # Prompts
    MIDJOURNEY_PROMPTS,
    get_midjourney_prompts,
    # System
    BadgeSystem,
    get_badge_system,
)

__all__ = [
    "BadgeRarity",
    "BadgeDefinition",
    "UserBadge",
    "BadgeProgress",
    "BADGES",
    "MIDJOURNEY_PROMPTS",
    "get_midjourney_prompts",
    "BadgeSystem",
    "get_badge_system",
]
