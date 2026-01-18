"""
Theme summary generation.
"""
from typing import Dict
from datetime import datetime

from ..builders import normalize_day_master


def get_theme_summary(theme: str, saju: Dict, astro: Dict, locale: str = "ko") -> str:
    """Generate theme-specific summary line. Supports ko/en locales."""
    dm, _ = normalize_day_master(saju)
    planets = astro.get("planets", [])
    sun = next((p for p in planets if p.get("name") == "Sun"), {})
    moon = next((p for p in planets if p.get("name") == "Moon"), {})
    venus = next((p for p in planets if p.get("name") == "Venus"), {})
    mars = next((p for p in planets if p.get("name") == "Mars"), {})
    now = datetime.now()

    if locale == "en":
        t_map = {
            "fortune_today": f"{dm} Day Master | {moon.get('sign','')} Moon",
            "fortune_monthly": f"{now.strftime('%B')} Fortune | {dm} Day Master",
            "fortune_new_year": f"{now.year} New Year Fortune | {dm} Day Master",
            "fortune_next_year": f"{now.year+1} Fortune | {dm} Day Master",
            "focus_career": f"Career | {astro.get('mc',{}).get('sign','')} Career Sign",
            "focus_love": f"Love | Venus {venus.get('sign','')}",
            "focus_family": f"Family | Moon {moon.get('sign','')}",
            "focus_health": f"Health | Mars {mars.get('sign','')}",
        }
        return t_map.get(theme, f"Life Fortune | {dm} Day Master | {sun.get('sign','')} Sun")
    else:
        sign_ko = {
            "Aries": "양자리", "Taurus": "황소자리", "Gemini": "쌍둥이자리",
            "Cancer": "게자리", "Leo": "사자자리", "Virgo": "처녀자리",
            "Libra": "천칭자리", "Scorpio": "전갈자리", "Sagittarius": "궁수자리",
            "Capricorn": "염소자리", "Aquarius": "물병자리", "Pisces": "물고기자리"
        }
        t_map = {
            "fortune_today": f"{dm} 일주 | {sign_ko.get(moon.get('sign',''),'')} 달",
            "fortune_monthly": f"{now.month}월 운세 | {dm} 일주",
            "fortune_new_year": f"{now.year}년 신년 운세 | {dm} 일주",
            "fortune_next_year": f"{now.year+1}년 운세 | {dm} 일주",
            "focus_career": f"커리어 | {sign_ko.get(astro.get('mc',{}).get('sign',''),'')} 직업운",
            "focus_love": f"연애 | 금성 {sign_ko.get(venus.get('sign',''),'')}",
            "focus_family": f"가족 | 달 {sign_ko.get(moon.get('sign',''),'')}",
            "focus_health": f"건강 | 화성 {sign_ko.get(mars.get('sign',''),'')}",
        }
        return t_map.get(theme, f"인생 총운 | {dm} 일주 | {sign_ko.get(sun.get('sign',''),'')} 태양")
