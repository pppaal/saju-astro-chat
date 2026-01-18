# backend_ai/app/badge_system/prompts.py
"""
Midjourney prompts for generating badge images.
Contains all badge image generation prompts.
"""

from typing import Dict


MIDJOURNEY_PROMPTS: Dict[str, str] = {
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


def get_prompt_for_badge(badge_id: str) -> str:
    """Get Midjourney prompt for a specific badge."""
    return MIDJOURNEY_PROMPTS.get(badge_id, "")
