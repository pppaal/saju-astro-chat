# backend_ai/app/fortune_score_engine/astro_scoring.py
"""
Astrology scoring methods for FortuneScoreEngine.
Contains scoring methods for transits, moon, planetary hour, VOC, retrograde, aspects, progressions.
"""

from typing import Dict

from .dataclass import ScoreBreakdown
from .constants import (
    TRANSIT_WEIGHTS,
    MOON_PHASE_SCORES,
    PLANETARY_HOUR_SCORES,
    MAJOR_RETROGRADE_SCORES,
    MINOR_RETROGRADE_SCORES,
)


class AstroScoringMixin:
    """Mixin providing astrology scoring methods for FortuneScoreEngine."""

    def _score_transits(self, astro: Dict) -> float:
        """Score current transits"""
        score = 5.0  # Base score

        transits = astro.get("transits", [])

        for transit in transits[:10]:
            planet = transit.get("planet", "") or transit.get("transitPlanet", "")
            aspect = transit.get("aspect", "") or transit.get("type", "")

            if planet in TRANSIT_WEIGHTS:
                aspect_lower = aspect.lower() if aspect else ""
                weight = TRANSIT_WEIGHTS[planet].get(aspect_lower, 0)
                score += weight

        return max(-10, min(15, score))

    def _score_moon(self, astro: Dict) -> float:
        """Score moon phase and sign"""
        score = 5.0  # Base score

        electional = astro.get("electional", {})

        # Moon phase
        moon_phase = electional.get("moonPhase", {})
        if isinstance(moon_phase, str):
            phase_name = moon_phase
        else:
            phase_name = moon_phase.get("phase", "") or moon_phase.get("name", "")

        if phase_name in MOON_PHASE_SCORES:
            score = MOON_PHASE_SCORES[phase_name]

        return max(0, min(10, score))

    def _score_planetary_hour(self, astro: Dict) -> float:
        """Score current planetary hour"""
        score = 4.0  # Base score

        electional = astro.get("electional", {})
        ph = electional.get("planetaryHour", {})

        ruler = ph.get("planet", "")
        if ruler in PLANETARY_HOUR_SCORES:
            score = PLANETARY_HOUR_SCORES[ruler]

        return max(0, min(8, score))

    def _score_voc(self, astro: Dict, breakdown: ScoreBreakdown) -> float:
        """Score Void of Course Moon"""
        electional = astro.get("electional", {})
        voc = electional.get("voidOfCourse", {})

        if voc and voc.get("isVoid"):
            breakdown.alerts.append({
                "type": "warning",
                "msg": "VOC Moon - 중요 결정 피하세요",
                "icon": "🌙"
            })
            return -4.0

        return 0.0

    def _score_retrograde(self, astro: Dict, breakdown: ScoreBreakdown) -> float:
        """Score retrograde planet effects"""
        score = 0.0

        electional = astro.get("electional", {})
        retrogrades = electional.get("retrograde", [])

        if not retrogrades:
            return 0.0

        for planet in retrogrades:
            if planet in MAJOR_RETROGRADE_SCORES:
                score += MAJOR_RETROGRADE_SCORES[planet]
                breakdown.alerts.append({
                    "type": "info",
                    "msg": f"{planet} Retrograde - 재검토 시기",
                    "icon": "↩️"
                })
            elif planet in MINOR_RETROGRADE_SCORES:
                score += MINOR_RETROGRADE_SCORES[planet]

        return max(-5, min(0, score))

    def _score_aspects(self, astro: Dict) -> float:
        """Score current natal aspects activation"""
        score = 2.5  # Base score

        aspects = astro.get("aspects", [])

        # Count harmonious vs challenging aspects
        harmonious = ["trine", "sextile", "conjunction"]
        challenging = ["square", "opposition", "quincunx"]

        for aspect in aspects[:15]:
            asp_type = (aspect.get("aspect", "") or aspect.get("type", "")).lower()
            if asp_type in harmonious:
                score += 0.5
            elif asp_type in challenging:
                score -= 0.3

        return max(-5, min(10, score))

    def _score_progressions(self, astro: Dict) -> float:
        """Score secondary progressions"""
        score = 3.5  # Base score

        # This would need progressions data
        # For now, return neutral base
        return score
