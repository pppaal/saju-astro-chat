# backend_ai/app/compatibility/constants.py
"""
Compatibility Analysis Constants
================================
사주/점성술 궁합 분석에 사용되는 모든 상수 정의

Includes:
- Element mappings (오행, 점성술 원소)
- Stem/Branch relationships (천간합, 지지 삼합/육합/충/형 등)
- Shinsal definitions (신살)
- House system mappings
- Synastry mappings
- Timing constants
"""


# ===============================================================
# ELEMENT MAPPING CONSTANTS
# ===============================================================
OHENG_TO_ASTRO = {
    "木": "air", "wood": "air",
    "火": "fire", "fire": "fire",
    "土": "earth", "earth": "earth",
    "金": "air", "metal": "air",  # 金 maps to Air/Earth
    "水": "water", "water": "water",
}

ASTRO_ELEMENT_TO_OHENG = {
    "fire": "火",
    "earth": "土",
    "air": "木",  # or 金
    "water": "水",
}

BRANCH_ELEMENTS = {
    "寅": "木", "卯": "木",
    "巳": "火", "午": "火",
    "辰": "土", "戌": "土", "丑": "土", "未": "土",
    "申": "金", "酉": "金",
    "亥": "水", "子": "水",
}

MONTH_BRANCHES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"]

# ===============================================================
# ADVANCED COMPATIBILITY CONSTANTS
# ===============================================================

# 천간 (Heavenly Stems)
HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]

# 천간합 (Heavenly Stem Combinations) - 합이 되면 궁합이 좋음
STEM_COMBINATIONS = {
    ("甲", "己"): {"result": "土", "score": 90, "meaning": "갑기합토(甲己合土) - 서로를 안정시키는 관계"},
    ("乙", "庚"): {"result": "金", "score": 85, "meaning": "을경합금(乙庚合金) - 정의롭고 신뢰로운 관계"},
    ("丙", "辛"): {"result": "水", "score": 88, "meaning": "병신합수(丙辛合水) - 열정과 섬세함의 조화"},
    ("丁", "壬"): {"result": "木", "score": 87, "meaning": "정임합목(丁壬合木) - 성장을 돕는 관계"},
    ("戊", "癸"): {"result": "火", "score": 86, "meaning": "무계합화(戊癸合火) - 따뜻하고 열정적인 관계"},
}

# 천간충 (Heavenly Stem Clashes) - 충이 되면 갈등 가능
STEM_CLASHES = {
    ("甲", "庚"): {"score": -20, "meaning": "갑경충 - 리더십 충돌, 경쟁 관계"},
    ("乙", "辛"): {"score": -15, "meaning": "을신충 - 섬세함과 날카로움의 충돌"},
    ("丙", "壬"): {"score": -18, "meaning": "병임충 - 불과 물의 대립, 감정적 갈등"},
    ("丁", "癸"): {"score": -12, "meaning": "정계충 - 작은 불씨와 큰 물, 주도권 다툼"},
}

# 지지 (Earthly Branches)
EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

# 지지 삼합 (Three Harmonies) - 가장 좋은 조합
BRANCH_SAMHAP = {
    frozenset(["寅", "午", "戌"]): {"element": "火", "score": 95, "meaning": "인오술 화국(火局) - 열정과 리더십의 강력한 시너지"},
    frozenset(["申", "子", "辰"]): {"element": "水", "score": 95, "meaning": "신자진 수국(水局) - 지혜와 소통의 완벽한 조화"},
    frozenset(["亥", "卯", "未"]): {"element": "木", "score": 95, "meaning": "해묘미 목국(木局) - 성장과 창의력의 융합"},
    frozenset(["巳", "酉", "丑"]): {"element": "金", "score": 95, "meaning": "사유축 금국(金局) - 결단력과 실행력의 결합"},
}

# 지지 반합 (Half Harmonies) - 삼합 중 2개만 있을 때
BRANCH_BANHAP = {
    # 화국 반합
    frozenset(["寅", "午"]): {"element": "火", "score": 75, "meaning": "인오 반합 - 화국(火局)의 절반, 열정의 시작"},
    frozenset(["午", "戌"]): {"element": "火", "score": 75, "meaning": "오술 반합 - 화국(火局)의 절반, 리더십 공유"},
    frozenset(["寅", "戌"]): {"element": "火", "score": 70, "meaning": "인술 반합 - 화국(火局) 잠재력"},
    # 수국 반합
    frozenset(["申", "子"]): {"element": "水", "score": 75, "meaning": "신자 반합 - 수국(水局)의 절반, 지혜 교류"},
    frozenset(["子", "辰"]): {"element": "水", "score": 75, "meaning": "자진 반합 - 수국(水局)의 절반, 소통 원활"},
    frozenset(["申", "辰"]): {"element": "水", "score": 70, "meaning": "신진 반합 - 수국(水局) 잠재력"},
    # 목국 반합
    frozenset(["亥", "卯"]): {"element": "木", "score": 75, "meaning": "해묘 반합 - 목국(木局)의 절반, 성장 에너지"},
    frozenset(["卯", "未"]): {"element": "木", "score": 75, "meaning": "묘미 반합 - 목국(木局)의 절반, 창의적 협력"},
    frozenset(["亥", "未"]): {"element": "木", "score": 70, "meaning": "해미 반합 - 목국(木局) 잠재력"},
    # 금국 반합
    frozenset(["巳", "酉"]): {"element": "金", "score": 75, "meaning": "사유 반합 - 금국(金局)의 절반, 결단력"},
    frozenset(["酉", "丑"]): {"element": "金", "score": 75, "meaning": "유축 반합 - 금국(金局)의 절반, 실행력"},
    frozenset(["巳", "丑"]): {"element": "金", "score": 70, "meaning": "사축 반합 - 금국(金局) 잠재력"},
}

# 지지 방합 (Directional Harmonies) - 같은 방위의 3지지
BRANCH_BANGHAP = {
    frozenset(["寅", "卯", "辰"]): {"element": "木", "direction": "東", "score": 88, "meaning": "인묘진 동방합(東方合) - 봄의 에너지, 새로운 시작과 성장"},
    frozenset(["巳", "午", "未"]): {"element": "火", "direction": "南", "score": 88, "meaning": "사오미 남방합(南方合) - 여름의 에너지, 열정과 번영"},
    frozenset(["申", "酉", "戌"]): {"element": "金", "direction": "西", "score": 88, "meaning": "신유술 서방합(西方合) - 가을의 에너지, 결실과 성취"},
    frozenset(["亥", "子", "丑"]): {"element": "水", "direction": "北", "score": 88, "meaning": "해자축 북방합(北方合) - 겨울의 에너지, 지혜와 내면 성찰"},
}

# 방합 반합 (방합 중 2개만 있을 때)
BRANCH_BANGHAP_HALF = {
    # 동방 (木)
    frozenset(["寅", "卯"]): {"element": "木", "score": 65, "meaning": "인묘 - 동방목 잠재력"},
    frozenset(["卯", "辰"]): {"element": "木", "score": 65, "meaning": "묘진 - 동방목 잠재력"},
    # 남방 (火)
    frozenset(["巳", "午"]): {"element": "火", "score": 65, "meaning": "사오 - 남방화 잠재력"},
    frozenset(["午", "未"]): {"element": "火", "score": 65, "meaning": "오미 - 남방화 잠재력"},
    # 서방 (金)
    frozenset(["申", "酉"]): {"element": "金", "score": 65, "meaning": "신유 - 서방금 잠재력"},
    frozenset(["酉", "戌"]): {"element": "金", "score": 65, "meaning": "유술 - 서방금 잠재력"},
    # 북방 (水)
    frozenset(["亥", "子"]): {"element": "水", "score": 65, "meaning": "해자 - 북방수 잠재력"},
    frozenset(["子", "丑"]): {"element": "水", "score": 65, "meaning": "자축 - 북방수 잠재력"},
}

# 지지 육합 (Six Harmonies) - 좋은 조합
BRANCH_YUKHAP = {
    ("子", "丑"): {"result": "土", "score": 88, "meaning": "자축합토 - 깊은 신뢰와 안정"},
    ("寅", "亥"): {"result": "木", "score": 86, "meaning": "인해합목 - 성장을 돕는 파트너"},
    ("卯", "戌"): {"result": "火", "score": 85, "meaning": "묘술합화 - 따뜻한 교감"},
    ("辰", "酉"): {"result": "金", "score": 87, "meaning": "진유합금 - 실용적 협력"},
    ("巳", "申"): {"result": "水", "score": 84, "meaning": "사신합수 - 지적 교류"},
    ("午", "未"): {"result": "土", "score": 88, "meaning": "오미합토 - 열정과 온정의 조화"},
}

# 지지충 (Branch Clashes) - 충돌
BRANCH_CHUNG = {
    ("子", "午"): {"score": -25, "meaning": "자오충 - 감정 vs 이성의 대립"},
    ("丑", "未"): {"score": -20, "meaning": "축미충 - 고집과 고집의 충돌"},
    ("寅", "申"): {"score": -22, "meaning": "인신충 - 행동 방식의 차이"},
    ("卯", "酉"): {"score": -23, "meaning": "묘유충 - 가치관 충돌"},
    ("辰", "戌"): {"score": -18, "meaning": "진술충 - 목표 충돌"},
    ("巳", "亥"): {"score": -20, "meaning": "사해충 - 열정 vs 냉정"},
}

# 지지형 (Branch Punishments) - 해로운 관계
BRANCH_HYUNG = {
    frozenset(["寅", "巳", "申"]): {"score": -15, "meaning": "인사신 삼형 - 은혜를 원수로 갚는 관계 주의"},
    frozenset(["丑", "戌", "未"]): {"score": -12, "meaning": "축술미 삼형 - 고집 충돌, 지지 않으려 함"},
    frozenset(["子", "卯"]): {"score": -10, "meaning": "자묘형 - 무례한 형벌, 예의 없는 관계"},
}

# 지지원진 (Branch Resentment) - 숨은 갈등
BRANCH_WONGJIN = {
    ("子", "未"): {"score": -8, "meaning": "자미 원진 - 숨겨진 불만"},
    ("丑", "午"): {"score": -8, "meaning": "축오 원진 - 표면적 평화, 내면적 갈등"},
    ("寅", "酉"): {"score": -8, "meaning": "인유 원진 - 서로 다른 템포"},
    ("卯", "申"): {"score": -8, "meaning": "묘신 원진 - 의사소통 문제"},
    ("辰", "亥"): {"score": -8, "meaning": "진해 원진 - 기대치 불일치"},
    ("巳", "戌"): {"score": -8, "meaning": "사술 원진 - 열정 vs 안정"},
}

# 지지해 (Branch Harm/害) - 미묘한 불편함, Quincunx(150°)에 해당
# cross_synastry_gunghap.json의 hae_quincunx 참조
BRANCH_HAE = {
    ("子", "未"): {"score": -6, "meaning": "자미해 - 감정과 현실의 괴리", "synastry": "Quincunx aspect"},
    ("丑", "午"): {"score": -6, "meaning": "축오해 - 안정 vs 열정의 부조화", "synastry": "Quincunx aspect"},
    ("寅", "巳"): {"score": -6, "meaning": "인사해 - 행동 방식의 미묘한 차이", "synastry": "Quincunx aspect"},
    ("卯", "辰"): {"score": -6, "meaning": "묘진해 - 유연함 vs 고집", "synastry": "Quincunx aspect"},
    ("申", "亥"): {"score": -6, "meaning": "신해해 - 논리 vs 직관의 불일치", "synastry": "Quincunx aspect"},
    ("酉", "戌"): {"score": -6, "meaning": "유술해 - 섬세함 vs 강직함", "synastry": "Quincunx aspect"},
}

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

# ===============================================================
# 신살(神殺) 궁합 분석 - 38종 신살 점수화
# ===============================================================

# 궁합에 영향을 미치는 주요 신살
SHINSAL_COMPATIBILITY = {
    # 연애/매력 관련 신살 (도화계열)
    "도화살": {
        "score_self": 0,  # 본인에게 있으면
        "score_both": 8,   # 둘 다 있으면 - 강한 끌림
        "score_partner": 5,  # 상대만 있으면 - 매력적
        "meaning": "이성 인연, 매력",
        "compatibility_effect": "강한 성적 끌림과 로맨틱한 관계",
        "astro_parallel": "Venus-Eros conjunction"
    },
    "홍염살": {
        "score_self": 0,
        "score_both": 10,   # 둘 다 있으면 - 강렬한 끌림
        "score_partner": 6,
        "meaning": "강렬한 매력, 유혹",
        "compatibility_effect": "자석처럼 끌리는 관계, 열정적",
        "astro_parallel": "Lilith-Mars conjunction"
    },

    # 귀인 관련 신살 (도움)
    "천을귀인": {
        "score_self": 5,  # 본인에게 있으면 상대에게 도움 가능
        "score_both": 12,  # 둘 다 있으면 서로 귀인
        "score_partner": 8,  # 상대에게 있으면 내가 도움받음
        "meaning": "귀인의 도움",
        "compatibility_effect": "서로에게 귀인이 되어주는 관계",
        "astro_parallel": "Jupiter-Part of Fortune conjunction"
    },
    "천덕귀인": {
        "score_self": 4,
        "score_both": 10,
        "score_partner": 7,
        "meaning": "하늘의 덕",
        "compatibility_effect": "어려울 때 서로 보호해주는 관계",
        "astro_parallel": "Jupiter-North Node conjunction"
    },
    "월덕귀인": {
        "score_self": 3,
        "score_both": 8,
        "score_partner": 5,
        "meaning": "달의 덕",
        "compatibility_effect": "일상에서 서로 도움이 되는 관계",
        "astro_parallel": "Moon-Ceres conjunction"
    },

    # 학문/지적 관련 신살
    "문창귀인": {
        "score_self": 2,
        "score_both": 7,
        "score_partner": 4,
        "meaning": "학문과 문서",
        "compatibility_effect": "지적으로 자극을 주는 관계",
        "astro_parallel": "Mercury-Pallas conjunction"
    },
    "학당귀인": {
        "score_self": 2,
        "score_both": 6,
        "score_partner": 3,
        "meaning": "배움의 재능",
        "compatibility_effect": "함께 성장하고 배우는 관계",
        "astro_parallel": "Mercury-Urania conjunction"
    },

    # 이동/변화 관련 신살
    "역마살": {
        "score_self": 0,
        "score_both": 5,  # 둘 다 있으면 함께 이동/여행
        "score_partner": 2,
        "score_opposite": -3,  # 한쪽만 있으면 떨어져 있을 수 있음
        "meaning": "이동, 변화",
        "compatibility_effect": "함께 여행하고 새로운 경험을 하는 관계",
        "astro_parallel": "Jupiter-North Node aspect"
    },

    # 영적/예술 관련 신살
    "화개살": {
        "score_self": 1,
        "score_both": 8,  # 둘 다 있으면 영적 교감
        "score_partner": 4,
        "meaning": "예술성, 영성",
        "compatibility_effect": "영적으로 깊이 연결된 관계",
        "astro_parallel": "Neptune-Vesta conjunction"
    },

    # 경쟁/갈등 관련 신살 (조심)
    "양인살": {
        "score_self": -2,
        "score_both": -8,  # 둘 다 있으면 충돌 위험
        "score_partner": -3,
        "meaning": "날카로움, 결단",
        "compatibility_effect": "서로 상처를 줄 수 있음, 주의 필요",
        "astro_parallel": "Mars-Pluto square"
    },
    "겁살": {
        "score_self": -2,
        "score_both": -6,
        "score_partner": -3,
        "meaning": "손실, 배신",
        "compatibility_effect": "신뢰 문제가 생길 수 있음",
        "astro_parallel": "Pluto-Nessus conjunction"
    },
    "백호살": {
        "score_self": -1,
        "score_both": -5,
        "score_partner": -2,
        "meaning": "사고, 충돌",
        "compatibility_effect": "함께 있을 때 사고 주의",
        "astro_parallel": "Mars-Uranus square"
    },

    # 고독 관련 신살 (연애 방해)
    "고진살": {
        "score_self": -3,
        "score_both": -10,  # 둘 다 있으면 함께해도 외로움
        "score_partner": -4,
        "meaning": "고독, 독신",
        "compatibility_effect": "개인 공간 필요, 친밀감 형성 어려움",
        "astro_parallel": "Saturn-Chiron conjunction"
    },
    "과숙살": {
        "score_self": -3,
        "score_both": -8,
        "score_partner": -4,
        "meaning": "배우자 인연 약함",
        "compatibility_effect": "결혼 유지에 노력 필요",
        "astro_parallel": "Saturn-Pandora conjunction"
    },

    # 구속/제한 관련 신살
    "천라지망": {
        "score_self": -2,
        "score_both": -6,
        "score_partner": -2,
        "meaning": "갇힘, 구속",
        "compatibility_effect": "관계가 답답하게 느껴질 수 있음",
        "astro_parallel": "Saturn-South Node conjunction"
    },

    # 원한/갈등 관련 신살
    "원진살": {
        "score_self": -2,
        "score_both": -7,
        "score_partner": -3,
        "meaning": "원망, 갈등",
        "compatibility_effect": "숨겨진 불만이 쌓일 수 있음",
        "astro_parallel": "Chiron-Dejanira conjunction"
    },

    # 권력/리더십 관련 신살
    "괴강살": {
        "score_self": 1,
        "score_both": -4,  # 둘 다 강하면 충돌
        "score_partner": 2,  # 상대가 강하면 이끌어줌
        "meaning": "강한 개성, 권력",
        "compatibility_effect": "한 명이 리더십을 가지면 좋음",
        "astro_parallel": "Pluto-Sun conjunction"
    },
    "장성": {
        "score_self": 2,
        "score_both": 5,
        "score_partner": 3,
        "meaning": "리더십, 통솔력",
        "compatibility_effect": "함께 목표를 향해 나아가는 관계",
        "astro_parallel": "Mars-Pallas conjunction"
    },

    # 기타 길신
    "천의성": {
        "score_self": 2,
        "score_both": 6,
        "score_partner": 3,
        "meaning": "치유 능력",
        "compatibility_effect": "서로의 상처를 치유하는 관계",
        "astro_parallel": "Chiron-Hygiea conjunction"
    },
    "천복성": {
        "score_self": 3,
        "score_both": 8,
        "score_partner": 4,
        "meaning": "타고난 복",
        "compatibility_effect": "함께 있으면 행운이 찾아오는 관계",
        "astro_parallel": "Jupiter-Fortuna conjunction"
    },
    "삼기성": {
        "score_self": 2,
        "score_both": 7,
        "score_partner": 4,
        "meaning": "특별한 재능",
        "compatibility_effect": "특별하고 유니크한 커플",
        "astro_parallel": "Uranus-Psyche conjunction"
    },
    "천관성": {
        "score_self": 2,
        "score_both": 5,
        "score_partner": 3,
        "meaning": "관직, 명예",
        "compatibility_effect": "사회적으로 인정받는 커플",
        "astro_parallel": "Saturn-Juno conjunction"
    }
}

# 신살 판정용 데이터 (일간 기준 지지)
SHINSAL_DETERMINATION = {
    # 도화살: 일지/년지 기준 (寅午戌-卯, 巳酉丑-午, 申子辰-酉, 亥卯未-子)
    "도화살": {
        "寅": "卯", "午": "卯", "戌": "卯",
        "巳": "午", "酉": "午", "丑": "午",
        "申": "酉", "子": "酉", "辰": "酉",
        "亥": "子", "卯": "子", "未": "子"
    },
    # 역마살: 일지/년지 기준 (寅午戌-申, 巳酉丑-亥, 申子辰-寅, 亥卯未-巳)
    "역마살": {
        "寅": "申", "午": "申", "戌": "申",
        "巳": "亥", "酉": "亥", "丑": "亥",
        "申": "寅", "子": "寅", "辰": "寅",
        "亥": "巳", "卯": "巳", "未": "巳"
    },
    # 화개살: 일지/년지 기준 (寅午戌-戌, 巳酉丑-丑, 申子辰-辰, 亥卯未-未)
    "화개살": {
        "寅": "戌", "午": "戌", "戌": "戌",
        "巳": "丑", "酉": "丑", "丑": "丑",
        "申": "辰", "子": "辰", "辰": "辰",
        "亥": "未", "卯": "未", "未": "未"
    }
}

# 귀인 판정용 데이터 (일간 기준)
GUIIN_DETERMINATION = {
    # 천을귀인: 일간 기준
    "천을귀인": {
        "甲": ["丑", "未"], "戊": ["丑", "未"],
        "乙": ["子", "申"], "己": ["子", "申"],
        "丙": ["亥", "酉"], "丁": ["亥", "酉"],
        "庚": ["丑", "未"], "辛": ["寅", "午"],
        "壬": ["卯", "巳"], "癸": ["卯", "巳"]
    },
    # 문창귀인: 일간 기준
    "문창귀인": {
        "甲": "巳", "乙": "午", "丙": "申", "丁": "酉",
        "戊": "申", "己": "酉", "庚": "亥", "辛": "子",
        "壬": "寅", "癸": "卯"
    }
}

# 12운성(十二運星) 정의
TWELVE_STAGES = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"]

# 12운성 궁합 점수
TWELVE_STAGES_COMPATIBILITY = {
    # 왕성한 운 조합 (장생, 관대, 건록, 제왕)
    ("장생", "장생"): {"score": 10, "meaning": "함께 새롭게 시작하는 관계"},
    ("장생", "제왕"): {"score": 8, "meaning": "성장과 성취의 조화"},
    ("관대", "관대"): {"score": 9, "meaning": "함께 성장하는 관계"},
    ("관대", "건록"): {"score": 10, "meaning": "최고의 에너지 조합"},
    ("건록", "건록"): {"score": 8, "meaning": "안정적이고 든든한 관계"},
    ("건록", "제왕"): {"score": 9, "meaning": "강력한 파트너십"},
    ("제왕", "제왕"): {"score": 7, "meaning": "두 리더의 만남, 경쟁 가능"},

    # 쇠퇴 운 조합 (쇠, 병, 사, 묘)
    ("쇠", "장생"): {"score": 6, "meaning": "한쪽이 다른쪽을 일으킴"},
    ("쇠", "쇠"): {"score": 4, "meaning": "함께 쉬어가는 관계"},
    ("병", "장생"): {"score": 5, "meaning": "치유와 새 시작"},
    ("병", "병"): {"score": 3, "meaning": "서로 돌봐야 함"},
    ("사", "장생"): {"score": 4, "meaning": "종말과 시작의 만남"},
    ("묘", "태"): {"score": 5, "meaning": "끝과 새 시작의 연결"},

    # 잠재운 조합 (절, 태, 양)
    ("절", "장생"): {"score": 6, "meaning": "무에서 유로"},
    ("태", "태"): {"score": 7, "meaning": "함께 잉태하는 관계"},
    ("태", "양"): {"score": 8, "meaning": "성장의 잠재력"},
    ("양", "양"): {"score": 7, "meaning": "함께 성장 준비"},
    ("양", "장생"): {"score": 9, "meaning": "양육과 탄생"},

    # 목욕 관련 (도화)
    ("목욕", "목욕"): {"score": 8, "meaning": "강한 끌림, 바람기 주의"},
    ("목욕", "관대"): {"score": 7, "meaning": "매력과 성장"},
    ("목욕", "제왕"): {"score": 6, "meaning": "매력과 권력"}
}

# ===============================================================
# 납음오행(納音五行) 궁합 분석 - 60갑자 납음 매핑
# ===============================================================

# 60갑자 → 납음 매핑
GANJI_TO_NAEUM = {
    # 해중금 (金)
    "甲子": "해중금", "乙丑": "해중금",
    # 노중화 (火)
    "丙寅": "노중화", "丁卯": "노중화",
    # 대림목 (木)
    "戊辰": "대림목", "己巳": "대림목",
    # 노방토 (土)
    "庚午": "노방토", "辛未": "노방토",
    # 검봉금 (金)
    "壬申": "검봉금", "癸酉": "검봉금",
    # 산하화 (火)
    "丙申": "산하화", "丁酉": "산하화",
    # 평지목 (木)
    "戊戌": "평지목", "己亥": "평지목",
    # 벽상토 (土)
    "庚子": "벽상토", "辛丑": "벽상토",
    # 금박금 (金)
    "壬寅": "금박금", "癸卯": "금박금",
    # 복등화 (火)
    "甲辰": "복등화", "乙巳": "복등화",
    # 천하수 (水)
    "丙午": "천하수", "丁未": "천하수",
    # 대역토 (土)
    "戊申": "대역토", "己酉": "대역토",
    # 차천금 (金)
    "庚戌": "차천금", "辛亥": "차천금",
    # 상자목 (木)
    "壬子": "상자목", "癸丑": "상자목",
    # 대계수 (水)
    "甲寅": "대계수", "乙卯": "대계수",
    # 사중토 (土)
    "丙辰": "사중토", "丁巳": "사중토",
    # 천상화 (火)
    "戊午": "천상화", "己未": "천상화",
    # 석류목 (木)
    "庚申": "석류목", "辛酉": "석류목",
    # 대해수 (水)
    "壬戌": "대해수", "癸亥": "대해수",
    # 사중금 (金)
    "甲午": "사중금", "乙未": "사중금",
    # 산두화 (火)
    "甲戌": "산두화", "乙亥": "산두화",
    # 간하수 (水)
    "丙子": "간하수", "丁丑": "간하수",
    # 성두토 (土)
    "戊寅": "성두토", "己卯": "성두토",
    # 백랍금 (金)
    "庚辰": "백랍금", "辛巳": "백랍금",
    # 양류목 (木)
    "壬午": "양류목", "癸未": "양류목",
    # 천중수 (水)
    "甲申": "천중수", "乙酉": "천중수",
    # 옥상토 (土)
    "丙戌": "옥상토", "丁亥": "옥상토",
    # 벽력화 (火)
    "戊子": "벽력화", "己丑": "벽력화",
    # 송백목 (木)
    "庚寅": "송백목", "辛卯": "송백목",
    # 장류수 (水)
    "壬辰": "장류수", "癸巳": "장류수",
}

# 납음 → 오행 매핑
NAEUM_TO_ELEMENT = {
    "해중금": "金", "검봉금": "金", "금박금": "金", "차천금": "金", "사중금": "金", "백랍금": "金",
    "노중화": "火", "산하화": "火", "복등화": "火", "천상화": "火", "산두화": "火", "벽력화": "火",
    "대림목": "木", "평지목": "木", "상자목": "木", "석류목": "木", "양류목": "木", "송백목": "木",
    "노방토": "土", "벽상토": "土", "대역토": "土", "사중토": "土", "성두토": "土", "옥상토": "土",
    "천하수": "水", "대계수": "水", "대해수": "水", "간하수": "水", "천중수": "水", "장류수": "水",
}

# 납음 특성 (궁합에 영향)
NAEUM_CHARACTERISTICS = {
    # 해중금 - 숨겨진 보물
    "해중금": {"nature": "숨겨진", "personality": "내면에 큰 가치를 품음", "compatible_nature": ["보호", "성장"]},
    # 천상화 - 빛나는 존재
    "천상화": {"nature": "빛남", "personality": "리더십과 존재감", "compatible_nature": ["숨겨진", "흐름"]},
    # 대림목 - 웅장한 성장
    "대림목": {"nature": "성장", "personality": "큰 그릇", "compatible_nature": ["흐름", "빛남"]},
    # 대해수 - 무한한 포용
    "대해수": {"nature": "흐름", "personality": "모든 것을 품는 포용력", "compatible_nature": ["성장", "숨겨진"]},
    # 노방토 - 겸손한 인내
    "노방토": {"nature": "보호", "personality": "묵묵히 역할 수행", "compatible_nature": ["빛남", "성장"]},
}

# 납음 오행 상생상극 궁합 점수
NAEUM_ELEMENT_COMPATIBILITY = {
    # 상생 관계 (좋음)
    ("木", "火"): {"score": 8, "meaning": "목생화 - 나무가 불을 키움, 서로를 성장시킴"},
    ("火", "土"): {"score": 8, "meaning": "화생토 - 불이 재를 만듦, 열정이 안정을 만듦"},
    ("土", "金"): {"score": 8, "meaning": "토생금 - 흙에서 금이 나옴, 안정이 가치를 만듦"},
    ("金", "水"): {"score": 8, "meaning": "금생수 - 금이 물을 머금음, 결단력이 지혜를 낳음"},
    ("水", "木"): {"score": 8, "meaning": "수생목 - 물이 나무를 키움, 지혜가 성장을 도움"},

    # 상극 관계 (도전적)
    ("木", "土"): {"score": -3, "meaning": "목극토 - 나무가 흙을 뚫음, 갈등 가능"},
    ("土", "水"): {"score": -3, "meaning": "토극수 - 흙이 물을 막음, 의사소통 장애"},
    ("水", "火"): {"score": -4, "meaning": "수극화 - 물이 불을 끔, 열정의 충돌"},
    ("火", "金"): {"score": -3, "meaning": "화극금 - 불이 금을 녹임, 가치관 충돌"},
    ("金", "木"): {"score": -3, "meaning": "금극목 - 금이 나무를 자름, 성장 방해"},

    # 같은 원소 (비화)
    ("木", "木"): {"score": 5, "meaning": "같은 목 - 함께 성장하지만 경쟁 가능"},
    ("火", "火"): {"score": 4, "meaning": "같은 화 - 열정적이지만 과열 주의"},
    ("土", "土"): {"score": 6, "meaning": "같은 토 - 안정적이지만 변화 부족"},
    ("金", "金"): {"score": 5, "meaning": "같은 금 - 결단력 있지만 충돌 가능"},
    ("水", "水"): {"score": 5, "meaning": "같은 수 - 깊이 있지만 방향성 필요"},
}

# 공망(空亡) 정의 - 순 기준
GONGMANG_BY_CYCLE = {
    # 갑자순 (甲子旬): 戌, 亥가 공망
    "甲子": ["戌", "亥"], "乙丑": ["戌", "亥"], "丙寅": ["戌", "亥"], "丁卯": ["戌", "亥"], "戊辰": ["戌", "亥"],
    "己巳": ["戌", "亥"], "庚午": ["戌", "亥"], "辛未": ["戌", "亥"], "壬申": ["戌", "亥"], "癸酉": ["戌", "亥"],
    # 갑술순 (甲戌旬): 申, 酉가 공망
    "甲戌": ["申", "酉"], "乙亥": ["申", "酉"], "丙子": ["申", "酉"], "丁丑": ["申", "酉"], "戊寅": ["申", "酉"],
    "己卯": ["申", "酉"], "庚辰": ["申", "酉"], "辛巳": ["申", "酉"], "壬午": ["申", "酉"], "癸未": ["申", "酉"],
    # 갑신순 (甲申旬): 午, 未가 공망
    "甲申": ["午", "未"], "乙酉": ["午", "未"], "丙戌": ["午", "未"], "丁亥": ["午", "未"], "戊子": ["午", "未"],
    "己丑": ["午", "未"], "庚寅": ["午", "未"], "辛卯": ["午", "未"], "壬辰": ["午", "未"], "癸巳": ["午", "未"],
    # 갑오순 (甲午旬): 辰, 巳가 공망
    "甲午": ["辰", "巳"], "乙未": ["辰", "巳"], "丙申": ["辰", "巳"], "丁酉": ["辰", "巳"], "戊戌": ["辰", "巳"],
    "己亥": ["辰", "巳"], "庚子": ["辰", "巳"], "辛丑": ["辰", "巳"], "壬寅": ["辰", "巳"], "癸卯": ["辰", "巳"],
    # 갑진순 (甲辰旬): 寅, 卯가 공망
    "甲辰": ["寅", "卯"], "乙巳": ["寅", "卯"], "丙午": ["寅", "卯"], "丁未": ["寅", "卯"], "戊申": ["寅", "卯"],
    "己酉": ["寅", "卯"], "庚戌": ["寅", "卯"], "辛亥": ["寅", "卯"], "壬子": ["寅", "卯"], "癸丑": ["寅", "卯"],
    # 갑인순 (甲寅旬): 子, 丑가 공망
    "甲寅": ["子", "丑"], "乙卯": ["子", "丑"], "丙辰": ["子", "丑"], "丁巳": ["子", "丑"], "戊午": ["子", "丑"],
    "己未": ["子", "丑"], "庚申": ["子", "丑"], "辛酉": ["子", "丑"], "壬戌": ["子", "丑"], "癸亥": ["子", "丑"],
}

# ===============================================================
# 12하우스 시스템 - 지지↔하우스 완전 매핑
# ===============================================================

# 지지 → 하우스 매핑
BRANCH_TO_HOUSE = {
    "子": {"primary": 4, "secondary": 8, "theme": "가정/뿌리, 변형/심층"},
    "丑": {"primary": 2, "secondary": 6, "theme": "재물/가치, 건강/봉사"},
    "寅": {"primary": 1, "secondary": 9, "theme": "자아/시작, 확장/철학"},
    "卯": {"primary": 3, "secondary": 7, "theme": "소통/이동, 관계/파트너"},
    "辰": {"primary": 10, "secondary": 1, "theme": "커리어/명예, 자아"},
    "巳": {"primary": 8, "secondary": 12, "theme": "변형/심층, 무의식/영성"},
    "午": {"primary": 5, "secondary": 9, "theme": "창조/기쁨, 확장/철학"},
    "未": {"primary": 6, "secondary": 4, "theme": "건강/봉사, 가정/뿌리"},
    "申": {"primary": 3, "secondary": 11, "theme": "소통/이동, 친구/희망"},
    "酉": {"primary": 7, "secondary": 2, "theme": "관계/파트너, 재물/가치"},
    "戌": {"primary": 11, "secondary": 7, "theme": "친구/희망, 관계/파트너"},
    "亥": {"primary": 12, "secondary": 4, "theme": "무의식/영성, 가정/뿌리"},
}

# 하우스 궁합 의미
HOUSE_COMPATIBILITY_MEANING = {
    1: {"name": "1하우스 (자아)", "theme": "서로의 정체성 이해", "positive": "진정한 자아 인정", "negative": "자아 충돌"},
    2: {"name": "2하우스 (재물)", "theme": "가치관과 재정", "positive": "물질적 안정 공유", "negative": "금전 갈등"},
    3: {"name": "3하우스 (소통)", "theme": "일상 소통", "positive": "대화가 잘 통함", "negative": "소통 불통"},
    4: {"name": "4하우스 (가정)", "theme": "가정생활", "positive": "편안한 가정 형성", "negative": "가정 불화"},
    5: {"name": "5하우스 (창조)", "theme": "로맨스와 즐거움", "positive": "즐거운 관계", "negative": "재미 부족"},
    6: {"name": "6하우스 (건강)", "theme": "일상과 봉사", "positive": "서로 돌봄", "negative": "일상 갈등"},
    7: {"name": "7하우스 (파트너십)", "theme": "결혼/파트너", "positive": "완벽한 파트너", "negative": "파트너십 문제"},
    8: {"name": "8하우스 (변형)", "theme": "깊은 유대", "positive": "영혼의 연결", "negative": "집착/갈등"},
    9: {"name": "9하우스 (확장)", "theme": "성장과 철학", "positive": "함께 성장", "negative": "가치관 차이"},
    10: {"name": "10하우스 (커리어)", "theme": "사회적 성취", "positive": "커플 목표 달성", "negative": "경쟁"},
    11: {"name": "11하우스 (친구)", "theme": "우정과 희망", "positive": "친구 같은 연인", "negative": "목표 불일치"},
    12: {"name": "12하우스 (영성)", "theme": "영적 연결", "positive": "전생의 인연", "negative": "미묘한 갈등"},
}

# 하우스 축 호환성 (1-7, 2-8, 3-9, 4-10, 5-11, 6-12)
HOUSE_AXIS_COMPATIBILITY = {
    (1, 7): {"score": 10, "meaning": "자아-관계 축: 완벽한 파트너십 에너지"},
    (2, 8): {"score": 9, "meaning": "가치-변형 축: 깊은 재정/감정적 유대"},
    (3, 9): {"score": 8, "meaning": "소통-철학 축: 지적 교류와 성장"},
    (4, 10): {"score": 9, "meaning": "가정-커리어 축: 안정과 성취의 균형"},
    (5, 11): {"score": 8, "meaning": "창조-희망 축: 즐거움과 미래 비전"},
    (6, 12): {"score": 7, "meaning": "봉사-영성 축: 서로를 위한 헌신"},
}

# 같은 하우스 점수
SAME_HOUSE_SCORE = {
    1: {"score": 7, "meaning": "같은 자아 에너지 - 이해 빠름, 경쟁 가능"},
    2: {"score": 8, "meaning": "같은 가치관 - 재정적 조화"},
    3: {"score": 7, "meaning": "같은 소통 스타일 - 대화 잘 통함"},
    4: {"score": 9, "meaning": "같은 가정 에너지 - 편안함"},
    5: {"score": 8, "meaning": "같은 창조 에너지 - 즐거움"},
    6: {"score": 6, "meaning": "같은 봉사 에너지 - 실용적"},
    7: {"score": 10, "meaning": "같은 파트너십 - 완벽한 매칭"},
    8: {"score": 7, "meaning": "같은 변형 에너지 - 깊이 있지만 강렬"},
    9: {"score": 8, "meaning": "같은 확장 에너지 - 함께 성장"},
    10: {"score": 6, "meaning": "같은 야망 - 경쟁 가능"},
    11: {"score": 8, "meaning": "같은 희망 - 친구같은 관계"},
    12: {"score": 7, "meaning": "같은 영성 - 깊은 이해, 미묘함"},
}

# ===============================================================
# ASC/DSC (어센던트/디센던트) 궁합 분석
# ===============================================================

# ASC Sign → 성격/외적 이미지
ASC_SIGN_TRAITS = {
    "aries": {"trait": "적극적, 리더십", "approach": "직접적", "first_impression": "강렬하고 자신감 있음"},
    "taurus": {"trait": "안정적, 감각적", "approach": "신중한", "first_impression": "편안하고 신뢰감"},
    "gemini": {"trait": "지적, 사교적", "approach": "호기심 많은", "first_impression": "재미있고 다재다능"},
    "cancer": {"trait": "보호적, 감성적", "approach": "돌봄형", "first_impression": "따뜻하고 가정적"},
    "leo": {"trait": "화려함, 자신감", "approach": "드라마틱", "first_impression": "빛나고 주목받음"},
    "virgo": {"trait": "분석적, 실용적", "approach": "꼼꼼한", "first_impression": "정돈되고 지적"},
    "libra": {"trait": "조화, 예술적", "approach": "외교적", "first_impression": "매력적이고 세련됨"},
    "scorpio": {"trait": "강렬함, 신비로움", "approach": "깊이 있는", "first_impression": "미스터리하고 강렬"},
    "sagittarius": {"trait": "자유, 낙관적", "approach": "모험적", "first_impression": "쾌활하고 열린"},
    "capricorn": {"trait": "야망, 책임감", "approach": "진지한", "first_impression": "성숙하고 신뢰감"},
    "aquarius": {"trait": "독창적, 혁신적", "approach": "독립적", "first_impression": "독특하고 지적"},
    "pisces": {"trait": "직관적, 예술적", "approach": "공감적", "first_impression": "몽환적이고 부드러움"},
}

# ASC-DSC 축 궁합 (내 ASC가 상대 DSC에 해당하면 운명적)
ASC_DSC_COMPATIBILITY = {
    # 완벽한 축 (ASC-DSC 일치)
    "perfect_axis": {"score": 15, "meaning": "운명적 끌림! 서로가 찾던 파트너상"},
    # 같은 ASC
    "same_asc": {"score": 8, "meaning": "비슷한 외적 이미지, 공감대 형성"},
    # 같은 원소 ASC
    "same_element_asc": {"score": 6, "meaning": "비슷한 접근 방식"},
    # 상극 원소 ASC
    "opposing_element_asc": {"score": 3, "meaning": "다른 스타일, 보완 가능"},
}

# DSC = 내가 원하는 파트너상
DSC_PARTNER_NEEDS = {
    "aries": "독립적이고 자신감 있는 파트너",  # ASC Libra의 DSC
    "taurus": "안정적이고 감각적인 파트너",    # ASC Scorpio의 DSC
    "gemini": "지적이고 소통 잘되는 파트너",   # ASC Sagittarius의 DSC
    "cancer": "따뜻하고 보호해주는 파트너",    # ASC Capricorn의 DSC
    "leo": "자신감 있고 빛나는 파트너",        # ASC Aquarius의 DSC
    "virgo": "실용적이고 세심한 파트너",       # ASC Pisces의 DSC
    "libra": "조화롭고 예술적인 파트너",       # ASC Aries의 DSC
    "scorpio": "깊이 있고 충실한 파트너",      # ASC Taurus의 DSC
    "sagittarius": "자유롭고 낙관적인 파트너", # ASC Gemini의 DSC
    "capricorn": "책임감 있고 성숙한 파트너",  # ASC Cancer의 DSC
    "aquarius": "독특하고 혁신적인 파트너",    # ASC Leo의 DSC
    "pisces": "영적이고 공감적인 파트너",      # ASC Virgo의 DSC
}

# ===============================================================
# Lilith(릴리스) & Chiron(키론) 상세 궁합
# ===============================================================

# Lilith 궁합 - 숨겨진 욕망, 그림자, 매혹
LILITH_SYNASTRY = {
    "lilith_sun": {
        "conjunction": {"score": 8, "meaning": "강렬한 매혹, 숨겨진 욕망 자극"},
        "opposition": {"score": 5, "meaning": "밀고 당기는 끌림, 그림자 투사"},
        "square": {"score": -3, "meaning": "권력 다툼, 숨겨진 갈등"},
        "trine": {"score": 6, "meaning": "자연스러운 매력, 깊은 이해"}
    },
    "lilith_moon": {
        "conjunction": {"score": 7, "meaning": "감정적으로 강렬한 연결, 무의식 자극"},
        "opposition": {"score": 4, "meaning": "감정적 밀당, 깊은 끌림"},
        "square": {"score": -4, "meaning": "감정적 불안정, 집착 가능"},
        "trine": {"score": 5, "meaning": "직관적 이해, 영적 연결"}
    },
    "lilith_venus": {
        "conjunction": {"score": 10, "meaning": "치명적 매력! 운명적 끌림"},
        "opposition": {"score": 6, "meaning": "사랑과 욕망의 긴장"},
        "square": {"score": -2, "meaning": "복잡한 감정, 질투 가능"},
        "trine": {"score": 8, "meaning": "섹시하고 매혹적인 관계"}
    },
    "lilith_mars": {
        "conjunction": {"score": 9, "meaning": "폭발적 열정! 성적 끌림 강함"},
        "opposition": {"score": 5, "meaning": "경쟁과 열정의 긴장"},
        "square": {"score": -5, "meaning": "갈등과 권력 다툼"},
        "trine": {"score": 7, "meaning": "강렬하지만 조화로운 열정"}
    },
    "lilith_lilith": {
        "conjunction": {"score": 8, "meaning": "그림자 공유, 깊은 이해"},
        "opposition": {"score": 4, "meaning": "서로의 어둠을 비춤"},
        "trine": {"score": 6, "meaning": "무의식적 연결"}
    }
}

# Chiron 궁합 - 상처와 치유
CHIRON_SYNASTRY = {
    "chiron_sun": {
        "conjunction": {"score": 6, "meaning": "치유자-피치유자 역할, 성장의 관계"},
        "opposition": {"score": 3, "meaning": "상처를 비추는 거울"},
        "square": {"score": -4, "meaning": "오래된 상처 건드림"},
        "trine": {"score": 7, "meaning": "자연스러운 치유"}
    },
    "chiron_moon": {
        "conjunction": {"score": 5, "meaning": "감정적 상처 치유, 깊은 공감"},
        "opposition": {"score": 2, "meaning": "감정적 취약점 노출"},
        "square": {"score": -5, "meaning": "감정적 상처 자극"},
        "trine": {"score": 6, "meaning": "서로 감싸주는 관계"}
    },
    "chiron_venus": {
        "conjunction": {"score": 7, "meaning": "사랑을 통한 치유"},
        "opposition": {"score": 3, "meaning": "사랑의 상처 직면"},
        "square": {"score": -3, "meaning": "관계 패턴 상처"},
        "trine": {"score": 8, "meaning": "아름다운 치유의 사랑"}
    },
    "chiron_chiron": {
        "conjunction": {"score": 8, "meaning": "같은 상처 공유, 깊은 이해"},
        "opposition": {"score": 4, "meaning": "서로의 상처 비춤"},
        "trine": {"score": 7, "meaning": "함께 성장하고 치유"}
    }
}

# ===============================================================
# 삼재(三災) 분석 - 12년 주기 재앙 시기
# ===============================================================

# 삼재 그룹 (년지 기준)
SAMJAE_GROUPS = {
    # 寅午戌 (인오술) 그룹 - 화국
    frozenset(["寅", "午", "戌"]): {
        "name": "화국(火局) 삼재",
        "entering": "申",  # 들삼재
        "peak": "酉",      # 눌삼재
        "leaving": "戌",   # 날삼재
        "years": ["신년", "유년", "술년"]
    },
    # 巳酉丑 (사유축) 그룹 - 금국
    frozenset(["巳", "酉", "丑"]): {
        "name": "금국(金局) 삼재",
        "entering": "亥",
        "peak": "子",
        "leaving": "丑",
        "years": ["해년", "자년", "축년"]
    },
    # 申子辰 (신자진) 그룹 - 수국
    frozenset(["申", "子", "辰"]): {
        "name": "수국(水局) 삼재",
        "entering": "寅",
        "peak": "卯",
        "leaving": "辰",
        "years": ["인년", "묘년", "진년"]
    },
    # 亥卯未 (해묘미) 그룹 - 목국
    frozenset(["亥", "卯", "未"]): {
        "name": "목국(木局) 삼재",
        "entering": "巳",
        "peak": "午",
        "leaving": "未",
        "years": ["사년", "오년", "미년"]
    }
}

# 삼재가 궁합에 미치는 영향
SAMJAE_COMPATIBILITY_EFFECT = {
    "both_in_samjae": {
        "score": -8,
        "meaning": "둘 다 삼재 기간 - 함께 어려움 겪을 수 있음",
        "advice": "서로 의지하며 조심스럽게"
    },
    "one_in_samjae": {
        "score": -3,
        "meaning": "한 명이 삼재 기간 - 한쪽이 힘든 시기",
        "advice": "삼재 중인 사람을 지지해주세요"
    },
    "same_samjae_group": {
        "score": 2,
        "meaning": "같은 삼재 그룹 - 같은 시기에 어려움/안정",
        "advice": "함께 리듬을 탈 수 있음"
    },
    "none_in_samjae": {
        "score": 3,
        "meaning": "둘 다 삼재 아님 - 안정적인 시기",
        "advice": "좋은 시기에 중요한 결정을"
    }
}

# ===============================================================
# 용신(用神)/기신(忌神) 상호작용 분석
# ===============================================================

# 용신 관계 유형
YONGSIN_INTERACTION = {
    "mutual_yongsin": {
        "score": 15,
        "meaning": "서로의 용신이 됨 - 최고의 궁합!",
        "description": "A의 강한 오행이 B의 용신이고, B의 강한 오행이 A의 용신"
    },
    "one_yongsin": {
        "score": 10,
        "meaning": "한 명이 상대의 용신 - 매우 좋은 궁합",
        "description": "한 쪽이 다른 쪽에게 필요한 기운을 줌"
    },
    "neutral": {
        "score": 0,
        "meaning": "용신 상호작용 없음 - 보통",
        "description": "특별한 보완 관계 없음"
    },
    "one_gisin": {
        "score": -8,
        "meaning": "한 명이 상대의 기신 - 주의 필요",
        "description": "한 쪽이 다른 쪽에게 해로운 기운"
    },
    "mutual_gisin": {
        "score": -15,
        "meaning": "서로의 기신이 됨 - 어려운 궁합",
        "description": "서로 해로운 기운을 강화"
    }
}

# 오행별 용신 성격
YONGSIN_CHARACTERISTICS = {
    "木": {"needed_when": "너무 약하거나 화/토가 과함", "provides": "성장, 시작, 유연함", "strengths": ["창의력", "성장", "시작"], "weaknesses": ["우유부단", "산만함"]},
    "火": {"needed_when": "너무 차갑거나 금/수가 과함", "provides": "열정, 밝음, 따뜻함", "strengths": ["열정", "밝음", "표현력"], "weaknesses": ["급함", "분노"]},
    "土": {"needed_when": "불안정하거나 목/수가 과함", "provides": "안정, 중용, 신뢰", "strengths": ["안정", "신뢰", "중재"], "weaknesses": ["고집", "느림"]},
    "金": {"needed_when": "너무 흐트러지거나 목/화가 과함", "provides": "결단, 명확함, 정리", "strengths": ["결단력", "명확함", "정리"], "weaknesses": ["차가움", "비판"]},
    "水": {"needed_when": "너무 건조하거나 화/토가 과함", "provides": "지혜, 유연함, 깊이", "strengths": ["지혜", "적응력", "깊이"], "weaknesses": ["불안", "의심"]}
}

# ===============================================================
# Secondary Progression (세컨더리 프로그레션) 시스템
# ===============================================================
PROGRESSED_SUN_SIGN_CHANGE = {
    "description": "진행 태양이 별자리를 바꿀 때 (약 30년마다)",
    "effect_on_relationship": "자아와 인생 방향의 변화가 관계에도 영향",
    "interpretation": {
        "same_sign_as_partner": {"score": 10, "meaning": "파트너와 같은 에너지로 진입 - 깊은 유대 형성"},
        "trine_to_partner": {"score": 8, "meaning": "파트너 별자리와 트라인 - 자연스러운 조화"},
        "square_to_partner": {"score": -5, "meaning": "파트너 별자리와 스퀘어 - 긴장과 성장의 기회"},
        "opposition_to_partner": {"score": 3, "meaning": "파트너 별자리와 반대 - 보완적 균형"}
    }
}

PROGRESSED_MOON_PHASES = {
    "new_moon": {
        "phase": "합(0°)",
        "duration": "약 3.5년",
        "relationship_meaning": "새로운 시작, 관계의 새 장이 열림",
        "advice": "새로운 관계 패턴 형성에 좋은 시기",
        "score_modifier": 5
    },
    "crescent": {
        "phase": "45°",
        "duration": "약 3.5년",
        "relationship_meaning": "도전과 시험, 관계 성장의 초기 단계",
        "advice": "어려움이 있어도 포기하지 말 것",
        "score_modifier": 0
    },
    "first_quarter": {
        "phase": "90°",
        "duration": "약 3.5년",
        "relationship_meaning": "행동과 결단이 필요한 시기",
        "advice": "관계에 적극적으로 투자해야 할 때",
        "score_modifier": -2
    },
    "gibbous": {
        "phase": "135°",
        "duration": "약 3.5년",
        "relationship_meaning": "분석과 조정, 관계 개선 시기",
        "advice": "소통을 통해 문제 해결",
        "score_modifier": 2
    },
    "full_moon": {
        "phase": "180°(충)",
        "duration": "약 3.5년",
        "relationship_meaning": "정점과 완성, 관계의 결실",
        "advice": "관계의 진정한 의미를 깨닫는 시기",
        "score_modifier": 8
    },
    "disseminating": {
        "phase": "225°",
        "duration": "약 3.5년",
        "relationship_meaning": "나눔과 전파, 관계의 지혜 공유",
        "advice": "배운 것을 바탕으로 관계 심화",
        "score_modifier": 4
    },
    "last_quarter": {
        "phase": "270°",
        "duration": "약 3.5년",
        "relationship_meaning": "재평가, 무엇을 유지할지 결정",
        "advice": "불필요한 패턴 버리기",
        "score_modifier": -3
    },
    "balsamic": {
        "phase": "315°",
        "duration": "약 3.5년",
        "relationship_meaning": "마무리와 준비, 다음 주기 대비",
        "advice": "과거 정리하고 새 시작 준비",
        "score_modifier": 1
    }
}

PROGRESSED_VENUS_RETROGRADE = {
    "description": "진행 금성 역행 (약 40일, 8년마다)",
    "relationship_effect": "사랑과 가치관의 내면화, 과거 관계 돌아봄",
    "advice": "외부 표현보다 내면 성찰에 집중",
    "during_retrograde": {
        "new_relationship": {"caution": True, "meaning": "신중하게 시작, 과거 패턴 주의"},
        "existing_relationship": {"focus": "재평가", "meaning": "관계의 진정한 가치 발견"}
    }
}

PROGRESSED_MARS_ASPECTS = {
    "progressed_mars_conjunct_natal_venus": {
        "score": 12,
        "meaning": "열정적인 시기, 새로운 사랑 시작 가능",
        "duration": "약 2년"
    },
    "progressed_mars_square_natal_saturn": {
        "score": -8,
        "meaning": "좌절과 제한, 인내가 필요한 시기",
        "duration": "약 2년"
    },
    "progressed_mars_trine_natal_moon": {
        "score": 8,
        "meaning": "감정과 행동의 조화, 적극적인 관계",
        "duration": "약 2년"
    }
}

# 사주 대운과 점성술 프로그레션 연결
DAEUN_PROGRESSION_CORRELATION = {
    "description": "대운 10년 주기와 프로그레션 연결",
    "correlation": {
        "대운_초반": {
            "years": "1-3년차",
            "progression_phase": "new_moon ~ crescent",
            "meaning": "새로운 운의 시작과 적응",
            "relationship_focus": "새로운 패턴 형성"
        },
        "대운_중반": {
            "years": "4-7년차",
            "progression_phase": "first_quarter ~ full_moon",
            "meaning": "운의 정점, 가장 활발한 시기",
            "relationship_focus": "관계 성숙과 결실"
        },
        "대운_후반": {
            "years": "8-10년차",
            "progression_phase": "disseminating ~ balsamic",
            "meaning": "다음 대운 준비, 정리와 마무리",
            "relationship_focus": "관계 정리 및 새 시작 준비"
        }
    }
}

SOLAR_ARC_DIRECTIONS = {
    "description": "솔라 아크 디렉션 (1년 = 1도)",
    "key_aspects": {
        "solar_arc_venus_conjunct_dc": {
            "meaning": "결혼/파트너십의 중요한 시기",
            "score": 15,
            "timing": "정확한 접촉 시점 ±1년"
        },
        "solar_arc_mars_conjunct_venus": {
            "meaning": "열정적인 사랑, 새로운 관계 시작",
            "score": 10,
            "timing": "정확한 접촉 시점 ±1년"
        },
        "solar_arc_saturn_square_moon": {
            "meaning": "감정적 제한, 관계 시험기",
            "score": -10,
            "timing": "정확한 접촉 시점 ±1년"
        },
        "solar_arc_jupiter_conjunct_sun": {
            "meaning": "확장과 행운, 관계 성장",
            "score": 12,
            "timing": "정확한 접촉 시점 ±1년"
        }
    }
}

# ===============================================================
# 타이밍 호환성 - 대운/세운 상호작용 (cross_synastry_gunghap.json timing_compatibility)
# ===============================================================
CRITICAL_PERIODS = {
    "saturn_return": {
        "age": 29,
        "astro": "29세경 토성 회귀",
        "saju": "대운 전환기",
        "relationship_effect": "관계 재평가, 결혼 또는 이별",
        "advice": "이 시기에는 관계의 본질을 진지하게 생각해볼 때입니다"
    },
    "seven_year": {
        "cycle": 7,
        "astro": "7년 주기 행성 사이클",
        "saju": "대운 중간점",
        "relationship_effect": "관계 변화 주기",
        "advice": "7년마다 관계를 점검하고 새롭게 다짐하세요"
    },
    "nodal_return": {
        "cycle": 18.6,
        "astro": "18.6년 노드 회귀",
        "saju": "대운 2회 순환",
        "relationship_effect": "운명적 만남/이별",
        "advice": "인생의 큰 방향이 바뀌는 시기, 운명적 결정이 있을 수 있습니다"
    }
}

DAEUN_INTERACTION = {
    "supporting": {
        "description": "A의 대운이 B의 용신을 돕는 경우",
        "score_bonus": 10,
        "meaning": "이 시기 A가 B에게 큰 도움이 됩니다"
    },
    "conflicting": {
        "description": "A의 대운이 B의 기신을 강화하는 경우",
        "score_penalty": -8,
        "meaning": "이 시기 서로 거리를 두는 것이 좋습니다"
    },
    "neutral": {
        "description": "특별한 상호작용 없음",
        "score_adjustment": 0,
        "meaning": "평범한 시기, 꾸준한 노력이 중요합니다"
    }
}

SEUN_INTERACTION = {
    "favorable": {
        "description": "올해 세운이 두 사람 모두에게 좋은 경우",
        "timing_advice": "중요한 결정에 좋은 해입니다",
        "actions": ["결혼", "동거 시작", "큰 여행", "재정 투자"]
    },
    "challenging": {
        "description": "올해 세운이 한쪽에게 어려운 경우",
        "timing_advice": "서로 지지하며 버텨야 하는 해입니다",
        "actions": ["감정 표현 많이 하기", "작은 다툼 빨리 해결", "개인 공간 존중"]
    },
    "transformative": {
        "description": "올해 세운이 변화를 가져오는 경우",
        "timing_advice": "관계가 한 단계 성장하거나 변할 수 있습니다",
        "actions": ["열린 대화", "새로운 시도", "과거 패턴 돌아보기"]
    }
}

# ===============================================================
# 추가 행성 데이터 (Neptune, Jupiter, Pluto, Mercury, Node)
# ===============================================================
ADDITIONAL_PLANET_ASPECTS = {
    "jupiter_venus": {
        "conjunction": {"score": 15, "meaning": "풍요롭고 행복한 사랑, 축복받은 관계"},
        "trine": {"score": 12, "meaning": "자연스러운 행운과 성장"},
        "square": {"score": -5, "meaning": "과잉 기대 주의, 현실감 필요"},
        "opposition": {"score": -3, "meaning": "가치관 차이 조정 필요"}
    },
    "neptune_moon": {
        "conjunction": {"score": 10, "meaning": "영적 교감, 이상적 사랑 (환상 주의)"},
        "trine": {"score": 8, "meaning": "직관적 이해, 예술적 교감"},
        "square": {"score": -10, "meaning": "환상과 현실 혼동 위험"},
        "opposition": {"score": -8, "meaning": "상대를 있는 그대로 보기 어려움"}
    },
    "pluto_venus": {
        "conjunction": {"score": 12, "meaning": "강렬한 끌림, 변화를 가져오는 사랑"},
        "trine": {"score": 10, "meaning": "깊은 유대, 영혼의 연결"},
        "square": {"score": -12, "meaning": "집착과 갈등 주의, 권력 다툼"},
        "opposition": {"score": -10, "meaning": "밀당과 갈등, 변화 요구"}
    },
    "mercury_mercury": {
        "conjunction": {"score": 10, "meaning": "생각이 통하는 관계, 대화가 잘 됨"},
        "trine": {"score": 8, "meaning": "소통이 수월함"},
        "square": {"score": -6, "meaning": "오해 발생 가능, 소통 스타일 차이"},
        "opposition": {"score": -4, "meaning": "다른 관점, 대화로 극복 가능"}
    },
    "node_connections": {
        "conjunction_sun": {"score": 15, "meaning": "운명적 만남! 카르마적 연결"},
        "conjunction_moon": {"score": 14, "meaning": "감정적으로 깊이 연결된 인연"},
        "conjunction_venus": {"score": 13, "meaning": "사랑의 운명, 전생의 인연"},
        "square_node": {"score": -5, "meaning": "성장을 위한 도전적 관계"},
        "opposition_node": {"score": 8, "meaning": "서로의 성장을 돕는 관계"}
    }
}

# 점성술 별자리 원소
ZODIAC_ELEMENTS = {
    "aries": "fire", "leo": "fire", "sagittarius": "fire",
    "taurus": "earth", "virgo": "earth", "capricorn": "earth",
    "gemini": "air", "libra": "air", "aquarius": "air",
    "cancer": "water", "scorpio": "water", "pisces": "water",
    # Korean
    "양자리": "fire", "사자자리": "fire", "사수자리": "fire",
    "황소자리": "earth", "처녀자리": "earth", "염소자리": "earth",
    "쌍둥이자리": "air", "천칭자리": "air", "물병자리": "air",
    "게자리": "water", "전갈자리": "water", "물고기자리": "water",
}

# 점성술 원소 궁합 점수
ASTRO_ELEMENT_COMPATIBILITY = {
    ("fire", "fire"): {"score": 85, "meaning": "열정적이지만 충돌 주의"},
    ("fire", "air"): {"score": 92, "meaning": "완벽한 조화, 서로를 키워줌"},
    ("fire", "earth"): {"score": 65, "meaning": "보완 관계, 인내 필요"},
    ("fire", "water"): {"score": 55, "meaning": "반대 에너지, 조절 필요"},
    ("earth", "earth"): {"score": 80, "meaning": "안정적이지만 변화 부족"},
    ("earth", "water"): {"score": 88, "meaning": "서로를 키우는 관계"},
    ("earth", "air"): {"score": 60, "meaning": "다른 속도, 조율 필요"},
    ("air", "air"): {"score": 82, "meaning": "지적 교감, 감정 부족 주의"},
    ("air", "water"): {"score": 58, "meaning": "이해하기 어려움, 노력 필요"},
    ("water", "water"): {"score": 78, "meaning": "깊은 교감, 감정 과잉 주의"},
}

# 점성술 별자리 반대궁 (끌림이 있지만 충돌 가능)
ZODIAC_OPPOSITES = {
    "aries": "libra", "taurus": "scorpio", "gemini": "sagittarius",
    "cancer": "capricorn", "leo": "aquarius", "virgo": "pisces",
    "libra": "aries", "scorpio": "taurus", "sagittarius": "gemini",
    "capricorn": "cancer", "aquarius": "leo", "pisces": "virgo",
}

# ===============================================================
# 십성(十星) 관계 - 사주 궁합의 핵심
# ===============================================================

# 일간 → 상대 일간의 십성 판단용 오행 순서
OHENG_ORDER = ["木", "火", "土", "金", "水"]
STEM_TO_ELEMENT = {
    "甲": "木", "乙": "木",
    "丙": "火", "丁": "火",
    "戊": "土", "己": "土",
    "庚": "金", "辛": "金",
    "壬": "水", "癸": "水",
}
STEM_POLARITY = {
    "甲": "양", "乙": "음",
    "丙": "양", "丁": "음",
    "戊": "양", "己": "음",
    "庚": "양", "辛": "음",
    "壬": "양", "癸": "음",
}

# 십성 궁합 점수 (상대방이 나에게 어떤 십성인가)
SIPSUNG_COMPATIBILITY = {
    "비견": {"score": 65, "meaning": "경쟁과 동지의식 공존, 이해는 빠르지만 충돌 가능", "synastry": "Mars conjunct Mars"},
    "겁재": {"score": 55, "meaning": "경쟁심 강함, 서로 양보가 필요한 관계", "synastry": "Mars square Mars"},
    "식신": {"score": 80, "meaning": "즐거움과 표현, 함께 있으면 행복", "synastry": "Venus trine Moon"},
    "상관": {"score": 70, "meaning": "창의적이지만 비판적일 수 있음, 자극적 관계", "synastry": "Uranus aspects"},
    "편재": {"score": 75, "meaning": "다양한 인연, 자유로운 관계, 새로움 추구", "synastry": "Venus-Jupiter aspects"},
    "정재": {"score": 85, "meaning": "안정적 재물운, 결혼 상대로 좋음 (남성 기준)", "synastry": "Venus conjunct Sun"},
    "편관": {"score": 60, "meaning": "긴장감 있는 끌림, 도전적 관계", "synastry": "Pluto-Mars aspects"},
    "정관": {"score": 88, "meaning": "책임감 있는 관계, 결혼 상대로 좋음 (여성 기준)", "synastry": "Saturn-Sun positive"},
    "편인": {"score": 72, "meaning": "독특한 교감, 영적/학문적 연결", "synastry": "Neptune-Moon aspects"},
    "정인": {"score": 82, "meaning": "돌봄과 지지, 어머니 같은 따뜻함", "synastry": "Moon conjunct Moon"},
}

# ===============================================================
# 금성-화성 시나스트리 (연애 궁합의 핵심)
# ===============================================================

# 금성 별자리 (매력, 사랑 스타일)
VENUS_CHARACTERISTICS = {
    "aries": {"style": "직접적, 정열적", "needs": "도전과 흥분"},
    "taurus": {"style": "감각적, 안정적", "needs": "물질적 안정과 감촉"},
    "gemini": {"style": "지적, 유희적", "needs": "대화와 다양성"},
    "cancer": {"style": "보호적, 가정적", "needs": "안전함과 돌봄"},
    "leo": {"style": "화려한, 낭만적", "needs": "인정과 찬사"},
    "virgo": {"style": "실용적, 헌신적", "needs": "봉사와 완벽함"},
    "libra": {"style": "조화로운, 세련된", "needs": "파트너십과 균형"},
    "scorpio": {"style": "강렬한, 깊은", "needs": "깊은 유대와 변화"},
    "sagittarius": {"style": "자유로운, 모험적", "needs": "자유와 탐험"},
    "capricorn": {"style": "신중한, 전통적", "needs": "안정과 성취"},
    "aquarius": {"style": "독특한, 독립적", "needs": "지적 교감과 자유"},
    "pisces": {"style": "낭만적, 희생적", "needs": "영적 연결과 이상"},
}

# 화성 별자리 (열정, 성적 에너지, 행동 스타일)
MARS_CHARACTERISTICS = {
    "aries": {"style": "공격적, 직접적", "energy": "폭발적"},
    "taurus": {"style": "지속적, 감각적", "energy": "느리지만 강함"},
    "gemini": {"style": "다양한, 지적", "energy": "변화무쌍"},
    "cancer": {"style": "보호적, 간접적", "energy": "감정적"},
    "leo": {"style": "드라마틱, 창조적", "energy": "열정적"},
    "virgo": {"style": "분석적, 정확한", "energy": "꼼꼼함"},
    "libra": {"style": "협조적, 우유부단", "energy": "균형 추구"},
    "scorpio": {"style": "강렬한, 전략적", "energy": "집요함"},
    "sagittarius": {"style": "모험적, 낙관적", "energy": "탐험적"},
    "capricorn": {"style": "야심찬, 인내심", "energy": "목표 지향"},
    "aquarius": {"style": "혁신적, 독립적", "energy": "예측 불가"},
    "pisces": {"style": "직관적, 수동적", "energy": "유동적"},
}

# 금성-화성 애스펙트 궁합 (연인 관계에서 가장 중요)
VENUS_MARS_SYNASTRY = {
    # 같은 원소: 자연스러운 끌림
    ("fire", "fire"): {"score": 88, "chemistry": "불꽃 튀는 열정! 🔥", "caution": "소모적일 수 있음"},
    ("earth", "earth"): {"score": 85, "chemistry": "감각적이고 안정적 💎", "caution": "지루해질 수 있음"},
    ("air", "air"): {"score": 82, "chemistry": "지적 교감과 대화 💨", "caution": "감정 부족 주의"},
    ("water", "water"): {"score": 80, "chemistry": "깊은 감정적 연결 💧", "caution": "감정 과잉 주의"},
    # 상생 원소: 조화로운 에너지
    ("fire", "air"): {"score": 92, "chemistry": "완벽한 시너지! 불을 키우는 바람 🌟", "caution": "거의 없음"},
    ("air", "fire"): {"score": 92, "chemistry": "자극과 영감의 조화 ✨", "caution": "거의 없음"},
    ("earth", "water"): {"score": 90, "chemistry": "생산적인 조합, 서로를 키움 🌱", "caution": "거의 없음"},
    ("water", "earth"): {"score": 90, "chemistry": "감정과 안정의 조화 🏡", "caution": "거의 없음"},
    # 상극 원소: 도전적이지만 끌림
    ("fire", "water"): {"score": 65, "chemistry": "강렬한 끌림, 증발 주의 💨", "caution": "감정 소모 큼"},
    ("water", "fire"): {"score": 65, "chemistry": "꺼지거나 끓어오르거나", "caution": "극과 극"},
    ("fire", "earth"): {"score": 70, "chemistry": "열정 vs 안정 ⚖️", "caution": "속도 차이"},
    ("earth", "fire"): {"score": 70, "chemistry": "땅을 태우는 불", "caution": "인내 필요"},
    ("earth", "air"): {"score": 60, "chemistry": "현실 vs 이상 🌪️", "caution": "가치관 차이"},
    ("air", "earth"): {"score": 60, "chemistry": "날고 싶은 vs 정착", "caution": "이해 부족"},
    ("air", "water"): {"score": 58, "chemistry": "머리 vs 가슴 💭", "caution": "소통 어려움"},
    ("water", "air"): {"score": 58, "chemistry": "감정 vs 논리", "caution": "답답함"},
}


# ===============================================================
# 점성술 애스펙트 (Aspects) - 행성 간 각도
# ===============================================================

# 별자리 경도 (0-360도) - 각 별자리의 시작점
ZODIAC_DEGREES = {
    "aries": 0, "양자리": 0,
    "taurus": 30, "황소자리": 30,
    "gemini": 60, "쌍둥이자리": 60,
    "cancer": 90, "게자리": 90,
    "leo": 120, "사자자리": 120,
    "virgo": 150, "처녀자리": 150,
    "libra": 180, "천칭자리": 180,
    "scorpio": 210, "전갈자리": 210,
    "sagittarius": 240, "사수자리": 240,
    "capricorn": 270, "염소자리": 270,
    "aquarius": 300, "물병자리": 300,
    "pisces": 330, "물고기자리": 330,
}

# 애스펙트 정의 (각도, 오브 허용 범위, 점수, 의미)
ASPECTS = {
    "conjunction": {"angle": 0, "orb": 10, "score": 15, "meaning": "합(合) - 강력한 융합, 에너지 집중", "symbol": "☌"},
    "sextile": {"angle": 60, "orb": 6, "score": 8, "meaning": "육분(六分) - 조화로운 기회, 협력", "symbol": "⚹"},
    "square": {"angle": 90, "orb": 8, "score": -10, "meaning": "사각(四角) - 긴장과 도전, 성장 촉진", "symbol": "□"},
    "trine": {"angle": 120, "orb": 8, "score": 12, "meaning": "삼각(三角) - 자연스러운 조화, 행운", "symbol": "△"},
    "quincunx": {"angle": 150, "orb": 3, "score": -5, "meaning": "반육분(半六分) - 조정 필요, 미묘한 불편", "symbol": "⚻"},
    "opposition": {"angle": 180, "orb": 10, "score": -8, "meaning": "충(衝) - 끌림과 긴장, 균형 필요", "symbol": "☍"},
}

# 행성별 시나스트리 중요도 (연인 관계 기준)
PLANET_SYNASTRY_WEIGHT = {
    "sun_moon": {"weight": 1.5, "meaning": "태양-달: 자아와 감정의 조화, 기본 궁합"},
    "venus_mars": {"weight": 1.8, "meaning": "금성-화성: 연애/성적 끌림, 열정"},
    "sun_sun": {"weight": 1.0, "meaning": "태양-태양: 자아 정체성, 목표 공유"},
    "moon_moon": {"weight": 1.2, "meaning": "달-달: 감정적 교감, 편안함"},
    "venus_venus": {"weight": 1.0, "meaning": "금성-금성: 사랑 스타일, 가치관"},
    "mars_mars": {"weight": 0.8, "meaning": "화성-화성: 에너지, 갈등 패턴"},
    "saturn_sun": {"weight": 1.0, "meaning": "토성-태양: 책임감, 장기 관계"},
    "saturn_moon": {"weight": 0.9, "meaning": "토성-달: 안정성, 보호 vs 제약"},
}

# 토성 애스펙트 (관계의 장기성/현실성)
SATURN_ASPECTS_MEANING = {
    "conjunction": {"score": 5, "meaning": "책임감 있는 결합, 진지한 관계"},
    "sextile": {"score": 8, "meaning": "건설적인 지원, 현실적 협력"},
    "square": {"score": -12, "meaning": "제약과 시험, 인내 필요"},
    "trine": {"score": 10, "meaning": "안정적 성장, 믿음직한 파트너"},
    "opposition": {"score": -8, "meaning": "권위 충돌, 자유 vs 책임"},
}


