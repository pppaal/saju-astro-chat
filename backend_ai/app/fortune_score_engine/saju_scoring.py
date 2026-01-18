# backend_ai/app/fortune_score_engine/saju_scoring.py
"""
Saju scoring methods for FortuneScoreEngine.
Contains scoring methods for 일진, 월운, 용신, 격국, 십신, 형충회합.
"""

from datetime import datetime
from typing import Dict

from .constants import (
    ELEMENTS,
    GEOKGUK_GRADE_SCORES,
)


class SajuScoringMixin:
    """Mixin providing saju scoring methods for FortuneScoreEngine."""

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
        dm_element_cn = ELEMENTS.get(dm_element, dm_element)

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
        day_pillar_str = pillars.get("day", "")
        if day_pillar_str and len(day_pillar_str) >= 2:
            natal_ji = day_pillar_str[1]
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

        dm_element = day_master.get("element", "") if isinstance(day_master, dict) else ""

        # Current month luck
        if monthly:
            current_month = monthly[0] if monthly else {}
            month_element = current_month.get("element", "")

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
        score += GEOKGUK_GRADE_SCORES.get(grade, 2)

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
