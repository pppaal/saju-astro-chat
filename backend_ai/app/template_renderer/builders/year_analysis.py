"""
Year analysis builder functions.
Handles important years extraction and daeun/annual fortune analysis.
"""
from typing import Dict, Any, List
from datetime import datetime

from .helpers import (
    get_sibsin_value,
    get_element_from_stem,
    calculate_rating_from_sibsin,
    get_yearly_transit_info,
)
from ..data.sibsin import SIBSIN_DAEUN_MEANING, SIBSIN_ANNUAL_MEANING


def get_personalized_daeun_meaning(cheon: str, ji: str, element: str, age: int, is_current: bool) -> Dict[str, str]:
    """Generate personalized daeun meaning."""
    data = SIBSIN_DAEUN_MEANING.get(cheon, {
        "title": f"{age}세 10년 운세",
        "saju": f"{element}의 기운이 흐르는 시기입니다",
        "astro": "트랜짓 행성들이 변화를 예고합니다",
    })

    title = data["title"]
    if is_current:
        title = f"🔥 {title} (지금!)"

    return {
        "title": title,
        "saju": data["saju"],
        "astro": data["astro"],
    }


def get_personalized_annual_meaning(cheon: str, ji: str, year: int, is_current: bool) -> Dict[str, str]:
    """Generate personalized annual meaning."""
    data = SIBSIN_ANNUAL_MEANING.get(cheon)

    if data:
        result = {
            "title": data["title_template"].format(year),
            "saju": data["saju"],
            "astro": data["astro"],
        }
    else:
        result = {
            "title": f"{year}년",
            "saju": "변화의 기운이 흐르는 해입니다",
            "astro": "트랜짓 행성들의 영향이 있습니다",
        }

    if is_current:
        result["title"] = f"⭐ {result['title']} (올해)"

    return result


def get_important_years(unse: Dict[str, Any], saju: Dict[str, Any], astro: Dict[str, Any] = None, locale: str = "ko") -> List[Dict[str, Any]]:
    """Extract important years from saju unse data + astro transits.

    Returns format matching Display.tsx ImportantYear interface:
    - year: number (individual year)
    - age: number
    - rating: 1-5
    - title: string
    - sajuReason: string
    - astroReason: string
    """
    years = []
    current_year = datetime.now().year

    # Get birth year for age calculation
    birth_year = None
    facts = (saju or {}).get("facts", {})
    birth_date = facts.get("birthDate") or facts.get("birth_date") or facts.get("dateOfBirth") or (saju or {}).get("birthDate") or ""

    if birth_date and isinstance(birth_date, str) and len(birth_date) >= 4:
        try:
            birth_year = int(birth_date[:4])
        except (ValueError, TypeError):
            pass

    # Try to infer from unse.annual[0]
    if not birth_year:
        annual = (unse or {}).get("annual") or []
        if annual and len(annual) > 0:
            first_annual = annual[0]
            annual_year = first_annual.get("year")
            age = first_annual.get("age")
            if annual_year and age:
                try:
                    birth_year = int(annual_year) - int(age)
                except (ValueError, TypeError):
                    pass

    # Try daeun start year and age
    if not birth_year:
        daeun = (unse or {}).get("daeun") or []
        if daeun and len(daeun) > 0:
            first_daeun = daeun[0]
            start_year = first_daeun.get("startYear") or first_daeun.get("start_year")
            age = first_daeun.get("age") or first_daeun.get("startAge")
            if start_year and age:
                try:
                    birth_year = int(start_year) - int(age)
                except (ValueError, TypeError):
                    pass

    # Default fallback
    if not birth_year:
        birth_year = current_year - 30

    # Process Daeun (대운) - major luck periods
    daeun = (unse or {}).get("daeun") or []
    user_age = current_year - birth_year if birth_year else 30

    for idx, d in enumerate(daeun):
        age = d.get("age")
        if age is None:
            continue

        year_num = birth_year + int(age) if birth_year else current_year + (idx * 10)
        stem = d.get("heavenlyStem") or d.get("heavenly_stem") or ""
        branch = d.get("earthlyBranch") or d.get("earthly_branch") or ""

        sibsin = d.get("sibsin")
        cheon_sibsin = get_sibsin_value(sibsin, "cheon", "")
        ji_sibsin = get_sibsin_value(sibsin, "ji", "")

        element = get_element_from_stem(stem)
        rating = calculate_rating_from_sibsin(cheon_sibsin, ji_sibsin)

        is_current = age <= user_age < age + 10
        meaning = get_personalized_daeun_meaning(cheon_sibsin, ji_sibsin, element, age, is_current)

        years.append({
            "year": year_num,
            "age": int(age),
            "rating": rating,
            "title": meaning["title"],
            "sajuReason": meaning["saju"],
            "astroReason": meaning["astro"],
        })

    # Process Annual fortune (세운)
    annual = (unse or {}).get("annual") or []
    for a in annual:
        year = a.get("year")
        if not year:
            continue

        year_num = int(year) if isinstance(year, str) else year
        age = year_num - birth_year if birth_year else current_year - 1990

        stem = a.get("heavenlyStem") or a.get("heavenly_stem") or ""
        branch = a.get("earthlyBranch") or a.get("earthly_branch") or ""

        sibsin = a.get("sibsin")
        cheon_sibsin = get_sibsin_value(sibsin, "cheon", "")
        ji_sibsin = get_sibsin_value(sibsin, "ji", "")

        element = get_element_from_stem(stem)
        rating = calculate_rating_from_sibsin(cheon_sibsin, ji_sibsin)

        is_current = year_num == current_year
        meaning = get_personalized_annual_meaning(cheon_sibsin, ji_sibsin, year_num, is_current)

        years.append({
            "year": year_num,
            "age": age,
            "rating": rating,
            "title": meaning["title"],
            "sajuReason": meaning["saju"],
            "astroReason": meaning["astro"],
        })

    # Filter and sort
    has_daeun = bool(daeun)
    has_annual = bool(annual)

    if has_daeun or has_annual:
        high_rated = years.copy()
        high_rated.sort(key=lambda x: (-x["rating"], x["year"]))
        high_rated = high_rated[:8]
    else:
        high_rated = [y for y in years if y["rating"] >= 4]
        if len(high_rated) < 6:
            medium_rated = [y for y in years if y["rating"] == 3]
            medium_rated.sort(key=lambda x: x["year"])
            high_rated.extend(medium_rated[:6 - len(high_rated)])
        high_rated.sort(key=lambda x: (-x["rating"], x["year"]))

    # Fallback: generate based on day master if no data
    if len(high_rated) < 4 and not has_daeun and not has_annual:
        day_master = (saju or {}).get("dayMaster", {})
        dm_name = day_master.get("name") or day_master.get("heavenlyStem") or ""
        dm_element = day_master.get("element") or get_element_from_stem(dm_name)

        generates = {"목": "화", "화": "토", "토": "금", "금": "수", "수": "목"}
        supports = {"목": "수", "화": "목", "토": "화", "금": "토", "수": "금"}

        year_stems = {
            2024: ("갑", "목"), 2025: ("을", "목"), 2026: ("병", "화"), 2027: ("정", "화"),
            2028: ("무", "토"), 2029: ("기", "토"), 2030: ("경", "금"), 2031: ("신", "금"),
            2032: ("임", "수"), 2033: ("계", "수")
        }

        for year in range(current_year, current_year + 10):
            if year not in year_stems:
                continue
            stem, el = year_stems[year]
            age = year - birth_year

            rating = 3
            reason = "변화의 기운이 흐르는 해"
            astro_reason = get_yearly_transit_info(year, astro)

            if el == dm_element:
                rating = 4
                reason = f"같은 {el} 기운으로 힘이 강해지는 해"
            elif dm_element and generates.get(dm_element) == el:
                rating = 3
                reason = f"에너지를 발산하기 좋은 해"
            elif dm_element and supports.get(dm_element) == el:
                rating = 5
                reason = f"{el}이 당신을 생(生)해주는 황금기"

            high_rated.append({
                "year": year,
                "age": age,
                "rating": rating,
                "title": f"{year}년 운세",
                "sajuReason": reason,
                "astroReason": astro_reason,
            })

        high_rated.sort(key=lambda x: (-x["rating"], x["year"]))

    return high_rated[:8]
