# backend_ai/app/fortune_score_engine.py
"""
Fortune Score Engine v1.0
=========================
Comprehensive real-time fortune scoring combining ALL Saju + Astrology data
with weighted cross-reference analysis.

Score Range: 0-100
Update Triggers: Moon sign change, planetary hour, VOC, daily pillar change
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict

# Load cross-reference mappings
FUSION_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data", "graph", "fusion"
)


@dataclass
class ScoreBreakdown:
    """Detailed score breakdown for transparency"""
    # Saju components (max 50)
    saju_iljin: float = 0.0           # 일진 궁합 (0-12)
    saju_wolun: float = 0.0           # 월운 흐름 (0-10)
    saju_yongsin: float = 0.0         # 용신 활성 (0-10)
    saju_geokguk: float = 0.0         # 격국 에너지 (0-8)
    saju_sibsin: float = 0.0          # 십신 균형 (0-5)
    saju_hyeongchung: float = 0.0     # 형충회합 (−5 to +5)

    # Astrology components (max 50)
    astro_transit: float = 0.0        # 주요 트랜짓 (−10 to +15)
    astro_moon: float = 0.0           # 달 위상/사인 (0-10)
    astro_planetary_hour: float = 0.0 # 행성시 (0-8)
    astro_voc: float = 0.0            # VOC 공허시간 (−5 to 0)
    astro_retrograde: float = 0.0     # 역행 영향 (−5 to 0)
    astro_aspects: float = 0.0        # 현재 aspects (−5 to +10)
    astro_progression: float = 0.0    # progressions (0-7)

    # Cross-reference bonus (−10 to +10)
    cross_bonus: float = 0.0

    # Alerts
    alerts: List[Dict[str, str]] = field(default_factory=list)

    @property
    def saju_total(self) -> float:
        return max(0, min(50, (
            self.saju_iljin + self.saju_wolun + self.saju_yongsin +
            self.saju_geokguk + self.saju_sibsin + self.saju_hyeongchung
        )))

    @property
    def astro_total(self) -> float:
        return max(0, min(50, (
            self.astro_transit + self.astro_moon + self.astro_planetary_hour +
            self.astro_voc + self.astro_retrograde + self.astro_aspects +
            self.astro_progression
        )))

    @property
    def total(self) -> int:
        raw = self.saju_total + self.astro_total + self.cross_bonus
        return max(0, min(100, int(round(raw))))

    def to_dict(self) -> Dict:
        return {
            "total": self.total,
            "saju": {
                "total": round(self.saju_total, 1),
                "iljin": round(self.saju_iljin, 1),
                "wolun": round(self.saju_wolun, 1),
                "yongsin": round(self.saju_yongsin, 1),
                "geokguk": round(self.saju_geokguk, 1),
                "sibsin": round(self.saju_sibsin, 1),
                "hyeongchung": round(self.saju_hyeongchung, 1),
            },
            "astro": {
                "total": round(self.astro_total, 1),
                "transit": round(self.astro_transit, 1),
                "moon": round(self.astro_moon, 1),
                "planetary_hour": round(self.astro_planetary_hour, 1),
                "voc": round(self.astro_voc, 1),
                "retrograde": round(self.astro_retrograde, 1),
                "aspects": round(self.astro_aspects, 1),
                "progression": round(self.astro_progression, 1),
            },
            "cross_bonus": round(self.cross_bonus, 1),
            "alerts": self.alerts,
        }


class FortuneScoreEngine:
    """
    Comprehensive fortune scoring engine using ALL saju + astrology data.
    """

    # Element mappings
    ELEMENTS = {
        "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
        "wood": "木", "fire": "火", "earth": "土", "metal": "金", "water": "水",
    }

    # Zodiac to element mapping
    ZODIAC_ELEMENTS = {
        "Aries": "fire", "Leo": "fire", "Sagittarius": "fire",
        "Taurus": "earth", "Virgo": "earth", "Capricorn": "earth",
        "Gemini": "air", "Libra": "air", "Aquarius": "air",
        "Cancer": "water", "Scorpio": "water", "Pisces": "water",
    }

    # Branch to zodiac rough mapping
    BRANCH_ZODIAC = {
        "子": "Capricorn", "丑": "Capricorn", "寅": "Aquarius", "卯": "Pisces",
        "辰": "Aries", "巳": "Taurus", "午": "Gemini", "未": "Cancer",
        "申": "Leo", "酉": "Virgo", "戌": "Libra", "亥": "Scorpio",
    }

    # Ten Gods weights
    SIBSIN_WEIGHTS = {
        "비견": 0, "겁재": -0.5, "식신": 0.5, "상관": -0.3,
        "편재": 0.3, "정재": 0.5, "편관": -0.3, "정관": 0.5,
        "편인": 0.2, "정인": 0.4,
    }

    # Transit planet weights
    TRANSIT_WEIGHTS = {
        "Jupiter": {"conjunction": 3, "trine": 2, "sextile": 1, "square": -1, "opposition": -1},
        "Saturn": {"conjunction": -2, "trine": 1, "sextile": 0.5, "square": -2, "opposition": -2},
        "Mars": {"conjunction": 1, "trine": 1, "sextile": 0.5, "square": -1.5, "opposition": -1},
        "Venus": {"conjunction": 2, "trine": 1.5, "sextile": 1, "square": -0.5, "opposition": -0.5},
        "Mercury": {"conjunction": 0.5, "trine": 0.5, "sextile": 0.3, "square": -0.3, "opposition": -0.3},
        "Sun": {"conjunction": 1, "trine": 1, "sextile": 0.5, "square": -0.5, "opposition": -0.5},
        "Moon": {"conjunction": 0.5, "trine": 0.5, "sextile": 0.3, "square": -0.3, "opposition": -0.3},
        "Uranus": {"conjunction": 0, "trine": 1, "sextile": 0.5, "square": -1, "opposition": -1},
        "Neptune": {"conjunction": 0, "trine": 0.5, "sextile": 0.3, "square": -0.5, "opposition": -0.5},
        "Pluto": {"conjunction": 0, "trine": 1, "sextile": 0.5, "square": -1.5, "opposition": -1.5},
    }

    # Moon phase scores
    MOON_PHASE_SCORES = {
        "New Moon": 8, "Waxing Crescent": 7, "First Quarter": 6,
        "Waxing Gibbous": 7, "Full Moon": 10, "Waning Gibbous": 6,
        "Last Quarter": 5, "Waning Crescent": 4, "Dark Moon": 3,
    }

    # Planetary hour ruler scores
    PLANETARY_HOUR_SCORES = {
        "Sun": 8, "Jupiter": 8, "Venus": 7, "Moon": 6,
        "Mercury": 5, "Mars": 4, "Saturn": 3,
    }

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

    # =========================================================
    # SAJU SCORING METHODS
    # =========================================================

    def _score_iljin(self, saju: Dict, current_time: datetime) -> float:
        """Score daily pillar compatibility with natal chart"""
        score = 6.0  # Base score

        unse = saju.get("unse", {})
        iljin = unse.get("iljin", [])
        day_master = saju.get("dayMaster", {})
        pillars = saju.get("pillars", {})

        if not iljin:
            return score

        # Get today's pillar
        today_pillar = iljin[0] if iljin else {}
        today_gan = today_pillar.get("gan", "")
        today_ji = today_pillar.get("ji", "")

        # Get day master element
        dm_element = day_master.get("element", "") if isinstance(day_master, dict) else ""
        dm_element_cn = self.ELEMENTS.get(dm_element, dm_element)

        # Check element harmony
        day_element = today_pillar.get("element", "")
        if day_element:
            # Same element = +2
            if day_element == dm_element or day_element == dm_element_cn:
                score += 2
            # Generating cycle = +1.5
            elif self._is_generating(dm_element_cn, day_element):
                score += 1.5
            # Controlling cycle = -1
            elif self._is_controlling(day_element, dm_element_cn):
                score -= 1

        # Check for branch harmony with day pillar
        day_pillar = pillars.get("day", "")
        if day_pillar and len(day_pillar) >= 2:
            natal_ji = day_pillar[1]
            if today_ji == natal_ji:
                score += 2  # Same branch
            elif self._is_liu_he(today_ji, natal_ji):
                score += 1.5  # 육합
            elif self._is_chong(today_ji, natal_ji):
                score -= 2  # 충

        return max(0, min(12, score))

    def _score_wolun(self, saju: Dict, current_time: datetime) -> float:
        """Score monthly luck flow"""
        score = 5.0  # Base score

        unse = saju.get("unse", {})
        monthly = unse.get("monthly", [])
        annual = unse.get("annual", [])
        day_master = saju.get("dayMaster", {})

        if not monthly and not annual:
            return score

        # Current month luck
        if monthly:
            current_month = monthly[0] if monthly else {}
            month_element = current_month.get("element", "")
            dm_element = day_master.get("element", "") if isinstance(day_master, dict) else ""

            if month_element and dm_element:
                if self._is_generating(dm_element, month_element):
                    score += 2
                elif self._is_controlling(month_element, dm_element):
                    score -= 1.5

        # Annual luck overlay
        if annual:
            current_year = annual[0] if annual else {}
            year_element = current_year.get("element", "")
            if year_element == dm_element:
                score += 1.5

        return max(0, min(10, score))

    def _score_yongsin(self, saju: Dict, current_time: datetime) -> float:
        """Score favorable god (용신) activation"""
        score = 5.0  # Base score

        adv = saju.get("advancedAnalysis", {})
        yongsin = adv.get("yongsin", {})
        unse = saju.get("unse", {})

        if not yongsin:
            return score

        # Get yongsin element
        yongsin_element = yongsin.get("primary", {}).get("element", "") or yongsin.get("yongsin", "")
        huisin_element = yongsin.get("secondary", {}).get("element", "") or yongsin.get("huisin", "")
        gisin_element = yongsin.get("avoid", {}).get("element", "") or yongsin.get("gisin", "")

        # Check current luck cycles for yongsin activation
        iljin = unse.get("iljin", [])
        monthly = unse.get("monthly", [])

        if iljin:
            today = iljin[0] if iljin else {}
            today_element = today.get("element", "")

            if today_element == yongsin_element:
                score += 3  # 용신 active today
            elif today_element == huisin_element:
                score += 2  # 희신 active
            elif today_element == gisin_element:
                score -= 2  # 기신 active

        if monthly:
            month = monthly[0] if monthly else {}
            month_element = month.get("element", "")

            if month_element == yongsin_element:
                score += 1.5
            elif month_element == gisin_element:
                score -= 1

        return max(0, min(10, score))

    def _score_geokguk(self, saju: Dict) -> float:
        """Score chart pattern (격국) quality"""
        score = 4.0  # Base score

        adv = saju.get("advancedAnalysis", {})
        geokguk = adv.get("geokguk", {}) or adv.get("extended", {}).get("geokguk", {})

        if not geokguk:
            return score

        # Grade-based scoring
        grade = geokguk.get("grade", "") or geokguk.get("level", "")
        grade_scores = {"상": 4, "중상": 3, "중": 2, "중하": 1, "하": 0,
                        "high": 4, "medium-high": 3, "medium": 2, "medium-low": 1, "low": 0}
        score += grade_scores.get(grade, 2)

        return max(0, min(8, score))

    def _score_sibsin(self, saju: Dict) -> float:
        """Score ten gods balance"""
        score = 2.5  # Base score

        adv = saju.get("advancedAnalysis", {})
        sibsin = adv.get("sibsin", {})

        if not sibsin:
            return score

        # Check distribution balance
        distribution = sibsin.get("distribution", {}) or sibsin.get("counts", {})
        if distribution:
            values = list(distribution.values())
            if values:
                # Balanced distribution = higher score
                avg = sum(values) / len(values)
                variance = sum((v - avg) ** 2 for v in values) / len(values)
                if variance < 1:
                    score += 1.5  # Well balanced
                elif variance < 2:
                    score += 0.5

        # Check for missing gods
        missing = sibsin.get("missing", []) or sibsin.get("absent", [])
        if missing:
            score -= 0.3 * len(missing)

        return max(0, min(5, score))

    def _score_hyeongchung(self, saju: Dict) -> float:
        """Score branch interactions (형충회합)"""
        score = 0.0  # Neutral base

        adv = saju.get("advancedAnalysis", {})
        hc = adv.get("hyeongchung", {})

        if not hc:
            return score

        # Positive: 합 (combinations)
        hap = hc.get("hap", []) or hc.get("combinations", [])
        samhap = hc.get("samhap", [])
        banghap = hc.get("banghap", [])
        score += len(hap) * 1.0
        score += len(samhap) * 1.5
        score += len(banghap) * 1.0

        # Negative: 충, 형
        chung = hc.get("chung", []) or hc.get("clashes", [])
        hyeong = hc.get("hyeong", []) or hc.get("punishments", [])
        score -= len(chung) * 1.5
        score -= len(hyeong) * 1.0

        return max(-5, min(5, score))

    # =========================================================
    # ASTROLOGY SCORING METHODS
    # =========================================================

    def _score_transits(self, astro: Dict) -> float:
        """Score current transits"""
        score = 5.0  # Base score

        transits = astro.get("transits", [])

        for transit in transits[:10]:
            planet = transit.get("planet", "") or transit.get("transitPlanet", "")
            aspect = transit.get("aspect", "") or transit.get("type", "")

            if planet in self.TRANSIT_WEIGHTS:
                aspect_lower = aspect.lower() if aspect else ""
                weight = self.TRANSIT_WEIGHTS[planet].get(aspect_lower, 0)
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

        if phase_name in self.MOON_PHASE_SCORES:
            score = self.MOON_PHASE_SCORES[phase_name]

        return max(0, min(10, score))

    def _score_planetary_hour(self, astro: Dict) -> float:
        """Score current planetary hour"""
        score = 4.0  # Base score

        electional = astro.get("electional", {})
        ph = electional.get("planetaryHour", {})

        ruler = ph.get("planet", "")
        if ruler in self.PLANETARY_HOUR_SCORES:
            score = self.PLANETARY_HOUR_SCORES[ruler]

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

        # Major retrogrades have bigger impact
        major_retrogrades = {"Mercury": -2, "Venus": -1.5, "Mars": -1.5}
        minor_retrogrades = {"Jupiter": -0.5, "Saturn": -0.5, "Uranus": -0.3, "Neptune": -0.3, "Pluto": -0.2}

        for planet in retrogrades:
            if planet in major_retrogrades:
                score += major_retrogrades[planet]
                breakdown.alerts.append({
                    "type": "info",
                    "msg": f"{planet} Retrograde - 재검토 시기",
                    "icon": "↩️"
                })
            elif planet in minor_retrogrades:
                score += minor_retrogrades[planet]

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

    # =========================================================
    # CROSS-REFERENCE BONUS
    # =========================================================

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
        sun_element = self.ZODIAC_ELEMENTS.get(sun_sign, "")
        moon_element = self.ZODIAC_ELEMENTS.get(moon_sign, "")

        dm_element_western = {
            "木": "air", "火": "fire", "土": "earth", "金": "earth", "水": "water",
            "wood": "air", "fire": "fire", "earth": "earth", "metal": "earth", "water": "water",
        }.get(dm_element, "")

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
            mapped_sign = self.BRANCH_ZODIAC.get(day_ji, "")
            if mapped_sign:
                # Check if any important planet is in this sign
                for planet in planets[:5]:  # Personal planets
                    if planet.get("sign") == mapped_sign:
                        bonus += 1
                        break

        return max(-10, min(10, bonus))

    # =========================================================
    # HELPER METHODS
    # =========================================================

    def _is_generating(self, source: str, target: str) -> bool:
        """Check if source element generates target (상생)"""
        generating_cycle = {
            "木": "火", "火": "土", "土": "金", "金": "水", "水": "木",
            "wood": "fire", "fire": "earth", "earth": "metal", "metal": "water", "water": "wood",
        }
        return generating_cycle.get(source) == target

    def _is_controlling(self, source: str, target: str) -> bool:
        """Check if source element controls target (상극)"""
        controlling_cycle = {
            "木": "土", "土": "水", "水": "火", "火": "金", "金": "木",
            "wood": "earth", "earth": "water", "water": "fire", "fire": "metal", "metal": "wood",
        }
        return controlling_cycle.get(source) == target

    def _is_liu_he(self, ji1: str, ji2: str) -> bool:
        """Check if two branches form 육합 (six harmonies)"""
        liu_he_pairs = [
            ("子", "丑"), ("寅", "亥"), ("卯", "戌"),
            ("辰", "酉"), ("巳", "申"), ("午", "未"),
        ]
        return (ji1, ji2) in liu_he_pairs or (ji2, ji1) in liu_he_pairs

    def _is_chong(self, ji1: str, ji2: str) -> bool:
        """Check if two branches clash (충)"""
        chong_pairs = [
            ("子", "午"), ("丑", "未"), ("寅", "申"),
            ("卯", "酉"), ("辰", "戌"), ("巳", "亥"),
        ]
        return (ji1, ji2) in chong_pairs or (ji2, ji1) in chong_pairs


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


# =========================================================
# TEST
# =========================================================
if __name__ == "__main__":
    print("Testing FortuneScoreEngine...")

    # Mock data
    mock_saju = {
        "dayMaster": {"name": "甲", "element": "木", "strength": "moderate"},
        "pillars": {"year": "甲子", "month": "丙寅", "day": "甲午", "time": "庚子"},
        "unse": {
            "iljin": [{"gan": "乙", "ji": "亥", "element": "水"}],
            "monthly": [{"element": "木"}],
            "annual": [{"element": "火"}],
        },
        "advancedAnalysis": {
            "yongsin": {"primary": {"element": "水"}},
            "geokguk": {"grade": "중상"},
            "sibsin": {"distribution": {"비견": 2, "식신": 1, "정재": 2}},
            "hyeongchung": {"hap": [{}], "chung": []},
        },
    }

    mock_astro = {
        "planets": [
            {"name": "Sun", "sign": "Sagittarius", "house": 1},
            {"name": "Moon", "sign": "Cancer", "house": 7},
        ],
        "transits": [
            {"planet": "Jupiter", "aspect": "trine", "natalPlanet": "Sun"},
        ],
        "electional": {
            "moonPhase": {"phase": "Waxing Gibbous"},
            "planetaryHour": {"planet": "Jupiter"},
            "voidOfCourse": {"isVoid": False},
            "retrograde": [],
        },
    }

    result = calculate_fortune_score(mock_saju, mock_astro)
    print(f"\nTotal Score: {result['total']}/100")
    print(f"Saju: {result['saju']['total']}/50")
    print(f"Astro: {result['astro']['total']}/50")
    print(f"Cross Bonus: {result['cross_bonus']}")
    print(f"Alerts: {result['alerts']}")
