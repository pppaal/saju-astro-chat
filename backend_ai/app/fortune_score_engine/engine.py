# backend_ai/app/fortune_score_engine/engine.py
"""
Fortune Score Engine main class.
Contains FortuneScoreEngine with cross-reference bonus calculation.
"""

import os
import json
from datetime import datetime
from typing import Dict, Optional

from .dataclass import ScoreBreakdown
from .constants import (
    ELEMENTS,
    ZODIAC_ELEMENTS,
    BRANCH_ZODIAC,
    DM_ELEMENT_WESTERN,
)
from .saju_scoring import SajuScoringMixin
from .astro_scoring import AstroScoringMixin


# Load cross-reference mappings
FUSION_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data", "graph", "fusion"
)


class FortuneScoreEngine(SajuScoringMixin, AstroScoringMixin):
    """
    Comprehensive fortune scoring engine using ALL saju + astrology data.
    """

    # Re-export constants for backward compatibility
    ELEMENTS = ELEMENTS
    ZODIAC_ELEMENTS = ZODIAC_ELEMENTS
    BRANCH_ZODIAC = BRANCH_ZODIAC

    def __init__(self):
        self.cross_mappings = self._load_cross_mappings()

    def _load_cross_mappings(self) -> Dict:
        """Load all fusion cross-reference JSON files"""
        mappings = {}
        if os.path.exists(FUSION_DATA_PATH):
            for filename in os.listdir(FUSION_DATA_PATH):
                if filename.endswith(".json"):
                    key = filename.replace(".json", "")
                    try:
                        with open(os.path.join(FUSION_DATA_PATH, filename), "r", encoding="utf-8") as f:
                            mappings[key] = json.load(f)
                    except Exception as e:
                        print(f"[FortuneScore] Error loading {filename}: {e}")
        print(f"[FortuneScore] Loaded {len(mappings)} cross-reference mappings")
        return mappings

    def calculate_score(
        self,
        saju: Dict,
        astro: Dict,
        current_time: Optional[datetime] = None
    ) -> ScoreBreakdown:
        """
        Calculate comprehensive fortune score from saju + astrology data.

        Args:
            saju: Full saju data including pillars, unse, advancedAnalysis
            astro: Full astrology data including planets, transits, electional
            current_time: Current datetime for real-time calculations

        Returns:
            ScoreBreakdown with detailed component scores
        """
        if current_time is None:
            current_time = datetime.now()

        breakdown = ScoreBreakdown()

        # =====================================================
        # SAJU SCORING (max 50 points)
        # =====================================================

        # 1. 일진 (Daily Pillar) compatibility (0-12)
        breakdown.saju_iljin = self._score_iljin(saju, current_time)

        # 2. 월운 (Monthly Luck) flow (0-10)
        breakdown.saju_wolun = self._score_wolun(saju, current_time)

        # 3. 용신 (Yongsin) activation (0-10)
        breakdown.saju_yongsin = self._score_yongsin(saju, current_time)

        # 4. 격국 (Geokguk) energy (0-8)
        breakdown.saju_geokguk = self._score_geokguk(saju)

        # 5. 십신 (Ten Gods) balance (0-5)
        breakdown.saju_sibsin = self._score_sibsin(saju)

        # 6. 형충회합 (Interactions) (−5 to +5)
        breakdown.saju_hyeongchung = self._score_hyeongchung(saju)

        # =====================================================
        # ASTROLOGY SCORING (max 50 points)
        # =====================================================

        # 7. Transits (−10 to +15)
        breakdown.astro_transit = self._score_transits(astro)

        # 8. Moon phase/sign (0-10)
        breakdown.astro_moon = self._score_moon(astro)

        # 9. Planetary hour (0-8)
        breakdown.astro_planetary_hour = self._score_planetary_hour(astro)

        # 10. Void of Course (−5 to 0)
        breakdown.astro_voc = self._score_voc(astro, breakdown)

        # 11. Retrograde effects (−5 to 0)
        breakdown.astro_retrograde = self._score_retrograde(astro, breakdown)

        # 12. Current aspects (−5 to +10)
        breakdown.astro_aspects = self._score_aspects(astro)

        # 13. Progressions (0-7)
        breakdown.astro_progression = self._score_progressions(astro)

        # =====================================================
        # CROSS-REFERENCE BONUS (−10 to +10)
        # =====================================================
        breakdown.cross_bonus = self._calculate_cross_bonus(saju, astro, breakdown)

        return breakdown

    def _calculate_cross_bonus(
        self,
        saju: Dict,
        astro: Dict,
        breakdown: ScoreBreakdown
    ) -> float:
        """Calculate cross-reference bonus from saju-astro intersections"""
        bonus = 0.0

        # Get relevant data
        day_master = saju.get("dayMaster", {})
        dm_element = day_master.get("element", "") if isinstance(day_master, dict) else ""

        adv = saju.get("advancedAnalysis", {})
        sibsin = adv.get("sibsin", {})
        dominant_sibsin = sibsin.get("dominant", "") or sibsin.get("primary", "")

        planets = astro.get("planets", [])
        sun_planet = next((p for p in planets if p.get("name") == "Sun"), {})
        moon_planet = next((p for p in planets if p.get("name") == "Moon"), {})

        sun_sign = sun_planet.get("sign", "")
        moon_sign = moon_planet.get("sign", "")

        # 1. Element harmony check (Saju element ↔ Sun/Moon sign element)
        sun_element = ZODIAC_ELEMENTS.get(sun_sign, "")
        moon_element = ZODIAC_ELEMENTS.get(moon_sign, "")

        dm_element_western = DM_ELEMENT_WESTERN.get(dm_element, "")

        if dm_element_western == sun_element:
            bonus += 2
            breakdown.alerts.append({
                "type": "positive",
                "msg": "일간↔태양 원소 조화",
                "icon": "☀️"
            })

        if dm_element_western == moon_element:
            bonus += 1.5

        # 2. Use cross_sipsin_planets mapping if available
        sipsin_mapping = self.cross_mappings.get("cross_sipsin_planets", {})
        if sipsin_mapping and dominant_sibsin:
            mapped_planet = sipsin_mapping.get("mappings", {}).get(dominant_sibsin, {})
            if mapped_planet:
                planet_name = mapped_planet.get("planet", "")
                # Check if this planet is well-aspected
                for planet in planets:
                    if planet.get("name") == planet_name:
                        if not planet.get("isRetrograde"):
                            bonus += 1.5
                            breakdown.alerts.append({
                                "type": "positive",
                                "msg": f"주요 십신({dominant_sibsin})↔{planet_name} 활성",
                                "icon": "⭐"
                            })

        # 3. Branch ↔ House alignment
        pillars = saju.get("pillars", {})
        day_pillar = pillars.get("day", "")
        if day_pillar and len(day_pillar) >= 2:
            day_ji = day_pillar[1]
            mapped_sign = BRANCH_ZODIAC.get(day_ji, "")
            if mapped_sign:
                # Check if any important planet is in this sign
                for planet in planets[:5]:  # Personal planets
                    if planet.get("sign") == mapped_sign:
                        bonus += 1
                        break

        return max(-10, min(10, bonus))


# =========================================================
# SINGLETON INSTANCE
# =========================================================
_engine_instance: Optional[FortuneScoreEngine] = None


def get_fortune_score_engine() -> FortuneScoreEngine:
    """Get or create singleton FortuneScoreEngine instance."""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = FortuneScoreEngine()
    return _engine_instance


def calculate_fortune_score(saju: Dict, astro: Dict) -> Dict:
    """
    Convenience function to calculate fortune score.

    Args:
        saju: Full saju data
        astro: Full astrology data

    Returns:
        Score breakdown as dictionary
    """
    engine = get_fortune_score_engine()
    breakdown = engine.calculate_score(saju, astro)
    return breakdown.to_dict()
