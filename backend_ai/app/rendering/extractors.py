# backend_ai/app/rendering/extractors.py
"""
Rendering Data Extractors
=========================
사주/점성술 데이터에서 값을 추출하는 함수들
"""

from typing import Dict, Any, Optional, Tuple
from .profiles import DAY_MASTER_PROFILES


def get_sibsin_value(sibsin_data, key: str = "cheon", default: str = "") -> str:
    """
    Extract sibsin value from either string or dict format.
    sibsin can be:
    - String: "식신", "비견", etc.
    - Dict: {"cheon": "식신", "ji": "상관"}

    Args:
        sibsin_data: Raw sibsin data (str or dict)
        key: "cheon" for 천간 or "ji" for 지지
        default: Default value if not found

    Returns:
        Sibsin name string
    """
    if sibsin_data is None:
        return default

    if isinstance(sibsin_data, str):
        return sibsin_data

    if isinstance(sibsin_data, dict):
        return sibsin_data.get(key, default)

    return default


def get_element_from_stem(stem: str) -> str:
    """Get element from heavenly stem (천간) name.

    Args:
        stem: Heavenly stem character (Korean or Hanja)

    Returns:
        Element name in Korean (목/화/토/금/수)
    """
    stem_elements = {
        # Korean
        "갑": "목", "을": "목",
        "병": "화", "정": "화",
        "무": "토", "기": "토",
        "경": "금", "신": "금",
        "임": "수", "계": "수",
        # Hanja
        "甲": "목", "乙": "목",
        "丙": "화", "丁": "화",
        "戊": "토", "己": "토",
        "庚": "금", "辛": "금",
        "壬": "수", "癸": "수",
    }
    return stem_elements.get(stem, "")


def normalize_day_master(saju: Dict[str, Any]) -> Tuple[str, str]:
    """Normalize day master from various saju formats.

    Args:
        saju: Saju data dictionary

    Returns:
        Tuple of (day_master_hanja, element)
    """
    day_master = (saju or {}).get("dayMaster", {})

    if isinstance(day_master, dict):
        dm_name = day_master.get("name") or day_master.get("heavenlyStem") or ""
        dm_el = day_master.get("element") or ""
    elif isinstance(day_master, str):
        dm_name = day_master
        dm_el = get_element_from_stem(day_master)
    else:
        dm_name = ""
        dm_el = ""

    # Derive element from stem if not set
    if dm_name and not dm_el:
        dm_el = get_element_from_stem(dm_name)

    return dm_name, dm_el


def hanja_to_korean(stem: str) -> str:
    """Convert Hanja stem to Korean name.

    Args:
        stem: Hanja character

    Returns:
        Korean name (e.g., 甲 -> 갑목)
    """
    hanja_to_ko = {
        "甲": "갑목", "乙": "을목", "丙": "병화", "丁": "정화",
        "戊": "무토", "己": "기토", "庚": "경금", "辛": "신금",
        "壬": "임수", "癸": "계수"
    }
    return hanja_to_ko.get(stem, stem)


def hanja_element_to_korean(element: str) -> str:
    """Convert Hanja element to Korean.

    Args:
        element: Hanja element (木/火/土/金/水)

    Returns:
        Korean element (목/화/토/금/수)
    """
    hanja_to_hangul = {"木": "목", "火": "화", "土": "토", "金": "금", "水": "수"}
    return hanja_to_hangul.get(element, element)


def get_element_trait(element: str) -> str:
    """Get personality trait description for element.

    Args:
        element: Element name (Korean or English)

    Returns:
        Trait description in Korean
    """
    element_traits = {
        "목": "창의적이고 성장 지향적인",
        "화": "열정적이고 표현력이 뛰어난",
        "토": "안정적이고 신뢰감 있는",
        "금": "결단력 있고 원칙적인",
        "수": "유연하고 지혜로운",
        "wood": "창의적이고 성장 지향적인",
        "fire": "열정적이고 표현력이 뛰어난",
        "earth": "안정적이고 신뢰감 있는",
        "metal": "결단력 있고 원칙적인",
        "water": "유연하고 지혜로운",
    }
    return element_traits.get(element, "균형 잡힌")


def get_birth_year(unse: Dict[str, Any], saju: Dict[str, Any], current_year: int) -> Optional[int]:
    """Extract birth year from saju/unse data.

    Tries multiple sources in order:
    1. facts.birthDate
    2. saju.birthDate
    3. unse.annual[0] year/age
    4. unse.daeun[0] startYear/age

    Args:
        unse: Unse data dictionary
        saju: Saju data dictionary
        current_year: Current year for fallback calculation

    Returns:
        Birth year or None if not determinable
    """
    birth_year = None

    # 1. Try facts.birthDate first (most reliable)
    facts = (saju or {}).get("facts", {})
    birth_date = (
        facts.get("birthDate")
        or facts.get("birth_date")
        or facts.get("dateOfBirth")
        or (saju or {}).get("birthDate")
        or ""
    )
    if birth_date and isinstance(birth_date, str) and len(birth_date) >= 4:
        try:
            birth_year = int(birth_date[:4])
        except (ValueError, TypeError):
            pass

    # 2. Try unse.annual[0].year to infer current age
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

    # 3. Try daeun start year and age
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

    return birth_year


def get_yongsin_element(saju: Dict[str, Any], saju_meta: Dict[str, Any]) -> str:
    """Extract yongsin (용신) element from saju data.

    Args:
        saju: Saju data dictionary
        saju_meta: Saju meta information

    Returns:
        Yongsin element name
    """
    advanced = saju.get("advancedAnalysis", {})
    yongsin_data = advanced.get("yongsin", {})

    if isinstance(yongsin_data, dict):
        yongsin = yongsin_data.get("element") or yongsin_data.get("name") or ""
    else:
        yongsin = str(yongsin_data) if yongsin_data else ""

    if not yongsin:
        yongsin = saju_meta.get("yongsin") or saju_meta.get("yong_sin") or ""

    return yongsin


def get_day_master_profile(day_master: str) -> Dict[str, Any]:
    """Get day master profile data.

    Args:
        day_master: Day master Hanja character

    Returns:
        Profile dictionary from DAY_MASTER_PROFILES
    """
    return DAY_MASTER_PROFILES.get(day_master, {})
