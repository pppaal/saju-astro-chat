# backend_ai/app/compatibility/synastry.py
"""
Synastry Analysis Functions
===========================
점성술 시나스트리(Synastry) 분석 함수들

Functions:
- analyze_asc_dsc_compatibility: ASC/DSC 축 궁합 분석
- analyze_lilith_chiron_synastry: Lilith/Chiron 시나스트리 분석
- analyze_progression_synastry: Secondary Progression 시나스트리 분석
- analyze_venus_mars_synastry: 금성-화성 시나스트리 분석
- analyze_astro_compatibility: 태양 별자리 궁합 분석
- calculate_sipsung: 십성 계산
"""

from datetime import datetime

from .constants import (
    ASC_DSC_COMPATIBILITY,
    DSC_PARTNER_NEEDS,
    ASC_SIGN_TRAITS,
    LILITH_SYNASTRY,
    CHIRON_SYNASTRY,
    PROGRESSED_MOON_PHASES,
    DAEUN_PROGRESSION_CORRELATION,
    CRITICAL_PERIODS,
    STEM_TO_ELEMENT,
    STEM_POLARITY,
    OHENG_ORDER,
    SIPSUNG_COMPATIBILITY,
    VENUS_MARS_SYNASTRY,
    ZODIAC_ELEMENTS,
    ASTRO_ELEMENT_COMPATIBILITY,
)
from .helpers import get_sign_midpoint, calculate_aspect


def analyze_asc_dsc_compatibility(person1: dict, person2: dict) -> dict:
    """
    ASC/DSC 축 궁합 분석 - 점성술에서 가장 중요한 관계 축

    Args:
        person1: 첫 번째 사람의 데이터 (astro 포함)
        person2: 두 번째 사람의 데이터 (astro 포함)

    Returns:
        dict with ASC/DSC compatibility analysis
    """
    result = {
        "person1_asc": "",
        "person2_asc": "",
        "person1_dsc": "",
        "person2_dsc": "",
        "score": 0,
        "interactions": [],
        "partner_needs_match": [],
        "relationship_style": "",
        "summary": ""
    }

    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})

    asc1 = astro1.get("ascendant", astro1.get("asc", ""))
    asc2 = astro2.get("ascendant", astro2.get("asc", ""))

    if isinstance(asc1, str) and asc1:
        asc1 = asc1.split()[0] if " " in asc1 else asc1
    if isinstance(asc2, str) and asc2:
        asc2 = asc2.split()[0] if " " in asc2 else asc2

    if not asc1 or not asc2:
        result["summary"] = "ASC 정보가 없어 분석할 수 없습니다."
        return result

    result["person1_asc"] = asc1
    result["person2_asc"] = asc2

    sign_order = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

    def get_dsc(asc_sign):
        if asc_sign in sign_order:
            idx = sign_order.index(asc_sign)
            return sign_order[(idx + 6) % 12]
        return ""

    dsc1 = get_dsc(asc1)
    dsc2 = get_dsc(asc2)
    result["person1_dsc"] = dsc1
    result["person2_dsc"] = dsc2

    total_score = 0

    # 1. ASC-DSC 축 체크
    if asc1 == dsc2:
        total_score += 15
        result["interactions"].append({
            "type": "asc_conjunct_dsc",
            "description": f"{person1.get('name', 'Person1')}의 ASC가 {person2.get('name', 'Person2')}의 DSC와 일치",
            "score": 15,
            "meaning": "상대가 찾던 이상적인 파트너상과 일치! 매우 강력한 끌림."
        })

    if asc2 == dsc1:
        total_score += 15
        result["interactions"].append({
            "type": "asc_conjunct_dsc",
            "description": f"{person2.get('name', 'Person2')}의 ASC가 {person1.get('name', 'Person1')}의 DSC와 일치",
            "score": 15,
            "meaning": "상대가 찾던 이상적인 파트너상과 일치! 매우 강력한 끌림."
        })

    # 2. 같은 ASC
    if asc1 == asc2:
        total_score += 8
        result["interactions"].append({
            "type": "same_asc",
            "description": "같은 상승궁",
            "score": 8,
            "meaning": "비슷한 첫인상과 외적 표현 방식. 서로 이해하기 쉬움."
        })

    # 3. ASC-ASC 호환성 체크
    asc_compat = ASC_DSC_COMPATIBILITY.get(asc1, {}).get(asc2, {"score": 0, "description": ""})
    if asc_compat.get("score", 0) != 0:
        total_score += asc_compat["score"]
        result["interactions"].append({
            "type": "asc_compatibility",
            "description": f"ASC 간 호환: {asc1} - {asc2}",
            "score": asc_compat["score"],
            "meaning": asc_compat.get("description", "")
        })

    # 4. 파트너 니즈 매칭
    dsc1_needs = DSC_PARTNER_NEEDS.get(dsc1, {})
    dsc2_needs = DSC_PARTNER_NEEDS.get(dsc2, {})

    if dsc1_needs and asc2:
        asc2_traits = ASC_SIGN_TRAITS.get(asc2, {})
        for need in dsc1_needs.get("attracted_to", []):
            if need in asc2_traits.get("traits", []) or need in asc2_traits.get("energy", ""):
                total_score += 2
                result["partner_needs_match"].append({
                    "seeker": person1.get("name", "Person1"),
                    "need": need,
                    "provider": person2.get("name", "Person2"),
                    "match_score": 2
                })

    if dsc2_needs and asc1:
        asc1_traits = ASC_SIGN_TRAITS.get(asc1, {})
        for need in dsc2_needs.get("attracted_to", []):
            if need in asc1_traits.get("traits", []) or need in asc1_traits.get("energy", ""):
                total_score += 2
                result["partner_needs_match"].append({
                    "seeker": person2.get("name", "Person2"),
                    "need": need,
                    "provider": person1.get("name", "Person1"),
                    "match_score": 2
                })

    result["score"] = min(total_score, 20)

    if total_score >= 20:
        result["relationship_style"] = "운명적 만남"
        result["summary"] = "ASC-DSC 축이 완벽하게 연결됩니다. 서로가 찾던 이상형에 가까운 관계입니다."
    elif total_score >= 12:
        result["relationship_style"] = "강한 끌림"
        result["summary"] = "ASC-DSC 궁합이 매우 좋습니다. 첫 만남부터 끌림이 있고, 외적으로 잘 어울립니다."
    elif total_score >= 6:
        result["relationship_style"] = "조화로운 관계"
        result["summary"] = "ASC 에너지가 조화롭습니다. 함께 있으면 편안함을 느낍니다."
    else:
        result["relationship_style"] = "다른 표현 방식"
        result["summary"] = "ASC 에너지가 다릅니다. 외적 표현 방식의 차이를 이해하면 좋습니다."

    return result


def analyze_lilith_chiron_synastry(person1: dict, person2: dict) -> dict:
    """
    Lilith(릴리스)와 Chiron(카이론) 시나스트리 분석

    Args:
        person1: 첫 번째 사람의 데이터 (astro 포함)
        person2: 두 번째 사람의 데이터 (astro 포함)

    Returns:
        dict with Lilith/Chiron synastry analysis
    """
    result = {
        "lilith_analysis": {
            "person1_lilith": "",
            "person2_lilith": "",
            "interactions": [],
            "score": 0
        },
        "chiron_analysis": {
            "person1_chiron": "",
            "person2_chiron": "",
            "interactions": [],
            "score": 0
        },
        "combined_score": 0,
        "shadow_work": [],
        "healing_potential": [],
        "summary": ""
    }

    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})
    planets1 = astro1.get("planets", {})
    planets2 = astro2.get("planets", {})

    lilith1 = planets1.get("Lilith", planets1.get("lilith", planets1.get("Black Moon Lilith", "")))
    lilith2 = planets2.get("Lilith", planets2.get("lilith", planets2.get("Black Moon Lilith", "")))
    chiron1 = planets1.get("Chiron", planets1.get("chiron", ""))
    chiron2 = planets2.get("Chiron", planets2.get("chiron", ""))

    def extract_sign(pos):
        if isinstance(pos, str) and pos:
            return pos.split()[0] if " " in pos else pos
        elif isinstance(pos, dict):
            return pos.get("sign", "")
        return ""

    lilith1_sign = extract_sign(lilith1)
    lilith2_sign = extract_sign(lilith2)
    chiron1_sign = extract_sign(chiron1)
    chiron2_sign = extract_sign(chiron2)

    result["lilith_analysis"]["person1_lilith"] = lilith1_sign
    result["lilith_analysis"]["person2_lilith"] = lilith2_sign
    result["chiron_analysis"]["person1_chiron"] = chiron1_sign
    result["chiron_analysis"]["person2_chiron"] = chiron2_sign

    lilith_score = 0
    chiron_score = 0

    # Lilith 시나스트리 분석
    if lilith1_sign and lilith2_sign:
        lilith_synastry = LILITH_SYNASTRY.get(lilith1_sign, {})

        if lilith1_sign == lilith2_sign:
            lilith_score += 6
            result["lilith_analysis"]["interactions"].append({
                "type": "same_lilith",
                "description": f"같은 Lilith 별자리 ({lilith1_sign})",
                "score": 6,
                "meaning": lilith_synastry.get("when_triggered", "깊은 무의식적 연결")
            })
            result["shadow_work"].append(lilith_synastry.get("shadow_work", "함께 그림자를 탐구할 수 있음"))

        sun2 = planets2.get("Sun", planets2.get("sun", ""))
        sun2_sign = extract_sign(sun2)
        if lilith1_sign == sun2_sign:
            lilith_score += 5
            result["lilith_analysis"]["interactions"].append({
                "type": "lilith_conjunct_sun",
                "description": "Person1의 Lilith가 Person2의 Sun과 같은 별자리",
                "score": 5,
                "meaning": "강렬한 끌림과 변형적 관계. 그림자 측면을 자극함."
            })

    # Chiron 시나스트리 분석
    if chiron1_sign and chiron2_sign:
        chiron_synastry = CHIRON_SYNASTRY.get(chiron1_sign, {})

        if chiron1_sign == chiron2_sign:
            chiron_score += 6
            result["chiron_analysis"]["interactions"].append({
                "type": "same_chiron",
                "description": f"같은 Chiron 별자리 ({chiron1_sign})",
                "score": 6,
                "meaning": "비슷한 상처와 치유 여정을 공유함"
            })
            result["healing_potential"].append(chiron_synastry.get("healing_gift", "서로의 상처를 이해하고 치유할 수 있음"))

        moon2 = planets2.get("Moon", planets2.get("moon", ""))
        moon2_sign = extract_sign(moon2)
        if chiron1_sign == moon2_sign:
            chiron_score += 5
            result["chiron_analysis"]["interactions"].append({
                "type": "chiron_conjunct_moon",
                "description": "Person1의 Chiron이 Person2의 Moon과 같은 별자리",
                "score": 5,
                "meaning": "깊은 감정적 치유가 일어날 수 있는 관계"
            })
            result["healing_potential"].append("감정적 상처의 치유와 돌봄이 가능한 관계")

        if chiron_synastry:
            result["chiron_analysis"]["wound_theme"] = chiron_synastry.get("wound_theme", "")

    result["lilith_analysis"]["score"] = lilith_score
    result["chiron_analysis"]["score"] = chiron_score
    result["combined_score"] = min(lilith_score + chiron_score, 15)

    total = result["combined_score"]
    if total >= 12:
        result["summary"] = "Lilith/Chiron 연결이 강력합니다. 깊은 변형과 치유가 일어나는 카르마적 관계입니다."
    elif total >= 7:
        result["summary"] = "Lilith/Chiron 연결이 있습니다. 서로의 상처와 그림자를 이해하고 성장할 수 있습니다."
    elif total >= 3:
        result["summary"] = "약한 Lilith/Chiron 연결이 있습니다. 일부 영역에서 치유적 교류가 가능합니다."
    else:
        result["summary"] = "Lilith/Chiron 연결이 약합니다. 치유보다는 다른 영역에서 연결됩니다."

    return result


def analyze_progression_synastry(person1: dict, person2: dict, current_year: int = None) -> dict:
    """
    Secondary Progression (세컨더리 프로그레션) 시나스트리 분석

    Args:
        person1: 첫 번째 사람의 데이터 (astro, birth_date 포함)
        person2: 두 번째 사람의 데이터 (astro, birth_date 포함)
        current_year: 분석 기준 년도 (기본값: 현재 년도)

    Returns:
        dict with progression synastry analysis
    """
    if current_year is None:
        current_year = datetime.now().year

    result = {
        "person1_progression": {},
        "person2_progression": {},
        "progressed_moon_phase": {},
        "progressed_synastry_aspects": [],
        "daeun_progression_link": {},
        "score": 0,
        "timing_assessment": "",
        "relationship_phase": "",
        "summary": ""
    }

    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})

    def get_birth_year(person):
        birth_date = person.get("birth_date", person.get("birthDate", ""))
        if isinstance(birth_date, str) and birth_date:
            try:
                if "-" in birth_date:
                    return int(birth_date.split("-")[0])
                elif "/" in birth_date:
                    parts = birth_date.split("/")
                    return int(parts[2]) if len(parts) > 2 else int(parts[0])
            except (ValueError, IndexError):
                pass
        return None

    birth_year1 = get_birth_year(person1)
    birth_year2 = get_birth_year(person2)

    if not birth_year1 or not birth_year2:
        result["summary"] = "출생년도 정보가 없어 프로그레션 분석이 제한됩니다."
        return result

    age1 = current_year - birth_year1
    age2 = current_year - birth_year2

    total_score = 0

    # 1. 진행 달 페이즈 분석
    def get_progressed_moon_phase(age):
        phase_index = int((age % 27.3) / 3.4)
        phases = ["new_moon", "crescent", "first_quarter", "gibbous",
                  "full_moon", "disseminating", "last_quarter", "balsamic"]
        return phases[min(phase_index, 7)]

    moon_phase1 = get_progressed_moon_phase(age1)
    moon_phase2 = get_progressed_moon_phase(age2)

    phase1_data = PROGRESSED_MOON_PHASES.get(moon_phase1, {})
    phase2_data = PROGRESSED_MOON_PHASES.get(moon_phase2, {})

    result["person1_progression"]["moon_phase"] = moon_phase1
    result["person1_progression"]["phase_meaning"] = phase1_data.get("relationship_meaning", "")
    result["person2_progression"]["moon_phase"] = moon_phase2
    result["person2_progression"]["phase_meaning"] = phase2_data.get("relationship_meaning", "")

    if moon_phase1 == moon_phase2:
        total_score += 6
        result["progressed_moon_phase"]["sync"] = True
        result["progressed_moon_phase"]["meaning"] = "같은 달 페이즈 - 인생 리듬이 같습니다"
    else:
        result["progressed_moon_phase"]["sync"] = False

    total_score += phase1_data.get("score_modifier", 0)
    total_score += phase2_data.get("score_modifier", 0)

    result["progressed_moon_phase"]["person1"] = {
        "phase": moon_phase1,
        "advice": phase1_data.get("advice", "")
    }
    result["progressed_moon_phase"]["person2"] = {
        "phase": moon_phase2,
        "advice": phase2_data.get("advice", "")
    }

    # 2. 진행 태양 별자리 분석
    sun1 = astro1.get("sunSign", "").lower()
    sun2 = astro2.get("sunSign", "").lower()

    if sun1 and sun2:
        sign_order = ["aries", "taurus", "gemini", "cancer", "leo", "virgo",
                      "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]

        def get_progressed_sun_sign(natal_sign, age):
            if natal_sign not in sign_order:
                return natal_sign
            idx = sign_order.index(natal_sign)
            progress = int(age / 30)
            return sign_order[(idx + progress) % 12]

        prog_sun1 = get_progressed_sun_sign(sun1, age1)
        prog_sun2 = get_progressed_sun_sign(sun2, age2)

        result["person1_progression"]["progressed_sun"] = prog_sun1
        result["person2_progression"]["progressed_sun"] = prog_sun2

        if prog_sun1 == sun2:
            total_score += 8
            result["progressed_synastry_aspects"].append({
                "type": "progressed_sun_conjunct_natal_sun",
                "person1_to_person2": True,
                "score": 8,
                "meaning": "Person1의 진행 태양이 Person2 태양과 합 - 깊은 연결 시기"
            })

        if prog_sun2 == sun1:
            total_score += 8
            result["progressed_synastry_aspects"].append({
                "type": "progressed_sun_conjunct_natal_sun",
                "person2_to_person1": True,
                "score": 8,
                "meaning": "Person2의 진행 태양이 Person1 태양과 합 - 깊은 연결 시기"
            })

    # 3. 대운-프로그레션 연결 분석
    def get_current_daeun_phase(age):
        if age < 10:
            return "대운_초반"
        daeun_year = (age - 10) % 10
        if daeun_year < 3:
            return "대운_초반"
        elif daeun_year < 7:
            return "대운_중반"
        else:
            return "대운_후반"

    daeun_phase1 = get_current_daeun_phase(age1)
    daeun_phase2 = get_current_daeun_phase(age2)

    correlation1 = DAEUN_PROGRESSION_CORRELATION.get("correlation", {}).get(daeun_phase1, {})
    correlation2 = DAEUN_PROGRESSION_CORRELATION.get("correlation", {}).get(daeun_phase2, {})

    result["daeun_progression_link"]["person1"] = {
        "daeun_phase": daeun_phase1,
        "relationship_focus": correlation1.get("relationship_focus", ""),
        "meaning": correlation1.get("meaning", "")
    }
    result["daeun_progression_link"]["person2"] = {
        "daeun_phase": daeun_phase2,
        "relationship_focus": correlation2.get("relationship_focus", ""),
        "meaning": correlation2.get("meaning", "")
    }

    if daeun_phase1 == daeun_phase2:
        total_score += 5
        result["daeun_progression_link"]["sync"] = True
        result["daeun_progression_link"]["sync_meaning"] = "같은 대운 페이즈 - 비슷한 인생 시기"

    # 4. 토성 회귀 체크
    saturn_return_ages = [28, 29, 30, 57, 58, 59]
    if age1 in saturn_return_ages or age2 in saturn_return_ages:
        result["critical_period"] = {
            "type": "saturn_return",
            "affected": [],
            "meaning": CRITICAL_PERIODS.get("saturn_return", {}).get("relationship_effect", ""),
            "advice": CRITICAL_PERIODS.get("saturn_return", {}).get("advice", "")
        }
        if age1 in saturn_return_ages:
            result["critical_period"]["affected"].append("person1")
        if age2 in saturn_return_ages:
            result["critical_period"]["affected"].append("person2")
        total_score -= 3

    result["score"] = max(-10, min(25, total_score))

    if total_score >= 15:
        result["timing_assessment"] = "최적"
        result["relationship_phase"] = "성장과 결실의 시기"
        result["summary"] = "프로그레션 상 매우 좋은 시기입니다! 관계의 성숙과 발전이 기대됩니다."
    elif total_score >= 8:
        result["timing_assessment"] = "좋음"
        result["relationship_phase"] = "안정과 조화의 시기"
        result["summary"] = "프로그레션이 조화롭습니다. 관계를 발전시키기 좋은 시기입니다."
    elif total_score >= 0:
        result["timing_assessment"] = "보통"
        result["relationship_phase"] = "노력이 필요한 시기"
        result["summary"] = "프로그레션 상 평범한 시기입니다. 꾸준한 노력이 중요합니다."
    else:
        result["timing_assessment"] = "도전적"
        result["relationship_phase"] = "변화와 조정의 시기"
        result["summary"] = "프로그레션 상 도전적인 시기입니다. 인내와 이해가 필요합니다."

    return result


def calculate_sipsung(my_stem: str, other_stem: str) -> dict:
    """
    십성(十星) 계산 - 내 일간 기준으로 상대방의 일간이 어떤 십성인지 판단

    Args:
        my_stem: 나의 일간 (甲, 乙, 丙, 丁, 戊, 己, 庚, 辛, 壬, 癸)
        other_stem: 상대방의 일간

    Returns:
        dict with sipsung name, score, meaning
    """
    if not my_stem or not other_stem:
        return {"sipsung": "unknown", "score": 70, "meaning": "데이터 부족"}

    my_element = STEM_TO_ELEMENT.get(my_stem)
    other_element = STEM_TO_ELEMENT.get(other_stem)
    my_polarity = STEM_POLARITY.get(my_stem)
    other_polarity = STEM_POLARITY.get(other_stem)

    if not my_element or not other_element:
        return {"sipsung": "unknown", "score": 70, "meaning": "데이터 부족"}

    my_idx = OHENG_ORDER.index(my_element)
    other_idx = OHENG_ORDER.index(other_element)

    # 비겁 (같은 오행)
    if my_element == other_element:
        if my_polarity == other_polarity:
            return {
                "sipsung": "비견",
                **SIPSUNG_COMPATIBILITY["비견"]
            }
        else:
            return {
                "sipsung": "겁재",
                **SIPSUNG_COMPATIBILITY["겁재"]
            }

    # 식상 (내가 생해주는 오행)
    saeng_idx = (my_idx + 1) % 5
    if other_idx == saeng_idx:
        if my_polarity == other_polarity:
            return {
                "sipsung": "식신",
                **SIPSUNG_COMPATIBILITY["식신"]
            }
        else:
            return {
                "sipsung": "상관",
                **SIPSUNG_COMPATIBILITY["상관"]
            }

    # 재성 (내가 극하는 오행)
    geuk_idx = (my_idx + 2) % 5
    if other_idx == geuk_idx:
        if my_polarity == other_polarity:
            return {
                "sipsung": "편재",
                **SIPSUNG_COMPATIBILITY["편재"]
            }
        else:
            return {
                "sipsung": "정재",
                **SIPSUNG_COMPATIBILITY["정재"]
            }

    # 관성 (나를 극하는 오행)
    geuk_by_idx = (my_idx - 2) % 5
    if other_idx == geuk_by_idx:
        if my_polarity == other_polarity:
            return {
                "sipsung": "편관",
                **SIPSUNG_COMPATIBILITY["편관"]
            }
        else:
            return {
                "sipsung": "정관",
                **SIPSUNG_COMPATIBILITY["정관"]
            }

    # 인성 (나를 생해주는 오행)
    saeng_by_idx = (my_idx - 1) % 5
    if other_idx == saeng_by_idx:
        if my_polarity == other_polarity:
            return {
                "sipsung": "편인",
                **SIPSUNG_COMPATIBILITY["편인"]
            }
        else:
            return {
                "sipsung": "정인",
                **SIPSUNG_COMPATIBILITY["정인"]
            }

    return {"sipsung": "unknown", "score": 70, "meaning": "관계 판별 불가"}


def analyze_venus_mars_synastry(person1: dict, person2: dict, relationship_type: str = "lover") -> dict:
    """
    금성-화성 시나스트리 분석 (연인 궁합에서 가장 중요)

    Args:
        person1, person2: 각 사람의 astro 데이터
        relationship_type: 관계 유형

    Returns:
        dict with chemistry analysis
    """
    result = {
        "venus_mars_chemistry": None,
        "score_adjustment": 0,
        "details": [],
        "fusion_insight": "",
    }

    if relationship_type not in ["lover", "spouse"]:
        return result

    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})

    venus1 = astro1.get("venusSign", "").lower().strip()
    venus2 = astro2.get("venusSign", "").lower().strip()
    mars1 = astro1.get("marsSign", "").lower().strip()
    mars2 = astro2.get("marsSign", "").lower().strip()

    if not venus1:
        venus1 = astro1.get("sunSign", "").lower().strip()
    if not venus2:
        venus2 = astro2.get("sunSign", "").lower().strip()
    if not mars1:
        mars1 = astro1.get("sunSign", "").lower().strip()
    if not mars2:
        mars2 = astro2.get("sunSign", "").lower().strip()

    if not venus1 or not mars2:
        return result

    venus1_elem = ZODIAC_ELEMENTS.get(venus1, "")
    venus2_elem = ZODIAC_ELEMENTS.get(venus2, "")
    mars1_elem = ZODIAC_ELEMENTS.get(mars1, "")
    mars2_elem = ZODIAC_ELEMENTS.get(mars2, "")

    chemistry_scores = []

    if venus1_elem and mars2_elem:
        key1 = (venus1_elem, mars2_elem)
        if key1 in VENUS_MARS_SYNASTRY:
            data = VENUS_MARS_SYNASTRY[key1]
            chemistry_scores.append(data["score"])
            result["details"].append(f"A금성-B화성: {data['chemistry']}")
            if data["caution"] != "거의 없음":
                result["details"].append(f"   주의: {data['caution']}")

    if venus2_elem and mars1_elem:
        key2 = (venus2_elem, mars1_elem)
        if key2 in VENUS_MARS_SYNASTRY:
            data = VENUS_MARS_SYNASTRY[key2]
            chemistry_scores.append(data["score"])
            result["details"].append(f"B금성-A화성: {data['chemistry']}")
            if data["caution"] != "거의 없음":
                result["details"].append(f"   주의: {data['caution']}")

    if chemistry_scores:
        avg_score = sum(chemistry_scores) / len(chemistry_scores)
        result["venus_mars_chemistry"] = round(avg_score)
        result["score_adjustment"] = (avg_score - 70) * 0.3

        if avg_score >= 85:
            result["fusion_insight"] = "금성-화성 시너지 최상! 자연스러운 끌림과 열정"
        elif avg_score >= 75:
            result["fusion_insight"] = "좋은 케미스트리, 조화로운 연애 에너지"
        elif avg_score >= 65:
            result["fusion_insight"] = "적절한 끌림, 노력으로 더 좋아질 수 있음"
        else:
            result["fusion_insight"] = "다른 방식의 표현, 서로 이해하려는 노력 필요"

    return result


def analyze_astro_compatibility(sign1: str, sign2: str) -> dict:
    """
    점성술 태양 별자리 궁합 분석

    Args:
        sign1: 첫 번째 사람의 태양 별자리
        sign2: 두 번째 사람의 태양 별자리

    Returns:
        dict with astro compatibility analysis
    """
    result = {
        "relationship": "neutral",
        "score": 70,
        "score_adjustment": 0,
        "meaning": "",
        "details": [],
    }

    sign1_lower = sign1.lower().strip()
    sign2_lower = sign2.lower().strip()

    elem1 = ZODIAC_ELEMENTS.get(sign1_lower, "")
    elem2 = ZODIAC_ELEMENTS.get(sign2_lower, "")

    if elem1 and elem2:
        key = (elem1, elem2) if (elem1, elem2) in ASTRO_ELEMENT_COMPATIBILITY else (elem2, elem1)
        if key in ASTRO_ELEMENT_COMPATIBILITY:
            data = ASTRO_ELEMENT_COMPATIBILITY[key]
            result["score"] = data.get("score", 70)
            result["score_adjustment"] = result["score"] - 70
            result["meaning"] = data.get("chemistry", "")
            result["details"].append(f"원소 궁합: {elem1} - {elem2}")

            if elem1 == elem2:
                result["relationship"] = "same_element"
                result["details"].append("같은 원소 - 쉽게 이해하지만 자극이 부족할 수 있음")
            elif data.get("score", 70) >= 80:
                result["relationship"] = "harmonious"
                result["details"].append("조화로운 원소 조합")
            elif data.get("score", 70) <= 60:
                result["relationship"] = "challenging"
                result["details"].append("도전적인 원소 조합 - 성장의 기회")

    # 같은 별자리
    if sign1_lower == sign2_lower:
        result["relationship"] = "same_sign"
        result["score"] += 5
        result["details"].append("같은 별자리 - 깊은 공감과 이해")

    # 반대 별자리 (대항성)
    opposite_pairs = {
        "aries": "libra", "taurus": "scorpio", "gemini": "sagittarius",
        "cancer": "capricorn", "leo": "aquarius", "virgo": "pisces"
    }
    opposite_pairs.update({v: k for k, v in opposite_pairs.items()})

    if opposite_pairs.get(sign1_lower) == sign2_lower:
        result["relationship"] = "opposite"
        result["score"] += 8
        result["details"].append("대항성 - 서로를 완성하는 관계, 강한 끌림")

    return result


def analyze_planet_synastry_aspects(person1: dict, person2: dict) -> dict:
    """
    행성 간 시나스트리 애스펙트 분석

    Args:
        person1, person2: 각 사람의 데이터 (astro.planets 포함)

    Returns:
        dict with planetary aspect analysis
    """
    result = {
        "major_aspects": [],
        "positive_aspects": [],
        "challenging_aspects": [],
        "score": 0,
        "summary": ""
    }

    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})
    planets1 = astro1.get("planets", {})
    planets2 = astro2.get("planets", {})

    important_planets = ["Sun", "Moon", "Venus", "Mars", "Jupiter"]

    for planet1 in important_planets:
        for planet2 in important_planets:
            pos1 = planets1.get(planet1, "")
            pos2 = planets2.get(planet2, "")

            if not pos1 or not pos2:
                continue

            # 별자리에서 경도 추정
            def get_degree(pos):
                if isinstance(pos, str) and pos:
                    sign = pos.split()[0] if " " in pos else pos
                    return get_sign_midpoint(sign)
                return 0

            deg1 = get_degree(pos1)
            deg2 = get_degree(pos2)

            aspect_result = calculate_aspect(deg1, deg2)

            if aspect_result.get("aspect") != "none":
                aspect_info = {
                    "planet1": planet1,
                    "planet2": planet2,
                    "aspect": aspect_result["aspect"],
                    "score": aspect_result.get("score", 0),
                    "meaning": aspect_result.get("meaning", "")
                }
                result["major_aspects"].append(aspect_info)
                result["score"] += aspect_result.get("score", 0)

                if aspect_result.get("score", 0) > 0:
                    result["positive_aspects"].append(aspect_info)
                elif aspect_result.get("score", 0) < 0:
                    result["challenging_aspects"].append(aspect_info)

    if result["score"] >= 20:
        result["summary"] = "행성 애스펙트가 매우 조화롭습니다. 자연스러운 연결이 많습니다."
    elif result["score"] >= 10:
        result["summary"] = "행성 애스펙트가 좋습니다. 긍정적인 상호작용이 많습니다."
    elif result["score"] >= 0:
        result["summary"] = "행성 애스펙트가 보통입니다. 균형 잡힌 관계입니다."
    else:
        result["summary"] = "행성 애스펙트에 도전적인 면이 있습니다. 성장의 기회로 활용하세요."

    return result
