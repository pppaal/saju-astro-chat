#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
고급 점성술 해석 데이터 생성
- Chiron, Lilith, Part of Fortune, Vertex 해석
- Solar Return / Lunar Return 해석
- Progressions 해석
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json
import csv
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "graph", "astro")

ZODIAC_SIGNS = [
    ("Aries", "양자리"), ("Taurus", "황소자리"), ("Gemini", "쌍둥이자리"),
    ("Cancer", "게자리"), ("Leo", "사자자리"), ("Virgo", "처녀자리"),
    ("Libra", "천칭자리"), ("Scorpio", "전갈자리"), ("Sagittarius", "사수자리"),
    ("Capricorn", "염소자리"), ("Aquarius", "물병자리"), ("Pisces", "물고기자리")
]

HOUSES = list(range(1, 13))


def generate_chiron_interpretations():
    """키론 해석 데이터"""
    output_file = os.path.join(DATA_DIR, "chiron_interpretations.json")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    chiron_signs = {
        "Aries": {
            "wound": "존재 자체, 정체성에 대한 상처",
            "healing": "자기 주장과 용기를 통한 치유",
            "gift": "다른 이들이 자신을 찾도록 돕는 능력"
        },
        "Taurus": {
            "wound": "자존감, 물질적 안정에 대한 상처",
            "healing": "자기 가치 인정과 안정감 구축",
            "gift": "타인의 가치를 인정하고 안정감을 주는 능력"
        },
        "Gemini": {
            "wound": "소통, 학습, 형제 관계의 상처",
            "healing": "표현과 연결을 통한 치유",
            "gift": "복잡한 것을 쉽게 설명하는 능력"
        },
        "Cancer": {
            "wound": "가정, 어머니, 소속감의 상처",
            "healing": "자신만의 안전한 공간 만들기",
            "gift": "타인에게 정서적 안식처 제공"
        },
        "Leo": {
            "wound": "창조성, 인정받음, 자녀 관련 상처",
            "healing": "진정한 자기 표현과 창조",
            "gift": "타인의 창조성과 빛을 이끌어내는 능력"
        },
        "Virgo": {
            "wound": "완벽주의, 건강, 봉사의 상처",
            "healing": "불완전함의 수용, 자기 돌봄",
            "gift": "실질적인 치유와 봉사 능력"
        },
        "Libra": {
            "wound": "관계, 균형, 공정함의 상처",
            "healing": "건강한 경계와 파트너십",
            "gift": "갈등 중재와 조화 창조"
        },
        "Scorpio": {
            "wound": "신뢰, 친밀감, 상실의 깊은 상처",
            "healing": "변환과 재탄생 경험",
            "gift": "타인의 심리적 치유를 돕는 능력"
        },
        "Sagittarius": {
            "wound": "믿음, 의미, 자유의 상처",
            "healing": "자신만의 진리와 철학 발견",
            "gift": "영감과 지혜를 나누는 능력"
        },
        "Capricorn": {
            "wound": "권위, 성공, 아버지 관련 상처",
            "healing": "자신의 권위와 구조 세우기",
            "gift": "타인의 목표 달성을 돕는 능력"
        },
        "Aquarius": {
            "wound": "소외감, 다름, 소속의 상처",
            "healing": "독특함의 수용과 커뮤니티 찾기",
            "gift": "아웃사이더를 포용하는 능력"
        },
        "Pisces": {
            "wound": "경계, 영성, 현실 도피의 상처",
            "healing": "건강한 영적 연결과 경계",
            "gift": "무조건적 연민과 영적 치유"
        }
    }

    chiron_houses = {
        1: {"area": "자아 정체성", "wound": "존재 자체에 대한 상처", "healing": "자기 수용"},
        2: {"area": "자존감과 재정", "wound": "가치와 안정에 대한 상처", "healing": "자기 가치 인정"},
        3: {"area": "소통과 학습", "wound": "표현과 연결의 상처", "healing": "목소리 찾기"},
        4: {"area": "가정과 뿌리", "wound": "가족과 안전의 상처", "healing": "내면의 집 만들기"},
        5: {"area": "창조성과 기쁨", "wound": "자기 표현의 상처", "healing": "내면 아이 치유"},
        6: {"area": "건강과 일상", "wound": "완벽주의와 봉사의 상처", "healing": "자기 돌봄"},
        7: {"area": "파트너십", "wound": "관계와 균형의 상처", "healing": "건강한 경계"},
        8: {"area": "변환과 친밀감", "wound": "신뢰와 상실의 상처", "healing": "깊은 변환"},
        9: {"area": "믿음과 확장", "wound": "의미와 진리의 상처", "healing": "자신만의 철학"},
        10: {"area": "커리어와 명성", "wound": "권위와 인정의 상처", "healing": "진정한 소명"},
        11: {"area": "커뮤니티", "wound": "소속과 소외의 상처", "healing": "부족 찾기"},
        12: {"area": "영성과 무의식", "wound": "분리와 초월의 상처", "healing": "영적 연결"}
    }

    data = {
        "meta": {"type": "chiron", "description": "키론(Chiron) 상처와 치유의 해석"},
        "signs": chiron_signs,
        "houses": chiron_houses
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"키론 해석 생성 완료: {output_file}")
    return 24


def generate_lilith_interpretations():
    """릴리스 해석 데이터"""
    output_file = os.path.join(DATA_DIR, "lilith_interpretations.json")

    lilith_signs = {
        "Aries": {"shadow": "분노, 공격성", "power": "원초적 생존 본능", "integration": "건강한 자기 주장"},
        "Taurus": {"shadow": "탐욕, 집착", "power": "감각적 즐거움", "integration": "건강한 욕구 인정"},
        "Gemini": {"shadow": "거짓말, 조작", "power": "말의 힘", "integration": "진실한 소통"},
        "Cancer": {"shadow": "정서적 조작", "power": "깊은 직관", "integration": "건강한 돌봄"},
        "Leo": {"shadow": "나르시시즘", "power": "자기 표현", "integration": "진정한 창조성"},
        "Virgo": {"shadow": "비판, 완벽주의", "power": "분석력", "integration": "건설적 개선"},
        "Libra": {"shadow": "의존, 조종", "power": "매력", "integration": "진정한 파트너십"},
        "Scorpio": {"shadow": "집착, 복수", "power": "변환력", "integration": "깊은 친밀감"},
        "Sagittarius": {"shadow": "무책임, 과장", "power": "자유 추구", "integration": "진정한 지혜"},
        "Capricorn": {"shadow": "권력욕", "power": "야망", "integration": "책임있는 권위"},
        "Aquarius": {"shadow": "냉담, 반항", "power": "독립성", "integration": "진정한 개혁"},
        "Pisces": {"shadow": "도피, 희생자", "power": "영적 연결", "integration": "건강한 경계"}
    }

    lilith_houses = {
        1: {"area": "외모/정체성", "shadow": "억압된 자아", "power": "진정한 존재감"},
        2: {"area": "재정/가치", "shadow": "물질 집착", "power": "풍요 창조"},
        3: {"area": "소통/학습", "shadow": "금지된 지식", "power": "진실 말하기"},
        4: {"area": "가정/뿌리", "shadow": "가족 비밀", "power": "조상 치유"},
        5: {"area": "창조/로맨스", "shadow": "금지된 즐거움", "power": "자유로운 표현"},
        6: {"area": "건강/일", "shadow": "완벽주의", "power": "본능적 치유"},
        7: {"area": "파트너십", "shadow": "관계 패턴", "power": "진정한 평등"},
        8: {"area": "변환/섹슈얼리티", "shadow": "금기", "power": "깊은 변환"},
        9: {"area": "믿음/철학", "shadow": "이단적 사고", "power": "자신만의 진리"},
        10: {"area": "커리어", "shadow": "권력 문제", "power": "진정한 권위"},
        11: {"area": "커뮤니티", "shadow": "소외", "power": "혁명적 변화"},
        12: {"area": "영성", "shadow": "숨겨진 적", "power": "심령 능력"}
    }

    data = {
        "meta": {"type": "lilith", "description": "검은 달 릴리스(Black Moon Lilith) 해석"},
        "signs": lilith_signs,
        "houses": lilith_houses
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"릴리스 해석 생성 완료: {output_file}")
    return 24


def generate_pof_interpretations():
    """Part of Fortune 해석 데이터"""
    output_file = os.path.join(DATA_DIR, "part_of_fortune_interpretations.json")

    pof_signs = {
        "Aries": {"fortune": "행동과 주도를 통한 행운", "advice": "먼저 시작하고 이끌어라"},
        "Taurus": {"fortune": "안정과 감각을 통한 행운", "advice": "천천히 꾸준히 쌓아라"},
        "Gemini": {"fortune": "소통과 다양성을 통한 행운", "advice": "연결하고 정보를 나눠라"},
        "Cancer": {"fortune": "돌봄과 가정을 통한 행운", "advice": "뿌리를 내리고 양육하라"},
        "Leo": {"fortune": "창조와 표현을 통한 행운", "advice": "빛나고 이끌어라"},
        "Virgo": {"fortune": "봉사와 개선을 통한 행운", "advice": "세부사항에 주의하라"},
        "Libra": {"fortune": "협력과 조화를 통한 행운", "advice": "파트너십을 맺어라"},
        "Scorpio": {"fortune": "변환과 깊이를 통한 행운", "advice": "깊이 파고들어라"},
        "Sagittarius": {"fortune": "확장과 모험을 통한 행운", "advice": "넓게 탐험하라"},
        "Capricorn": {"fortune": "구조와 성취를 통한 행운", "advice": "목표를 세우고 올라가라"},
        "Aquarius": {"fortune": "혁신과 커뮤니티를 통한 행운", "advice": "다르게 생각하라"},
        "Pisces": {"fortune": "직관과 영성을 통한 행운", "advice": "흐름에 맡겨라"}
    }

    pof_houses = {
        1: {"area": "자아", "fortune": "자기 표현에서 행운", "focus": "개인 프로젝트"},
        2: {"area": "재정", "fortune": "물질적 풍요", "focus": "수입 증대"},
        3: {"area": "소통", "fortune": "정보와 연결에서 행운", "focus": "학습과 네트워킹"},
        4: {"area": "가정", "fortune": "부동산, 가족에서 행운", "focus": "안정적 기반"},
        5: {"area": "창조", "fortune": "창작, 투기에서 행운", "focus": "자녀, 연애, 취미"},
        6: {"area": "건강", "fortune": "일과 건강에서 행운", "focus": "일상 루틴 개선"},
        7: {"area": "파트너십", "fortune": "결혼, 계약에서 행운", "focus": "1:1 관계"},
        8: {"area": "공유자원", "fortune": "투자, 상속에서 행운", "focus": "타인 자원 활용"},
        9: {"area": "확장", "fortune": "여행, 교육에서 행운", "focus": "해외, 고등교육"},
        10: {"area": "커리어", "fortune": "직업, 명성에서 행운", "focus": "사회적 성공"},
        11: {"area": "커뮤니티", "fortune": "그룹, 목표에서 행운", "focus": "네트워크 확장"},
        12: {"area": "영성", "fortune": "숨겨진 곳에서 행운", "focus": "은둔, 영적 활동"}
    }

    data = {
        "meta": {"type": "part_of_fortune", "description": "행운점(Part of Fortune) 해석"},
        "signs": pof_signs,
        "houses": pof_houses
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"행운점 해석 생성 완료: {output_file}")
    return 24


def generate_vertex_interpretations():
    """Vertex 해석 데이터"""
    output_file = os.path.join(DATA_DIR, "vertex_interpretations.json")

    vertex_signs = {
        "Aries": {"fated_theme": "용기를 요구하는 운명적 만남", "trigger": "도전적 상황"},
        "Taurus": {"fated_theme": "안정과 가치를 가르치는 인연", "trigger": "물질적 상황"},
        "Gemini": {"fated_theme": "소통과 학습의 운명적 연결", "trigger": "정보 교환"},
        "Cancer": {"fated_theme": "정서적 유대의 카르마", "trigger": "가정 관련 상황"},
        "Leo": {"fated_theme": "창조적 표현의 운명", "trigger": "무대와 인정"},
        "Virgo": {"fated_theme": "봉사와 개선의 카르마", "trigger": "건강/직장 상황"},
        "Libra": {"fated_theme": "관계의 운명적 레슨", "trigger": "파트너십 기회"},
        "Scorpio": {"fated_theme": "변환적 만남의 운명", "trigger": "위기와 변화"},
        "Sagittarius": {"fated_theme": "확장과 지혜의 카르마", "trigger": "여행/학습 기회"},
        "Capricorn": {"fated_theme": "성취와 책임의 운명", "trigger": "커리어 기회"},
        "Aquarius": {"fated_theme": "혁신적 연결의 카르마", "trigger": "그룹/커뮤니티"},
        "Pisces": {"fated_theme": "영적 연결의 운명", "trigger": "영적 각성"}
    }

    vertex_houses = {
        5: {"meaning": "창조적 운명, 로맨스의 카르마적 만남"},
        6: {"meaning": "일과 건강 관련 운명적 사건"},
        7: {"meaning": "파트너십의 운명, 중요한 관계"},
        8: {"meaning": "변환적 운명, 깊은 연결"},
        9: {"meaning": "철학적/영적 운명의 만남"}
    }

    data = {
        "meta": {"type": "vertex", "description": "버텍스(Vertex) 운명적 포인트 해석"},
        "signs": vertex_signs,
        "houses": vertex_houses,
        "note": "버텍스는 보통 5-8하우스에 위치하며, 운명적/카르마적 만남을 나타냅니다."
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"버텍스 해석 생성 완료: {output_file}")
    return 17


def generate_solar_return_interpretations():
    """Solar Return 해석 데이터"""
    output_file = os.path.join(DATA_DIR, "solar_return_interpretations.json")

    sr_asc_signs = {
        "Aries": "올해는 새로운 시작, 자기 주장, 독립의 해입니다.",
        "Taurus": "안정, 재정, 감각적 즐거움에 집중하는 해입니다.",
        "Gemini": "소통, 학습, 다양한 관심사를 추구하는 해입니다.",
        "Cancer": "가정, 가족, 정서적 안정에 집중하는 해입니다.",
        "Leo": "자기 표현, 창조성, 인정받음의 해입니다.",
        "Virgo": "건강, 일상 개선, 봉사에 집중하는 해입니다.",
        "Libra": "관계, 파트너십, 조화에 집중하는 해입니다.",
        "Scorpio": "변환, 심리적 깊이, 재탄생의 해입니다.",
        "Sagittarius": "확장, 여행, 학습, 모험의 해입니다.",
        "Capricorn": "커리어, 성취, 목표 달성의 해입니다.",
        "Aquarius": "혁신, 친구, 미래 비전에 집중하는 해입니다.",
        "Pisces": "영성, 창의성, 내면 탐구의 해입니다."
    }

    sr_sun_houses = {
        1: "자아 정체성, 개인 프로젝트에 집중하는 해",
        2: "재정, 가치관, 자존감이 테마인 해",
        3: "소통, 학습, 형제/이웃 관계가 활발한 해",
        4: "가정, 가족, 부동산이 중요한 해",
        5: "창조성, 로맨스, 자녀가 테마인 해",
        6: "건강, 직장, 일상 루틴 개선의 해",
        7: "결혼, 파트너십, 중요한 관계의 해",
        8: "변환, 공유자원, 심리적 깊이의 해",
        9: "여행, 고등교육, 철학적 탐구의 해",
        10: "커리어, 명성, 사회적 성취의 해",
        11: "친구, 그룹활동, 미래 목표의 해",
        12: "휴식, 영적 성장, 내면 작업의 해"
    }

    data = {
        "meta": {"type": "solar_return", "description": "태양 회귀(Solar Return) 연간 운세 해석"},
        "asc_by_sign": sr_asc_signs,
        "sun_by_house": sr_sun_houses,
        "interpretation_guide": {
            "asc": "Solar Return ASC는 올해의 전반적인 테마와 접근 방식을 나타냅니다.",
            "sun_house": "태양이 위치한 하우스는 올해 에너지가 집중되는 삶의 영역입니다.",
            "moon": "Solar Return 달은 올해의 감정적 테마와 필요를 나타냅니다.",
            "aspects": "Solar Return 차트의 애스펙트는 올해 펼쳐질 역동을 보여줍니다."
        }
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Solar Return 해석 생성 완료: {output_file}")
    return 24


def generate_progression_interpretations():
    """Progressions 해석 데이터"""
    output_file = os.path.join(DATA_DIR, "progression_interpretations.json")

    progressed_moon_signs = {
        "Aries": "새로운 시작, 독립, 자기 주장의 감정적 시기 (약 2.5년)",
        "Taurus": "안정 추구, 물질적 안정, 감각적 즐거움의 시기",
        "Gemini": "호기심, 학습, 소통이 활발한 감정적 시기",
        "Cancer": "가정, 가족, 정서적 안정에 집중하는 시기",
        "Leo": "자기 표현, 창조성, 인정받고 싶은 시기",
        "Virgo": "분석, 개선, 건강에 집중하는 시기",
        "Libra": "관계, 조화, 균형을 추구하는 시기",
        "Scorpio": "깊은 감정, 변환, 심리적 탐구의 시기",
        "Sagittarius": "확장, 모험, 의미 추구의 시기",
        "Capricorn": "목표, 성취, 책임에 집중하는 시기",
        "Aquarius": "독립, 혁신, 사회적 관심의 시기",
        "Pisces": "직관, 영성, 창의성이 높아지는 시기"
    }

    progressed_moon_houses = {
        1: "자아 재정의, 새로운 정체성 탐구 (약 2.5년)",
        2: "재정과 가치관에 대한 감정적 집중",
        3: "소통, 학습, 형제 관계가 감정적 테마",
        4: "가정, 가족, 뿌리에 대한 깊은 집중",
        5: "창조성, 로맨스, 기쁨을 추구하는 시기",
        6: "건강, 일상, 봉사가 감정적 테마",
        7: "관계, 파트너십에 대한 깊은 집중",
        8: "변환, 위기, 재탄생의 감정적 시기",
        9: "확장, 여행, 철학적 탐구의 시기",
        10: "커리어와 사회적 역할에 집중",
        11: "친구, 그룹, 미래 목표가 테마",
        12: "내면 탐구, 영적 성장, 휴식의 시기"
    }

    moon_phases = {
        "New Moon": "새로운 시작, 씨앗 심기의 시기 (0-45°)",
        "Crescent": "성장과 도전 극복의 시기 (45-90°)",
        "First Quarter": "행동과 결단의 위기 (90-135°)",
        "Gibbous": "개선과 완성을 향한 노력 (135-180°)",
        "Full Moon": "결실, 인식, 관계의 정점 (180-225°)",
        "Disseminating": "나눔과 전파의 시기 (225-270°)",
        "Last Quarter": "재평가와 놓아주기 (270-315°)",
        "Balsamic": "휴식, 성찰, 새 사이클 준비 (315-360°)"
    }

    data = {
        "meta": {"type": "progressions", "description": "진행법(Progressions) 해석"},
        "secondary_progression": {
            "description": "1일 = 1년 원리. 내면의 심리적 발달을 나타냅니다.",
            "moon_by_sign": progressed_moon_signs,
            "moon_by_house": progressed_moon_houses,
            "moon_phases": moon_phases
        },
        "solar_arc": {
            "description": "모든 행성이 태양의 진행 속도(약 1도/년)로 이동합니다.",
            "triggers": "Solar Arc 행성이 출생 차트의 행성이나 앵글과 정확한 애스펙트를 이룰 때 주요 사건이 일어납니다.",
            "orb": "보통 1도 이내의 오브를 사용합니다."
        }
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Progressions 해석 생성 완료: {output_file}")
    return 32


def main():
    print("=" * 60)
    print("고급 점성술 해석 데이터 생성")
    print("=" * 60)

    os.makedirs(DATA_DIR, exist_ok=True)

    total = 0
    total += generate_chiron_interpretations()
    total += generate_lilith_interpretations()
    total += generate_pof_interpretations()
    total += generate_vertex_interpretations()
    total += generate_solar_return_interpretations()
    total += generate_progression_interpretations()

    print("\n" + "=" * 60)
    print(f"총 {total}개 해석 항목 생성 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()
