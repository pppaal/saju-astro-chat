# backend_ai/app/compatibility/timing.py
"""
Timing Compatibility Constants
==============================
타이밍 관련 상수 (삼재, 대운, 세운, 프로그레션 등)
"""

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
