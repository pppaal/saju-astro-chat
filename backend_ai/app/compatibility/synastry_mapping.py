# backend_ai/app/compatibility/synastry_mapping.py
"""
Synastry Mapping Constants
==========================
사주↔점성술 시나스트리 매핑 상수
"""

# ===============================================================
# 육합↔시나스트리 상세 매핑 (cross_synastry_gunghap.json 완전 반영)
# ===============================================================
YUKHAP_SYNASTRY_MAPPING = {
    ("子", "丑"): {"synastry": "Moon-Saturn conjunction", "theme": "안정적 유대", "composite": "4th house Saturn"},
    ("寅", "亥"): {"synastry": "Mars-Neptune positive", "theme": "영적 열정", "composite": "12th house Mars"},
    ("卯", "戌"): {"synastry": "Venus-Pluto positive", "theme": "깊은 사랑", "composite": "8th house Venus"},
    ("辰", "酉"): {"synastry": "Mercury-Venus conjunction", "theme": "소통과 사랑", "composite": "3rd house Venus"},
    ("巳", "申"): {"synastry": "Mercury-Mars positive", "theme": "지적 자극", "composite": "6th house Mercury"},
    ("午", "未"): {"synastry": "Sun-Moon conjunction", "theme": "기본적 조화", "composite": "1st house Sun-Moon"},
}

# ===============================================================
# 천간합↔시나스트리 상세 매핑 (cross_synastry_gunghap.json 완전 반영)
# ===============================================================
CHEONGAN_HAP_SYNASTRY = {
    ("甲", "己"): {
        "saju_meaning": "리더(甲) + 유연(己) = 土로 화합",
        "synastry_parallel": "Sun-Moon conjunction in earth signs",
        "relationship_theme": "든든한 파트너십, 현실적 결합",
        "composite_parallel": "Composite Sun in earth house (2nd, 6th, 10th)"
    },
    ("乙", "庚"): {
        "saju_meaning": "부드러움(乙) + 강함(庚) = 金으로 화합",
        "synastry_parallel": "Venus-Mars conjunction",
        "relationship_theme": "끌림과 열정, 보완적 결합",
        "composite_parallel": "Composite Venus-Mars conjunction"
    },
    ("丙", "辛"): {
        "saju_meaning": "열정(丙) + 순수(辛) = 水로 화합",
        "synastry_parallel": "Sun-Neptune positive aspect",
        "relationship_theme": "이상적 사랑, 영적 연결",
        "composite_parallel": "Composite Neptune prominent"
    },
    ("丁", "壬"): {
        "saju_meaning": "따뜻함(丁) + 지혜(壬) = 木으로 화합",
        "synastry_parallel": "Moon-Jupiter conjunction",
        "relationship_theme": "성장하는 관계, 지적 교류",
        "composite_parallel": "Composite Jupiter in angular house"
    },
    ("戊", "癸"): {
        "saju_meaning": "안정(戊) + 깊이(癸) = 火로 화합",
        "synastry_parallel": "Saturn-Moon positive aspect",
        "relationship_theme": "깊고 안정적인 유대",
        "composite_parallel": "Composite Saturn-Moon aspect"
    },
}

# ===============================================================
# 일간 관계↔시나스트리 매핑 (cross_synastry_gunghap.json ilgan_relations)
# ===============================================================
ILGAN_SYNASTRY_MAPPING = {
    "same_element": {
        "saju": "비견 관계 (같은 오행)",
        "synastry": "Sun conjunct Sun / Sun same element",
        "meaning": "이해는 빠르나 경쟁 가능",
        "score_range": (60, 75)
    },
    "generating": {
        "saju": "상생 관계 (내가 생해주거나 생해받거나)",
        "synastry": "Sun trine Moon / harmonious elements",
        "meaning": "자연스러운 지원과 조화",
        "score_range": (80, 95)
    },
    "controlling": {
        "saju": "상극 관계 (내가 극하거나 극당하거나)",
        "synastry": "Sun square Moon / challenging elements",
        "meaning": "긴장과 성장, 끌림과 갈등",
        "score_range": (50, 70)
    },
    "combining": {
        "saju": "천간합 (甲己, 乙庚, 丙辛, 丁壬, 戊癸)",
        "synastry": "Sun conjunct Moon (lights conjunction)",
        "meaning": "강력한 끌림, 융합",
        "score_range": (85, 98)
    }
}

# ===============================================================
# 배우자 지표 (cross_synastry_gunghap.json spouse_indicators)
# ===============================================================
SPOUSE_INDICATORS = {
    "male": {
        "primary": "정재",  # 正財 = 아내
        "secondary": "편재",  # 偏財 = 애인/다른 여자
        "synastry_primary": "Venus aspects",
        "synastry_secondary": "Mars-Pluto aspects",
        "composite": "7th house, Venus position"
    },
    "female": {
        "primary": "정관",  # 正官 = 남편
        "secondary": "편관",  # 偏官 = 애인/다른 남자
        "synastry_primary": "Saturn aspects",
        "synastry_secondary": "Mars-Pluto aspects",
        "composite": "7th house, Mars position"
    }
}

# ===============================================================
# 육친↔시나스트리 관계 역학 (cross_synastry_gunghap.json relationship_dynamics)
# ===============================================================
YUKSIN_DYNAMICS = {
    "insung_moon": {
        "saju": "상대방이 내 인성 = 어머니 같은 돌봄",
        "synastry": "Their Moon nurtures my Sun/ASC",
        "dynamic": "보호받는 느낌",
        "score_bonus": 8
    },
    "gwansung_saturn": {
        "saju": "상대방이 내 관성 = 권위, 책임",
        "synastry": "Their Saturn aspects my personal planets",
        "dynamic": "성숙하게 해주는 관계",
        "score_bonus": 5
    },
    "siksang_venus": {
        "saju": "상대방이 내 식상 = 표현, 즐거움",
        "synastry": "Their Venus/Moon in my 5th house",
        "dynamic": "함께 있으면 즐거움",
        "score_bonus": 10
    },
    "bigyeop_mars": {
        "saju": "상대방이 내 비겁 = 경쟁자, 친구",
        "synastry": "Their Mars conjunct my Mars",
        "dynamic": "경쟁과 동지의식",
        "score_bonus": 3
    },
    "jaesung_venus": {
        "saju": "상대방이 내 재성 = 현실적 도움",
        "synastry": "Their Venus aspects my Sun/Moon",
        "dynamic": "물질적/감정적 안정",
        "score_bonus": 7
    }
}

# ===============================================================
# 컴포지트 차트 매핑 (cross_synastry_gunghap.json composite_saju_mapping)
# ===============================================================
COMPOSITE_HOUSES_SAJU = {
    "1st_house": {
        "meaning": "관계의 정체성, 외부에 보이는 모습",
        "saju_parallel": "두 사람의 일간 합 결과",
        "interpretation": {
            "fire": "열정적이고 활동적인 커플",
            "earth": "안정적이고 신뢰할 수 있는 커플",
            "air": "지적이고 사교적인 커플",
            "water": "감성적이고 직관적인 커플"
        }
    },
    "4th_house": {
        "meaning": "가정, 함께 사는 공간",
        "saju_parallel": "년주/월주 조화",
        "interpretation": {
            "strong": "탄탄한 가정 기반",
            "weak": "가정에 대한 관점 조율 필요"
        }
    },
    "5th_house": {
        "meaning": "로맨스, 창조, 자녀",
        "saju_parallel": "시주 조화, 자녀운",
        "interpretation": {
            "strong": "낭만적이고 창의적인 관계",
            "weak": "로맨스 유지 노력 필요"
        }
    },
    "7th_house": {
        "meaning": "파트너십의 질",
        "saju_parallel": "일주 간 관계",
        "interpretation": {
            "strong": "파트너로서 완벽한 조화",
            "weak": "역할 분담 조정 필요"
        }
    },
    "8th_house": {
        "meaning": "깊은 유대, 공유 자원",
        "saju_parallel": "재성 조화",
        "interpretation": {
            "strong": "깊은 신뢰와 공유",
            "weak": "재정/친밀감 문제 주의"
        }
    },
    "10th_house": {
        "meaning": "사회적 커플 이미지",
        "saju_parallel": "관성 조화",
        "interpretation": {
            "strong": "사회적으로 인정받는 커플",
            "weak": "공개적 이미지 관리 필요"
        }
    }
}

COMPOSITE_PLANETS_SAJU = {
    "composite_sun": {
        "meaning": "관계의 목적과 방향",
        "saju_parallel": "용신 조화 여부",
        "weight": 1.5
    },
    "composite_moon": {
        "meaning": "감정적 기반, 안정감",
        "saju_parallel": "일지 관계",
        "weight": 1.3
    },
    "composite_venus": {
        "meaning": "사랑 표현 방식",
        "saju_parallel": "도화살/홍염살 상호작용",
        "weight": 1.2
    },
    "composite_mars": {
        "meaning": "에너지, 갈등 해결",
        "saju_parallel": "양인살/겁재 상호작용",
        "weight": 1.0
    },
    "composite_saturn": {
        "meaning": "관계의 구조, 장기성",
        "saju_parallel": "정관/편관 조화",
        "weight": 1.4
    },
    "composite_jupiter": {
        "meaning": "관계의 성장과 행운",
        "saju_parallel": "식신/상관 조화",
        "weight": 0.8
    },
    "composite_neptune": {
        "meaning": "영적 연결, 이상화",
        "saju_parallel": "편인 에너지",
        "weight": 0.6
    },
    "composite_pluto": {
        "meaning": "변화와 깊이",
        "saju_parallel": "편관/겁재 강도",
        "weight": 0.7
    }
}
