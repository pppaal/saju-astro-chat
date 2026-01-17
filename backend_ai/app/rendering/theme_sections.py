# backend_ai/app/rendering/theme_sections.py
"""
Theme Sections Generator
========================
Generates theme-specific sections for 9 fortune themes.
Extracted from template_renderer.py for better modularity.

Supported themes:
- fortune_today, fortune_monthly, fortune_new_year, fortune_next_year
- focus_career, focus_love, focus_family, focus_health, focus_overall
"""

from datetime import datetime
from typing import Dict, List, Any

from .profiles import DAY_MASTER_PROFILES, ZODIAC_PROFILES
from .constants import SIBSIN_MEANINGS, SIBSIN_EN
from .extractors import normalize_day_master, get_sibsin_value


# ============================================================
# Sign/Element Mappings
# ============================================================
SIGN_KO = {
    "Aries": "양자리", "Taurus": "황소자리", "Gemini": "쌍둥이자리",
    "Cancer": "게자리", "Leo": "사자자리", "Virgo": "처녀자리",
    "Libra": "천칭자리", "Scorpio": "전갈자리", "Sagittarius": "사수자리",
    "Capricorn": "염소자리", "Aquarius": "물병자리", "Pisces": "물고기자리"
}

SIBSIN_EASY = {
    "비견": "경쟁과 협력의 시기",
    "겁재": "도전과 추진의 시기",
    "식신": "창의력이 빛나는 시기",
    "상관": "자유와 변화의 시기",
    "편재": "재물 기회가 많은 시기",
    "정재": "안정적 수입의 시기",
    "편관": "도전과 성장의 시기",
    "정관": "인정받는 시기",
    "편인": "배움과 변화의 시기",
    "정인": "도움받는 시기",
}


# ============================================================
# Theme Summary Generator
# ============================================================
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
        t_map = {
            "fortune_today": f"{dm} 일주 | {SIGN_KO.get(moon.get('sign',''),'')} 달",
            "fortune_monthly": f"{now.month}월 운세 | {dm} 일주",
            "fortune_new_year": f"{now.year}년 신년 운세 | {dm} 일주",
            "fortune_next_year": f"{now.year+1}년 운세 | {dm} 일주",
            "focus_career": f"커리어 | {SIGN_KO.get(astro.get('mc',{}).get('sign',''),'')} 직업운",
            "focus_love": f"연애 | 금성 {SIGN_KO.get(venus.get('sign',''),'')}",
            "focus_family": f"가족 | 달 {SIGN_KO.get(moon.get('sign',''),'')}",
            "focus_health": f"건강 | 화성 {SIGN_KO.get(mars.get('sign',''),'')}",
        }
        return t_map.get(theme, f"인생 총운 | {dm} 일주 | {SIGN_KO.get(sun.get('sign',''),'')} 태양")


# ============================================================
# Helper Functions
# ============================================================
def _get_user_age(saju: Dict, now: datetime) -> int:
    """Calculate user age from saju data."""
    user_age = 30
    facts = saju.get("facts", {})
    birth_date = facts.get("birthDate") or saju.get("birthDate") or ""

    if birth_date and len(birth_date) >= 4:
        try:
            birth_year = int(birth_date[:4])
            user_age = now.year - birth_year
        except (ValueError, TypeError):
            pass
    else:
        daeun = saju.get("unse", {}).get("daeun", [])
        if daeun and len(daeun) >= 3:
            mid_idx = min(3, len(daeun) - 1)
            user_age = daeun[mid_idx].get("age", 30) + 2

    return user_age


def _get_current_daeun(daeun: List[Dict], user_age: int) -> tuple:
    """Find current and next daeun by user age."""
    cur_daeun = {}
    next_daeun = {}
    for i, d in enumerate(daeun):
        d_age = d.get("age", 0)
        if d_age <= user_age < d_age + 10:
            cur_daeun = d
            if i + 1 < len(daeun):
                next_daeun = daeun[i + 1]
            break
    return cur_daeun, next_daeun


# ============================================================
# Theme Section Generators - Fortune Today
# ============================================================
def _generate_fortune_today(
    saju: Dict, astro: Dict, now: datetime,
    day_master: str, dm_profile: Dict,
    zodiac_sun: Dict, locale: str
) -> List[Dict[str, Any]]:
    """Generate today's fortune sections."""
    unse = saju.get("unse", {})
    iljin = unse.get("iljin", [])
    today_iljin = next(
        (i for i in iljin if i.get("day") == now.day and i.get("month") == now.month),
        {}
    )
    iljin_sibsin = today_iljin.get("sibsin", {})
    iljin_cheon = iljin_sibsin if isinstance(iljin_sibsin, str) else iljin_sibsin.get("cheon", "")
    is_gwiin = today_iljin.get("isCheoneulGwiin", False)

    dow = ["월", "화", "수", "목", "금", "토", "일"][now.weekday()]
    daily_tip = SIBSIN_MEANINGS.get(iljin_cheon, {}).get("timing", "평온한 하루")
    gwiin_msg = "🌟 천을귀인일! 귀인의 도움이 있는 날" if is_gwiin else ""
    iljin_ganji = f"{today_iljin.get('heavenlyStem','')}{today_iljin.get('earthlyBranch','')}"
    iljin_detail = SIBSIN_MEANINGS.get(iljin_cheon, {})

    monthly = unse.get("monthly", [])
    cur_month = next(
        (m for m in monthly if m.get("month") == now.month and m.get("year") == now.year),
        {}
    )
    month_cheon = get_sibsin_value(cur_month.get("sibsin"), "cheon", "")

    moon_day = now.day
    moon_phase = "초승달" if moon_day < 8 else "상현달" if moon_day < 15 else "보름달" if moon_day < 22 else "하현달"
    moon_energy = {
        "초승달": "새로운 시작, 계획 수립",
        "상현달": "적극 실행, 추진력 발휘",
        "보름달": "결실, 완성, 인간관계 활발",
        "하현달": "정리, 휴식, 성찰"
    }

    sun_s = next((p for p in astro.get("planets", []) if p.get("name") == "Sun"), {}).get("sign", "")
    moon_s = next((p for p in astro.get("planets", []) if p.get("name") == "Moon"), {}).get("sign", "")

    return [
        {"id": "summary", "icon": "☀️", "title": "오늘 한줄요약", "titleEn": "Summary",
         "content": f"{dow}요일, {iljin_ganji}일 - {iljin_cheon} 에너지가 흐르는 날.\n{gwiin_msg}\n**이번 달 흐름**: {month_cheon}의 달 중 {now.day}일째"},
        {"id": "energy", "icon": "⚡", "title": "오늘의 에너지", "titleEn": "Energy",
         "content": f"**사주**: {daily_tip}\n**점성**: {moon_phase} ({moon_energy.get(moon_phase, '')})\n두 시스템 모두 {'활동적인' if iljin_cheon in ['비견','겁재','식신'] else '신중한'} 에너지를 말하고 있어요!"},
        {"id": "timing", "icon": "⏰", "title": "좋은 시간대", "titleEn": "Best Times",
         "content": f"**오전 9-11시**: {iljin_detail.get('career', '중요 업무 처리')}\n**오후 2-4시**: {iljin_detail.get('love', '소통과 미팅')}\n**저녁 7-9시**: 자기계발"},
        {"id": "action", "icon": "🎯", "title": "오늘 행동 가이드", "titleEn": "Action",
         "content": f"**커리어**: {iljin_detail.get('career', '업무에 집중하기 좋은 날')}\n**연애/관계**: {iljin_detail.get('love', '소통이 중요한 날')}\n**재물**: {iljin_detail.get('wealth', '지출 관리에 신경 쓰세요')}"},
        {"id": "cross", "icon": "✨", "title": "동서양 교차 분석", "titleEn": "Cross",
         "content": f"**사주 분석**: 오늘은 {iljin_cheon} 에너지\n**점성 분석**: 태양 {SIGN_KO.get(sun_s,sun_s)}, 달 {SIGN_KO.get(moon_s,moon_s)}\n**종합**: 일간 {day_master}과 오늘 에너지가 {'조화로워요' if iljin_cheon in ['식신','정재','정인'] else '긴장감이 있어요'}"},
        {"id": "reminder", "icon": "💫", "title": "오늘의 리마인더", "titleEn": "Reminder",
         "content": f"⚠️ {dm_profile.get('weaknesses', '과욕').split(',')[0] if dm_profile.get('weaknesses') else '주의점'} 조심!\n✅ {iljin_detail.get('timing', '오늘의 흐름을 타세요')}\n💪 긍정 에너지로 하루를 시작하세요!"}
    ]


# ============================================================
# Theme Section Generators - Fortune Monthly
# ============================================================
def _generate_fortune_monthly(
    saju: Dict, astro: Dict, now: datetime,
    day_master: str, dm_profile: Dict,
    zodiac_sun: Dict, zodiac_venus: Dict, locale: str
) -> List[Dict[str, Any]]:
    """Generate monthly fortune sections."""
    unse = saju.get("unse", {})
    monthly = unse.get("monthly", [])
    annual = unse.get("annual", [])

    cur_month = next((m for m in monthly if m.get("month") == now.month and m.get("year") == now.year), {})
    month_cheon = get_sibsin_value(cur_month.get("sibsin"), "cheon", "")
    month_info = SIBSIN_MEANINGS.get(month_cheon, {})

    next_month_data = next((m for m in monthly if m.get("month") == now.month + 1 and m.get("year") == now.year), {})
    next_month_cheon = get_sibsin_value(next_month_data.get("sibsin"), "cheon", "")
    month_ganji = f"{cur_month.get('heavenlyStem','')}{cur_month.get('earthlyBranch','')}"

    cur_annual = next((a for a in annual if a.get("year") == now.year), {})
    annual_cheon = get_sibsin_value(cur_annual.get("sibsin"), "cheon", "")

    sun_s = next((p for p in astro.get("planets", []) if p.get("name") == "Sun"), {}).get("sign", "")
    venus_s = next((p for p in astro.get("planets", []) if p.get("name") == "Venus"), {}).get("sign", "")

    week_guide = {
        "식신": {"week1": "새 아이디어 떠올리기", "week2": "창작/기획 본격화", "week3": "협업 진행", "week4": "결과물 완성"},
        "상관": {"week1": "변화 계획 세우기", "week2": "과감한 시도", "week3": "수정 보완", "week4": "새로운 방향 정리"},
        "편재": {"week1": "기회 포착", "week2": "투자 검토", "week3": "수익 실현", "week4": "재정 점검"},
        "정재": {"week1": "예산 수립", "week2": "안정적 수입 관리", "week3": "저축 실행", "week4": "재무 점검"},
        "편관": {"week1": "도전 준비", "week2": "적극 추진", "week3": "난관 극복", "week4": "성과 확인"},
        "정관": {"week1": "계획 정리", "week2": "체계적 실행", "week3": "인정받기", "week4": "책임 완수"},
        "편인": {"week1": "학습 시작", "week2": "정보 수집", "week3": "응용 연습", "week4": "실전 적용"},
        "정인": {"week1": "멘토 만남", "week2": "조언 수용", "week3": "성장 체감", "week4": "감사 표현"},
        "비견": {"week1": "동료 파악", "week2": "협업 시작", "week3": "경쟁/협력", "week4": "성과 나누기"},
        "겁재": {"week1": "목표 설정", "week2": "과감한 도전", "week3": "리스크 관리", "week4": "결과 수용"}
    }
    weeks = week_guide.get(month_cheon, {"week1": "계획 수립", "week2": "적극 실행", "week3": "조율/수정", "week4": "마무리/정리"})

    return [
        {"id": "theme", "icon": "🗓️", "title": "월간 한줄테마", "titleEn": "Theme",
         "content": f"{now.month}월({month_ganji}월)은 **{month_cheon}** 에너지의 달!\n\n💫 {month_info.get('meaning', '변화와 성장의 기회')}\n�� **세운 흐름**: {annual_cheon}의 해 중 {month_cheon}의 달"},
        {"id": "career", "icon": "💼", "title": "이달 커리어", "titleEn": "Career",
         "content": f"**전망**: {month_info.get('career', '꾸준한 노력이 빛나는 시기')}\n**행동**: {dm_profile.get('career_fit','본업').split(',')[0]} 관련 전문성 강화"},
        {"id": "love", "icon": "💖", "title": "이달 연애", "titleEn": "Love",
         "content": f"**분위기**: {month_info.get('love', '진심 어린 소통이 관계를 깊게 합니다')}\n**스타일**: 금성 {SIGN_KO.get(venus_s,venus_s)}"},
        {"id": "wealth", "icon": "💰", "title": "이달 재물", "titleEn": "Wealth",
         "content": f"**재물운**: {month_info.get('wealth', '계획적인 지출과 저축 추천')}\n**조언**: {'적극 투자 검토' if month_cheon in ['편재','편관'] else '안정적 저축 우선'}"},
        {"id": "weeks", "icon": "📅", "title": "주간 가이드", "titleEn": "Weeks",
         "content": f"**1주차**: {weeks['week1']}\n**2주차**: {weeks['week2']}\n**3주차**: {weeks['week3']}\n**4주차**: {weeks['week4']}"},
        {"id": "nextmonth", "icon": "🔮", "title": "다음 달 미리보기", "titleEn": "Next Month",
         "content": f"**{now.month+1}월**: {next_month_cheon} 에너지\n{SIBSIN_MEANINGS.get(next_month_cheon, {}).get('meaning', '새로운 기회')}"},
        {"id": "cross", "icon": "✨", "title": "동서양 교차 분석", "titleEn": "Cross",
         "content": f"**사주 분석**: 이달은 {month_cheon} 에너지\n**점성 분석**: 태양 {SIGN_KO.get(sun_s,sun_s)}\n**종합**: 일간 {day_master}에게 {'순조로운' if month_cheon in ['식신','정재','정인'] else '도전적인'} 시기"},
        {"id": "reminder", "icon": "💫", "title": "이달의 리마인더", "titleEn": "Reminder",
         "content": f"✅ {month_info.get('timing', '이번 달의 흐름을 타세요')}\n💪 {now.month}월을 {month_cheon} 에너지로 잘 마무리하세요!"}
    ]


# ============================================================
# Main Theme Sections Function
# ============================================================
def get_theme_sections(theme: str, saju: Dict, astro: Dict, locale: str = "ko") -> List[Dict[str, Any]]:
    """
    Generate theme-specific sections for 9 themes.
    Routes to original template_renderer for complex themes.
    """
    now = datetime.now()
    day_master, day_el = normalize_day_master(saju)

    planets = astro.get("planets", [])
    sun_s = next((p for p in planets if p.get("name") == "Sun"), {}).get("sign", "")
    venus_s = next((p for p in planets if p.get("name") == "Venus"), {}).get("sign", "")

    dm_profile = DAY_MASTER_PROFILES.get(day_master, {})
    zodiac_sun = ZODIAC_PROFILES.get(sun_s, {})
    zodiac_venus = ZODIAC_PROFILES.get(venus_s, {})

    if theme == "fortune_today":
        return _generate_fortune_today(saju, astro, now, day_master, dm_profile, zodiac_sun, locale)

    if theme == "fortune_monthly":
        return _generate_fortune_monthly(saju, astro, now, day_master, dm_profile, zodiac_sun, zodiac_venus, locale)

    # For other themes, delegate to original template_renderer
    try:
        from ..template_renderer import _get_theme_sections as _original
        return _original(theme, saju, astro, locale)
    except ImportError:
        return [{"id": "summary", "icon": "✨", "title": "종합 분석", "titleEn": "Summary",
                 "content": f"일간 {day_master} 분석"}]


# Backward compatibility aliases
_get_theme_sections = get_theme_sections
_get_theme_summary = get_theme_summary
