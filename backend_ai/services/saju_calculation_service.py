"""
Saju Calculation Service

Business logic for Saju (Four Pillars) calculations:
- Simple Saju calculation from birth date/time
- Ten Gods (Sibsin) analysis
- Pillar calculations (Year, Month, Day, Hour)

Phase 4.1: Extracted from app.py (148 lines)
"""
import logging
from datetime import datetime as dt_module
from typing import Dict

logger = logging.getLogger(__name__)


# 천간/지지 데이터
STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
STEM_ELEMENTS = {
    "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
    "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水"
}
BRANCH_ELEMENTS = {
    "子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土", "巳": "火",
    "午": "火", "未": "土", "申": "金", "酉": "金", "戌": "土", "亥": "水"
}

# 형충회합 쌍
CHONG_PAIRS = [("子", "午"), ("丑", "未"), ("寅", "申"), ("卯", "酉"), ("辰", "戌"), ("巳", "亥")]
HAP_PAIRS = [("子", "丑"), ("寅", "亥"), ("卯", "戌"), ("辰", "酉"), ("巳", "申"), ("午", "未")]


class SajuCalculationService:
    """
    Saju calculation service for computing Four Pillars from birth date/time.

    Methods:
        - calculate_simple_saju(): Calculate basic Saju data
        - get_sibsin(): Calculate Ten Gods relationship
    """

    def __init__(self):
        """Initialize SajuCalculationService."""
        pass

    def get_sibsin(self, day_stem: str, target_stem: str) -> str:
        """
        Calculate Ten Gods (Sibsin) relationship between day stem and target stem.

        Args:
            day_stem: Day master stem (일간)
            target_stem: Target stem to compare

        Returns:
            Sibsin name in Korean
        """
        dm_idx = STEMS.index(day_stem)
        t_idx = STEMS.index(target_stem)
        diff = (t_idx - dm_idx) % 10
        sibsin_map = {
            0: "비견", 1: "겁재", 2: "식신", 3: "상관", 4: "편재",
            5: "정재", 6: "편관", 7: "정관", 8: "편인", 9: "정인"
        }
        return sibsin_map.get(diff, "비견")

    def calculate_simple_saju(self, birth_date: str, birth_time: str = "12:00") -> Dict:
        """
        생년월일시로 기본 사주 데이터 계산 (만세력 간이 버전)

        Args:
            birth_date: Birth date in format "YYYY-MM-DD"
            birth_time: Birth time in format "HH:MM" (default "12:00")

        Returns:
            Dictionary containing:
                - dayMaster: {name, element}
                - pillars: {year, month, day, time}
                - unse: {iljin, monthly, annual}
                - advancedAnalysis: {sibsin, hyeongchung, yongsin, geokguk}
        """
        try:
            # Parse birth date
            bd = dt_module.strptime(birth_date, "%Y-%m-%d")
            year, month, day = bd.year, bd.month, bd.day

            # Parse birth time
            hour = 12
            if birth_time:
                try:
                    hour = int(birth_time.split(":")[0])
                except (ValueError, IndexError, AttributeError):
                    hour = 12

            # 년주 계산 (1984=甲子 기준)
            year_offset = (year - 1984) % 60
            year_stem = STEMS[year_offset % 10]
            year_branch = BRANCHES[year_offset % 12]

            # 월주 계산 (간략화 - 실제로는 절기 고려 필요)
            month_branch_idx = (month + 1) % 12  # 寅월(1월)부터 시작
            month_branch = BRANCHES[month_branch_idx]
            # 월간 계산 (년간 기준)
            year_stem_idx = STEMS.index(year_stem)
            month_stem_idx = (year_stem_idx * 2 + month) % 10
            month_stem = STEMS[month_stem_idx]

            # 일주 계산 (JDN 기반)
            a = (14 - month) // 12
            y = year + 4800 - a
            m = month + 12 * a - 3
            jdn = day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
            day_offset = (jdn - 11) % 60  # 甲子일 보정
            day_stem = STEMS[day_offset % 10]
            day_branch = BRANCHES[day_offset % 12]

            # 시주 계산
            hour_branch_idx = ((hour + 1) // 2) % 12
            hour_branch = BRANCHES[hour_branch_idx]
            day_stem_idx = STEMS.index(day_stem)
            hour_stem_idx = (day_stem_idx * 2 + hour_branch_idx) % 10
            hour_stem = STEMS[hour_stem_idx]

            # 일간 (day master)
            dm_element = STEM_ELEMENTS[day_stem]

            # 십신 분포 계산
            sibsin_dist = {}
            for stem in [year_stem, month_stem, hour_stem]:
                s = self.get_sibsin(day_stem, stem)
                sibsin_dist[s] = sibsin_dist.get(s, 0) + 1

            # 오늘 일진 계산
            today = dt_module.now()
            today_jdn = self._calculate_jdn(today.year, today.month, today.day)
            today_offset = (today_jdn - 11) % 60
            today_stem = STEMS[today_offset % 10]
            today_branch = BRANCHES[today_offset % 12]
            today_element = STEM_ELEMENTS[today_stem]

            # 형충회합 간이 계산
            natal_branches = [year_branch, month_branch, day_branch, hour_branch]
            chung_list = []
            hap_list = []
            for b in natal_branches:
                if (b, today_branch) in CHONG_PAIRS or (today_branch, b) in CHONG_PAIRS:
                    chung_list.append(f"{b}-{today_branch}")
                if (b, today_branch) in HAP_PAIRS or (today_branch, b) in HAP_PAIRS:
                    hap_list.append(f"{b}-{today_branch}")

            return {
                "dayMaster": {"name": day_stem, "element": dm_element},
                "pillars": {
                    "year": year_stem + year_branch,
                    "month": month_stem + month_branch,
                    "day": day_stem + day_branch,
                    "time": hour_stem + hour_branch,
                },
                "unse": {
                    "iljin": [{"gan": today_stem, "ji": today_branch, "element": today_element}],
                    "monthly": [{"element": STEM_ELEMENTS.get(month_stem, "土")}],
                    "annual": [{"element": STEM_ELEMENTS.get(year_stem, "土")}],
                },
                "advancedAnalysis": {
                    "sibsin": {"distribution": sibsin_dist},
                    "hyeongchung": {"chung": chung_list, "hap": hap_list},
                    "yongsin": {"primary": {"element": dm_element}},  # 간이 용신
                    "geokguk": {"grade": "중"},
                },
            }
        except Exception as e:
            logger.warning(f"[SimpleSaju] Calculation error: {e}")
            # Fallback minimal data
            return {
                "dayMaster": {"name": "甲", "element": "木"},
                "pillars": {"year": "甲子", "month": "甲寅", "day": "甲午", "time": "甲子"},
                "unse": {"iljin": [{"element": "木"}], "monthly": [{"element": "木"}], "annual": [{"element": "木"}]},
                "advancedAnalysis": {
                    "sibsin": {"distribution": {}},
                    "hyeongchung": {"chung": [], "hap": []},
                },
            }

    def _calculate_jdn(self, year: int, month: int, day: int) -> int:
        """Calculate Julian Day Number for a given date."""
        a = (14 - month) // 12
        y = year + 4800 - a
        m = month + 12 * a - 3
        return day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045


# Module-level function for backward compatibility
def calculate_simple_saju(birth_date: str, birth_time: str = "12:00") -> Dict:
    """
    Module-level wrapper for SajuCalculationService.calculate_simple_saju().
    Provides backward compatibility with existing code.
    """
    service = SajuCalculationService()
    return service.calculate_simple_saju(birth_date, birth_time)
