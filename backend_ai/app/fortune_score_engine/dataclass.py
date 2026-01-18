# backend_ai/app/fortune_score_engine/dataclass.py
"""
Fortune Score data structures.
Contains ScoreBreakdown dataclass and related types.
"""

from typing import Dict, List, Any
from dataclasses import dataclass, field


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

    def to_dict(self) -> Dict[str, Any]:
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
