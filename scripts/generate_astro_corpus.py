#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
점성학 상세 해석 코퍼스 생성기
- 행성-사인 120개 조합
- 행성-하우스 120개 조합
- 애스펙트 225개+ 조합
- 어센던트 12개
- 트랜짓 주요 조합
"""

import json
import os

# =============================================================================
# 기본 데이터 정의
# =============================================================================

PLANETS = {
    "Sun": {"ko": "태양", "keyword": "자아, 정체성, 의지력, 생명력, 아버지"},
    "Moon": {"ko": "달", "keyword": "감정, 무의식, 본능, 습관, 어머니"},
    "Mercury": {"ko": "수성", "keyword": "사고, 소통, 학습, 정보, 이동"},
    "Venus": {"ko": "금성", "keyword": "사랑, 미, 가치관, 재물, 예술"},
    "Mars": {"ko": "화성", "keyword": "행동, 에너지, 욕망, 경쟁, 분노"},
    "Jupiter": {"ko": "목성", "keyword": "확장, 행운, 철학, 고등교육, 해외"},
    "Saturn": {"ko": "토성", "keyword": "제한, 책임, 구조, 시간, 성숙"},
    "Uranus": {"ko": "천왕성", "keyword": "혁신, 자유, 돌발, 기술, 반항"},
    "Neptune": {"ko": "해왕성", "keyword": "영성, 환상, 직관, 예술, 혼란"},
    "Pluto": {"ko": "명왕성", "keyword": "변환, 권력, 재생, 심층심리, 극단"}
}

SIGNS = {
    "Aries": {"ko": "양자리", "element": "Fire", "modality": "Cardinal", "ruler": "Mars",
              "keyword": "개척, 용기, 독립, 충동, 경쟁심"},
    "Taurus": {"ko": "황소자리", "element": "Earth", "modality": "Fixed", "ruler": "Venus",
               "keyword": "안정, 소유, 감각, 인내, 고집"},
    "Gemini": {"ko": "쌍둥이자리", "element": "Air", "modality": "Mutable", "ruler": "Mercury",
               "keyword": "소통, 호기심, 다재다능, 변화, 이중성"},
    "Cancer": {"ko": "게자리", "element": "Water", "modality": "Cardinal", "ruler": "Moon",
               "keyword": "보호, 가정, 감정, 양육, 민감"},
    "Leo": {"ko": "사자자리", "element": "Fire", "modality": "Fixed", "ruler": "Sun",
            "keyword": "자부심, 창조성, 리더십, 관대함, 드라마"},
    "Virgo": {"ko": "처녀자리", "element": "Earth", "modality": "Mutable", "ruler": "Mercury",
              "keyword": "분석, 봉사, 완벽주의, 실용, 건강"},
    "Libra": {"ko": "천칭자리", "element": "Air", "modality": "Cardinal", "ruler": "Venus",
              "keyword": "균형, 관계, 조화, 미, 공정"},
    "Scorpio": {"ko": "전갈자리", "element": "Water", "modality": "Fixed", "ruler": "Pluto",
                "keyword": "심층, 변환, 열정, 비밀, 통찰"},
    "Sagittarius": {"ko": "사수자리", "element": "Fire", "modality": "Mutable", "ruler": "Jupiter",
                    "keyword": "탐험, 철학, 자유, 낙관, 확장"},
    "Capricorn": {"ko": "염소자리", "element": "Earth", "modality": "Cardinal", "ruler": "Saturn",
                  "keyword": "야망, 책임, 구조, 성취, 권위"},
    "Aquarius": {"ko": "물병자리", "element": "Air", "modality": "Fixed", "ruler": "Uranus",
                 "keyword": "혁신, 인도주의, 독립, 독창성, 미래"},
    "Pisces": {"ko": "물고기자리", "element": "Water", "modality": "Mutable", "ruler": "Neptune",
               "keyword": "직관, 영성, 동정심, 예술, 초월"}
}

HOUSES = {
    1: {"ko": "1하우스", "keyword": "자아, 외모, 첫인상, 시작, 성격", "life_area": "self"},
    2: {"ko": "2하우스", "keyword": "재물, 가치관, 소유물, 자원, 자존감", "life_area": "money"},
    3: {"ko": "3하우스", "keyword": "소통, 학습, 형제, 단거리 이동, 글쓰기", "life_area": "communication"},
    4: {"ko": "4하우스", "keyword": "가정, 뿌리, 부동산, 부모, 심리적 기반", "life_area": "home"},
    5: {"ko": "5하우스", "keyword": "창조성, 연애, 자녀, 취미, 즐거움", "life_area": "creativity"},
    6: {"ko": "6하우스", "keyword": "건강, 일상, 직장, 봉사, 루틴", "life_area": "health"},
    7: {"ko": "7하우스", "keyword": "파트너십, 결혼, 계약, 대인관계, 적", "life_area": "partnership"},
    8: {"ko": "8하우스", "keyword": "변환, 공동재산, 심리, 죽음과재생, 성", "life_area": "transformation"},
    9: {"ko": "9하우스", "keyword": "철학, 고등교육, 해외, 종교, 진리탐구", "life_area": "philosophy"},
    10: {"ko": "10하우스", "keyword": "사회적지위, 직업, 명예, 업적, 권위", "life_area": "career"},
    11: {"ko": "11하우스", "keyword": "친구, 단체, 희망, 미래, 인도주의", "life_area": "community"},
    12: {"ko": "12하우스", "keyword": "무의식, 은둔, 영성, 희생, 숨겨진것", "life_area": "unconscious"}
}

ASPECTS = {
    "conjunction": {"ko": "합", "angle": 0, "nature": "neutral",
                    "keyword": "융합, 강화, 새로운 시작, 집중"},
    "sextile": {"ko": "육분", "angle": 60, "nature": "harmonious",
                "keyword": "기회, 협력, 재능 활용, 조화"},
    "square": {"ko": "사각", "angle": 90, "nature": "challenging",
               "keyword": "긴장, 도전, 성장 동력, 갈등"},
    "trine": {"ko": "삼합", "angle": 120, "nature": "harmonious",
              "keyword": "자연스러운 흐름, 재능, 행운, 조화"},
    "opposition": {"ko": "대립", "angle": 180, "nature": "challenging",
                   "keyword": "인식, 균형 필요, 투사, 통합 과제"}
}

# 행성 품위 (Dignity)
DIGNITIES = {
    "Sun": {"domicile": "Leo", "exalted": "Aries", "detriment": "Aquarius", "fall": "Libra"},
    "Moon": {"domicile": "Cancer", "exalted": "Taurus", "detriment": "Capricorn", "fall": "Scorpio"},
    "Mercury": {"domicile": ["Gemini", "Virgo"], "exalted": "Virgo", "detriment": ["Sagittarius", "Pisces"], "fall": "Pisces"},
    "Venus": {"domicile": ["Taurus", "Libra"], "exalted": "Pisces", "detriment": ["Scorpio", "Aries"], "fall": "Virgo"},
    "Mars": {"domicile": ["Aries", "Scorpio"], "exalted": "Capricorn", "detriment": ["Libra", "Taurus"], "fall": "Cancer"},
    "Jupiter": {"domicile": ["Sagittarius", "Pisces"], "exalted": "Cancer", "detriment": ["Gemini", "Virgo"], "fall": "Capricorn"},
    "Saturn": {"domicile": ["Capricorn", "Aquarius"], "exalted": "Libra", "detriment": ["Cancer", "Leo"], "fall": "Aries"},
    "Uranus": {"domicile": "Aquarius", "exalted": "Scorpio", "detriment": "Leo", "fall": "Taurus"},
    "Neptune": {"domicile": "Pisces", "exalted": "Leo", "detriment": "Virgo", "fall": "Aquarius"},
    "Pluto": {"domicile": "Scorpio", "exalted": "Aries", "detriment": "Taurus", "fall": "Libra"}
}


def get_dignity(planet, sign):
    """행성의 품위 계산"""
    dig = DIGNITIES.get(planet, {})

    domicile = dig.get("domicile", [])
    if isinstance(domicile, str):
        domicile = [domicile]
    if sign in domicile:
        return "domicile"

    exalted = dig.get("exalted")
    if sign == exalted:
        return "exalted"

    detriment = dig.get("detriment", [])
    if isinstance(detriment, str):
        detriment = [detriment]
    if sign in detriment:
        return "detriment"

    fall = dig.get("fall")
    if sign == fall:
        return "fall"

    return "peregrine"


# =============================================================================
# 행성-사인 해석 생성
# =============================================================================

def generate_planet_sign_interpretations():
    """120개 행성-사인 조합 해석 생성"""
    interpretations = []

    for planet_en, planet_data in PLANETS.items():
        planet_ko = planet_data["ko"]
        planet_keyword = planet_data["keyword"]

        for sign_en, sign_data in SIGNS.items():
            sign_ko = sign_data["ko"]
            sign_keyword = sign_data["keyword"]
            element = sign_data["element"]
            modality = sign_data["modality"]

            dignity = get_dignity(planet_en, sign_en)

            # 품위별 해석 생성
            dignity_text = {
                "domicile": f"{planet_ko}이(가) 본래의 자리인 {sign_ko}에서 가장 강력하고 자연스럽게 에너지를 발휘합니다.",
                "exalted": f"{planet_ko}이(가) {sign_ko}에서 고양되어 최고의 표현력을 보여줍니다.",
                "detriment": f"{planet_ko}이(가) {sign_ko}에서 불편함을 느끼며, 본래 에너지 표현에 어려움이 있습니다.",
                "fall": f"{planet_ko}이(가) {sign_ko}에서 약화되어 있으며, 의식적인 노력이 필요합니다.",
                "peregrine": f"{planet_ko}이(가) {sign_ko}의 특성과 혼합되어 독특한 표현을 만들어냅니다."
            }

            # 원소별 추가 해석
            element_text = {
                "Fire": "불의 원소로 인해 열정적이고 적극적인 방식으로 표현됩니다.",
                "Earth": "흙의 원소로 인해 실용적이고 현실적인 방식으로 표현됩니다.",
                "Air": "공기의 원소로 인해 지적이고 소통 지향적으로 표현됩니다.",
                "Water": "물의 원소로 인해 감정적이고 직관적으로 표현됩니다."
            }

            # 모달리티별 추가 해석
            modality_text = {
                "Cardinal": "카디널 특성으로 시작하고 이끄는 에너지가 강합니다.",
                "Fixed": "고정 특성으로 지속하고 유지하는 에너지가 강합니다.",
                "Mutable": "변동 특성으로 적응하고 변화하는 에너지가 강합니다."
            }

            interpretation = {
                "id": f"{planet_en}_in_{sign_en}",
                "planet": {"en": planet_en, "ko": planet_ko},
                "sign": {"en": sign_en, "ko": sign_ko},
                "element": element,
                "modality": modality,
                "dignity": dignity,
                "core_interpretation": f"{planet_ko}({planet_keyword})이(가) {sign_ko}({sign_keyword})에 있을 때: {dignity_text[dignity]} {element_text[element]} {modality_text[modality]}",
                "personality": generate_personality_text(planet_en, sign_en, planet_ko, sign_ko),
                "strengths": generate_strengths_text(planet_en, sign_en, dignity),
                "challenges": generate_challenges_text(planet_en, sign_en, dignity),
                "life_advice": generate_life_advice_text(planet_en, sign_en),
                "career_hints": generate_career_hints(planet_en, sign_en),
                "relationship_style": generate_relationship_style(planet_en, sign_en)
            }

            interpretations.append(interpretation)

    return interpretations


def generate_personality_text(planet, sign, planet_ko, sign_ko):
    """성격 해석 생성"""
    templates = {
        ("Sun", "Aries"): "강렬한 자아의식과 개척 정신을 가진 리더형입니다. 새로운 것에 도전하고 앞장서는 것을 두려워하지 않으며, 독립적이고 용감합니다.",
        ("Sun", "Taurus"): "안정적이고 실용적인 자아를 가졌습니다. 인내심이 강하고 감각적 즐거움을 추구하며, 한번 시작한 일은 끝까지 해내는 끈기가 있습니다.",
        ("Sun", "Gemini"): "다재다능하고 호기심 많은 성격입니다. 소통과 학습에 뛰어나며, 다양한 관심사를 가지고 변화를 즐깁니다.",
        ("Sun", "Cancer"): "감정이 풍부하고 가정적인 성격입니다. 가족과 사랑하는 사람들을 보호하려는 본능이 강하며, 직관력이 뛰어납니다.",
        ("Sun", "Leo"): "자신감 넘치고 창조적인 리더입니다. 주목받는 것을 좋아하고 관대하며, 드라마틱한 표현력을 가졌습니다.",
        ("Sun", "Virgo"): "분석적이고 실용적인 성격입니다. 세부사항에 주의를 기울이며, 봉사와 개선에 헌신합니다.",
        ("Sun", "Libra"): "균형과 조화를 추구하는 외교적 성격입니다. 관계를 중시하고 공정함을 추구하며, 미적 감각이 뛰어납니다.",
        ("Sun", "Scorpio"): "강렬하고 통찰력 있는 성격입니다. 진실을 추구하고 변환의 힘을 가지며, 깊은 감정과 의지력을 보여줍니다.",
        ("Sun", "Sagittarius"): "낙관적이고 자유를 사랑하는 탐험가입니다. 철학과 진리를 추구하며, 넓은 시야를 가졌습니다.",
        ("Sun", "Capricorn"): "야망 있고 책임감 강한 성격입니다. 목표 지향적이며 인내심으로 정상에 오르는 사람입니다.",
        ("Sun", "Aquarius"): "독창적이고 인도주의적인 성격입니다. 혁신을 추구하고 개성을 중시하며, 미래지향적 사고를 합니다.",
        ("Sun", "Pisces"): "직관적이고 영적인 성격입니다. 예술적 감수성이 풍부하고 동정심이 깊으며, 경계를 초월하는 이해력을 가졌습니다.",
        # Moon
        ("Moon", "Aries"): "감정이 빠르고 직접적입니다. 독립적인 감정 생활을 원하며, 열정적이지만 금방 식기도 합니다.",
        ("Moon", "Taurus"): "감정적으로 안정적이고 충성스럽습니다. 물질적 안정이 정서적 안정을 가져다주며, 변화에 저항합니다.",
        ("Moon", "Gemini"): "감정이 다양하고 변화무쌍합니다. 대화를 통해 감정을 처리하며, 지적 자극이 정서적 만족을 줍니다.",
        ("Moon", "Cancer"): "깊은 감정과 강한 직관력을 가졌습니다. 가정과 가족이 정서적 중심이며, 과거에 대한 기억이 강합니다.",
        ("Moon", "Leo"): "따뜻하고 관대한 감정 표현을 합니다. 인정받고 싶은 욕구가 있으며, 드라마틱한 감정 표현을 합니다.",
        ("Moon", "Virgo"): "감정을 분석하고 정리하려 합니다. 봉사를 통해 정서적 만족을 얻으며, 걱정이 많을 수 있습니다.",
        ("Moon", "Libra"): "조화로운 환경에서 정서적 안정을 찾습니다. 갈등을 피하고 관계에서 균형을 추구합니다.",
        ("Moon", "Scorpio"): "감정이 깊고 강렬합니다. 쉽게 드러내지 않지만 한번 느끼면 매우 깊으며, 직관력이 뛰어납니다.",
        ("Moon", "Sagittarius"): "자유롭고 낙관적인 감정 생활을 합니다. 새로운 경험에서 정서적 자극을 받으며, 구속을 싫어합니다.",
        ("Moon", "Capricorn"): "감정을 통제하고 억제하는 경향이 있습니다. 책임감이 정서적 안정을 주며, 성숙한 감정 표현을 합니다.",
        ("Moon", "Aquarius"): "독특하고 독립적인 감정 생활을 합니다. 인류애적 감정이 강하지만, 개인적 감정 표현은 어려울 수 있습니다.",
        ("Moon", "Pisces"): "매우 민감하고 공감 능력이 뛰어납니다. 경계가 없어 타인의 감정을 흡수하며, 예술적 감수성이 풍부합니다.",
    }

    key = (planet, sign)
    if key in templates:
        return templates[key]

    # 템플릿에 없는 조합은 일반 설명 생성
    return f"{planet_ko}이(가) {sign_ko}에 있어 {PLANETS[planet]['keyword'].split(',')[0]}의 에너지가 {SIGNS[sign]['keyword'].split(',')[0]}의 특성으로 표현됩니다."


def generate_strengths_text(planet, sign, dignity):
    """강점 해석 생성"""
    base_strengths = {
        "domicile": "본래의 힘을 온전히 발휘할 수 있어 자연스럽고 강력합니다.",
        "exalted": "최고의 표현력을 보이며 탁월한 능력을 발휘합니다.",
        "detriment": "어려움 속에서도 독특한 관점을 개발할 수 있습니다.",
        "fall": "의식적 노력을 통해 남들이 보지 못하는 통찰을 얻습니다.",
        "peregrine": "유연하게 적응하며 다양한 방식으로 표현할 수 있습니다."
    }

    planet_strength = {
        "Sun": "강한 자아의식과 리더십",
        "Moon": "깊은 직관력과 공감 능력",
        "Mercury": "뛰어난 소통력과 분석력",
        "Venus": "예술적 감각과 관계 형성 능력",
        "Mars": "추진력과 결단력",
        "Jupiter": "낙관주의와 확장하는 능력",
        "Saturn": "인내력과 구조화하는 능력",
        "Uranus": "혁신적 사고와 독창성",
        "Neptune": "예술적 영감과 영적 통찰",
        "Pluto": "변환의 힘과 재생 능력"
    }

    return f"{planet_strength.get(planet, '')}을 가지고 있으며, {base_strengths.get(dignity, '')}"


def generate_challenges_text(planet, sign, dignity):
    """도전 과제 해석 생성"""
    challenges = {
        "domicile": "힘이 강한 만큼 과도하게 표현될 수 있어 균형이 필요합니다.",
        "exalted": "너무 이상적인 기대를 가질 수 있어 현실과 조화가 필요합니다.",
        "detriment": "본래의 에너지가 어색하게 표현되어 좌절감을 느낄 수 있습니다.",
        "fall": "에너지가 약해져 자신감 부족이나 두려움이 생길 수 있습니다.",
        "peregrine": "일관성 없이 표현될 수 있어 의식적인 통합이 필요합니다."
    }

    return challenges.get(dignity, "균형 잡힌 표현을 위해 의식적인 노력이 필요합니다.")


def generate_life_advice_text(planet, sign):
    """인생 조언 생성"""
    element = SIGNS[sign]["element"]

    element_advice = {
        "Fire": "열정을 생산적으로 사용하고, 충동을 조절하는 법을 배우세요.",
        "Earth": "실용적 목표를 세우고, 때로는 유연성을 가지세요.",
        "Air": "아이디어를 현실로 옮기고, 감정적 깊이도 탐험하세요.",
        "Water": "직관을 신뢰하되, 논리적 사고도 발전시키세요."
    }

    return element_advice.get(element, "균형 잡힌 삶을 추구하세요.")


def generate_career_hints(planet, sign):
    """직업 힌트 생성"""
    career_map = {
        "Sun": {"Fire": "리더, 기업가, 정치인", "Earth": "경영자, 부동산", "Air": "홍보, 미디어", "Water": "상담사, 예술가"},
        "Moon": {"Fire": "엔터테인먼트, 요식업", "Earth": "부동산, 의료", "Air": "작가, 교육", "Water": "심리상담, 간호"},
        "Mercury": {"Fire": "세일즈, 스포츠 기자", "Earth": "회계, 데이터분석", "Air": "저널리스트, 번역", "Water": "시인, 상담사"},
        "Venus": {"Fire": "패션, 이벤트", "Earth": "금융, 인테리어", "Air": "외교, 예술평론", "Water": "음악, 치료예술"},
        "Mars": {"Fire": "운동선수, 군인", "Earth": "건축, 외과의", "Air": "변호사, 토론가", "Water": "심리치료, 탐정"},
        "Jupiter": {"Fire": "철학교수, 탐험가", "Earth": "투자, 부동산개발", "Air": "출판, 국제관계", "Water": "종교지도자, 자선"},
        "Saturn": {"Fire": "공학 경영", "Earth": "건축, 행정", "Air": "법률, 정치", "Water": "역사, 고고학"},
        "Uranus": {"Fire": "발명가, 스타트업", "Earth": "친환경기술", "Air": "IT, 방송", "Water": "대체의학, 점성술"},
        "Neptune": {"Fire": "영화제작, 광고", "Earth": "사진, 와인", "Air": "시나리오, 심리학", "Water": "음악, 영성지도"},
        "Pluto": {"Fire": "위기관리, 변환리더", "Earth": "광업, 재활용", "Air": "심층취재, 연구", "Water": "심리치료, 장례"}
    }

    element = SIGNS[sign]["element"]
    return career_map.get(planet, {}).get(element, "다양한 분야에서 능력 발휘 가능")


def generate_relationship_style(planet, sign):
    """관계 스타일 생성"""
    if planet in ["Venus", "Moon"]:
        element = SIGNS[sign]["element"]
        styles = {
            "Fire": "열정적이고 적극적인 사랑을 합니다. 흥분과 새로움을 추구합니다.",
            "Earth": "안정적이고 충실한 파트너입니다. 실질적인 헌신을 보여줍니다.",
            "Air": "지적 교류를 중시합니다. 대화와 정신적 연결이 중요합니다.",
            "Water": "깊고 감정적인 유대를 원합니다. 직관적으로 파트너를 이해합니다."
        }
        return styles.get(element, "")
    return ""


# =============================================================================
# 행성-하우스 해석 생성
# =============================================================================

def generate_planet_house_interpretations():
    """120개 행성-하우스 조합 해석 생성"""
    interpretations = []

    for planet_en, planet_data in PLANETS.items():
        planet_ko = planet_data["ko"]
        planet_keyword = planet_data["keyword"]

        for house_num, house_data in HOUSES.items():
            house_ko = house_data["ko"]
            house_keyword = house_data["keyword"]
            life_area = house_data["life_area"]

            interpretation = {
                "id": f"{planet_en}_in_house_{house_num}",
                "planet": {"en": planet_en, "ko": planet_ko},
                "house": {"number": house_num, "ko": house_ko},
                "life_area": life_area,
                "core_interpretation": generate_planet_house_core(planet_en, house_num, planet_ko, house_ko),
                "manifestation": generate_planet_house_manifestation(planet_en, house_num),
                "challenges": generate_planet_house_challenges(planet_en, house_num),
                "opportunities": generate_planet_house_opportunities(planet_en, house_num)
            }

            interpretations.append(interpretation)

    return interpretations


def generate_planet_house_core(planet, house, planet_ko, house_ko):
    """행성-하우스 핵심 해석"""
    house_meanings = {
        1: "자아와 정체성",
        2: "재물과 가치관",
        3: "소통과 학습",
        4: "가정과 뿌리",
        5: "창조성과 즐거움",
        6: "건강과 일상",
        7: "파트너십과 관계",
        8: "변환과 공유자원",
        9: "철학과 확장",
        10: "사회적 지위와 직업",
        11: "우정과 희망",
        12: "무의식과 영성"
    }

    planet_action = {
        "Sun": "빛을 비추고 활성화합니다",
        "Moon": "감정적으로 반응하고 양육합니다",
        "Mercury": "사고하고 소통합니다",
        "Venus": "사랑하고 가치를 부여합니다",
        "Mars": "행동하고 추진합니다",
        "Jupiter": "확장하고 풍요롭게 합니다",
        "Saturn": "구조화하고 제한합니다",
        "Uranus": "혁신하고 변화시킵니다",
        "Neptune": "영감을 주고 초월합니다",
        "Pluto": "변환하고 재생합니다"
    }

    return f"{planet_ko}이(가) {house_ko}에서 {house_meanings[house]}의 영역을 {planet_action[planet]}."


def generate_planet_house_manifestation(planet, house):
    """행성-하우스 발현 양상"""
    manifestations = {
        ("Sun", 1): "강한 자아 정체성과 리더십, 개성이 뚜렷하고 존재감이 강합니다.",
        ("Sun", 10): "사회적 성공과 명예를 추구하며, 공적 영역에서 빛나고자 합니다.",
        ("Moon", 4): "가정이 정서적 중심이며, 가족과의 유대가 매우 중요합니다.",
        ("Moon", 7): "파트너에게 정서적으로 깊이 연결되며, 관계에서 안정을 찾습니다.",
        ("Venus", 5): "예술과 로맨스에 재능이 있으며, 창조적 자기표현을 즐깁니다.",
        ("Venus", 7): "조화로운 파트너십을 추구하며, 결혼과 관계가 인생의 중요한 부분입니다.",
        ("Mars", 1): "적극적이고 경쟁적이며, 강한 추진력과 결단력을 가졌습니다.",
        ("Mars", 10): "야심차고 직업적 성공을 위해 노력하며, 권위적 위치를 추구합니다.",
        ("Jupiter", 9): "철학, 종교, 고등교육에 관심이 많고 해외 여행/유학 기회가 많습니다.",
        ("Saturn", 10): "직업에서 큰 책임을 지며, 시간이 지나면서 권위를 얻습니다.",
    }

    key = (planet, house)
    if key in manifestations:
        return manifestations[key]

    return f"{PLANETS[planet]['ko']}의 에너지가 {HOUSES[house]['ko']}의 영역에서 표현됩니다."


def generate_planet_house_challenges(planet, house):
    """행성-하우스 도전 과제"""
    return f"{HOUSES[house]['ko']}의 영역에서 {PLANETS[planet]['ko']}의 에너지를 균형 있게 사용하는 것이 과제입니다."


def generate_planet_house_opportunities(planet, house):
    """행성-하우스 기회"""
    return f"{PLANETS[planet]['ko']}의 에너지를 {HOUSES[house]['keyword'].split(',')[0]}에 집중하면 성장의 기회가 됩니다."


# =============================================================================
# 애스펙트 해석 생성
# =============================================================================

def generate_aspect_interpretations():
    """행성간 애스펙트 해석 생성"""
    interpretations = []
    planet_list = list(PLANETS.keys())

    for i, planet1 in enumerate(planet_list):
        for planet2 in planet_list[i+1:]:
            for aspect_en, aspect_data in ASPECTS.items():
                interpretation = {
                    "id": f"{planet1}_{aspect_en}_{planet2}",
                    "planet1": {"en": planet1, "ko": PLANETS[planet1]["ko"]},
                    "planet2": {"en": planet2, "ko": PLANETS[planet2]["ko"]},
                    "aspect": {"en": aspect_en, "ko": aspect_data["ko"], "angle": aspect_data["angle"]},
                    "nature": aspect_data["nature"],
                    "core_interpretation": generate_aspect_core(planet1, planet2, aspect_en, aspect_data),
                    "positive_expression": generate_aspect_positive(planet1, planet2, aspect_en),
                    "challenging_expression": generate_aspect_challenging(planet1, planet2, aspect_en),
                    "integration_advice": generate_aspect_advice(planet1, planet2, aspect_en)
                }

                interpretations.append(interpretation)

    return interpretations


def generate_aspect_core(planet1, planet2, aspect, aspect_data):
    """애스펙트 핵심 해석"""
    p1_ko = PLANETS[planet1]["ko"]
    p2_ko = PLANETS[planet2]["ko"]
    asp_ko = aspect_data["ko"]
    nature = aspect_data["nature"]

    nature_text = {
        "neutral": "두 에너지가 융합하여 하나가 됩니다.",
        "harmonious": "두 에너지가 조화롭게 협력합니다.",
        "challenging": "두 에너지 사이에 긴장이 있지만 성장의 동력이 됩니다."
    }

    return f"{p1_ko}와(과) {p2_ko}가 {asp_ko}({aspect_data['angle']}°)를 이룹니다. {nature_text[nature]}"


def generate_aspect_positive(planet1, planet2, aspect):
    """긍정적 표현"""
    combinations = {
        ("Sun", "Moon"): "자아와 감정의 통합, 내면의 조화",
        ("Sun", "Mercury"): "명확한 자기표현과 소통 능력",
        ("Sun", "Venus"): "자신을 사랑하고 창조적 표현",
        ("Sun", "Mars"): "강한 의지력과 실행력",
        ("Sun", "Jupiter"): "자신감과 낙관주의, 성공 가능성",
        ("Moon", "Venus"): "감정적 조화와 사랑하는 능력",
        ("Mercury", "Jupiter"): "넓은 시야와 학습 능력",
        ("Venus", "Mars"): "열정적인 사랑과 매력",
        ("Jupiter", "Saturn"): "이상과 현실의 균형",
    }

    key = (planet1, planet2)
    if key in combinations:
        return combinations[key]
    return f"{PLANETS[planet1]['ko']}와(과) {PLANETS[planet2]['ko']}의 시너지"


def generate_aspect_challenging(planet1, planet2, aspect):
    """도전적 표현"""
    return f"{PLANETS[planet1]['ko']}와(과) {PLANETS[planet2]['ko']} 사이의 갈등을 의식적으로 통합해야 합니다."


def generate_aspect_advice(planet1, planet2, aspect):
    """통합 조언"""
    if aspect in ["trine", "sextile"]:
        return "자연스러운 재능을 의식적으로 활용하고 발전시키세요."
    elif aspect in ["square", "opposition"]:
        return "긴장을 성장의 동력으로 전환하세요. 두 에너지의 균형점을 찾으세요."
    else:  # conjunction
        return "융합된 에너지를 하나의 통합된 표현으로 발전시키세요."


# =============================================================================
# 어센던트/트랜짓 해석 생성
# =============================================================================

def generate_ascendant_interpretations():
    """12개 어센던트 해석"""
    interpretations = []

    for sign_en, sign_data in SIGNS.items():
        interpretation = {
            "id": f"ASC_{sign_en}",
            "sign": {"en": sign_en, "ko": sign_data["ko"]},
            "element": sign_data["element"],
            "ruler": sign_data["ruler"],
            "first_impression": generate_asc_impression(sign_en, sign_data),
            "approach_to_life": generate_asc_approach(sign_en, sign_data),
            "physical_appearance": generate_asc_appearance(sign_en, sign_data),
            "life_path": generate_asc_life_path(sign_en, sign_data)
        }

        interpretations.append(interpretation)

    return interpretations


def generate_asc_impression(sign, sign_data):
    """첫인상 해석"""
    impressions = {
        "Aries": "에너지 넘치고 직접적이며 용감해 보입니다. 리더 같은 인상을 줍니다.",
        "Taurus": "안정적이고 신뢰할 수 있어 보입니다. 차분하고 감각적인 매력이 있습니다.",
        "Gemini": "재치 있고 호기심 많아 보입니다. 대화하기 쉽고 다재다능해 보입니다.",
        "Cancer": "따뜻하고 친근해 보입니다. 보호적이고 배려심 있는 인상을 줍니다.",
        "Leo": "당당하고 자신감 있어 보입니다. 화려하고 주목을 끄는 매력이 있습니다.",
        "Virgo": "깔끔하고 지적으로 보입니다. 세심하고 실용적인 인상을 줍니다.",
        "Libra": "매력적이고 우아해 보입니다. 외교적이고 균형 잡힌 인상을 줍니다.",
        "Scorpio": "강렬하고 신비로워 보입니다. 깊이 있고 통찰력 있는 인상을 줍니다.",
        "Sagittarius": "활기차고 낙관적으로 보입니다. 자유롭고 모험적인 인상을 줍니다.",
        "Capricorn": "성숙하고 책임감 있어 보입니다. 권위 있고 신뢰할 수 있는 인상을 줍니다.",
        "Aquarius": "독특하고 독립적으로 보입니다. 진보적이고 개성 있는 인상을 줍니다.",
        "Pisces": "부드럽고 예술적으로 보입니다. 공감적이고 직관적인 인상을 줍니다."
    }
    return impressions.get(sign, "")


def generate_asc_approach(sign, sign_data):
    """삶에 대한 접근법"""
    return f"{sign_data['keyword'].split(',')[0]}의 에너지로 세상을 마주하며, {sign_data['element']} 원소의 방식으로 삶에 접근합니다."


def generate_asc_appearance(sign, sign_data):
    """외모 특성"""
    appearances = {
        "Aries": "날카로운 이목구비, 운동선수 같은 체형",
        "Taurus": "둥근 얼굴, 감각적인 입술, 튼튼한 체형",
        "Gemini": "날렵한 체형, 표정이 풍부한 얼굴",
        "Cancer": "둥근 얼굴, 부드러운 눈빛, 보호색의 옷차림",
        "Leo": "풍성한 머리카락, 당당한 자세, 화려한 스타일",
        "Virgo": "깔끔한 외모, 단정한 차림, 세련된 스타일",
        "Libra": "균형 잡힌 이목구비, 매력적인 미소, 우아한 스타일",
        "Scorpio": "강렬한 눈빛, 날카로운 이목구비, 신비로운 분위기",
        "Sagittarius": "긴 체형, 밝은 표정, 캐주얼한 스타일",
        "Capricorn": "뼈대 있는 얼굴, 성숙한 분위기, 클래식한 스타일",
        "Aquarius": "독특한 특징, 개성 있는 스타일, 현대적인 분위기",
        "Pisces": "부드러운 눈빛, 몽환적인 분위기, 예술적인 스타일"
    }
    return appearances.get(sign, "")


def generate_asc_life_path(sign, sign_data):
    """인생 경로"""
    ruler = sign_data["ruler"]
    return f"차트의 지배성 {PLANETS[ruler]['ko']}의 위치가 인생의 방향을 크게 좌우합니다."


def generate_transit_interpretations():
    """주요 트랜짓 해석"""
    interpretations = []

    # 외행성 트랜짓 (중요한 것들만)
    outer_planets = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]
    natal_points = ["Sun", "Moon", "Mercury", "Venus", "Mars", "ASC", "MC"]

    for transit_planet in outer_planets:
        for natal_point in natal_points:
            for aspect in ["conjunction", "square", "opposition", "trine"]:
                interpretation = {
                    "id": f"TR_{transit_planet}_{aspect}_{natal_point}",
                    "transit_planet": {"en": transit_planet, "ko": PLANETS[transit_planet]["ko"]},
                    "natal_point": natal_point,
                    "aspect": aspect,
                    "duration": get_transit_duration(transit_planet),
                    "theme": generate_transit_theme(transit_planet, natal_point, aspect),
                    "advice": generate_transit_advice(transit_planet, natal_point, aspect)
                }
                interpretations.append(interpretation)

    return interpretations


def get_transit_duration(planet):
    """트랜짓 지속 기간"""
    durations = {
        "Jupiter": "약 1년간 영향",
        "Saturn": "약 2-3년간 영향",
        "Uranus": "약 7년간 영향",
        "Neptune": "약 14년간 영향",
        "Pluto": "약 15-30년간 영향"
    }
    return durations.get(planet, "")


def generate_transit_theme(transit_planet, natal_point, aspect):
    """트랜짓 테마"""
    themes = {
        "Jupiter": "확장, 기회, 성장, 행운",
        "Saturn": "제한, 시험, 성숙, 책임",
        "Uranus": "변화, 해방, 돌발, 혁신",
        "Neptune": "환상, 영감, 혼란, 초월",
        "Pluto": "변환, 권력, 재생, 심층 변화"
    }

    aspect_mod = {
        "conjunction": "강력한 새로운 시작",
        "square": "도전과 성장 압력",
        "opposition": "인식과 균형 필요",
        "trine": "자연스러운 흐름과 기회"
    }

    return f"{themes[transit_planet]} - {aspect_mod[aspect]}"


def generate_transit_advice(transit_planet, natal_point, aspect):
    """트랜짓 조언"""
    if aspect in ["conjunction", "square", "opposition"]:
        return "이 시기의 에너지를 의식적으로 활용하세요. 변화에 저항하지 말고 흐름에 맡기되, 중요한 결정은 신중하게 하세요."
    else:
        return "이 시기의 순조로운 에너지를 적극적으로 활용하세요. 좋은 기회가 올 수 있습니다."


# =============================================================================
# 메인 함수
# =============================================================================

def main():
    """메인 실행 함수"""
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

    output_dir = os.path.join(os.path.dirname(__file__), '..', 'backend_ai', 'data', 'graph', 'astro_database', 'interpretations')
    os.makedirs(output_dir, exist_ok=True)

    print("=== 점성학 상세 해석 코퍼스 생성 ===\n")

    # 1. 행성-사인 해석
    print("1. 행성-사인 해석 생성 중...")
    planet_sign = generate_planet_sign_interpretations()
    with open(os.path.join(output_dir, 'planet_sign_detailed.json'), 'w', encoding='utf-8') as f:
        json.dump({"meta": {"type": "planet_in_sign", "count": len(planet_sign)}, "interpretations": planet_sign}, f, ensure_ascii=False, indent=2)
    print(f"   ✓ {len(planet_sign)}개 생성 완료")

    # 2. 행성-하우스 해석
    print("2. 행성-하우스 해석 생성 중...")
    planet_house = generate_planet_house_interpretations()
    with open(os.path.join(output_dir, 'planet_house_detailed.json'), 'w', encoding='utf-8') as f:
        json.dump({"meta": {"type": "planet_in_house", "count": len(planet_house)}, "interpretations": planet_house}, f, ensure_ascii=False, indent=2)
    print(f"   ✓ {len(planet_house)}개 생성 완료")

    # 3. 애스펙트 해석
    print("3. 애스펙트 해석 생성 중...")
    aspects = generate_aspect_interpretations()
    with open(os.path.join(output_dir, 'aspects_detailed.json'), 'w', encoding='utf-8') as f:
        json.dump({"meta": {"type": "aspects", "count": len(aspects)}, "interpretations": aspects}, f, ensure_ascii=False, indent=2)
    print(f"   ✓ {len(aspects)}개 생성 완료")

    # 4. 어센던트 해석
    print("4. 어센던트 해석 생성 중...")
    ascendants = generate_ascendant_interpretations()
    with open(os.path.join(output_dir, 'ascendants_detailed.json'), 'w', encoding='utf-8') as f:
        json.dump({"meta": {"type": "ascendants", "count": len(ascendants)}, "interpretations": ascendants}, f, ensure_ascii=False, indent=2)
    print(f"   ✓ {len(ascendants)}개 생성 완료")

    # 5. 트랜짓 해석
    print("5. 트랜짓 해석 생성 중...")
    transits = generate_transit_interpretations()
    with open(os.path.join(output_dir, 'transits_detailed.json'), 'w', encoding='utf-8') as f:
        json.dump({"meta": {"type": "transits", "count": len(transits)}, "interpretations": transits}, f, ensure_ascii=False, indent=2)
    print(f"   ✓ {len(transits)}개 생성 완료")

    # 총계
    total = len(planet_sign) + len(planet_house) + len(aspects) + len(ascendants) + len(transits)
    print(f"\n=== 총 {total}개 해석 생성 완료 ===")
    print(f"저장 위치: {output_dir}")


if __name__ == "__main__":
    main()
