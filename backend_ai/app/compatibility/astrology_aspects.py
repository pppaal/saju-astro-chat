# backend_ai/app/compatibility/astrology_aspects.py
"""
Astrology Aspects Constants
===========================
점성술 애스펙트, Lilith, Chiron 궁합 분석 상수
"""

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
# 점성술 애스펙트 (Aspects) - 행성 간 각도
# ===============================================================

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
