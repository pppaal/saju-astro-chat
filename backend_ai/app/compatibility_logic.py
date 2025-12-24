# backend_ai/app/compatibility_logic.py
"""
Compatibility Analysis Logic - FUSION Enhanced
===============================================
두 사람의 사주/점성술 데이터를 융합(Fusion) 분석하여 AI 궁합 해석 생성
- GraphRAG, multilayer, RuleEngine 통합
- 타이밍 분석 (연간/월간/일간 교차)
- 성장 포인트 액션 아이템
"""

import os
import json
import traceback
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment
_backend_ai_dir = Path(__file__).parent.parent
_env_path = _backend_ai_dir / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Import fusion system components
try:
    from saju_astro_rag import get_graph_rag, search_multilayer, format_multilayer_narrative
    HAS_MULTILAYER = True
except ImportError:
    HAS_MULTILAYER = False
    print("[compatibility_logic] Multilayer RAG not available")

try:
    from rule_engine import RuleEngine
    HAS_RULE_ENGINE = True
except ImportError:
    HAS_RULE_ENGINE = False
    print("[compatibility_logic] RuleEngine not available")

try:
    from signal_extractor import extract_signals, summarize_signals
    HAS_SIGNALS = True
except ImportError:
    HAS_SIGNALS = False
    print("[compatibility_logic] Signal extractor not available")


def get_openai_client():
    """Get OpenAI client for GPT."""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is missing.")
    from openai import OpenAI
    import httpx
    return OpenAI(
        api_key=OPENAI_API_KEY,
        timeout=httpx.Timeout(60.0, connect=10.0)
    )


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


def get_sign_midpoint(sign: str) -> float:
    """별자리의 중간점 경도 반환 (15도 추가)"""
    sign_lower = sign.lower().strip()
    base = ZODIAC_DEGREES.get(sign_lower, 0)
    return (base + 15) % 360  # 별자리 중간점


def calculate_aspect(degree1: float, degree2: float) -> dict:
    """두 행성 위치 간의 애스펙트 계산"""
    diff = abs(degree1 - degree2)
    if diff > 180:
        diff = 360 - diff

    for aspect_name, aspect_data in ASPECTS.items():
        angle = aspect_data["angle"]
        orb = aspect_data["orb"]
        if abs(diff - angle) <= orb:
            return {
                "aspect": aspect_name,
                "exact_diff": diff,
                "orb_used": abs(diff - angle),
                **aspect_data
            }

    return {"aspect": "none", "score": 0, "meaning": "주요 애스펙트 없음"}


def analyze_planetary_synastry(person1: dict, person2: dict) -> dict:
    """
    두 사람의 행성 간 시나스트리 분석
    """
    result = {
        "aspects": [],
        "total_score": 0,
        "harmony_count": 0,
        "tension_count": 0,
        "key_aspects": [],
        "details": [],
    }

    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})

    # 각 사람의 행성 위치 수집
    planets1 = {
        "sun": astro1.get("sunSign", ""),
        "moon": astro1.get("moonSign", ""),
        "venus": astro1.get("venusSign", "") or astro1.get("sunSign", ""),
        "mars": astro1.get("marsSign", "") or astro1.get("sunSign", ""),
        "saturn": astro1.get("saturnSign", "") or "",
    }
    planets2 = {
        "sun": astro2.get("sunSign", ""),
        "moon": astro2.get("moonSign", ""),
        "venus": astro2.get("venusSign", "") or astro2.get("sunSign", ""),
        "mars": astro2.get("marsSign", "") or astro2.get("sunSign", ""),
        "saturn": astro2.get("saturnSign", "") or "",
    }

    # 중요한 행성 조합 분석
    important_pairs = [
        ("sun", "moon", "sun_moon"),
        ("venus", "mars", "venus_mars"),
        ("sun", "sun", "sun_sun"),
        ("moon", "moon", "moon_moon"),
        ("venus", "venus", "venus_venus"),
        ("mars", "mars", "mars_mars"),
    ]

    for p1_planet, p2_planet, pair_key in important_pairs:
        sign1 = planets1.get(p1_planet, "")
        sign2 = planets2.get(p2_planet, "")

        if not sign1 or not sign2:
            continue

        deg1 = get_sign_midpoint(sign1)
        deg2 = get_sign_midpoint(sign2)

        aspect = calculate_aspect(deg1, deg2)

        if aspect["aspect"] != "none":
            weight_info = PLANET_SYNASTRY_WEIGHT.get(pair_key, {"weight": 1.0})
            weighted_score = aspect["score"] * weight_info["weight"]

            aspect_info = {
                "pair": f"A의 {p1_planet.title()} ↔ B의 {p2_planet.title()}",
                "signs": f"{sign1} - {sign2}",
                "aspect": aspect["aspect"],
                "symbol": aspect.get("symbol", ""),
                "score": round(weighted_score, 1),
                "meaning": aspect["meaning"],
            }

            result["aspects"].append(aspect_info)
            result["total_score"] += weighted_score

            if aspect["score"] > 0:
                result["harmony_count"] += 1
            elif aspect["score"] < 0:
                result["tension_count"] += 1

            # 주요 애스펙트 강조
            if abs(weighted_score) >= 10:
                emoji = "✨" if weighted_score > 0 else "⚡"
                result["key_aspects"].append(f"{emoji} {aspect_info['pair']}: {aspect['symbol']} {aspect['aspect']} - {aspect['meaning']}")
                result["details"].append(f"{aspect_info['pair']} ({sign1}↔{sign2}): {aspect['meaning']}")

    # A의 Sun과 B의 Moon (그리고 반대)
    if planets1["sun"] and planets2["moon"]:
        deg1 = get_sign_midpoint(planets1["sun"])
        deg2 = get_sign_midpoint(planets2["moon"])
        aspect = calculate_aspect(deg1, deg2)
        if aspect["aspect"] != "none":
            result["details"].append(f"☀️🌙 A태양-B달: {aspect['meaning']}")
            result["total_score"] += aspect["score"] * 1.5

    if planets2["sun"] and planets1["moon"]:
        deg1 = get_sign_midpoint(planets2["sun"])
        deg2 = get_sign_midpoint(planets1["moon"])
        aspect = calculate_aspect(deg1, deg2)
        if aspect["aspect"] != "none":
            result["details"].append(f"☀️🌙 B태양-A달: {aspect['meaning']}")
            result["total_score"] += aspect["score"] * 1.5

    # 토성 애스펙트 (장기 관계 지표)
    if planets1.get("saturn") and planets2.get("sun"):
        deg1 = get_sign_midpoint(planets1["saturn"])
        deg2 = get_sign_midpoint(planets2["sun"])
        aspect = calculate_aspect(deg1, deg2)
        if aspect["aspect"] in SATURN_ASPECTS_MEANING:
            saturn_info = SATURN_ASPECTS_MEANING[aspect["aspect"]]
            result["details"].append(f"🪐 A토성-B태양: {saturn_info['meaning']}")
            result["total_score"] += saturn_info["score"]

    result["total_score"] = round(result["total_score"], 1)

    return result


# ===============================================================
# TIMING ANALYSIS FUNCTIONS
# ===============================================================
def get_current_month_branch() -> str:
    """Get the current month's earthly branch (지지)."""
    now = datetime.now()
    # Approximate mapping (정확한 절기 계산은 더 복잡함)
    month_index = (now.month + 1) % 12  # 인월(寅月) = 2월 시작
    return MONTH_BRANCHES[month_index]


def analyze_timing_compatibility(person1: dict, person2: dict) -> dict:
    """
    두 사람의 운세 사이클 교차 분석

    Returns:
        dict with timing insights
    """
    result = {
        "current_month": {},
        "annual_guide": {},
        "good_days": [],
        "caution_days": [],
    }

    # Get current month branch
    current_branch = get_current_month_branch()
    current_element = BRANCH_ELEMENTS.get(current_branch, "土")

    # Extract day masters
    dm1 = person1.get("saju", {}).get("dayMaster", {})
    dm2 = person2.get("saju", {}).get("dayMaster", {})

    dm1_element = dm1.get("element", "") if isinstance(dm1, dict) else ""
    dm2_element = dm2.get("element", "") if isinstance(dm2, dict) else ""

    # Get sun signs
    sun1 = person1.get("astro", {}).get("sunSign", "")
    sun2 = person2.get("astro", {}).get("sunSign", "")

    # Analyze current month energy for the couple
    result["current_month"] = {
        "branch": current_branch,
        "element": current_element,
        "analysis": _analyze_month_for_couple(current_element, dm1_element, dm2_element),
    }

    # Generate good day recommendations
    result["good_days"] = _get_good_days_for_couple(dm1_element, dm2_element, sun1, sun2)

    return result


def _analyze_month_for_couple(month_element: str, dm1_element: str, dm2_element: str) -> str:
    """Analyze how the current month affects the couple."""

    # Check if month supports both
    supports_dm1 = _element_supports(month_element, dm1_element)
    supports_dm2 = _element_supports(month_element, dm2_element)

    if supports_dm1 and supports_dm2:
        return "이번 달은 두 분 모두에게 유리해요! 중요한 결정이나 함께하는 활동에 좋은 시기입니다."
    elif supports_dm1:
        return f"이번 달은 첫 번째 분에게 유리해요. 상대방을 지지하고 리드해주세요."
    elif supports_dm2:
        return f"이번 달은 두 번째 분에게 유리해요. 상대방의 의견을 존중하고 따라가 보세요."
    else:
        return "이번 달은 무리하지 말고 서로 의지하며 조용히 보내는 게 좋아요."


def _element_supports(source: str, target: str) -> bool:
    """Check if source element supports target element (상생)."""
    support_map = {
        "木": "火", "火": "土", "土": "金", "金": "水", "水": "木",
        "wood": "fire", "fire": "earth", "earth": "metal", "metal": "water", "water": "wood",
    }
    return support_map.get(source, "") == target


def _get_good_days_for_couple(dm1_element: str, dm2_element: str, sun1: str, sun2: str) -> list:
    """Get recommended activity days based on shared energy."""

    recommendations = []

    # Fire energy days (화 기운이 강한 날)
    if dm1_element in ["火", "fire"] or dm2_element in ["火", "fire"]:
        recommendations.append({
            "type": "fire_days",
            "days": "화/일요일",
            "activities": ["열정적 데이트", "운동", "새로운 도전"],
            "reason": "불 에너지가 활성화되는 날"
        })

    # Earth energy days (토 기운이 강한 날)
    if dm1_element in ["土", "earth"] or dm2_element in ["土", "earth"]:
        recommendations.append({
            "type": "earth_days",
            "days": "토요일",
            "activities": ["재정 계획", "집 꾸미기", "가족 모임"],
            "reason": "안정적 에너지가 흐르는 날"
        })

    # Water energy days (수 기운이 강한 날)
    if dm1_element in ["水", "water"] or dm2_element in ["水", "water"]:
        recommendations.append({
            "type": "water_days",
            "days": "수/월요일",
            "activities": ["깊은 대화", "영화/예술", "명상"],
            "reason": "감정적 교감에 좋은 날"
        })

    # Complementary days (보완 에너지)
    if dm1_element != dm2_element:
        recommendations.append({
            "type": "balance_days",
            "days": "주말",
            "activities": ["서로의 취미 체험", "새로운 장소 방문"],
            "reason": "다른 에너지가 만나 균형을 이루는 시간"
        })

    return recommendations


def get_action_items(person1: dict, person2: dict, reference_data: dict) -> list:
    """
    두 사람을 위한 성장 포인트 액션 아이템 생성
    """
    action_items = []

    # Get elements
    dm1 = person1.get("saju", {}).get("dayMaster", {})
    dm2 = person2.get("saju", {}).get("dayMaster", {})

    dm1_element = dm1.get("element", "") if isinstance(dm1, dict) else ""
    dm2_element = dm2.get("element", "") if isinstance(dm2, dict) else ""

    # Load action items from rules
    rules_data = reference_data.get("compatibility_rules", {})
    action_by_element = rules_data.get("action_items_by_element", {})

    # Determine couple type
    couple_type = _determine_couple_type(dm1_element, dm2_element)

    if couple_type in action_by_element:
        element_actions = action_by_element[couple_type]
        action_items.extend(element_actions.get("growth_actions", []))

    # Add default actions if none found
    if not action_items:
        action_items = [
            "매주 1회 서로의 감정 나누는 시간 갖기",
            "월 1회 새로운 활동 함께 도전하기",
            "갈등 시 24시간 쿨다운 규칙 만들기",
        ]

    return action_items


def _determine_couple_type(element1: str, element2: str) -> str:
    """Determine the couple type based on dominant elements."""
    fire_elements = ["火", "fire"]
    earth_elements = ["土", "earth"]
    water_elements = ["水", "water"]
    wood_elements = ["木", "wood"]
    metal_elements = ["金", "metal"]

    if element1 in fire_elements and element2 in fire_elements:
        return "fire_couple"
    elif element1 in earth_elements and element2 in earth_elements:
        return "earth_couple"
    elif element1 in water_elements and element2 in water_elements:
        return "water_couple"
    elif element1 in wood_elements or element2 in wood_elements:
        return "air_couple"
    else:
        return "complementary_couple"


def load_compatibility_data():
    """Load compatibility reference data from JSON files."""
    data_dir = _backend_ai_dir / "data" / "graph"

    result = {
        "saju_compatibility": {},
        "astro_compatibility": {},
        "fusion_compatibility": {},
        "compatibility_rules": {},
    }

    # Load Saju compatibility
    saju_compat_path = data_dir / "saju" / "interpretations" / "compatibility.json"
    if saju_compat_path.exists():
        with open(saju_compat_path, "r", encoding="utf-8") as f:
            result["saju_compatibility"] = json.load(f)

    # Load Astro synastry compatibility
    astro_compat_path = data_dir / "astro" / "synastry" / "compatibility.json"
    if astro_compat_path.exists():
        with open(astro_compat_path, "r", encoding="utf-8") as f:
            result["astro_compatibility"] = json.load(f)

    # Load FUSION cross-mapping compatibility (사주↔점성 교차 데이터)
    fusion_compat_path = data_dir / "fusion" / "compatibility.json"
    if fusion_compat_path.exists():
        with open(fusion_compat_path, "r", encoding="utf-8") as f:
            result["fusion_compatibility"] = json.load(f)

    # Load compatibility rules (교차 분석 규칙)
    rules_path = data_dir / "rules" / "fusion" / "compatibility.json"
    if rules_path.exists():
        with open(rules_path, "r", encoding="utf-8") as f:
            result["compatibility_rules"] = json.load(f)

    return result


def format_person_data(person: dict, index: int) -> str:
    """Format a single person's saju/astro data for the prompt."""
    parts = []
    name = person.get("name", f"Person {index}")
    relation = person.get("relation", "")

    parts.append(f"【{name}】" + (f" ({relation})" if relation else ""))

    # Saju data
    saju = person.get("saju", {})
    if saju:
        pillars = saju.get("pillars", {})
        day_master = saju.get("dayMaster", {})
        five_elements = saju.get("facts", {}).get("fiveElements", {})

        if pillars:
            parts.append(f"  사주: 년주 {pillars.get('year', '?')} | 월주 {pillars.get('month', '?')} | 일주 {pillars.get('day', '?')} | 시주 {pillars.get('time', '?')}")

        if day_master:
            dm_name = day_master.get("name", "") if isinstance(day_master, dict) else str(day_master)
            dm_element = day_master.get("element", "") if isinstance(day_master, dict) else ""
            parts.append(f"  일간(Day Master): {dm_name} ({dm_element})")

        if five_elements:
            elem_str = ", ".join([f"{k}:{v}" for k, v in five_elements.items()])
            parts.append(f"  오행 분포: {elem_str}")

    # Astro data
    astro = person.get("astro", {})
    if astro:
        sun_sign = astro.get("sunSign") or astro.get("facts", {}).get("sunSign", "")
        moon_sign = astro.get("moonSign") or astro.get("facts", {}).get("moonSign", "")
        asc = astro.get("ascendant", {})
        asc_sign = asc.get("sign") if isinstance(asc, dict) else asc

        if sun_sign:
            parts.append(f"  태양 별자리: {sun_sign}")
        if moon_sign:
            parts.append(f"  달 별자리: {moon_sign}")
        if asc_sign:
            parts.append(f"  상승궁: {asc_sign}")

        # Venus and Mars for relationship
        planets = astro.get("planets", [])
        for p in planets:
            if isinstance(p, dict) and p.get("name") in ["Venus", "Mars"]:
                parts.append(f"  {p.get('name')}: {p.get('sign', '?')} in House {p.get('house', '?')}")

    return "\n".join(parts)


def build_compatibility_prompt(
    people: list,
    relationship_type: str,
    locale: str,
    reference_data: dict,
) -> str:
    """Build the GPT prompt for compatibility analysis."""

    # Format people data
    people_text = "\n\n".join([
        format_person_data(p, i+1) for i, p in enumerate(people)
    ])

    # Extract relevant reference knowledge
    saju_ref = reference_data.get("saju_compatibility", {})
    astro_ref = reference_data.get("astro_compatibility", {})

    # Build reference context - COMPREHENSIVE DATA
    ref_parts = []

    # ========== SAJU REFERENCE DATA ==========
    # 1. Basic concepts
    if saju_ref.get("concepts"):
        ref_parts.append(f"[사주 궁합 기본 원리]\n{json.dumps(saju_ref['concepts'], ensure_ascii=False, indent=2)}")

    # 2. Daymaster (일간) compatibility - CRITICAL for fusion
    daymaster_compat = saju_ref.get("daymaster_compatibility", {})
    if daymaster_compat.get("combinations"):
        # Include 합(hap) and 충(chung) relationships
        ref_parts.append(f"[일간(日干) 궁합 - 천간 합/충]\n{json.dumps(daymaster_compat['combinations'], ensure_ascii=False, indent=2)}")

    # 3. Branch (지지) compatibility - 삼합, 육합, 충
    branch_compat = saju_ref.get("branch_compatibility", {})
    if branch_compat:
        branch_summary = {}
        if branch_compat.get("samhap"):
            branch_summary["삼합(三合)"] = branch_compat["samhap"]
        if branch_compat.get("yukhap"):
            branch_summary["육합(六合)"] = branch_compat["yukhap"]
        if branch_compat.get("chung"):
            branch_summary["충(沖)"] = branch_compat["chung"]
        if branch_compat.get("wongjin"):
            branch_summary["원진(怨嗔)"] = branch_compat["wongjin"]
        if branch_summary:
            ref_parts.append(f"[일지(日支) 궁합 - 삼합/육합/충]\n{json.dumps(branch_summary, ensure_ascii=False, indent=2)}")

    # 4. Special compatibility (용신, 기신, 12운성)
    special_compat = saju_ref.get("special_compatibility", {})
    if special_compat:
        ref_parts.append(f"[특수 궁합 (용신/기신/12운성)]\n{json.dumps(special_compat, ensure_ascii=False, indent=2)}")

    # 5. Relationship-specific compatibility
    if relationship_type in ["lover", "spouse"] and saju_ref.get("marriage_compatibility"):
        ref_parts.append(f"[결혼/연애 궁합 특별 조건]\n{json.dumps(saju_ref['marriage_compatibility'], ensure_ascii=False, indent=2)}")
    elif relationship_type == "business" and saju_ref.get("business_compatibility"):
        ref_parts.append(f"[사업 궁합 특별 조건]\n{json.dumps(saju_ref['business_compatibility'], ensure_ascii=False, indent=2)}")

    # ========== ASTROLOGY REFERENCE DATA ==========
    # 1. Element compatibility (Fire, Earth, Air, Water)
    if astro_ref.get("element_compatibility"):
        ref_parts.append(f"[점성술 원소 궁합]\n{json.dumps(astro_ref['element_compatibility'], ensure_ascii=False, indent=2)}")

    # 2. Modality compatibility (Cardinal, Fixed, Mutable)
    if astro_ref.get("modality_compatibility"):
        ref_parts.append(f"[점성술 모달리티 궁합 (Cardinal/Fixed/Mutable)]\n{json.dumps(astro_ref['modality_compatibility'], ensure_ascii=False, indent=2)}")

    # 3. Same sign combinations
    if astro_ref.get("same_sign"):
        ref_parts.append(f"[같은 별자리 궁합]\n{json.dumps(astro_ref['same_sign'], ensure_ascii=False, indent=2)}")

    # 4. Opposite sign attractions
    if astro_ref.get("opposite_signs"):
        ref_parts.append(f"[반대 별자리 궁합 (끌림)]\n{json.dumps(astro_ref['opposite_signs'], ensure_ascii=False, indent=2)}")

    # ========== FUSION CROSS-MAPPING DATA (핵심!) ==========
    fusion_ref = reference_data.get("fusion_compatibility", {})

    # 1. Element mapping (오행↔점성 원소)
    if fusion_ref.get("element_mapping"):
        ref_parts.append(f"[🔥 FUSION: 오행↔점성 원소 매핑]\n{json.dumps(fusion_ref['element_mapping'], ensure_ascii=False, indent=2)}")

    # 2. Daymaster-Sun cross compatibility (일간↔태양 교차)
    if fusion_ref.get("daymaster_sun_cross"):
        dm_cross = fusion_ref["daymaster_sun_cross"]
        # Include key combinations relevant to the analysis
        ref_parts.append(f"[🔥 FUSION: 일간↔태양별자리 교차 궁합]\n{json.dumps(dm_cross.get('combinations', {}), ensure_ascii=False, indent=2)}")

    # 3. Branch-Zodiac cross mappings (지지↔황도12궁)
    if fusion_ref.get("branch_zodiac_cross"):
        branch_cross = fusion_ref["branch_zodiac_cross"]
        ref_parts.append(f"[🔥 FUSION: 삼합↔점성 삼각형 대응]\n{json.dumps(branch_cross.get('samhap_astro_parallel', {}), ensure_ascii=False, indent=2)}")

    # 4. Cross-system patterns (이중 에너지, 보완 패턴)
    if fusion_ref.get("cross_system_patterns"):
        ref_parts.append(f"[🔥 FUSION: 교차 시스템 패턴]\n{json.dumps(fusion_ref['cross_system_patterns'], ensure_ascii=False, indent=2)}")

    # 5. Relationship-specific cross factors
    if fusion_ref.get("relationship_type_cross_factors", {}).get(relationship_type):
        rel_factors = fusion_ref["relationship_type_cross_factors"][relationship_type]
        ref_parts.append(f"[🔥 FUSION: {relationship_type} 관계 교차 요소]\n{json.dumps(rel_factors, ensure_ascii=False, indent=2)}")

    reference_text = "\n\n".join(ref_parts) if ref_parts else "기본 궁합 원리 적용"

    # Language instruction
    lang_instruction = {
        "ko": "한국어로 답변하세요. 사주와 점성술 전문 용어를 적절히 사용하세요.",
        "en": "Answer in English. Use saju and astrology terminology appropriately.",
    }.get(locale, "Answer in Korean by default.")

    # Relationship type context
    relationship_context = {
        "lover": "연인 궁합 - 로맨틱한 끌림, 감정적 교감, 장기적 조화를 분석하세요.",
        "spouse": "부부 궁합 - 결혼 생활의 조화, 가정 운영, 장기적 파트너십을 분석하세요.",
        "friend": "친구 궁합 - 우정, 신뢰, 협력 관계를 분석하세요.",
        "business": "사업 궁합 - 비즈니스 파트너십, 역할 분담, 성공 가능성을 분석하세요.",
        "family": "가족 궁합 - 가족 간의 조화, 이해, 갈등 해결을 분석하세요.",
        "other": "일반 궁합 - 두 사람의 전반적인 조화와 관계를 분석하세요.",
    }.get(relationship_type, "두 사람의 궁합을 종합적으로 분석하세요.")

    prompt = f"""당신은 사주명리학과 서양 점성술을 융합(Fusion)하여 분석하는 궁합 전문가입니다.

⚠️ 핵심 원칙: 사주와 점성술을 따로 분석하지 말고, 두 체계가 교차하는 지점을 찾아 통합 인사이트를 제공하세요!

## 분석 대상
{people_text}

## 관계 유형
{relationship_context}

## 참고 지식
{reference_text}

## 🔥 교차 분석 가이드 (FUSION APPROACH)

### 오행(五行)과 점성술 원소 매핑
- 목(木) ↔ 바람(Air) - 성장, 확장, 아이디어
- 화(火) ↔ 불(Fire) - 열정, 에너지, 행동
- 토(土) ↔ 땅(Earth) - 안정, 실용, 신뢰
- 금(金) ↔ 물(Water)/땅(Earth) - 정교함, 구조, 감정
- 수(水) ↔ 물(Water) - 지혜, 적응, 직관

### 교차점 찾기 예시
- "A의 일간이 丙火이고 B의 태양이 사자자리(Fire)면 → 둘 다 불 에너지로 열정적 끌림!"
- "A의 월주가 金 기운인데 B의 달이 물병자리(Air)면 → 지적 교감과 소통의 조화"
- "A는 오행에서 水가 부족한데 B는 전갈자리(Water) → B가 A의 부족한 감정적 깊이를 채워줌"

## 분석 구조 (반드시 이 순서대로!)

### 1. 🎯 종합 궁합 점수 (0-100)
점수와 함께 "이 커플의 핵심 케미스트리" 한 줄 요약

### 2. ⚡ 핵심 교차 인사이트 (FUSION CORE)
사주와 점성술이 동시에 보여주는 관계의 본질을 3-4가지로:
- 두 체계가 같은 방향을 가리키는 지점 (예: 둘 다 화 에너지 강함)
- 한 체계에서 부족한 것을 다른 체계가 보완하는 지점
- 두 체계에서 충돌이 예상되는 지점

### 3. 🌙 사주 깊이 분석
- 일간(日干) 관계: 합(合)/충(沖)/형(刑)/해(害) 여부와 의미
- 오행 상생상극: 서로의 오행이 어떻게 상호작용하는지
- 십성 관계: 한 사람이 다른 사람에게 어떤 십성인지 (정재? 식신? 편관?)

### 4. ✨ 점성술 깊이 분석
- 태양-태양: 자아의 조화
- 달-달: 감정적 교감
- 금성-화성: 연애/성적 끌림 (연인인 경우)
- 원소 궁합: Fire-Fire? Earth-Water?

### 5. 🔮 융합 인사이트 (이것이 핵심!)
사주와 점성술을 교차 분석한 통합 해석:
- "사주의 丙火 일간 + 점성술의 사자자리 태양 = 두 배로 강한 리더십 에너지"
- "오행에서 水 부족 + 달이 처녀자리 = 감정 표현에 공동 작업 필요"
- 이런 식의 구체적인 교차 분석 3-5가지

### 6. 💪 강점 & ⚠️ 주의점
- 잘 맞는 영역 3가지 (사주+점성 근거와 함께)
- 주의할 갈등 요소 2가지 (양쪽 체계에서 확인된 것)

### 7. 💡 실천 조언
구체적이고 실용적인 조언 3-4가지 (두 체계 통합 기반)

### 8. 📅 타이밍 가이드
- 함께하기 좋은 시기 (대운, 세운, 행성 트랜싯 고려)
- 주의할 시기

---
{lang_instruction}

⚠️ 품질 규칙:
1. 사주 분석과 점성술 분석을 별개로 나열하지 마세요. 항상 교차/융합하세요!
2. "A의 [사주요소]와 B의 [점성요소]가 만나 → [통합 인사이트]" 형식 활용
3. 막연한 표현 대신 구체적 근거 제시
4. 점수가 낮아도 개선 방법과 희망적 메시지 포함
"""

    return prompt


def format_group_compatibility_report(
    people: list,
    pairwise_matrix: list,
    element_distribution: dict,
    group_roles: dict,
    synergy_score: dict,
    group_timing: dict,
    group_actions: list,
    relationship_type: str = "family",
    locale: str = "ko",
) -> str:
    """
    GPT 없이 그룹 궁합 결과를 포맷팅된 리포트로 변환
    """
    names = [p.get("name", f"Person {i+1}") for i, p in enumerate(people)]
    n = len(people)

    lines = []

    # 헤더
    lines.append(f"## 👥 {' & '.join(names)} 그룹 궁합 분석")
    lines.append(f"**구성원**: {n}명")
    lines.append("")

    # 종합 시너지 점수
    overall = synergy_score.get("overall_score", 70)
    lines.append(f"### 🎯 그룹 시너지 점수: {overall}점")

    # 점수 평가
    if overall >= 85:
        lines.append("**최고의 팀워크! 서로를 완벽하게 보완하는 그룹**")
    elif overall >= 75:
        lines.append("**좋은 조화! 함께하면 시너지가 나는 그룹**")
    elif overall >= 65:
        lines.append("**괜찮은 균형! 노력하면 더 좋아질 그룹**")
    else:
        lines.append("**도전적인 조합! 서로 이해하려는 노력이 필요한 그룹**")
    lines.append("")

    # 시너지 점수 세부 내역
    lines.append("### 📊 점수 분석")
    lines.append(f"- 1:1 궁합 평균: {synergy_score.get('avg_pair_score', 0):.1f}점")
    if synergy_score.get("oheng_bonus", 0) > 0:
        lines.append(f"- 오행 다양성 보너스: +{synergy_score['oheng_bonus']:.1f}점")
    if synergy_score.get("astro_bonus", 0) > 0:
        lines.append(f"- 점성 다양성 보너스: +{synergy_score['astro_bonus']:.1f}점")
    if synergy_score.get("role_bonus", 0) > 0:
        lines.append(f"- 역할 균형 보너스: +{synergy_score['role_bonus']:.1f}점")
    if synergy_score.get("samhap_bonus", 0) > 0:
        lines.append(f"- 🌟 삼합 보너스: +{synergy_score['samhap_bonus']:.1f}점")
    if synergy_score.get("banghap_bonus", 0) > 0:
        lines.append(f"- 🧭 방합 보너스: +{synergy_score['banghap_bonus']:.1f}점")
    lines.append("")

    # 최고/최저 궁합
    best = synergy_score.get("best_pair", {})
    weakest = synergy_score.get("weakest_pair", {})
    if best.get("pair"):
        lines.append(f"### 🏆 최고 궁합: {best['pair']} ({best.get('score', 0)}점)")
        if best.get("summary"):
            lines.append(f"- {best['summary']}")
        lines.append("")
    if weakest.get("pair"):
        lines.append(f"### ⚠️ 주의 궁합: {weakest['pair']} ({weakest.get('score', 0)}점)")
        if weakest.get("summary"):
            lines.append(f"- {weakest['summary']}")
        lines.append("")

    # 그룹 원소 분포
    lines.append("### 🔮 그룹 에너지 분포")
    oheng = element_distribution.get("oheng", {})
    astro = element_distribution.get("astro", {})

    lines.append("**오행 분포**")
    for elem, count in oheng.items():
        if count > 0:
            bar = "●" * count + "○" * (n - count)
            lines.append(f"- {elem}: {bar} ({count}명)")

    lines.append("")
    lines.append("**점성 원소 분포**")
    elem_icons = {"fire": "🔥", "earth": "🌍", "air": "💨", "water": "💧"}
    for elem, count in astro.items():
        if count > 0:
            icon = elem_icons.get(elem, "")
            bar = "●" * count + "○" * (n - count)
            lines.append(f"- {icon} {elem.capitalize()}: {bar} ({count}명)")

    dominant = element_distribution.get("dominant_oheng")
    lacking = element_distribution.get("lacking_oheng")
    if dominant:
        lines.append(f"\n**지배적 에너지**: {dominant}")
    if lacking:
        lines.append(f"**부족한 에너지**: {lacking}")
    lines.append("")

    # 그룹 역할
    role_names = {
        "leader": "🔥 리더십",
        "mediator": "⚖️ 중재자",
        "catalyst": "⚡ 촉매제",
        "stabilizer": "🏔️ 안정자",
        "creative": "💡 창의력",
        "emotional": "💗 감정 지지",
    }
    has_roles = any(group_roles.get(k) for k in role_names)
    if has_roles:
        lines.append("### 🎭 그룹 역할")
        for role_key, role_name in role_names.items():
            members = group_roles.get(role_key, [])
            if members:
                lines.append(f"- {role_name}: {', '.join(members)}")
        lines.append("")

    # 1:1 궁합 매트릭스
    lines.append("### 👥 1:1 궁합 조합")
    for pair in pairwise_matrix:
        lines.append(f"\n**{pair['pair']}** - {pair.get('score', 70)}점")
        lines.append(f"- 사주: {pair.get('saju', '')}")
        lines.append(f"- 점성: {pair.get('astro', '')}")
        if pair.get("summary"):
            lines.append(f"- {pair['summary']}")
        if pair.get("saju_details"):
            for detail in pair["saju_details"][:2]:
                lines.append(f"  - {detail}")
        if pair.get("astro_details"):
            for detail in pair["astro_details"][:2]:
                lines.append(f"  - {detail}")
    lines.append("")

    # 타이밍 가이드
    if group_timing:
        lines.append("### 📅 타이밍 가이드")
        if group_timing.get("current_month"):
            month = group_timing["current_month"]
            lines.append(f"**이번 달 ({month.get('branch', '')} {month.get('element', '')}월)**")
            lines.append(f"- {month.get('analysis', '')}")

        if group_timing.get("group_activities"):
            lines.append("")
            lines.append("**그룹 활동 추천**")
            for activity in group_timing["group_activities"][:3]:
                acts = ", ".join(activity.get("activities", []))
                lines.append(f"- {activity.get('days', '')}: {acts}")
        lines.append("")

    # 성장 포인트
    if group_actions:
        lines.append("### 💪 그룹 성장 포인트")
        for i, item in enumerate(group_actions[:6], 1):
            lines.append(f"{i}. {item}")
        lines.append("")

    # 푸터
    lines.append("---")
    lines.append("*이 분석은 사주와 점성술을 융합한 그룹 궁합 결과입니다.*")

    return "\n".join(lines)


def format_compatibility_report(
    people: list,
    pair_score: dict,
    timing_analysis: dict,
    action_items: list,
    relationship_type: str = "lover",
    locale: str = "ko",
) -> str:
    """
    GPT 없이 계산 결과를 포맷팅된 리포트로 변환
    """
    name1 = people[0].get("name", "Person 1")
    name2 = people[1].get("name", "Person 2")

    # 관계 타입 한글 변환
    relation_labels = {
        "lover": "연인",
        "spouse": "배우자",
        "friend": "친구",
        "business": "비즈니스 파트너",
        "family": "가족",
        "other": "기타",
    }
    relation_label = relation_labels.get(relationship_type, relationship_type)

    score = pair_score.get("score", 70)
    summary = pair_score.get("summary", "")
    saju_details = pair_score.get("saju_details", [])
    astro_details = pair_score.get("astro_details", [])
    fusion_insights = pair_score.get("fusion_insights", [])
    sipsung = pair_score.get("sipsung", {})

    # 리포트 생성
    lines = []

    # 헤더
    lines.append(f"## 💕 {name1} & {name2} 궁합 분석")
    lines.append(f"**관계 유형**: {relation_label}")
    lines.append("")

    # 종합 점수
    lines.append(f"### 🎯 종합 궁합 점수: {score}점")
    lines.append(f"**{summary}**")
    lines.append("")

    # 사주 분석 섹션
    if saju_details:
        lines.append("### ☯️ 사주 분석")
        for detail in saju_details:
            lines.append(f"- {detail}")
        lines.append("")

    # 십성 분석 (핵심 궁합)
    if sipsung.get("a_to_b") or sipsung.get("b_to_a"):
        lines.append("### ⭐ 십성 관계 (핵심 궁합)")
        if sipsung.get("a_to_b"):
            ab = sipsung["a_to_b"]
            lines.append(f"- **{name1} → {name2}**: {ab.get('sipsung', '')} - {ab.get('meaning', '')}")
        if sipsung.get("b_to_a"):
            ba = sipsung["b_to_a"]
            lines.append(f"- **{name2} → {name1}**: {ba.get('sipsung', '')} - {ba.get('meaning', '')}")
        lines.append("")

    # 점성술 분석 섹션
    if astro_details:
        lines.append("### ✨ 점성술 분석")
        for detail in astro_details:
            lines.append(f"- {detail}")
        lines.append("")

    # 융합 인사이트
    if fusion_insights:
        lines.append("### 🔮 사주-점성 융합 인사이트")
        for insight in fusion_insights:
            lines.append(f"- {insight}")
        lines.append("")

    # 타이밍 가이드
    if timing_analysis:
        lines.append("### 📅 타이밍 가이드")
        if timing_analysis.get("current_month"):
            month = timing_analysis["current_month"]
            lines.append(f"**이번 달 ({month.get('branch', '')} {month.get('element', '')}월)**")
            lines.append(f"- {month.get('analysis', '')}")

        if timing_analysis.get("good_days"):
            lines.append("")
            lines.append("**추천 활동 시기**")
            for day in timing_analysis["good_days"][:3]:
                activities = ", ".join(day.get("activities", []))
                lines.append(f"- {day.get('days', '')}: {activities}")
        lines.append("")

    # 성장 포인트
    if action_items:
        lines.append("### 💪 관계 성장 포인트")
        for i, item in enumerate(action_items[:5], 1):
            lines.append(f"{i}. {item}")
        lines.append("")

    # 푸터
    lines.append("---")
    lines.append("*이 분석은 사주와 점성술을 융합한 결과입니다. 참고용으로 활용해주세요.*")

    return "\n".join(lines)


def interpret_compatibility(
    people: list,
    relationship_type: str = "lover",
    locale: str = "ko",
) -> dict:
    """
    Main function: Generate AI compatibility interpretation using GPT + FUSION system.

    Args:
        people: List of person data with saju/astro
        relationship_type: lover, spouse, friend, business, family, other
        locale: ko, en

    Returns:
        dict with status, interpretation, scores, timing, action_items, etc.
    """
    try:
        if len(people) < 2:
            return {
                "status": "error",
                "message": "최소 2명의 데이터가 필요합니다.",
            }

        # Load reference data
        reference_data = load_compatibility_data()

        # ===============================================================
        # FUSION SYSTEM INTEGRATION
        # ===============================================================
        fusion_context = ""

        # 1. Multilayer Search (사주↔점성 교차 검색)
        if HAS_MULTILAYER and len(people) >= 2:
            try:
                p1_saju = people[0].get("saju", {})
                p1_astro = people[0].get("astro", {})
                p2_saju = people[1].get("saju", {})
                p2_astro = people[1].get("astro", {})

                # Search for both people
                ml_results1 = search_multilayer(p1_saju, p1_astro, top_k=3)
                ml_results2 = search_multilayer(p2_saju, p2_astro, top_k=3)

                total1 = sum(len(v) for v in ml_results1.values())
                total2 = sum(len(v) for v in ml_results2.values())

                if total1 > 0 or total2 > 0:
                    ml_parts = []
                    if total1 > 0:
                        ml_parts.append(f"[Person 1 Multilayer]\n{format_multilayer_narrative(ml_results1)}")
                    if total2 > 0:
                        ml_parts.append(f"[Person 2 Multilayer]\n{format_multilayer_narrative(ml_results2)}")
                    fusion_context += "\n\n[Multilayer Fusion Analysis]\n" + "\n".join(ml_parts)
                    print(f"[Compatibility] Multilayer: P1={total1}, P2={total2} matches")
            except Exception as e:
                print(f"[Compatibility] Multilayer error: {e}")

        # 2. Rule Engine Evaluation
        if HAS_RULE_ENGINE:
            try:
                rules_base = _backend_ai_dir / "data" / "graph" / "rules"
                compat_rules_path = rules_base / "fusion"

                if compat_rules_path.exists():
                    rule_engine = RuleEngine(str(compat_rules_path))

                    # Build facts for rule evaluation
                    combined_facts = {
                        "person1": people[0],
                        "person2": people[1],
                        "relationship_type": relationship_type,
                        "saju": people[0].get("saju", {}),
                        "astro": people[0].get("astro", {}),
                    }

                    rule_eval = rule_engine.evaluate(combined_facts)
                    if rule_eval.get("matched_count", 0) > 0:
                        fusion_context += f"\n\n[Rule Evaluation]\n{json.dumps(rule_eval.get('matched_rules', [])[:5], ensure_ascii=False)}"
                        print(f"[Compatibility] Rules matched: {rule_eval.get('matched_count', 0)}")
            except Exception as e:
                print(f"[Compatibility] Rule engine error: {e}")

        # 3. Signal Extraction
        if HAS_SIGNALS:
            try:
                signals1 = extract_signals({"saju": people[0].get("saju", {}), "astro": people[0].get("astro", {})})
                signals2 = extract_signals({"saju": people[1].get("saju", {}), "astro": people[1].get("astro", {})})

                signal_summary1 = summarize_signals(signals1)
                signal_summary2 = summarize_signals(signals2)

                if signal_summary1 or signal_summary2:
                    fusion_context += f"\n\n[Signal Summary]\nPerson 1: {signal_summary1}\nPerson 2: {signal_summary2}"
            except Exception as e:
                print(f"[Compatibility] Signal extraction error: {e}")

        # 4. Timing Analysis
        timing_analysis = analyze_timing_compatibility(people[0], people[1])

        # 5. Action Items
        action_items = get_action_items(people[0], people[1], reference_data)

        # 6. Venus-Mars Synastry (연인/배우자인 경우)
        venus_mars_analysis = analyze_venus_mars_synastry(people[0], people[1], relationship_type)
        if venus_mars_analysis.get("venus_mars_chemistry"):
            fusion_context += f"\n\n[Venus-Mars Chemistry]\n"
            fusion_context += f"Chemistry Score: {venus_mars_analysis['venus_mars_chemistry']}\n"
            fusion_context += "\n".join(venus_mars_analysis.get("details", []))
            if venus_mars_analysis.get("fusion_insight"):
                fusion_context += f"\nInsight: {venus_mars_analysis['fusion_insight']}"

        # 7. Pair Score 계산 (Sipsung + 모든 분석 통합)
        pair_score = calculate_pair_score(people[0], people[1])

        # 8. Venus-Mars 정보를 pair_score에 추가
        if venus_mars_analysis.get("venus_mars_chemistry"):
            pair_score["astro_details"].append(
                f"💕 금성-화성 케미스트리: {venus_mars_analysis['venus_mars_chemistry']}점"
            )
            if venus_mars_analysis.get("fusion_insight"):
                pair_score["fusion_insights"].append(venus_mars_analysis["fusion_insight"])

        # GPT 없이 포맷된 리포트 생성
        interpretation = format_compatibility_report(
            people=people,
            pair_score=pair_score,
            timing_analysis=timing_analysis,
            action_items=action_items,
            relationship_type=relationship_type,
            locale=locale,
        )

        overall_score = pair_score.get("score", 70)

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "relationship_type": relationship_type,
            "locale": locale,
            "overall_score": overall_score,
            "interpretation": interpretation,
            "people_count": len(people),
            "model": "rule-based",  # GPT 대신 규칙 기반
            # Detailed score breakdown
            "pair_score": pair_score,
            # Timing and Action Items
            "timing": timing_analysis,
            "action_items": action_items,
            "fusion_enabled": True,
        }

    except Exception as e:
        print(f"[interpret_compatibility] Error: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
            "trace": traceback.format_exc(),
        }


def analyze_group_element_distribution(people: list) -> dict:
    """
    그룹 전체의 오행/점성 원소 분포 분석
    """
    oheng_count = {"木": 0, "火": 0, "土": 0, "金": 0, "水": 0}
    astro_element_count = {"fire": 0, "earth": 0, "air": 0, "water": 0}

    for person in people:
        # 사주 오행 분석
        saju = person.get("saju", {})
        dm = saju.get("dayMaster", {})
        if isinstance(dm, dict):
            dm_element = dm.get("element", "")
            if dm_element in oheng_count:
                oheng_count[dm_element] += 1
            elif dm_element.lower() in ["wood", "fire", "earth", "metal", "water"]:
                mapping = {"wood": "木", "fire": "火", "earth": "土", "metal": "金", "water": "水"}
                oheng_count[mapping.get(dm_element.lower(), "土")] += 1

        # 점성술 원소 분석
        astro = person.get("astro", {})
        sun_sign = astro.get("sunSign", "").lower()

        fire_signs = ["aries", "leo", "sagittarius", "양자리", "사자자리", "사수자리"]
        earth_signs = ["taurus", "virgo", "capricorn", "황소자리", "처녀자리", "염소자리"]
        air_signs = ["gemini", "libra", "aquarius", "쌍둥이자리", "천칭자리", "물병자리"]
        water_signs = ["cancer", "scorpio", "pisces", "게자리", "전갈자리", "물고기자리"]

        if any(s in sun_sign for s in fire_signs):
            astro_element_count["fire"] += 1
        elif any(s in sun_sign for s in earth_signs):
            astro_element_count["earth"] += 1
        elif any(s in sun_sign for s in air_signs):
            astro_element_count["air"] += 1
        elif any(s in sun_sign for s in water_signs):
            astro_element_count["water"] += 1

    # 지배적/부족 원소 찾기
    dominant_oheng = max(oheng_count, key=oheng_count.get) if any(oheng_count.values()) else None
    lacking_oheng = min(oheng_count, key=oheng_count.get) if any(oheng_count.values()) else None
    dominant_astro = max(astro_element_count, key=astro_element_count.get) if any(astro_element_count.values()) else None
    lacking_astro = min(astro_element_count, key=astro_element_count.get) if any(astro_element_count.values()) else None

    return {
        "oheng": oheng_count,
        "astro": astro_element_count,
        "dominant_oheng": dominant_oheng,
        "lacking_oheng": lacking_oheng,
        "dominant_astro": dominant_astro,
        "lacking_astro": lacking_astro,
    }


def analyze_stem_compatibility(stem1: str, stem2: str) -> dict:
    """
    천간(일간) 궁합 분석 - 합/충 관계 확인
    """
    result = {
        "relationship": "neutral",
        "score_adjustment": 0,
        "meaning": "",
        "details": [],
    }

    # 천간합 확인
    for (s1, s2), data in STEM_COMBINATIONS.items():
        if (stem1 == s1 and stem2 == s2) or (stem1 == s2 and stem2 == s1):
            result["relationship"] = "combination"
            result["score_adjustment"] = data["score"] - 70  # Base 70점 기준 조정
            result["meaning"] = data["meaning"]
            result["details"].append(f"✨ 천간합: {data['meaning']}")
            return result

    # 천간충 확인
    for (s1, s2), data in STEM_CLASHES.items():
        if (stem1 == s1 and stem2 == s2) or (stem1 == s2 and stem2 == s1):
            result["relationship"] = "clash"
            result["score_adjustment"] = data["score"]
            result["meaning"] = data["meaning"]
            result["details"].append(f"⚡ 천간충: {data['meaning']}")
            return result

    # 같은 천간 (비견 관계)
    if stem1 == stem2:
        result["relationship"] = "same"
        result["score_adjustment"] = 5
        result["meaning"] = "같은 일간 - 서로를 잘 이해하지만 경쟁 가능"
        result["details"].append(f"🔄 동일 일간: 비견 관계, 공감대 있지만 주도권 경쟁 주의")

    return result


def analyze_branch_compatibility(branch1: str, branch2: str, all_branches: list = None) -> dict:
    """
    지지(일지) 궁합 분석 - 삼합/반합/방합/육합/충/형/원진 확인
    """
    result = {
        "relationships": [],
        "score_adjustment": 0,
        "meanings": [],
        "details": [],
    }

    pair_set = frozenset([branch1, branch2])

    # 지지 육합 확인
    for (b1, b2), data in BRANCH_YUKHAP.items():
        if (branch1 == b1 and branch2 == b2) or (branch1 == b2 and branch2 == b1):
            result["relationships"].append("yukhap")
            result["score_adjustment"] += data["score"] - 70
            result["meanings"].append(data["meaning"])
            result["details"].append(f"💕 육합: {data['meaning']}")

    # 지지 반합 확인 (삼합 중 2개)
    if pair_set in BRANCH_BANHAP:
        data = BRANCH_BANHAP[pair_set]
        result["relationships"].append("banhap")
        result["score_adjustment"] += data["score"] - 70
        result["meanings"].append(data["meaning"])
        result["details"].append(f"🌙 반합: {data['meaning']}")

    # 방합 반합 확인 (방합 중 2개)
    if pair_set in BRANCH_BANGHAP_HALF:
        data = BRANCH_BANGHAP_HALF[pair_set]
        result["relationships"].append("banghap_half")
        result["score_adjustment"] += data["score"] - 70
        result["meanings"].append(data["meaning"])
        result["details"].append(f"🧭 방합 잠재력: {data['meaning']}")

    # 지지충 확인
    for (b1, b2), data in BRANCH_CHUNG.items():
        if (branch1 == b1 and branch2 == b2) or (branch1 == b2 and branch2 == b1):
            result["relationships"].append("chung")
            result["score_adjustment"] += data["score"]
            result["meanings"].append(data["meaning"])
            result["details"].append(f"⚡ 지지충: {data['meaning']}")

    # 지지원진 확인
    for (b1, b2), data in BRANCH_WONGJIN.items():
        if (branch1 == b1 and branch2 == b2) or (branch1 == b2 and branch2 == b1):
            result["relationships"].append("wongjin")
            result["score_adjustment"] += data["score"]
            result["meanings"].append(data["meaning"])
            result["details"].append(f"😔 원진: {data['meaning']}")

    # 지지해(害) 확인 - Quincunx에 해당
    for (b1, b2), data in BRANCH_HAE.items():
        if (branch1 == b1 and branch2 == b2) or (branch1 == b2 and branch2 == b1):
            result["relationships"].append("hae")
            result["score_adjustment"] += data["score"]
            result["meanings"].append(data["meaning"])
            result["details"].append(f"🔸 해(害): {data['meaning']} ({data.get('synastry', '')})")

    # 그룹 삼합 확인 (3명 이상일 때)
    if all_branches and len(all_branches) >= 3:
        branch_set = frozenset(all_branches)
        for samhap_set, data in BRANCH_SAMHAP.items():
            if samhap_set.issubset(branch_set):
                result["relationships"].append("samhap")
                result["score_adjustment"] += 15  # 그룹 보너스
                result["meanings"].append(data["meaning"])
                result["details"].append(f"🌟 삼합 완성: {data['meaning']}")

    # 그룹 방합 확인 (3명 이상일 때)
    if all_branches and len(all_branches) >= 3:
        branch_set = frozenset(all_branches)
        for banghap_set, data in BRANCH_BANGHAP.items():
            if banghap_set.issubset(branch_set):
                result["relationships"].append("banghap")
                result["score_adjustment"] += 12  # 방합 그룹 보너스
                result["meanings"].append(data["meaning"])
                result["details"].append(f"🧭 방합 완성: {data['meaning']}")

    # 그룹 형 확인
    if all_branches and len(all_branches) >= 2:
        branch_set = frozenset(all_branches)
        for hyung_set, data in BRANCH_HYUNG.items():
            if hyung_set.issubset(branch_set):
                result["relationships"].append("hyung")
                result["score_adjustment"] += data["score"]
                result["meanings"].append(data["meaning"])
                result["details"].append(f"⚠️ 형: {data['meaning']}")

    # 같은 지지
    if branch1 == branch2:
        result["relationships"].append("same")
        result["score_adjustment"] += 3
        result["details"].append(f"🔄 동일 일지: 비슷한 성향, 편안함")

    return result


def analyze_shinsal_compatibility(person1: dict, person2: dict) -> dict:
    """
    신살(神殺) 궁합 분석 - 두 사람의 신살 상호작용 분석

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with shinsal compatibility scores and details
    """
    result = {
        "total_score": 0,
        "details": [],
        "shinsal_interactions": [],
        "positive_shinsals": [],
        "negative_shinsals": [],
        "recommendations": []
    }

    # 사주 데이터 추출
    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})
    dm1 = saju1.get("dayMaster", {})
    dm2 = saju2.get("dayMaster", {})

    # 일간 추출
    dm1_name = dm1.get("name", "") if isinstance(dm1, dict) else str(dm1)
    dm2_name = dm2.get("name", "") if isinstance(dm2, dict) else str(dm2)

    # 지지 추출 (년지, 월지, 일지, 시지)
    def get_branches(pillars):
        branches = []
        for pillar_name in ["year", "month", "day", "hour"]:
            pillar = pillars.get(pillar_name, "")
            if len(pillar) >= 2:
                branches.append(pillar[1])
        return branches

    branches1 = get_branches(pillars1)
    branches2 = get_branches(pillars2)
    day_branch1 = branches1[2] if len(branches1) > 2 else ""
    day_branch2 = branches2[2] if len(branches2) > 2 else ""
    year_branch1 = branches1[0] if len(branches1) > 0 else ""
    year_branch2 = branches2[0] if len(branches2) > 0 else ""

    # 1. 도화살/역마살/화개살 분석 (지지 기반)
    for shinsal_name, branch_mapping in SHINSAL_DETERMINATION.items():
        # Person 1 신살 확인
        person1_has = False
        person2_has = False

        # 년지 또는 일지 기준으로 다른 지지에서 해당 신살이 있는지 확인
        for base_branch in [year_branch1, day_branch1]:
            if base_branch in branch_mapping:
                target_branch = branch_mapping[base_branch]
                if target_branch in branches1:
                    person1_has = True
                    break

        for base_branch in [year_branch2, day_branch2]:
            if base_branch in branch_mapping:
                target_branch = branch_mapping[base_branch]
                if target_branch in branches2:
                    person2_has = True
                    break

        # 점수 계산
        if shinsal_name in SHINSAL_COMPATIBILITY:
            shinsal_data = SHINSAL_COMPATIBILITY[shinsal_name]

            if person1_has and person2_has:
                score = shinsal_data.get("score_both", 0)
                result["total_score"] += score
                interaction = {
                    "shinsal": shinsal_name,
                    "both_have": True,
                    "score": score,
                    "meaning": shinsal_data.get("compatibility_effect", ""),
                    "astro_parallel": shinsal_data.get("astro_parallel", "")
                }
                result["shinsal_interactions"].append(interaction)
                if score > 0:
                    result["positive_shinsals"].append(f"{shinsal_name} (둘 다): {shinsal_data.get('compatibility_effect', '')}")
                elif score < 0:
                    result["negative_shinsals"].append(f"{shinsal_name} (둘 다): {shinsal_data.get('compatibility_effect', '')}")
            elif person1_has or person2_has:
                # 한 명만 가진 경우
                score = shinsal_data.get("score_partner", 0)
                # 역마살의 경우 한 명만 있으면 불리
                if "score_opposite" in shinsal_data:
                    score = shinsal_data.get("score_opposite", 0)
                result["total_score"] += score
                who_has = "본인" if person1_has else "상대방"
                interaction = {
                    "shinsal": shinsal_name,
                    "who_has": who_has,
                    "score": score,
                    "meaning": shinsal_data.get("meaning", "")
                }
                result["shinsal_interactions"].append(interaction)

    # 2. 귀인 분석 (일간 기준)
    for guiin_name, stem_mapping in GUIIN_DETERMINATION.items():
        person1_has_guiin = False
        person2_has_guiin = False

        # Person 1 귀인 확인
        if dm1_name in stem_mapping:
            guiin_branches = stem_mapping[dm1_name]
            if isinstance(guiin_branches, list):
                for gb in guiin_branches:
                    if gb in branches1:
                        person1_has_guiin = True
                        break
            elif guiin_branches in branches1:
                person1_has_guiin = True

        # Person 2 귀인 확인
        if dm2_name in stem_mapping:
            guiin_branches = stem_mapping[dm2_name]
            if isinstance(guiin_branches, list):
                for gb in guiin_branches:
                    if gb in branches2:
                        person2_has_guiin = True
                        break
            elif guiin_branches in branches2:
                person2_has_guiin = True

        # 점수 계산
        if guiin_name in SHINSAL_COMPATIBILITY:
            guiin_data = SHINSAL_COMPATIBILITY[guiin_name]

            if person1_has_guiin and person2_has_guiin:
                score = guiin_data.get("score_both", 0)
                result["total_score"] += score
                result["positive_shinsals"].append(f"{guiin_name} (둘 다): {guiin_data.get('compatibility_effect', '')}")
            elif person1_has_guiin:
                score = guiin_data.get("score_self", 0)
                result["total_score"] += score
                if score > 0:
                    result["details"].append(f"A에게 {guiin_name} - B를 도울 수 있음")
            elif person2_has_guiin:
                score = guiin_data.get("score_partner", 0)
                result["total_score"] += score
                if score > 0:
                    result["details"].append(f"B에게 {guiin_name} - A를 도움")

    # 3. 추가 신살 체크 (양인살, 고진살 등 - 단순화된 체크)
    # 양인살: 일간의 양인 지지
    YANGIN_BRANCHES = {
        "甲": "卯", "乙": "辰", "丙": "午", "丁": "未",
        "戊": "午", "己": "未", "庚": "酉", "辛": "戌",
        "壬": "子", "癸": "丑"
    }

    person1_yangin = dm1_name in YANGIN_BRANCHES and YANGIN_BRANCHES[dm1_name] in branches1
    person2_yangin = dm2_name in YANGIN_BRANCHES and YANGIN_BRANCHES[dm2_name] in branches2

    if "양인살" in SHINSAL_COMPATIBILITY:
        yangin_data = SHINSAL_COMPATIBILITY["양인살"]
        if person1_yangin and person2_yangin:
            result["total_score"] += yangin_data.get("score_both", 0)
            result["negative_shinsals"].append("양인살 (둘 다): 서로 상처를 줄 수 있음")
            result["recommendations"].append("감정 표현 시 말투에 주의하세요")
        elif person1_yangin or person2_yangin:
            result["total_score"] += yangin_data.get("score_partner", 0)
            result["details"].append("한 쪽에 양인살 - 날카로움 주의")

    # 4. 결과 요약
    if result["total_score"] > 15:
        result["summary"] = "신살 궁합이 매우 좋습니다! 서로에게 귀인이 되어주는 관계입니다."
    elif result["total_score"] > 5:
        result["summary"] = "신살 궁합이 좋습니다. 긍정적인 에너지가 많습니다."
    elif result["total_score"] > -5:
        result["summary"] = "신살 궁합이 보통입니다. 특별한 신살 영향이 적습니다."
    elif result["total_score"] > -15:
        result["summary"] = "신살 상 주의할 점이 있습니다. 권고사항을 참고하세요."
    else:
        result["summary"] = "신살 상 도전적인 부분이 있습니다. 서로 이해하고 노력이 필요합니다."

    return result


def analyze_twelve_stages_compatibility(person1: dict, person2: dict) -> dict:
    """
    12운성(十二運星) 궁합 분석 - 두 사람의 12운성 조합 분석

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with 12 stages compatibility analysis
    """
    result = {
        "person1_stage": "",
        "person2_stage": "",
        "score": 0,
        "meaning": "",
        "compatibility_level": ""
    }

    # 12운성 데이터 추출 (사주 데이터에 있다고 가정)
    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})

    stage1 = saju1.get("twelveStage", saju1.get("twelve_stage", ""))
    stage2 = saju2.get("twelveStage", saju2.get("twelve_stage", ""))

    if not stage1 or not stage2:
        # 12운성 데이터가 없으면 기본값 반환
        return result

    result["person1_stage"] = stage1
    result["person2_stage"] = stage2

    # 조합 점수 확인
    combo = (stage1, stage2)
    combo_reverse = (stage2, stage1)

    if combo in TWELVE_STAGES_COMPATIBILITY:
        data = TWELVE_STAGES_COMPATIBILITY[combo]
        result["score"] = data["score"]
        result["meaning"] = data["meaning"]
    elif combo_reverse in TWELVE_STAGES_COMPATIBILITY:
        data = TWELVE_STAGES_COMPATIBILITY[combo_reverse]
        result["score"] = data["score"]
        result["meaning"] = data["meaning"]
    else:
        # 기본 점수 계산 (왕성한 운일수록 높음)
        strong_stages = ["장생", "관대", "건록", "제왕"]
        moderate_stages = ["목욕", "양", "태"]
        weak_stages = ["쇠", "병", "사", "묘", "절"]

        score1 = 3 if stage1 in strong_stages else (2 if stage1 in moderate_stages else 1)
        score2 = 3 if stage2 in strong_stages else (2 if stage2 in moderate_stages else 1)

        result["score"] = (score1 + score2) * 2
        result["meaning"] = f"{stage1}과 {stage2}의 조합"

    # 호환성 레벨
    if result["score"] >= 9:
        result["compatibility_level"] = "최상"
    elif result["score"] >= 7:
        result["compatibility_level"] = "좋음"
    elif result["score"] >= 5:
        result["compatibility_level"] = "보통"
    else:
        result["compatibility_level"] = "노력 필요"

    return result


def analyze_naeum_compatibility(person1: dict, person2: dict) -> dict:
    """
    납음오행(納音五行) 궁합 분석 - 두 사람의 일주 납음 비교

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with naeum compatibility analysis
    """
    result = {
        "person1_naeum": "",
        "person2_naeum": "",
        "person1_element": "",
        "person2_element": "",
        "score": 0,
        "meaning": "",
        "compatibility_level": ""
    }

    # 사주 데이터 추출
    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    # 일주 추출 (60갑자 형태)
    day1 = pillars1.get("day", "")
    day2 = pillars2.get("day", "")

    if not day1 or not day2 or len(day1) < 2 or len(day2) < 2:
        return result

    # 납음 찾기
    naeum1 = GANJI_TO_NAEUM.get(day1, "")
    naeum2 = GANJI_TO_NAEUM.get(day2, "")

    if not naeum1 or not naeum2:
        return result

    result["person1_naeum"] = naeum1
    result["person2_naeum"] = naeum2

    # 납음 오행 찾기
    elem1 = NAEUM_TO_ELEMENT.get(naeum1, "")
    elem2 = NAEUM_TO_ELEMENT.get(naeum2, "")

    result["person1_element"] = elem1
    result["person2_element"] = elem2

    if not elem1 or not elem2:
        return result

    # 오행 궁합 점수 계산
    combo = (elem1, elem2)
    combo_reverse = (elem2, elem1)

    if combo in NAEUM_ELEMENT_COMPATIBILITY:
        data = NAEUM_ELEMENT_COMPATIBILITY[combo]
        result["score"] = data["score"]
        result["meaning"] = data["meaning"]
    elif combo_reverse in NAEUM_ELEMENT_COMPATIBILITY:
        data = NAEUM_ELEMENT_COMPATIBILITY[combo_reverse]
        result["score"] = data["score"]
        result["meaning"] = data["meaning"]
    else:
        result["score"] = 0
        result["meaning"] = f"{naeum1}({elem1})과 {naeum2}({elem2})의 조합"

    # 같은 납음인 경우 특별 보너스
    if naeum1 == naeum2:
        result["score"] += 5
        result["meaning"] = f"같은 납음({naeum1}) - 같은 운명적 성향"

    # 호환성 레벨
    if result["score"] >= 8:
        result["compatibility_level"] = "상생 - 매우 좋음"
    elif result["score"] >= 5:
        result["compatibility_level"] = "비화 - 좋음"
    elif result["score"] >= 0:
        result["compatibility_level"] = "중립"
    else:
        result["compatibility_level"] = "상극 - 도전적"

    return result


def analyze_gongmang_interaction(person1: dict, person2: dict) -> dict:
    """
    공망(空亡) 상호작용 분석 - 두 사람의 공망이 상대의 지지에 미치는 영향

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with gongmang interaction analysis
    """
    result = {
        "person1_gongmang": [],
        "person2_gongmang": [],
        "interactions": [],
        "score_adjustment": 0,
        "summary": ""
    }

    # 사주 데이터 추출
    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    # 일주 추출
    day1 = pillars1.get("day", "")
    day2 = pillars2.get("day", "")

    if not day1 or not day2 or len(day1) < 2 or len(day2) < 2:
        return result

    # 공망 찾기
    gongmang1 = GONGMANG_BY_CYCLE.get(day1, [])
    gongmang2 = GONGMANG_BY_CYCLE.get(day2, [])

    result["person1_gongmang"] = gongmang1
    result["person2_gongmang"] = gongmang2

    # 지지 추출
    def get_branches(pillars):
        branches = []
        for pillar_name in ["year", "month", "day", "hour"]:
            pillar = pillars.get(pillar_name, "")
            if len(pillar) >= 2:
                branches.append(pillar[1])
        return branches

    branches1 = get_branches(pillars1)
    branches2 = get_branches(pillars2)

    # 상호작용 분석
    # 1. 내 공망이 상대의 일지에 해당하면 - 상대를 '비워둠'
    day_branch2 = branches2[2] if len(branches2) > 2 else ""
    day_branch1 = branches1[2] if len(branches1) > 2 else ""

    if day_branch2 in gongmang1:
        result["interactions"].append({
            "type": "my_gongmang_partner_day",
            "effect": "A의 공망이 B의 일지 - B와의 관계에서 허전함 느낄 수 있음",
            "score": -3
        })
        result["score_adjustment"] -= 3

    if day_branch1 in gongmang2:
        result["interactions"].append({
            "type": "partner_gongmang_my_day",
            "effect": "B의 공망이 A의 일지 - A와의 관계에서 허전함 느낄 수 있음",
            "score": -3
        })
        result["score_adjustment"] -= 3

    # 2. 공망이 서로 같으면 - 같은 영역을 비워둠 (오히려 이해 가능)
    common_gongmang = set(gongmang1) & set(gongmang2)
    if common_gongmang:
        result["interactions"].append({
            "type": "shared_gongmang",
            "branches": list(common_gongmang),
            "effect": f"같은 공망({', '.join(common_gongmang)}) - 같은 영역에서 공허함을 공유, 이해 가능",
            "score": 2
        })
        result["score_adjustment"] += 2

    # 3. 배우자궁(일지) 관련 공망이 없으면 좋음
    if day_branch2 not in gongmang1 and day_branch1 not in gongmang2:
        result["interactions"].append({
            "type": "no_spouse_gongmang",
            "effect": "배우자궁 공망 없음 - 관계가 실질적으로 느껴짐",
            "score": 2
        })
        result["score_adjustment"] += 2

    # 요약
    if result["score_adjustment"] > 0:
        result["summary"] = "공망 상 좋은 조합입니다. 서로의 빈 곳을 이해합니다."
    elif result["score_adjustment"] == 0:
        result["summary"] = "공망 영향이 중립적입니다."
    else:
        result["summary"] = "공망 상 주의할 부분이 있습니다. 관계에서 허전함을 느낄 수 있어요."

    return result


def analyze_house_compatibility(person1: dict, person2: dict) -> dict:
    """
    12하우스 궁합 분석 - 두 사람의 일지를 하우스로 변환하여 분석

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with house compatibility analysis
    """
    result = {
        "person1_houses": {"primary": 0, "secondary": 0, "branch": ""},
        "person2_houses": {"primary": 0, "secondary": 0, "branch": ""},
        "score": 0,
        "house_interactions": [],
        "dominant_themes": [],
        "compatibility_level": "",
        "summary": ""
    }

    # 사주 데이터 추출
    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    # 일지 추출
    day1 = pillars1.get("day", "")
    day2 = pillars2.get("day", "")

    branch1 = day1[1] if len(day1) >= 2 else ""
    branch2 = day2[1] if len(day2) >= 2 else ""

    if not branch1 or not branch2:
        return result

    # 하우스 매핑
    house1_data = BRANCH_TO_HOUSE.get(branch1, {})
    house2_data = BRANCH_TO_HOUSE.get(branch2, {})

    if not house1_data or not house2_data:
        return result

    result["person1_houses"] = {
        "primary": house1_data.get("primary", 0),
        "secondary": house1_data.get("secondary", 0),
        "branch": branch1,
        "theme": house1_data.get("theme", "")
    }
    result["person2_houses"] = {
        "primary": house2_data.get("primary", 0),
        "secondary": house2_data.get("secondary", 0),
        "branch": branch2,
        "theme": house2_data.get("theme", "")
    }

    h1_primary = house1_data.get("primary", 0)
    h2_primary = house2_data.get("primary", 0)
    h1_secondary = house1_data.get("secondary", 0)
    h2_secondary = house2_data.get("secondary", 0)

    total_score = 0

    # 1. 같은 하우스 체크
    if h1_primary == h2_primary:
        same_data = SAME_HOUSE_SCORE.get(h1_primary, {"score": 5, "meaning": "같은 하우스"})
        total_score += same_data["score"]
        result["house_interactions"].append({
            "type": "same_primary",
            "house": h1_primary,
            "score": same_data["score"],
            "meaning": same_data["meaning"]
        })
        result["dominant_themes"].append(HOUSE_COMPATIBILITY_MEANING.get(h1_primary, {}).get("theme", ""))

    # 2. 하우스 축 체크 (1-7, 2-8, 3-9, 4-10, 5-11, 6-12)
    axis_pairs = [(h1_primary, h2_primary), (h2_primary, h1_primary)]
    for axis_key, axis_data in HOUSE_AXIS_COMPATIBILITY.items():
        for pair in axis_pairs:
            if (pair[0] == axis_key[0] and pair[1] == axis_key[1]) or \
               (pair[0] == axis_key[1] and pair[1] == axis_key[0]):
                total_score += axis_data["score"]
                result["house_interactions"].append({
                    "type": "axis",
                    "houses": list(axis_key),
                    "score": axis_data["score"],
                    "meaning": axis_data["meaning"]
                })
                break

    # 3. 관계에 좋은 하우스 조합 체크
    # 7하우스(파트너십) 관련
    if h1_primary == 7 or h2_primary == 7:
        total_score += 5
        result["house_interactions"].append({
            "type": "partnership_house",
            "score": 5,
            "meaning": "파트너십 하우스 활성 - 관계에 적합"
        })

    # 5하우스(로맨스) 관련
    if h1_primary == 5 or h2_primary == 5:
        total_score += 4
        result["house_interactions"].append({
            "type": "romance_house",
            "score": 4,
            "meaning": "로맨스 하우스 활성 - 즐거운 관계"
        })

    # 4하우스(가정) 관련
    if h1_primary == 4 or h2_primary == 4:
        total_score += 3
        result["house_interactions"].append({
            "type": "home_house",
            "score": 3,
            "meaning": "가정 하우스 활성 - 안정적 관계"
        })

    # 4. Secondary 하우스 보너스
    if h1_secondary == h2_primary or h2_secondary == h1_primary:
        total_score += 3
        result["house_interactions"].append({
            "type": "secondary_match",
            "score": 3,
            "meaning": "부수 하우스 연결 - 추가 조화"
        })

    result["score"] = total_score

    # 호환성 레벨
    if total_score >= 15:
        result["compatibility_level"] = "최상"
        result["summary"] = "하우스 상 완벽한 궁합! 삶의 영역이 조화롭게 연결됩니다."
    elif total_score >= 10:
        result["compatibility_level"] = "좋음"
        result["summary"] = "하우스 상 좋은 궁합입니다. 주요 삶의 영역에서 조화를 이룹니다."
    elif total_score >= 5:
        result["compatibility_level"] = "보통"
        result["summary"] = "하우스 상 보통 궁합입니다. 일부 영역에서 조율이 필요합니다."
    else:
        result["compatibility_level"] = "노력 필요"
        result["summary"] = "하우스 상 다른 에너지입니다. 서로 다른 점을 이해하는 노력이 필요합니다."

    return result


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

    # 점성술 데이터 추출
    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})

    # ASC 추출 (ascendant 또는 asc 키 체크)
    asc1 = astro1.get("ascendant", astro1.get("asc", ""))
    asc2 = astro2.get("ascendant", astro2.get("asc", ""))

    # 별자리만 추출 (예: "Leo 15°" -> "Leo")
    if isinstance(asc1, str) and asc1:
        asc1 = asc1.split()[0] if " " in asc1 else asc1
    if isinstance(asc2, str) and asc2:
        asc2 = asc2.split()[0] if " " in asc2 else asc2

    if not asc1 or not asc2:
        result["summary"] = "ASC 정보가 없어 분석할 수 없습니다."
        return result

    result["person1_asc"] = asc1
    result["person2_asc"] = asc2

    # DSC 계산 (ASC의 반대편)
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

    # 1. ASC-DSC 축 체크 (가장 강력한 시나스트리)
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

    # 2. 같은 ASC (비슷한 외적 표현)
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

    # Person1의 DSC 니즈와 Person2의 ASC 특성 비교
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

    # Person2의 DSC 니즈와 Person1의 ASC 특성 비교
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

    result["score"] = min(total_score, 20)  # 최대 20점

    # 관계 스타일 결정
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

    # Lilith 추출
    lilith1 = planets1.get("Lilith", planets1.get("lilith", planets1.get("Black Moon Lilith", "")))
    lilith2 = planets2.get("Lilith", planets2.get("lilith", planets2.get("Black Moon Lilith", "")))

    # Chiron 추출
    chiron1 = planets1.get("Chiron", planets1.get("chiron", ""))
    chiron2 = planets2.get("Chiron", planets2.get("chiron", ""))

    # 별자리만 추출
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

        # 같은 Lilith 별자리
        if lilith1_sign == lilith2_sign:
            lilith_score += 6
            result["lilith_analysis"]["interactions"].append({
                "type": "same_lilith",
                "description": f"같은 Lilith 별자리 ({lilith1_sign})",
                "score": 6,
                "meaning": lilith_synastry.get("when_triggered", "깊은 무의식적 연결")
            })
            result["shadow_work"].append(lilith_synastry.get("shadow_work", "함께 그림자를 탐구할 수 있음"))

        # Lilith-Sun/Moon 연결 (상대의 주요 별자리와 일치 시)
        sun2 = planets2.get("Sun", planets2.get("sun", ""))
        sun2_sign = extract_sign(sun2)
        if lilith1_sign == sun2_sign:
            lilith_score += 5
            result["lilith_analysis"]["interactions"].append({
                "type": "lilith_conjunct_sun",
                "description": f"Person1의 Lilith가 Person2의 Sun과 같은 별자리",
                "score": 5,
                "meaning": "강렬한 끌림과 변형적 관계. 그림자 측면을 자극함."
            })

    # Chiron 시나스트리 분석
    if chiron1_sign and chiron2_sign:
        chiron_synastry = CHIRON_SYNASTRY.get(chiron1_sign, {})

        # 같은 Chiron 별자리
        if chiron1_sign == chiron2_sign:
            chiron_score += 6
            result["chiron_analysis"]["interactions"].append({
                "type": "same_chiron",
                "description": f"같은 Chiron 별자리 ({chiron1_sign})",
                "score": 6,
                "meaning": "비슷한 상처와 치유 여정을 공유함"
            })
            result["healing_potential"].append(chiron_synastry.get("healing_gift", "서로의 상처를 이해하고 치유할 수 있음"))

        # Chiron-Moon 연결 (감정적 치유)
        moon2 = planets2.get("Moon", planets2.get("moon", ""))
        moon2_sign = extract_sign(moon2)
        if chiron1_sign == moon2_sign:
            chiron_score += 5
            result["chiron_analysis"]["interactions"].append({
                "type": "chiron_conjunct_moon",
                "description": f"Person1의 Chiron이 Person2의 Moon과 같은 별자리",
                "score": 5,
                "meaning": "깊은 감정적 치유가 일어날 수 있는 관계"
            })
            result["healing_potential"].append("감정적 상처의 치유와 돌봄이 가능한 관계")

        # Chiron 정보 추가
        if chiron_synastry:
            result["chiron_analysis"]["wound_theme"] = chiron_synastry.get("wound_theme", "")

    result["lilith_analysis"]["score"] = lilith_score
    result["chiron_analysis"]["score"] = chiron_score
    result["combined_score"] = min(lilith_score + chiron_score, 15)  # 최대 15점

    # 종합 요약
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


def analyze_samjae_compatibility(person1: dict, person2: dict) -> dict:
    """
    삼재(三災) 궁합 분석 - 두 사람의 삼재 상호작용

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with 삼재 compatibility analysis
    """
    result = {
        "person1_year_branch": "",
        "person2_year_branch": "",
        "person1_samjae_group": [],
        "person2_samjae_group": [],
        "interaction": "",
        "score": 0,
        "effect": "",
        "recommendation": "",
        "summary": ""
    }

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    # 년지 추출
    year1 = pillars1.get("year", "")
    year2 = pillars2.get("year", "")

    branch1 = year1[1] if len(year1) >= 2 else ""
    branch2 = year2[1] if len(year2) >= 2 else ""

    if not branch1 or not branch2:
        result["summary"] = "년지 정보가 없어 삼재 분석을 할 수 없습니다."
        return result

    result["person1_year_branch"] = branch1
    result["person2_year_branch"] = branch2

    # 삼재 그룹 찾기
    def get_samjae_group(branch):
        for group_name, data in SAMJAE_GROUPS.items():
            if branch in data.get("years", []):
                return group_name, data
        return None, None

    group1_name, group1_data = get_samjae_group(branch1)
    group2_name, group2_data = get_samjae_group(branch2)

    if group1_data:
        result["person1_samjae_group"] = group1_data.get("samjae_branches", [])
    if group2_data:
        result["person2_samjae_group"] = group2_data.get("samjae_branches", [])

    score = 0

    # 삼재 상호작용 분석
    # 1. 서로 다른 그룹이고, 서로의 삼재 년도에 해당하지 않음 = 좋음
    if group1_name and group2_name and group1_name != group2_name:
        samjae1 = group1_data.get("samjae_branches", [])
        samjae2 = group2_data.get("samjae_branches", [])

        if branch2 not in samjae1 and branch1 not in samjae2:
            score += 8
            result["interaction"] = "safe"
            effect_data = SAMJAE_COMPATIBILITY_EFFECT.get("different_group_no_clash", {})
            result["effect"] = effect_data.get("effect", "삼재 충돌 없음")
            result["recommendation"] = effect_data.get("recommendation", "")
        elif branch2 in samjae1 or branch1 in samjae2:
            score -= 5
            result["interaction"] = "one_in_other_samjae"
            effect_data = SAMJAE_COMPATIBILITY_EFFECT.get("one_in_other_samjae", {})
            result["effect"] = effect_data.get("effect", "한 쪽이 삼재 영향")
            result["recommendation"] = effect_data.get("recommendation", "")

    # 2. 같은 그룹 = 함께 삼재를 경험
    elif group1_name and group1_name == group2_name:
        score += 3
        result["interaction"] = "same_group"
        effect_data = SAMJAE_COMPATIBILITY_EFFECT.get("same_group", {})
        result["effect"] = effect_data.get("effect", "같은 시기에 삼재 경험")
        result["recommendation"] = effect_data.get("recommendation", "")

    result["score"] = score

    # 요약
    if score >= 6:
        result["summary"] = "삼재 상 안전한 궁합입니다. 서로의 삼재 시기에 영향을 주지 않습니다."
    elif score >= 0:
        result["summary"] = "삼재 상 보통 궁합입니다. 같은 시기에 어려움을 겪을 수 있으나 함께 극복 가능합니다."
    else:
        result["summary"] = "삼재 상 주의가 필요합니다. 상대의 삼재 시기에 관계에 영향을 줄 수 있습니다."

    return result


def analyze_yongsin_interaction(person1: dict, person2: dict) -> dict:
    """
    용신(用神)/기신(忌神) 상호작용 분석

    Args:
        person1: 첫 번째 사람의 사주 데이터 (용신 정보 포함)
        person2: 두 번째 사람의 사주 데이터 (용신 정보 포함)

    Returns:
        dict with 용신/기신 interaction analysis
    """
    result = {
        "person1_yongsin": "",
        "person2_yongsin": "",
        "person1_gisin": "",
        "person2_gisin": "",
        "interaction_type": "",
        "score": 0,
        "mutual_support": False,
        "potential_conflict": False,
        "compatibility_details": [],
        "recommendations": [],
        "summary": ""
    }

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})

    # 용신/기신 추출 (다양한 키 형태 지원)
    yongsin1 = saju1.get("yongsin", saju1.get("용신", saju1.get("use_god", "")))
    yongsin2 = saju2.get("yongsin", saju2.get("용신", saju2.get("use_god", "")))
    gisin1 = saju1.get("gisin", saju1.get("기신", saju1.get("avoid_god", "")))
    gisin2 = saju2.get("gisin", saju2.get("기신", saju2.get("avoid_god", "")))

    result["person1_yongsin"] = yongsin1
    result["person2_yongsin"] = yongsin2
    result["person1_gisin"] = gisin1
    result["person2_gisin"] = gisin2

    if not yongsin1 or not yongsin2:
        result["summary"] = "용신 정보가 없어 분석할 수 없습니다."
        return result

    score = 0

    # 용신 특성 가져오기
    yongsin1_chars = YONGSIN_CHARACTERISTICS.get(yongsin1, {})
    yongsin2_chars = YONGSIN_CHARACTERISTICS.get(yongsin2, {})

    # 1. 같은 용신 체크
    interaction = YONGSIN_INTERACTION.get("same_yongsin", {})
    if yongsin1 == yongsin2:
        score += interaction.get("score", 8)
        result["interaction_type"] = "same_yongsin"
        result["compatibility_details"].append({
            "type": "same_yongsin",
            "element": yongsin1,
            "score": interaction["score"],
            "meaning": interaction.get("meaning", "같은 에너지를 필요로 함")
        })
        result["recommendations"].append(interaction.get("recommendation", ""))

    # 2. 용신 상생 관계 체크
    generating_pairs = [("木", "火"), ("火", "土"), ("土", "金"), ("金", "水"), ("水", "木")]

    interaction = YONGSIN_INTERACTION.get("yongsin_generates_partner", {})
    for pair in generating_pairs:
        if yongsin1 == pair[0] and yongsin2 == pair[1]:
            score += interaction.get("score", 10)
            result["mutual_support"] = True
            result["compatibility_details"].append({
                "type": "yongsin_generates",
                "from": yongsin1,
                "to": yongsin2,
                "score": interaction["score"],
                "meaning": f"{yongsin1}이(가) {yongsin2}을(를) 생(生)함"
            })
            result["recommendations"].append(interaction.get("recommendation", ""))
        elif yongsin2 == pair[0] and yongsin1 == pair[1]:
            score += interaction.get("score", 10)
            result["mutual_support"] = True
            result["compatibility_details"].append({
                "type": "yongsin_generates",
                "from": yongsin2,
                "to": yongsin1,
                "score": interaction["score"],
                "meaning": f"{yongsin2}이(가) {yongsin1}을(를) 생(生)함"
            })

    # 3. 용신 상극 관계 체크
    controlling_pairs = [("木", "土"), ("土", "水"), ("水", "火"), ("火", "金"), ("金", "木")]

    interaction = YONGSIN_INTERACTION.get("yongsin_controls_partner", {})
    for pair in controlling_pairs:
        if (yongsin1 == pair[0] and yongsin2 == pair[1]) or \
           (yongsin2 == pair[0] and yongsin1 == pair[1]):
            score += interaction.get("score", -3)
            result["potential_conflict"] = True
            result["compatibility_details"].append({
                "type": "yongsin_controls",
                "controlling": pair[0],
                "controlled": pair[1],
                "score": interaction["score"],
                "meaning": "용신이 상극 관계"
            })
            result["recommendations"].append(interaction.get("recommendation", ""))

    # 4. 용신-기신 관계 체크 (내 용신이 상대 기신이면 주의)
    if yongsin1 and gisin2 and yongsin1 == gisin2:
        interaction = YONGSIN_INTERACTION.get("yongsin_is_partner_gisin", {})
        score += interaction.get("score", -5)
        result["potential_conflict"] = True
        result["compatibility_details"].append({
            "type": "my_yongsin_partner_gisin",
            "element": yongsin1,
            "score": interaction["score"],
            "meaning": "내 용신이 상대의 기신"
        })
        result["recommendations"].append(interaction.get("recommendation", ""))

    if yongsin2 and gisin1 and yongsin2 == gisin1:
        interaction = YONGSIN_INTERACTION.get("yongsin_is_partner_gisin", {})
        score += interaction.get("score", -5)
        result["potential_conflict"] = True
        result["compatibility_details"].append({
            "type": "partner_yongsin_my_gisin",
            "element": yongsin2,
            "score": interaction["score"],
            "meaning": "상대의 용신이 내 기신"
        })

    # 5. 강점/약점 보완 분석
    if yongsin1_chars and yongsin2_chars:
        strengths1 = set(yongsin1_chars.get("strengths", []))
        strengths2 = set(yongsin2_chars.get("strengths", []))
        weaknesses1 = set(yongsin1_chars.get("weaknesses", []))
        weaknesses2 = set(yongsin2_chars.get("weaknesses", []))

        # 상대 강점이 내 약점을 보완하면 보너스
        if strengths2 & weaknesses1:
            score += 3
            result["compatibility_details"].append({
                "type": "strength_covers_weakness",
                "provider": person2.get("name", "Person2"),
                "receiver": person1.get("name", "Person1"),
                "score": 3,
                "meaning": "상대의 강점이 나의 약점을 보완"
            })

        if strengths1 & weaknesses2:
            score += 3
            result["compatibility_details"].append({
                "type": "strength_covers_weakness",
                "provider": person1.get("name", "Person1"),
                "receiver": person2.get("name", "Person2"),
                "score": 3,
                "meaning": "나의 강점이 상대의 약점을 보완"
            })

    result["score"] = max(-10, min(15, score))  # -10 ~ +15 범위

    # 요약
    if score >= 10:
        result["summary"] = "용신이 서로를 돕는 최상의 궁합! 함께하면 운이 상승합니다."
    elif score >= 5:
        result["summary"] = "용신 궁합이 좋습니다. 서로의 부족한 부분을 보완해줍니다."
    elif score >= 0:
        result["summary"] = "용신 궁합이 보통입니다. 특별한 충돌이나 지원이 없습니다."
    elif score >= -5:
        result["summary"] = "용신 궁합에 주의가 필요합니다. 서로의 에너지가 다소 충돌할 수 있습니다."
    else:
        result["summary"] = "용신-기신 충돌이 있습니다. 서로의 차이를 이해하는 노력이 필요합니다."

    return result


def analyze_banhap_banghap_detailed(person1: dict, person2: dict) -> dict:
    """
    반합(半合)과 방합(方合) 상세 분석

    Args:
        person1: 첫 번째 사람의 사주 데이터
        person2: 두 번째 사람의 사주 데이터

    Returns:
        dict with 반합/방합 detailed analysis
    """
    result = {
        "banhap_analysis": {
            "found": [],
            "score": 0,
            "meaning": ""
        },
        "banghap_analysis": {
            "found": [],
            "score": 0,
            "meaning": ""
        },
        "combined_score": 0,
        "harmony_level": "",
        "summary": ""
    }

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    # 모든 지지 수집
    def get_branches(pillars):
        branches = []
        for pillar_name in ["year", "month", "day", "hour"]:
            pillar = pillars.get(pillar_name, "")
            if len(pillar) >= 2:
                branches.append(pillar[1])
        return branches

    branches1 = get_branches(pillars1)
    branches2 = get_branches(pillars2)

    if not branches1 or not branches2:
        result["summary"] = "지지 정보가 없어 반합/방합 분석을 할 수 없습니다."
        return result

    # 반합 정의 (삼합의 2개 조합)
    banhap_groups = {
        # 화국 반합
        ("寅", "午"): {"element": "火", "type": "인오 반합", "strength": "강"},
        ("午", "戌"): {"element": "火", "type": "오술 반합", "strength": "강"},
        ("寅", "戌"): {"element": "火", "type": "인술 반합", "strength": "약"},
        # 수국 반합
        ("申", "子"): {"element": "水", "type": "신자 반합", "strength": "강"},
        ("子", "辰"): {"element": "水", "type": "자진 반합", "strength": "강"},
        ("申", "辰"): {"element": "水", "type": "신진 반합", "strength": "약"},
        # 목국 반합
        ("亥", "卯"): {"element": "木", "type": "해묘 반합", "strength": "강"},
        ("卯", "未"): {"element": "木", "type": "묘미 반합", "strength": "강"},
        ("亥", "未"): {"element": "木", "type": "해미 반합", "strength": "약"},
        # 금국 반합
        ("巳", "酉"): {"element": "金", "type": "사유 반합", "strength": "강"},
        ("酉", "丑"): {"element": "金", "type": "유축 반합", "strength": "강"},
        ("巳", "丑"): {"element": "金", "type": "사축 반합", "strength": "약"},
    }

    # 방합 정의 (같은 방향의 3개 지지)
    banghap_groups = {
        "동방합": {"branches": ["寅", "卯", "辰"], "element": "木", "direction": "東"},
        "남방합": {"branches": ["巳", "午", "未"], "element": "火", "direction": "南"},
        "서방합": {"branches": ["申", "酉", "戌"], "element": "金", "direction": "西"},
        "북방합": {"branches": ["亥", "子", "丑"], "element": "水", "direction": "北"},
    }

    banhap_score = 0
    banghap_score = 0

    # 반합 체크 (두 사람 사이에서)
    for branch1 in branches1:
        for branch2 in branches2:
            pair = (branch1, branch2)
            reverse_pair = (branch2, branch1)

            banhap_data = banhap_groups.get(pair) or banhap_groups.get(reverse_pair)
            if banhap_data:
                score_add = 6 if banhap_data["strength"] == "강" else 4
                banhap_score += score_add
                result["banhap_analysis"]["found"].append({
                    "branches": [branch1, branch2],
                    "type": banhap_data["type"],
                    "element": banhap_data["element"],
                    "strength": banhap_data["strength"],
                    "score": score_add,
                    "meaning": f"{banhap_data['element']} 에너지의 부분 결합, {banhap_data['strength']}한 조화"
                })

    # 방합 체크 (두 사람의 지지가 방합을 형성하는지)
    all_branches = set(branches1 + branches2)

    for banghap_name, banghap_data in banghap_groups.items():
        banghap_branches = set(banghap_data["branches"])
        matching = all_branches & banghap_branches

        # 두 사람에서 모두 기여해야 방합 인정
        person1_contrib = set(branches1) & banghap_branches
        person2_contrib = set(branches2) & banghap_branches

        if len(matching) >= 2 and person1_contrib and person2_contrib:
            # 3개 완성 시 강한 방합, 2개는 약한 방합
            is_complete = len(matching) >= 3
            score_add = 10 if is_complete else 5
            banghap_score += score_add
            result["banghap_analysis"]["found"].append({
                "name": banghap_name,
                "branches_found": list(matching),
                "element": banghap_data["element"],
                "direction": banghap_data["direction"],
                "complete": is_complete,
                "score": score_add,
                "meaning": f"{banghap_data['direction']} 방향의 {banghap_data['element']} 에너지 결합"
            })

    result["banhap_analysis"]["score"] = banhap_score
    result["banhap_analysis"]["meaning"] = f"{len(result['banhap_analysis']['found'])}개의 반합 발견" if result["banhap_analysis"]["found"] else "반합 없음"

    result["banghap_analysis"]["score"] = banghap_score
    result["banghap_analysis"]["meaning"] = f"{len(result['banghap_analysis']['found'])}개의 방합 발견" if result["banghap_analysis"]["found"] else "방합 없음"

    result["combined_score"] = min(banhap_score + banghap_score, 18)  # 최대 18점

    total = result["combined_score"]
    if total >= 15:
        result["harmony_level"] = "최고"
        result["summary"] = "반합/방합이 매우 강력합니다! 함께하면 특정 오행 에너지가 크게 강화됩니다."
    elif total >= 10:
        result["harmony_level"] = "좋음"
        result["summary"] = "반합/방합이 좋습니다. 함께 있으면 에너지가 조화롭게 흐릅니다."
    elif total >= 5:
        result["harmony_level"] = "보통"
        result["summary"] = "일부 반합이 있습니다. 특정 영역에서 조화를 이룹니다."
    else:
        result["harmony_level"] = "약함"
        result["summary"] = "반합/방합이 적습니다. 다른 요소에서 조화를 찾을 수 있습니다."

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
    from datetime import datetime

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

    # 출생년도 추출
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

    # 1. 진행 달 페이즈 분석 (약 27.3년 주기)
    def get_progressed_moon_phase(age):
        # 약 27.3년 주기, 각 페이즈 약 3.4년
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

    # 같은 페이즈면 보너스
    if moon_phase1 == moon_phase2:
        total_score += 6
        result["progressed_moon_phase"]["sync"] = True
        result["progressed_moon_phase"]["meaning"] = "같은 달 페이즈 - 인생 리듬이 같습니다"
    else:
        result["progressed_moon_phase"]["sync"] = False

    # 페이즈별 점수 추가
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
        # 진행 태양은 약 30년에 1별자리 이동
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

        # 진행 태양 시나스트리
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
    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    daeun1 = saju1.get("daeun", saju1.get("대운", []))
    daeun2 = saju2.get("daeun", saju2.get("대운", []))

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

    # 같은 대운 페이즈면 보너스
    if daeun_phase1 == daeun_phase2:
        total_score += 5
        result["daeun_progression_link"]["sync"] = True
        result["daeun_progression_link"]["sync_meaning"] = "같은 대운 페이즈 - 비슷한 인생 시기"

    # 4. 토성 회귀 체크 (29세, 58세 근처)
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
        total_score -= 3  # 토성 회귀기는 어려운 시기

    result["score"] = max(-10, min(25, total_score))

    # 종합 평가
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

    # 오행 순서에서의 위치
    my_idx = OHENG_ORDER.index(my_element)
    other_idx = OHENG_ORDER.index(other_element)

    # 상생 관계 확인 (내가 생하는 것 = 식상, 나를 생하는 것 = 인성)
    # 상극 관계 확인 (내가 극하는 것 = 재성, 나를 극하는 것 = 관성)
    # 동일 = 비겁

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

    # 식상 (내가 생해주는 오행) - 木生火, 火生土, 土生金, 金生水, 水生木
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

    # 재성 (내가 극하는 오행) - 木剋土, 火剋金, 土剋水, 金剋木, 水剋火
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

    # 연인/배우자 관계에서만 분석
    if relationship_type not in ["lover", "spouse"]:
        return result

    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})

    venus1 = astro1.get("venusSign", "").lower().strip()
    venus2 = astro2.get("venusSign", "").lower().strip()
    mars1 = astro1.get("marsSign", "").lower().strip()
    mars2 = astro2.get("marsSign", "").lower().strip()

    # 금성/화성 데이터가 없으면 태양 별자리로 대체
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

    # 원소 추출
    venus1_elem = ZODIAC_ELEMENTS.get(venus1, "")
    venus2_elem = ZODIAC_ELEMENTS.get(venus2, "")
    mars1_elem = ZODIAC_ELEMENTS.get(mars1, "")
    mars2_elem = ZODIAC_ELEMENTS.get(mars2, "")

    # A의 금성 ↔ B의 화성 분석
    chemistry_scores = []

    if venus1_elem and mars2_elem:
        key1 = (venus1_elem, mars2_elem)
        if key1 in VENUS_MARS_SYNASTRY:
            data = VENUS_MARS_SYNASTRY[key1]
            chemistry_scores.append(data["score"])
            result["details"].append(f"💘 A금성-B화성: {data['chemistry']}")
            if data["caution"] != "거의 없음":
                result["details"].append(f"   주의: {data['caution']}")

    if venus2_elem and mars1_elem:
        key2 = (venus2_elem, mars1_elem)
        if key2 in VENUS_MARS_SYNASTRY:
            data = VENUS_MARS_SYNASTRY[key2]
            chemistry_scores.append(data["score"])
            result["details"].append(f"💘 B금성-A화성: {data['chemistry']}")
            if data["caution"] != "거의 없음":
                result["details"].append(f"   주의: {data['caution']}")

    # 평균 점수 계산
    if chemistry_scores:
        avg_score = sum(chemistry_scores) / len(chemistry_scores)
        result["venus_mars_chemistry"] = round(avg_score)
        result["score_adjustment"] = (avg_score - 70) * 0.3  # 30% 가중치

        # 융합 인사이트
        if avg_score >= 85:
            result["fusion_insight"] = "🔥 금성-화성 시너지 최상! 자연스러운 끌림과 열정"
        elif avg_score >= 75:
            result["fusion_insight"] = "💕 좋은 케미스트리, 조화로운 연애 에너지"
        elif avg_score >= 65:
            result["fusion_insight"] = "⚖️ 적절한 끌림, 노력으로 더 좋아질 수 있음"
        else:
            result["fusion_insight"] = "💭 다른 방식의 표현, 서로 이해하려는 노력 필요"

    return result


def analyze_astro_compatibility(sign1: str, sign2: str) -> dict:
    """
    점성술 태양 별자리 궁합 분석
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

    # 원소 가져오기
    elem1 = ZODIAC_ELEMENTS.get(sign1_lower, "")
    elem2 = ZODIAC_ELEMENTS.get(sign2_lower, "")

    if elem1 and elem2:
        # 원소 궁합 확인
        key = (elem1, elem2) if (elem1, elem2) in ASTRO_ELEMENT_COMPATIBILITY else (elem2, elem1)
        if key in ASTRO_ELEMENT_COMPATIBILITY:
            data = ASTRO_ELEMENT_COMPATIBILITY[key]
            result["score"] = data["score"]
            result["score_adjustment"] = data["score"] - 70
            result["meaning"] = data["meaning"]
            result["details"].append(f"🌟 원소 궁합 ({elem1}↔{elem2}): {data['meaning']}")

    # 같은 별자리
    if sign1_lower == sign2_lower:
        result["relationship"] = "same"
        result["score_adjustment"] += 5
        result["details"].append(f"🔄 같은 별자리: 깊은 이해, 비슷한 성향")

    # 반대궁 확인
    if ZODIAC_OPPOSITES.get(sign1_lower) == sign2_lower:
        result["relationship"] = "opposite"
        result["score_adjustment"] += 8  # 끌림은 있지만
        result["details"].append(f"🔮 반대궁: 강한 끌림이 있지만 갈등 가능성도 있음")

    return result


def calculate_pair_score(person1: dict, person2: dict) -> dict:
    """
    두 사람의 상세 궁합 점수 계산
    사주 + 점성술 융합 분석
    """
    base_score = 70  # 기본 점수
    total_adjustment = 0
    details = []
    saju_details = []
    astro_details = []
    fusion_insights = []

    # 사주 데이터 추출
    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})

    dm1 = saju1.get("dayMaster", {})
    dm2 = saju2.get("dayMaster", {})

    dm1_name = dm1.get("name", "") if isinstance(dm1, dict) else str(dm1)
    dm2_name = dm2.get("name", "") if isinstance(dm2, dict) else str(dm2)
    dm1_element = dm1.get("element", "") if isinstance(dm1, dict) else ""
    dm2_element = dm2.get("element", "") if isinstance(dm2, dict) else ""

    # 일지 추출
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})
    day_pillar1 = pillars1.get("day", "")
    day_pillar2 = pillars2.get("day", "")

    # 일지(지지) 추출 - 두 번째 글자
    branch1 = day_pillar1[1] if len(day_pillar1) >= 2 else ""
    branch2 = day_pillar2[1] if len(day_pillar2) >= 2 else ""

    # 점성술 데이터 추출
    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})

    sun1 = astro1.get("sunSign", "")
    sun2 = astro2.get("sunSign", "")
    moon1 = astro1.get("moonSign", "")
    moon2 = astro2.get("moonSign", "")

    # ============ 사주 분석 ============

    # 1. 천간(일간) 궁합 분석
    if dm1_name and dm2_name:
        stem_result = analyze_stem_compatibility(dm1_name, dm2_name)
        total_adjustment += stem_result["score_adjustment"]
        saju_details.extend(stem_result["details"])

    # 2. 지지(일지) 궁합 분석
    if branch1 and branch2:
        branch_result = analyze_branch_compatibility(branch1, branch2)
        total_adjustment += branch_result["score_adjustment"]
        saju_details.extend(branch_result["details"])

    # 3. 오행 상생상극 분석
    if dm1_element and dm2_element:
        oheng_score = analyze_oheng_relationship(dm1_element, dm2_element)
        total_adjustment += oheng_score["adjustment"]
        if oheng_score["details"]:
            saju_details.append(oheng_score["details"])

    # ============ 점성술 분석 ============

    # 4. 태양 별자리 궁합
    if sun1 and sun2:
        astro_result = analyze_astro_compatibility(sun1, sun2)
        total_adjustment += astro_result["score_adjustment"]
        astro_details.extend(astro_result["details"])

    # 5. 달 별자리 궁합 (감정적 조화)
    if moon1 and moon2:
        moon_result = analyze_astro_compatibility(moon1, moon2)
        moon_adjustment = moon_result["score_adjustment"] * 0.5  # 달은 절반 가중치
        total_adjustment += moon_adjustment
        if moon_result["details"]:
            astro_details.append(f"🌙 달 궁합: {moon_result['meaning']}")

    # 5-1. 행성 시나스트리 분석 (애스펙트 기반)
    try:
        planetary = analyze_planetary_synastry(person1, person2)
        if planetary.get("aspects"):
            # 시나스트리 점수의 20%만 반영 (다른 분석과 균형)
            synastry_contribution = planetary["total_score"] * 0.2
            total_adjustment += synastry_contribution

            if planetary.get("key_aspects"):
                for key_aspect in planetary["key_aspects"][:3]:
                    astro_details.append(key_aspect)

            # 조화/긴장 비율 표시
            if planetary["harmony_count"] > 0 or planetary["tension_count"] > 0:
                harmony_ratio = planetary["harmony_count"] / (planetary["harmony_count"] + planetary["tension_count"]) * 100
                if harmony_ratio >= 70:
                    astro_details.append(f"✨ 행성 조화율: {harmony_ratio:.0f}% - 매우 좋은 시나스트리")
                elif harmony_ratio >= 50:
                    astro_details.append(f"⚖️ 행성 조화율: {harmony_ratio:.0f}% - 균형 잡힌 시나스트리")
                else:
                    astro_details.append(f"⚡ 행성 긴장율: {100-harmony_ratio:.0f}% - 도전적이지만 성장 가능")
    except Exception:
        pass  # 에러 시 무시

    # ============ 십성(十星) 분석 ============

    # 6. 십성 관계 분석 (사주 궁합의 핵심)
    sipsung_data = {"a_to_b": None, "b_to_a": None}
    if dm1_name and dm2_name:
        # A 기준 B의 십성
        sipsung_a_to_b = calculate_sipsung(dm1_name, dm2_name)
        if sipsung_a_to_b["sipsung"] != "unknown":
            sipsung_data["a_to_b"] = sipsung_a_to_b
            saju_details.append(f"⭐ A→B 십성: {sipsung_a_to_b['sipsung']} - {sipsung_a_to_b['meaning']}")
            total_adjustment += (sipsung_a_to_b["score"] - 70) * 0.3  # 30% 가중치

        # B 기준 A의 십성
        sipsung_b_to_a = calculate_sipsung(dm2_name, dm1_name)
        if sipsung_b_to_a["sipsung"] != "unknown":
            sipsung_data["b_to_a"] = sipsung_b_to_a
            saju_details.append(f"⭐ B→A 십성: {sipsung_b_to_a['sipsung']} - {sipsung_b_to_a['meaning']}")
            total_adjustment += (sipsung_b_to_a["score"] - 70) * 0.3  # 30% 가중치

    # ============ 융합 인사이트 ============

    # 7. 사주↔점성 교차 분석
    elem1_astro = ZODIAC_ELEMENTS.get(sun1.lower(), "") if sun1 else ""
    elem2_astro = ZODIAC_ELEMENTS.get(sun2.lower(), "") if sun2 else ""

    # 일간 오행과 점성 원소 매핑 비교
    if dm1_element and elem2_astro:
        mapped_oheng = ASTRO_ELEMENT_TO_OHENG.get(elem2_astro, "")
        if dm1_element == mapped_oheng:
            fusion_insights.append(f"🔥 A의 일간({dm1_element})과 B의 태양원소({elem2_astro}) 일치 - 자연스러운 조화")
            total_adjustment += 5

    if dm2_element and elem1_astro:
        mapped_oheng = ASTRO_ELEMENT_TO_OHENG.get(elem1_astro, "")
        if dm2_element == mapped_oheng:
            fusion_insights.append(f"🔥 B의 일간({dm2_element})과 A의 태양원소({elem1_astro}) 일치 - 자연스러운 조화")
            total_adjustment += 5

    # 8. 십성↔시나스트리 교차 분석
    if sipsung_data["a_to_b"] and sipsung_data["a_to_b"]["sipsung"] != "unknown":
        synastry_parallel = sipsung_data["a_to_b"].get("synastry", "")
        if synastry_parallel:
            fusion_insights.append(f"🔮 십성↔점성 연결: {sipsung_data['a_to_b']['sipsung']} ≈ {synastry_parallel}")

    # 최종 점수 계산 (0-100 범위로 제한)
    final_score = max(0, min(100, base_score + total_adjustment))

    return {
        "score": round(final_score),
        "base_score": base_score,
        "adjustment": round(total_adjustment),
        "saju_details": saju_details,
        "astro_details": astro_details,
        "fusion_insights": fusion_insights,
        "sipsung": sipsung_data,
        "summary": get_score_summary(final_score),
    }


def analyze_oheng_relationship(elem1: str, elem2: str) -> dict:
    """
    오행 상생상극 관계 분석
    """
    result = {"adjustment": 0, "details": ""}

    # 상생 관계 (木→火→土→金→水→木)
    sangsaeng = {
        ("木", "火"): "목생화(木生火) - A가 B를 키워줌",
        ("火", "土"): "화생토(火生土) - A가 B를 안정시킴",
        ("土", "金"): "토생금(土生金) - A가 B를 단련시킴",
        ("金", "水"): "금생수(金生水) - A가 B에게 지혜를 줌",
        ("水", "木"): "수생목(水生木) - A가 B를 성장시킴",
    }

    # 상극 관계 (木→土→水→火→金→木)
    sanggeuk = {
        ("木", "土"): "목극토(木剋土) - 갈등 가능, 조율 필요",
        ("土", "水"): "토극수(土剋水) - 감정 억압 주의",
        ("水", "火"): "수극화(水剋火) - 열정 vs 냉정 충돌",
        ("火", "金"): "화극금(火剋金) - 즉흥 vs 계획 충돌",
        ("金", "木"): "금극목(金剋木) - 비판 vs 자유 충돌",
    }

    # 상생 확인
    if (elem1, elem2) in sangsaeng:
        result["adjustment"] = 8
        result["details"] = f"☯️ 상생: {sangsaeng[(elem1, elem2)]}"
    elif (elem2, elem1) in sangsaeng:
        result["adjustment"] = 8
        result["details"] = f"☯️ 상생: B가 A를 키워줌"

    # 상극 확인
    elif (elem1, elem2) in sanggeuk:
        result["adjustment"] = -8
        result["details"] = f"⚡ 상극: {sanggeuk[(elem1, elem2)]}"
    elif (elem2, elem1) in sanggeuk:
        result["adjustment"] = -8
        result["details"] = f"⚡ 상극: B가 A를 제압할 수 있음"

    # 같은 오행
    elif elem1 == elem2:
        result["adjustment"] = 3
        result["details"] = f"🔄 동일 오행: 비겁 관계, 공감대 형성"

    return result


def get_score_summary(score: int) -> str:
    """점수에 따른 요약 메시지"""
    if score >= 90:
        return "천생연분! 최고의 궁합"
    elif score >= 80:
        return "매우 좋은 궁합, 서로를 보완"
    elif score >= 70:
        return "좋은 궁합, 조화로운 관계"
    elif score >= 60:
        return "괜찮은 궁합, 노력하면 좋아짐"
    elif score >= 50:
        return "평범한 궁합, 이해와 배려 필요"
    else:
        return "도전적인 궁합, 많은 노력 필요"


def generate_pairwise_matrix(people: list) -> list:
    """
    모든 1:1 조합 생성 (N명 → N*(N-1)/2 조합)
    상세 점수와 분석 포함
    """
    pairs = []
    n = len(people)

    # 모든 일지 수집 (삼합 확인용)
    all_branches = []
    for person in people:
        pillars = person.get("saju", {}).get("pillars", {})
        day_pillar = pillars.get("day", "")
        if len(day_pillar) >= 2:
            all_branches.append(day_pillar[1])

    for i in range(n):
        for j in range(i + 1, n):
            p1 = people[i]
            p2 = people[j]

            # 기본 정보 추출
            name1 = p1.get("name", f"Person {i+1}")
            name2 = p2.get("name", f"Person {j+1}")

            dm1 = p1.get("saju", {}).get("dayMaster", {})
            dm2 = p2.get("saju", {}).get("dayMaster", {})

            dm1_name = dm1.get("name", "") if isinstance(dm1, dict) else str(dm1)
            dm2_name = dm2.get("name", "") if isinstance(dm2, dict) else str(dm2)
            dm1_element = dm1.get("element", "") if isinstance(dm1, dict) else ""
            dm2_element = dm2.get("element", "") if isinstance(dm2, dict) else ""

            sun1 = p1.get("astro", {}).get("sunSign", "")
            sun2 = p2.get("astro", {}).get("sunSign", "")

            # 상세 점수 계산
            pair_analysis = calculate_pair_score(p1, p2)

            pairs.append({
                "pair": f"{name1} ↔ {name2}",
                "index": (i+1, j+1),
                "saju": f"{dm1_name}({dm1_element}) ↔ {dm2_name}({dm2_element})",
                "astro": f"{sun1} ↔ {sun2}",
                # NEW: 상세 점수 정보
                "score": pair_analysis["score"],
                "summary": pair_analysis["summary"],
                "saju_details": pair_analysis["saju_details"],
                "astro_details": pair_analysis["astro_details"],
                "fusion_insights": pair_analysis["fusion_insights"],
            })

    return pairs


def calculate_group_synergy_score(people: list, pairwise_matrix: list, element_distribution: dict, group_roles: dict) -> dict:
    """
    그룹 전체 시너지 점수 계산
    """
    n = len(people)

    # 1. 개별 궁합 점수 평균
    pair_scores = [p["score"] for p in pairwise_matrix]
    avg_pair_score = sum(pair_scores) / len(pair_scores) if pair_scores else 70

    # 2. 최저/최고 궁합 찾기
    min_pair = min(pairwise_matrix, key=lambda x: x["score"]) if pairwise_matrix else None
    max_pair = max(pairwise_matrix, key=lambda x: x["score"]) if pairwise_matrix else None

    # 3. 원소 균형 점수 (다양성 보너스)
    oheng = element_distribution.get("oheng", {})
    astro = element_distribution.get("astro", {})

    # 오행 다양성 (5개 중 몇 개나 있는지)
    oheng_diversity = sum(1 for v in oheng.values() if v > 0)
    oheng_bonus = (oheng_diversity / 5) * 10  # 최대 10점 보너스

    # 점성 원소 다양성
    astro_diversity = sum(1 for v in astro.values() if v > 0)
    astro_bonus = (astro_diversity / 4) * 8  # 최대 8점 보너스

    # 4. 역할 균형 점수
    filled_roles = sum(1 for members in group_roles.values() if members)
    role_bonus = (filled_roles / 6) * 7  # 최대 7점 보너스

    # 5. 그룹 사이즈 조정
    # 인원이 많을수록 완벽한 조화는 어려우므로 소폭 조정
    size_adjustment = {3: 0, 4: -2, 5: -5}.get(n, 0)

    # 6. 삼합/방합 보너스 확인
    samhap_bonus = 0
    banghap_bonus = 0
    special_formations = []

    all_branches = []
    for person in people:
        pillars = person.get("saju", {}).get("pillars", {})
        day_pillar = pillars.get("day", "")
        if len(day_pillar) >= 2:
            all_branches.append(day_pillar[1])

    branch_set = frozenset(all_branches)

    # 삼합 확인
    for samhap_set, data in BRANCH_SAMHAP.items():
        if samhap_set.issubset(branch_set):
            samhap_bonus = 10
            special_formations.append(f"🌟 {data['meaning']}")
            break

    # 방합 확인
    for banghap_set, data in BRANCH_BANGHAP.items():
        if banghap_set.issubset(branch_set):
            banghap_bonus = 8
            special_formations.append(f"🧭 {data['meaning']}")
            break

    # 최종 점수 계산
    final_score = (
        avg_pair_score
        + oheng_bonus
        + astro_bonus
        + role_bonus
        + size_adjustment
        + samhap_bonus
        + banghap_bonus
    )

    final_score = max(0, min(100, round(final_score)))

    return {
        "overall_score": final_score,
        "avg_pair_score": round(avg_pair_score),
        "oheng_bonus": round(oheng_bonus, 1),
        "astro_bonus": round(astro_bonus, 1),
        "role_bonus": round(role_bonus, 1),
        "size_adjustment": size_adjustment,
        "samhap_bonus": samhap_bonus,
        "banghap_bonus": banghap_bonus,
        "special_formations": special_formations,
        "best_pair": max_pair,
        "weakest_pair": min_pair,
        "pair_scores": pair_scores,
    }


def identify_group_roles(people: list) -> dict:
    """
    그룹 내 역할 식별 (리더, 중재자, 촉매, 안정자 등)
    """
    roles = {
        "leader": [],      # 리더십 에너지
        "mediator": [],    # 중재자/조화
        "catalyst": [],    # 촉매/에너지 부여
        "stabilizer": [],  # 안정자
        "creative": [],    # 창의적 아이디어
        "emotional": [],   # 감정적 지지
    }

    for i, person in enumerate(people):
        name = person.get("name", f"Person {i+1}")

        dm = person.get("saju", {}).get("dayMaster", {})
        dm_element = dm.get("element", "") if isinstance(dm, dict) else ""

        astro = person.get("astro", {})
        sun_sign = astro.get("sunSign", "").lower()

        # 리더십 에너지 (火, 사자자리, 양자리)
        if dm_element in ["火", "fire"]:
            roles["leader"].append(name)
        if any(s in sun_sign for s in ["leo", "aries", "사자", "양자"]):
            roles["leader"].append(name)

        # 중재자 (土, 천칭자리)
        if dm_element in ["土", "earth"]:
            roles["mediator"].append(name)
        if any(s in sun_sign for s in ["libra", "천칭"]):
            roles["mediator"].append(name)

        # 촉매 (木, 쌍둥이자리, 사수자리)
        if dm_element in ["木", "wood"]:
            roles["catalyst"].append(name)
        if any(s in sun_sign for s in ["gemini", "sagittarius", "쌍둥이", "사수"]):
            roles["catalyst"].append(name)

        # 안정자 (金, 황소자리, 염소자리)
        if dm_element in ["金", "metal"]:
            roles["stabilizer"].append(name)
        if any(s in sun_sign for s in ["taurus", "capricorn", "황소", "염소"]):
            roles["stabilizer"].append(name)

        # 창의적 (水 + 물병자리)
        if dm_element in ["水", "water"]:
            roles["creative"].append(name)
        if any(s in sun_sign for s in ["aquarius", "물병"]):
            roles["creative"].append(name)

        # 감정적 지지 (水 + 게자리, 물고기자리)
        if any(s in sun_sign for s in ["cancer", "pisces", "게자리", "물고기"]):
            roles["emotional"].append(name)

    # 중복 제거
    for role in roles:
        roles[role] = list(set(roles[role]))

    return roles


def get_group_timing_analysis(people: list) -> dict:
    """
    그룹 전체를 위한 타이밍 분석
    """
    current_branch = get_current_month_branch()
    current_element = BRANCH_ELEMENTS.get(current_branch, "土")

    # 각 구성원의 일간 원소 수집
    dm_elements = []
    for person in people:
        dm = person.get("saju", {}).get("dayMaster", {})
        if isinstance(dm, dict):
            dm_elements.append(dm.get("element", ""))

    # 이번 달이 유리한 사람들 찾기
    favorable_members = []
    for i, elem in enumerate(dm_elements):
        if _element_supports(current_element, elem):
            favorable_members.append(i + 1)

    # 그룹 전체 조언 생성
    if len(favorable_members) >= len(people) / 2:
        group_advice = "이번 달은 그룹 전체에 좋은 에너지가 흐르고 있어요! 중요한 결정이나 함께하는 활동에 적합합니다."
    elif len(favorable_members) > 0:
        group_advice = f"이번 달은 {', '.join([str(m) for m in favorable_members])}번 분이 리드하면 좋겠어요. 다른 분들은 지지해주세요."
    else:
        group_advice = "이번 달은 그룹 전체가 무리하지 말고 서로 배려하며 보내는 게 좋아요."

    return {
        "current_month": {
            "branch": current_branch,
            "element": current_element,
            "analysis": group_advice,
        },
        "favorable_members": favorable_members,
        "group_activities": [
            {"type": "bonding", "days": "주말", "activities": ["단체 식사", "야외 활동"], "reason": "에너지 충전"},
            {"type": "planning", "days": "수요일", "activities": ["회의", "계획 수립"], "reason": "수(水) 기운으로 지혜로운 결정"},
            {"type": "celebration", "days": "화/일요일", "activities": ["축하 파티", "성과 공유"], "reason": "화(火) 기운으로 활기"},
        ],
    }


def get_group_action_items(people: list, element_distribution: dict) -> list:
    """
    그룹을 위한 성장 포인트 액션 아이템 생성
    """
    action_items = []

    n = len(people)
    lacking = element_distribution.get("lacking_oheng", "")
    dominant = element_distribution.get("dominant_oheng", "")

    # 부족한 원소 보완 조언
    element_advice = {
        "木": "새로운 아이디어 브레인스토밍 시간을 정기적으로 가져보세요",
        "火": "함께 운동하거나 열정적인 활동을 시도해보세요",
        "土": "서로의 안부를 묻고 신뢰를 쌓는 시간을 가져보세요",
        "金": "명확한 규칙과 역할 분담을 정해보세요",
        "水": "깊은 대화나 감정 나눔 시간을 가져보세요",
    }

    if lacking and lacking in element_advice:
        action_items.append(f"그룹에 {lacking} 에너지가 부족해요: {element_advice[lacking]}")

    # 인원수별 조언
    if n == 3:
        action_items.append("3명이면 2:1 구도가 생기기 쉬워요. 의사결정 시 모두의 의견을 순서대로 들어보세요")
        action_items.append("삼각형의 힘! 세 명이 각자 다른 역할을 맡으면 균형이 잡혀요")
    elif n == 4:
        action_items.append("4명이면 2:2로 나뉘기 쉬워요. 의견 충돌 시 중재자 역할을 돌아가며 맡아보세요")
        action_items.append("사각형의 안정! 네 명이 각자 한 분야씩 책임지면 효율적이에요")
    elif n == 5:
        action_items.append("5명이면 소외되는 사람이 생기기 쉬워요. 정기적으로 전체 모임을 가져보세요")
        action_items.append("오각형의 다양성! 다섯 개의 다른 시각이 모여 풍성한 결과를 만들어요")

    # 지배적 원소에 따른 주의점
    dominant_caution = {
        "火": "불 에너지가 강하면 충돌이 잦을 수 있어요. 쿨다운 규칙을 정해두세요",
        "木": "목 에너지가 강하면 아이디어만 많고 실행이 부족할 수 있어요. 실행 담당자를 정하세요",
        "水": "수 에너지가 강하면 감정에 휩쓸리기 쉬워요. 객관적 기준을 세워두세요",
        "金": "금 에너지가 강하면 너무 엄격해질 수 있어요. 유연성을 가져보세요",
        "土": "토 에너지가 강하면 변화를 꺼릴 수 있어요. 새로운 시도를 함께 해보세요",
    }

    if dominant and dominant in dominant_caution:
        action_items.append(dominant_caution[dominant])

    return action_items


def interpret_compatibility_group(
    people: list,
    relationship_type: str = "family",
    locale: str = "ko",
) -> dict:
    """
    Enhanced Group Compatibility for 3-5 people (family, team, friends, etc.)
    - 5명까지 지원
    - 상세한 그룹 역학 분석
    - 모든 1:1 조합 분석
    - 그룹 타이밍 가이드
    """
    try:
        if len(people) < 3:
            return interpret_compatibility(people, relationship_type, locale)

        if len(people) > 5:
            return {
                "status": "error",
                "message": "최대 5명까지만 지원합니다.",
            }

        # Load reference data
        reference_data = load_compatibility_data()

        # ===============================================================
        # ENHANCED GROUP ANALYSIS
        # ===============================================================

        # 1. 원소 분포 분석
        element_distribution = analyze_group_element_distribution(people)

        # 2. 모든 1:1 조합 생성 (상세 점수 포함)
        pairwise_matrix = generate_pairwise_matrix(people)

        # 3. 그룹 역할 식별
        group_roles = identify_group_roles(people)

        # 4. 그룹 타이밍 분석
        group_timing = get_group_timing_analysis(people)

        # 5. 그룹 액션 아이템
        group_actions = get_group_action_items(people, element_distribution)

        # 6. NEW: 그룹 시너지 점수 계산
        synergy_score = calculate_group_synergy_score(
            people, pairwise_matrix, element_distribution, group_roles
        )

        # Format people
        people_text = "\n\n".join([
            format_person_data(p, i+1) for i, p in enumerate(people)
        ])

        # Format pairwise matrix for prompt (이제 점수 포함)
        pairs_text = "\n".join([
            f"  • {p['pair']} (💕 {p['score']}점): 사주({p['saju']}) / 점성({p['astro']})\n    └ {p['summary']}"
            for p in pairwise_matrix
        ])

        # Format roles for prompt
        roles_text = ""
        role_names = {
            "leader": "🔥 리더십",
            "mediator": "⚖️ 중재자",
            "catalyst": "⚡ 촉매제",
            "stabilizer": "🏔️ 안정자",
            "creative": "💡 창의력",
            "emotional": "💗 감정 지지",
        }
        for role_key, role_name in role_names.items():
            if group_roles.get(role_key):
                roles_text += f"  • {role_name}: {', '.join(group_roles[role_key])}\n"

        # Format element distribution for prompt
        oheng_text = ", ".join([f"{k}:{v}" for k, v in element_distribution["oheng"].items()])
        astro_text = ", ".join([f"{k}:{v}" for k, v in element_distribution["astro"].items()])

        lang_instruction = "한국어로 답변하세요." if locale == "ko" else "Answer in English."

        # 시너지 분석 텍스트 포맷
        best_pair_info = synergy_score.get("best_pair", {})
        weakest_pair_info = synergy_score.get("weakest_pair", {})

        # 1:1 조합별 상세 분석 텍스트 생성
        pairs_detail_text = ""
        for p in pairwise_matrix:
            saju_details = p.get("saju_details", [])
            astro_details = p.get("astro_details", [])
            fusion_insights = p.get("fusion_insights", [])

            pairs_detail_text += f"\n  【{p['pair']}】 💕 {p['score']}점 ({p['summary']})\n"
            pairs_detail_text += f"    사주: {p['saju']}\n"
            pairs_detail_text += f"    점성: {p['astro']}\n"
            if saju_details:
                pairs_detail_text += f"    사주분석: {'; '.join(saju_details)}\n"
            if astro_details:
                pairs_detail_text += f"    점성분석: {'; '.join(astro_details)}\n"
            if fusion_insights:
                pairs_detail_text += f"    융합인사이트: {'; '.join(fusion_insights)}\n"

        prompt = f"""당신은 사주명리학과 서양 점성술을 융합(Fusion)하여 그룹 역학을 분석하는 최고 전문가입니다.

⚠️ 핵심 원칙: 사주와 점성술을 따로 분석하지 말고, 두 체계가 교차하는 지점을 찾아 그룹 인사이트를 제공하세요!

## 분석 대상 ({len(people)}명)
{people_text}

## 관계 유형
{relationship_type}

## 📊 그룹 원소 분포 (사전 분석됨)
- 오행 분포: {oheng_text}
- 점성 원소 분포: {astro_text}
- 지배적 오행: {element_distribution.get('dominant_oheng', '없음')}
- 부족한 오행: {element_distribution.get('lacking_oheng', '없음')}

## 📈 그룹 시너지 점수 (자동 계산됨)
- **총합 점수: {synergy_score['overall_score']}점**
- 1:1 평균 점수: {synergy_score['avg_pair_score']}점
- 오행 다양성 보너스: +{synergy_score['oheng_bonus']}점
- 점성 원소 다양성 보너스: +{synergy_score['astro_bonus']}점
- 역할 균형 보너스: +{synergy_score['role_bonus']}점
- 삼합 보너스: +{synergy_score['samhap_bonus']}점
- 인원 조정: {synergy_score['size_adjustment']}점
- 🏆 최고 궁합: {best_pair_info.get('pair', 'N/A')} ({best_pair_info.get('score', 0)}점)
- ⚠️ 주의 궁합: {weakest_pair_info.get('pair', 'N/A')} ({weakest_pair_info.get('score', 0)}점)

## 👥 모든 1:1 조합 상세 분석 ({len(pairwise_matrix)}개 조합)
{pairs_detail_text}

## 🎭 잠재적 역할 분석
{roles_text}

## 🔥 교차 분석 가이드 (FUSION APPROACH - cross_synastry_gunghap 기반)

### 사주↔점성 교차 매핑
- **천간합 ↔ Sun-Moon conjunction**: 갑기/을경/병신/정임/무계합 = 강력한 끌림과 융합
- **삼합 ↔ Grand Trine**: 寅午戌(火)/亥卯未(木)/申子辰(水)/巳酉丑(金) = 자연스러운 조화
- **육합 ↔ Personal planet conjunction**: 子丑/寅亥/卯戌/辰酉/巳申/午未 = 끌림과 융합
- **충 ↔ Opposition**: 子午/丑未/寅申/卯酉/辰戌/巳亥 = 끌림과 긴장 공존
- **형 ↔ T-square**: 寅巳申/丑戌未/子卯 = 마찰과 성장

### 오행(五行)과 점성술 원소 매핑
- 목(木) ↔ Air - 성장, 확장, 아이디어, 소통
- 화(火) ↔ Fire - 열정, 에너지, 행동, 리더십
- 토(土) ↔ Earth - 안정, 실용, 신뢰, 중재
- 금(金) ↔ Metal/Earth - 정교함, 규칙, 판단력
- 수(水) ↔ Water - 지혜, 적응, 직관, 감정

## 📝 분석 구조 (반드시 이 순서대로!)

### 1. 🎯 그룹 전체 조화도
**점수: {synergy_score['overall_score']}/100점** - 이 점수를 기반으로 "이 그룹의 핵심 케미스트리"를 한 줄로 요약해주세요.

### 2. ⚡ 그룹 에너지 프로필 (FUSION CORE)
사주와 점성술이 동시에 보여주는 그룹 역학:
- **지배적 에너지**: 그룹 전체를 이끄는 주요 에너지 (오행:{element_distribution.get('dominant_oheng')} + 점성:{element_distribution.get('dominant_astro')})
- **부족한 에너지**: 보완이 필요한 에너지와 구체적 보완 방법
- **시너지 조합**: 가장 좋은 궁합인 {best_pair_info.get('pair', 'N/A')}를 중심으로 설명
- **주의 조합**: 가장 주의가 필요한 {weakest_pair_info.get('pair', 'N/A')}를 중심으로 대처법

### 3. 👥 1:1 궁합 매트릭스 (모든 조합 분석)
위에서 제공된 상세 분석을 바탕으로, 각 조합에 대해 사람들이 이해하기 쉽게 설명:
{chr(10).join([f"- **{p['pair']}** ({p['score']}점): 핵심 인사이트와 실천 조언" for p in pairwise_matrix])}

### 4. 🌟 그룹 역할 분석 (사주+점성 기반)
- **🔥 리더**: 누가 그룹을 이끌 에너지를 가졌나? (일간/태양 분석)
- **⚖️ 중재자**: 누가 갈등을 해결할 수 있나?
- **⚡ 촉매**: 누가 그룹에 활력을 불어넣나?
- **🏔️ 안정자**: 누가 그룹의 기반을 다져주나?
- **💡 창의력**: 누가 새로운 아이디어를 내나?
- **역할 균형도**: 역할이 잘 분배되어 있는지 평가

### 5. 🎨 그룹 다이나믹스
- **화합 패턴**: 그룹이 어떤 상황에서 가장 잘 화합하나?
- **갈등 패턴**: 어떤 상황에서 갈등이 생기기 쉬운가?
- **의사결정**: 그룹이 결정을 내릴 때 어떤 패턴이 나타나나?
- **소외 위험**: {len(people)}명 중 소외될 가능성 있는 구성원은?

### 6. 💪 그룹 강점 TOP 3
(사주+점성 근거와 함께, 구체적으로)

### 7. ⚠️ 주의할 점 & 보완 방법
- 주의점 1 + 해결 방법
- 주의점 2 + 해결 방법
- 주의점 3 + 해결 방법

### 8. 💡 그룹 시너지 실천 조언
- **함께하면 좋은 활동** 3가지 (구체적으로)
- **피해야 할 상황** 2가지
- **정기 모임 추천**: 어떤 형태로 만나면 좋을지

### 9. 📅 타이밍 가이드
- **이번 달 그룹 에너지**: {group_timing['current_month']['analysis']}
- **좋은 날/시기**: 그룹 활동에 좋은 타이밍
- **주의할 시기**: 조심해야 할 타이밍

---
"""
        # GPT 없이 포맷된 그룹 리포트 생성
        interpretation = format_group_compatibility_report(
            people=people,
            pairwise_matrix=pairwise_matrix,
            element_distribution=element_distribution,
            group_roles=group_roles,
            synergy_score=synergy_score,
            group_timing=group_timing,
            group_actions=group_actions,
            relationship_type=relationship_type,
            locale=locale,
        )

        # 계산된 시너지 점수를 사용
        overall_score = synergy_score["overall_score"]

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "relationship_type": relationship_type,
            "locale": locale,
            "overall_score": overall_score,
            "interpretation": interpretation,
            "people_count": len(people),
            "model": "rule-based",  # GPT 대신 규칙 기반
            "is_group": True,
            # ENHANCED: 상세 그룹 분석 데이터
            "group_analysis": {
                "element_distribution": element_distribution,
                "pairwise_matrix": pairwise_matrix,
                "group_roles": group_roles,
            },
            # NEW: 시너지 점수 세부 내역
            "synergy_breakdown": {
                "total_score": synergy_score["overall_score"],
                "avg_pair_score": synergy_score["avg_pair_score"],
                "oheng_bonus": synergy_score["oheng_bonus"],
                "astro_bonus": synergy_score["astro_bonus"],
                "role_bonus": synergy_score["role_bonus"],
                "samhap_bonus": synergy_score["samhap_bonus"],
                "size_adjustment": synergy_score["size_adjustment"],
                "best_pair": {
                    "pair": best_pair_info.get("pair", "N/A"),
                    "score": best_pair_info.get("score", 0),
                    "summary": best_pair_info.get("summary", ""),
                },
                "weakest_pair": {
                    "pair": weakest_pair_info.get("pair", "N/A"),
                    "score": weakest_pair_info.get("score", 0),
                    "summary": weakest_pair_info.get("summary", ""),
                },
            },
            "timing": group_timing,
            "action_items": group_actions,
        }

    except Exception as e:
        print(f"[interpret_compatibility_group] Error: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
        }


# ===============================================================
# 컴포지트 차트 분석 (100% 구현)
# ===============================================================

def analyze_composite_chart(person1: dict, person2: dict) -> dict:
    """
    두 사람의 컴포지트 차트 분석 - 관계 자체의 특성 분석
    사주 + 점성술 융합 방식으로 컴포지트 차트 구성
    """
    result = {
        "composite_elements": {},
        "composite_houses": {},
        "relationship_identity": "",
        "relationship_purpose": "",
        "emotional_foundation": "",
        "partnership_quality": "",
        "long_term_potential": "",
        "score": 0,
        "details": [],
        "saju_parallel": {},
    }

    # 사주 데이터 추출
    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    dm1 = saju1.get("dayMaster", {})
    dm2 = saju2.get("dayMaster", {})
    dm1_name = dm1.get("name", "") if isinstance(dm1, dict) else str(dm1)
    dm2_name = dm2.get("name", "") if isinstance(dm2, dict) else str(dm2)
    dm1_elem = dm1.get("element", "") if isinstance(dm1, dict) else ""
    dm2_elem = dm2.get("element", "") if isinstance(dm2, dict) else ""

    # 점성술 데이터 추출
    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})
    sun1 = astro1.get("sunSign", "").lower()
    sun2 = astro2.get("sunSign", "").lower()
    moon1 = astro1.get("moonSign", "").lower()
    moon2 = astro2.get("moonSign", "").lower()

    # ============ 컴포지트 태양 (Composite Sun) = 관계의 목적 ============
    sun1_elem = ZODIAC_ELEMENTS.get(sun1, "")
    sun2_elem = ZODIAC_ELEMENTS.get(sun2, "")

    if sun1_elem and sun2_elem:
        # 두 태양 원소의 "중간점" 계산 (단순화된 방식)
        composite_sun_elem = _get_composite_element(sun1_elem, sun2_elem)
        result["composite_elements"]["sun"] = composite_sun_elem

        # 사주 병렬: 일간 합 결과와 비교
        stem_combo_result = _get_stem_combination_result(dm1_name, dm2_name)
        result["saju_parallel"]["composite_sun"] = {
            "saju": f"일간 합 결과: {stem_combo_result.get('result', '없음')}",
            "meaning": COMPOSITE_PLANETS_SAJU["composite_sun"]["meaning"]
        }

        # 관계 목적 해석
        purpose_interpretation = COMPOSITE_HOUSES_SAJU["1st_house"]["interpretation"]
        result["relationship_purpose"] = purpose_interpretation.get(composite_sun_elem, "독특한 관계")
        result["details"].append(f"☀️ 컴포지트 태양 ({composite_sun_elem}): {result['relationship_purpose']}")

    # ============ 컴포지트 달 (Composite Moon) = 감정적 기반 ============
    moon1_elem = ZODIAC_ELEMENTS.get(moon1, "")
    moon2_elem = ZODIAC_ELEMENTS.get(moon2, "")

    if moon1_elem and moon2_elem:
        composite_moon_elem = _get_composite_element(moon1_elem, moon2_elem)
        result["composite_elements"]["moon"] = composite_moon_elem

        # 사주 병렬: 일지 관계
        pillars1 = saju1.get("pillars", {})
        pillars2 = saju2.get("pillars", {})
        day1 = pillars1.get("day", "")
        day2 = pillars2.get("day", "")
        branch1 = day1[1] if len(day1) >= 2 else ""
        branch2 = day2[1] if len(day2) >= 2 else ""

        if branch1 and branch2:
            branch_result = analyze_branch_compatibility(branch1, branch2)
            result["saju_parallel"]["composite_moon"] = {
                "saju": f"일지 관계: {branch_result.get('relationships', ['없음'])}",
                "meaning": COMPOSITE_PLANETS_SAJU["composite_moon"]["meaning"]
            }

        # 감정 기반 해석
        emotional_map = {
            "fire": "열정적이고 활발한 감정 표현",
            "earth": "안정적이고 실용적인 감정 공유",
            "air": "지적이고 대화로 소통하는 감정",
            "water": "깊고 직관적인 감정적 연결"
        }
        result["emotional_foundation"] = emotional_map.get(composite_moon_elem, "독특한 감정 패턴")
        result["details"].append(f"🌙 컴포지트 달 ({composite_moon_elem}): {result['emotional_foundation']}")

    # ============ 컴포지트 금성 (Composite Venus) = 사랑 표현 ============
    venus1 = astro1.get("venusSign", sun1).lower()
    venus2 = astro2.get("venusSign", sun2).lower()
    venus1_elem = ZODIAC_ELEMENTS.get(venus1, sun1_elem)
    venus2_elem = ZODIAC_ELEMENTS.get(venus2, sun2_elem)

    if venus1_elem and venus2_elem:
        composite_venus_elem = _get_composite_element(venus1_elem, venus2_elem)
        result["composite_elements"]["venus"] = composite_venus_elem

        love_style_map = {
            "fire": "열정적이고 낭만적인 사랑",
            "earth": "안정적이고 헌신적인 사랑",
            "air": "지적이고 우정 같은 사랑",
            "water": "깊고 감성적인 사랑"
        }
        result["details"].append(f"💕 컴포지트 금성 ({composite_venus_elem}): {love_style_map.get(composite_venus_elem, '독특한 사랑')}")

    # ============ 컴포지트 토성 (Composite Saturn) = 관계의 장기성 ============
    # 사주의 정관/편관 조화와 연결
    if dm1_name and dm2_name:
        sipsung_a = calculate_sipsung(dm1_name, dm2_name)
        sipsung_b = calculate_sipsung(dm2_name, dm1_name)

        saturn_score = 0
        if sipsung_a.get("sipsung") in ["정관", "편관"] or sipsung_b.get("sipsung") in ["정관", "편관"]:
            saturn_score = 10
            result["long_term_potential"] = "장기적 관계에 적합 - 책임감과 구조가 있는 관계"
            result["details"].append(f"🪐 컴포지트 토성: 관성 관계 발견 - 장기적 파트너십 가능성 높음")
        elif sipsung_a.get("sipsung") in ["정인", "편인"] or sipsung_b.get("sipsung") in ["정인", "편인"]:
            saturn_score = 7
            result["long_term_potential"] = "서로를 성숙하게 하는 관계"
            result["details"].append(f"🪐 컴포지트 토성: 인성 관계 - 상호 성장하는 관계")
        else:
            saturn_score = 5
            result["long_term_potential"] = "자유로운 형태의 관계"
            result["details"].append(f"🪐 컴포지트 토성: 유연한 관계 형태")

        result["saju_parallel"]["composite_saturn"] = {
            "sipsung_a": sipsung_a.get("sipsung", ""),
            "sipsung_b": sipsung_b.get("sipsung", ""),
            "meaning": COMPOSITE_PLANETS_SAJU["composite_saturn"]["meaning"]
        }

    # ============ 7th House (파트너십의 질) ============
    # 일주 간 관계를 기반으로 파트너십 평가
    partnership_score = 0
    if dm1_name and dm2_name:
        stem_result = analyze_stem_compatibility(dm1_name, dm2_name)
        if stem_result.get("relationship") == "combination":
            partnership_score = 15
            result["partnership_quality"] = "천생연분 파트너십 - 서로를 완성시키는 관계"
            result["details"].append(f"💑 7th House (파트너십): {stem_result.get('meaning', '')}")
        elif stem_result.get("relationship") == "same":
            partnership_score = 8
            result["partnership_quality"] = "동질적 파트너십 - 비슷해서 이해가 빠름"
        elif stem_result.get("relationship") == "clash":
            partnership_score = 3
            result["partnership_quality"] = "도전적 파트너십 - 성장의 기회"
        else:
            partnership_score = 10
            result["partnership_quality"] = "균형 잡힌 파트너십"

    # ============ 컴포지트 종합 점수 계산 ============
    total_score = 60  # 기본 점수

    # 원소 조화 점수
    if result["composite_elements"].get("sun"):
        total_score += 10
    if result["composite_elements"].get("moon"):
        total_score += 10
    if result["composite_elements"].get("venus"):
        total_score += 5

    # 파트너십 점수 추가
    total_score += partnership_score

    # 장기성 점수 추가
    total_score += saturn_score if 'saturn_score' in dir() else 0

    result["score"] = min(100, total_score)

    return result


def _get_composite_element(elem1: str, elem2: str) -> str:
    """두 원소의 컴포지트(중간점) 계산"""
    if elem1 == elem2:
        return elem1

    # 상성이 좋은 조합은 강한 원소로
    compatible = {
        frozenset(["fire", "air"]): "fire",  # 불+바람 = 불 강화
        frozenset(["earth", "water"]): "earth",  # 흙+물 = 흙 강화
    }

    key = frozenset([elem1, elem2])
    if key in compatible:
        return compatible[key]

    # 그 외에는 첫 번째 원소 반환 (더 강한 영향)
    return elem1


def _get_stem_combination_result(stem1: str, stem2: str) -> dict:
    """천간합 결과 확인"""
    for (s1, s2), data in STEM_COMBINATIONS.items():
        if (stem1 == s1 and stem2 == s2) or (stem1 == s2 and stem2 == s1):
            return data
    return {"result": "없음", "meaning": "합이 없음"}


# ===============================================================
# 대운/세운 상호작용 분석 (100% 구현)
# ===============================================================

def analyze_daeun_seun_interaction(person1: dict, person2: dict, birth_year1: int = None, birth_year2: int = None) -> dict:
    """
    두 사람의 대운/세운 상호작용 분석

    Args:
        person1, person2: 각 사람의 saju/astro 데이터
        birth_year1, birth_year2: 각 사람의 출생년도 (대운 계산용)
    """
    result = {
        "daeun_interaction": None,
        "seun_interaction": None,
        "critical_periods": [],
        "current_year_advice": "",
        "timing_score": 0,
        "details": [],
    }

    current_year = datetime.now().year

    # 출생년도 추출 시도
    if not birth_year1:
        birth_year1 = person1.get("birthYear") or person1.get("birth_year")
    if not birth_year2:
        birth_year2 = person2.get("birthYear") or person2.get("birth_year")

    # ============ 대운 분석 ============
    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    dm1 = saju1.get("dayMaster", {})
    dm2 = saju2.get("dayMaster", {})
    dm1_elem = dm1.get("element", "") if isinstance(dm1, dict) else ""
    dm2_elem = dm2.get("element", "") if isinstance(dm2, dict) else ""

    # 용신 추출 (있는 경우)
    yongsin1 = saju1.get("yongsin") or saju1.get("favorableElement") or ""
    yongsin2 = saju2.get("yongsin") or saju2.get("favorableElement") or ""

    # 현재 대운 원소 추정 (단순화: 나이 기반)
    if birth_year1 and birth_year2:
        age1 = current_year - birth_year1
        age2 = current_year - birth_year2

        # 대운 10년 주기 계산 (단순화)
        daeun_period1 = (age1 // 10) % 5
        daeun_period2 = (age2 // 10) % 5

        daeun_elements = ["木", "火", "土", "金", "水"]
        current_daeun1 = daeun_elements[daeun_period1]
        current_daeun2 = daeun_elements[daeun_period2]

        # 대운 상호작용 분석
        if yongsin2 and current_daeun1 == yongsin2:
            result["daeun_interaction"] = DAEUN_INTERACTION["supporting"]
            result["timing_score"] += 15
            result["details"].append(f"✨ A의 현재 대운({current_daeun1})이 B의 용신({yongsin2})을 돕습니다!")
        elif yongsin1 and current_daeun2 == yongsin1:
            result["daeun_interaction"] = DAEUN_INTERACTION["supporting"]
            result["timing_score"] += 15
            result["details"].append(f"✨ B의 현재 대운({current_daeun2})이 A의 용신({yongsin1})을 돕습니다!")
        else:
            result["daeun_interaction"] = DAEUN_INTERACTION["neutral"]
            result["timing_score"] += 5
            result["details"].append(f"ℹ️ 대운 상호작용: 평범한 시기입니다")

    # ============ 세운 분석 (올해) ============
    # 올해 천간/지지 계산 (간단한 버전)
    year_cycle = (current_year - 4) % 10  # 갑자년 기준
    stem_cycle = HEAVENLY_STEMS[year_cycle]
    branch_cycle = (current_year - 4) % 12
    branch_names = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
    branch_cycle_name = branch_names[branch_cycle]

    # 올해 세운 원소
    seun_element = STEM_TO_ELEMENT.get(stem_cycle, "")
    seun_branch_element = BRANCH_ELEMENTS.get(branch_cycle_name, "")

    result["details"].append(f"📅 {current_year}년 세운: {stem_cycle}{branch_cycle_name} ({seun_element}/{seun_branch_element})")

    # 세운이 두 사람에게 미치는 영향
    favorable_count = 0

    if dm1_elem and seun_element:
        if _element_supports(seun_element, dm1_elem) or seun_element == yongsin1:
            favorable_count += 1
            result["details"].append(f"👤 A에게: 올해 세운이 유리합니다")
        elif _element_controls(seun_element, dm1_elem):
            result["details"].append(f"👤 A에게: 올해 세운이 도전적입니다")

    if dm2_elem and seun_element:
        if _element_supports(seun_element, dm2_elem) or seun_element == yongsin2:
            favorable_count += 1
            result["details"].append(f"👤 B에게: 올해 세운이 유리합니다")
        elif _element_controls(seun_element, dm2_elem):
            result["details"].append(f"👤 B에게: 올해 세운이 도전적입니다")

    if favorable_count == 2:
        result["seun_interaction"] = SEUN_INTERACTION["favorable"]
        result["timing_score"] += 15
        result["current_year_advice"] = f"{current_year}년은 두 분 모두에게 좋은 해입니다! 중요한 결정에 적합해요."
    elif favorable_count == 1:
        result["seun_interaction"] = SEUN_INTERACTION["transformative"]
        result["timing_score"] += 8
        result["current_year_advice"] = f"{current_year}년은 변화의 해입니다. 서로 지지하며 성장하세요."
    else:
        result["seun_interaction"] = SEUN_INTERACTION["challenging"]
        result["timing_score"] += 3
        result["current_year_advice"] = f"{current_year}년은 도전의 해입니다. 작은 갈등도 빨리 해결하세요."

    # ============ Critical Periods 분석 ============
    if birth_year1 and birth_year2:
        age1 = current_year - birth_year1
        age2 = current_year - birth_year2

        # 토성 회귀 (29세)
        for i, (age, person) in enumerate([(age1, "A"), (age2, "B")]):
            years_to_saturn = 29 - age
            if -2 <= years_to_saturn <= 2:
                period_info = CRITICAL_PERIODS["saturn_return"].copy()
                period_info["person"] = person
                period_info["timing"] = f"현재" if years_to_saturn == 0 else f"{abs(years_to_saturn)}년 {'후' if years_to_saturn > 0 else '전'}"
                result["critical_periods"].append(period_info)
                result["details"].append(f"🪐 {person}의 토성 회귀: {period_info['timing']} - {period_info['relationship_effect']}")

        # 7년 주기 체크
        relationship_years = min(age1, age2) // 7  # 관계 기간 추정
        if relationship_years > 0 and relationship_years % 7 == 0:
            period_info = CRITICAL_PERIODS["seven_year"].copy()
            period_info["timing"] = "현재 7년 주기"
            result["critical_periods"].append(period_info)

    return result


def _element_controls(source: str, target: str) -> bool:
    """source 원소가 target 원소를 극하는지 확인"""
    control_map = {
        "木": "土", "火": "金", "土": "水", "金": "木", "水": "火",
    }
    return control_map.get(source, "") == target


# ===============================================================
# 사주 100점 + 점성술 100점 독립 채점 시스템
# ===============================================================

def calculate_dual_score_system(person1: dict, person2: dict) -> dict:
    """
    사주 100점 만점 + 점성술 100점 만점으로 각각 독립 계산

    Returns:
        dict with separate saju_score (0-100) and astro_score (0-100)
    """
    result = {
        "saju_score": 0,
        "saju_breakdown": {},
        "astro_score": 0,
        "astro_breakdown": {},
        "combined_score": 0,  # 평균 점수
        "balance_assessment": "",
        "fusion_synergy": 0,  # 두 시스템이 같은 방향을 가리키면 보너스
    }

    # ===============================================
    # 사주 100점 계산
    # ===============================================
    saju_base = 50  # 기본 점수
    saju_adjustment = 0
    saju_details = {}

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    dm1 = saju1.get("dayMaster", {})
    dm2 = saju2.get("dayMaster", {})
    dm1_name = dm1.get("name", "") if isinstance(dm1, dict) else str(dm1)
    dm2_name = dm2.get("name", "") if isinstance(dm2, dict) else str(dm2)
    dm1_elem = dm1.get("element", "") if isinstance(dm1, dict) else ""
    dm2_elem = dm2.get("element", "") if isinstance(dm2, dict) else ""

    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})
    day1 = pillars1.get("day", "")
    day2 = pillars2.get("day", "")
    branch1 = day1[1] if len(day1) >= 2 else ""
    branch2 = day2[1] if len(day2) >= 2 else ""

    # 1. 천간합 (최대 +30)
    if dm1_name and dm2_name:
        stem_result = analyze_stem_compatibility(dm1_name, dm2_name)
        if stem_result.get("relationship") == "combination":
            saju_adjustment += 30
            saju_details["천간합"] = {"score": 30, "detail": stem_result.get("meaning", "")}
        elif stem_result.get("relationship") == "clash":
            saju_adjustment -= 15
            saju_details["천간충"] = {"score": -15, "detail": stem_result.get("meaning", "")}
        elif stem_result.get("relationship") == "same":
            saju_adjustment += 10
            saju_details["비견"] = {"score": 10, "detail": "같은 일간 - 이해가 빠름"}

    # 2. 지지 관계 (최대 +25)
    if branch1 and branch2:
        branch_result = analyze_branch_compatibility(branch1, branch2)

        # 육합
        if "yukhap" in branch_result.get("relationships", []):
            saju_adjustment += 25
            saju_details["육합"] = {"score": 25, "detail": "강한 끌림과 융합"}

        # 반합
        if "banhap" in branch_result.get("relationships", []):
            saju_adjustment += 18
            saju_details["반합"] = {"score": 18, "detail": "조화의 잠재력"}

        # 충
        if "chung" in branch_result.get("relationships", []):
            saju_adjustment -= 18
            saju_details["충"] = {"score": -18, "detail": "긴장과 갈등 가능"}

        # 형
        if "hyung" in branch_result.get("relationships", []):
            saju_adjustment -= 12
            saju_details["형"] = {"score": -12, "detail": "도전적 관계"}

        # 원진
        if "wongjin" in branch_result.get("relationships", []):
            saju_adjustment -= 8
            saju_details["원진"] = {"score": -8, "detail": "숨은 갈등"}

        # 해
        if "hae" in branch_result.get("relationships", []):
            saju_adjustment -= 5
            saju_details["해"] = {"score": -5, "detail": "미묘한 불편함"}

    # 3. 오행 상생상극 (최대 +15)
    if dm1_elem and dm2_elem:
        oheng_result = analyze_oheng_relationship(dm1_elem, dm2_elem)
        if oheng_result["adjustment"] > 0:
            saju_adjustment += 15
            saju_details["상생"] = {"score": 15, "detail": oheng_result.get("details", "")}
        elif oheng_result["adjustment"] < 0:
            saju_adjustment -= 12
            saju_details["상극"] = {"score": -12, "detail": oheng_result.get("details", "")}

    # 4. 십성 관계 (최대 +20)
    if dm1_name and dm2_name:
        sipsung_a = calculate_sipsung(dm1_name, dm2_name)
        sipsung_b = calculate_sipsung(dm2_name, dm1_name)

        sipsung_score = 0
        if sipsung_a.get("sipsung") in ["정재", "정관", "정인"]:
            sipsung_score += 12
        elif sipsung_a.get("sipsung") in ["식신", "편인"]:
            sipsung_score += 8
        elif sipsung_a.get("sipsung") in ["편관", "겁재"]:
            sipsung_score -= 5

        if sipsung_b.get("sipsung") in ["정재", "정관", "정인"]:
            sipsung_score += 8

        saju_adjustment += min(20, max(-10, sipsung_score))
        saju_details["십성"] = {"score": sipsung_score, "detail": f"A→B: {sipsung_a.get('sipsung', '?')}, B→A: {sipsung_b.get('sipsung', '?')}"}

    # 5. 육합↔시나스트리 보너스 (최대 +10)
    for (b1, b2), data in YUKHAP_SYNASTRY_MAPPING.items():
        if (branch1 == b1 and branch2 == b2) or (branch1 == b2 and branch2 == b1):
            saju_adjustment += 10
            saju_details["육합시나스트리"] = {"score": 10, "detail": data.get("theme", "")}
            break

    # 6. 신살(神殺) 궁합 분석 (최대 +15/-15)
    shinsal_result = analyze_shinsal_compatibility(person1, person2)
    shinsal_score = shinsal_result.get("total_score", 0)
    shinsal_capped = max(-15, min(15, shinsal_score))
    saju_adjustment += shinsal_capped
    saju_details["신살궁합"] = {
        "score": shinsal_capped,
        "detail": shinsal_result.get("summary", ""),
        "positive": shinsal_result.get("positive_shinsals", []),
        "negative": shinsal_result.get("negative_shinsals", [])
    }
    result["shinsal_analysis"] = shinsal_result

    # 7. 12운성 궁합 분석 (최대 +10)
    twelve_stages_result = analyze_twelve_stages_compatibility(person1, person2)
    if twelve_stages_result.get("score", 0) > 0:
        twelve_bonus = min(10, twelve_stages_result["score"])
        saju_adjustment += twelve_bonus
        saju_details["12운성"] = {
            "score": twelve_bonus,
            "detail": twelve_stages_result.get("meaning", ""),
            "person1": twelve_stages_result.get("person1_stage", ""),
            "person2": twelve_stages_result.get("person2_stage", "")
        }
        result["twelve_stages_analysis"] = twelve_stages_result

    # 8. 납음오행 궁합 분석 (최대 +8/-4)
    naeum_result = analyze_naeum_compatibility(person1, person2)
    if naeum_result.get("score", 0) != 0:
        naeum_capped = max(-4, min(8, naeum_result["score"]))
        saju_adjustment += naeum_capped
        saju_details["납음오행"] = {
            "score": naeum_capped,
            "detail": naeum_result.get("meaning", ""),
            "person1_naeum": naeum_result.get("person1_naeum", ""),
            "person2_naeum": naeum_result.get("person2_naeum", ""),
            "compatibility_level": naeum_result.get("compatibility_level", "")
        }
        result["naeum_analysis"] = naeum_result

    # 9. 공망(空亡) 상호작용 분석 (최대 +4/-6)
    gongmang_result = analyze_gongmang_interaction(person1, person2)
    if gongmang_result.get("score_adjustment", 0) != 0:
        gongmang_capped = max(-6, min(4, gongmang_result["score_adjustment"]))
        saju_adjustment += gongmang_capped
        saju_details["공망"] = {
            "score": gongmang_capped,
            "detail": gongmang_result.get("summary", ""),
            "interactions": gongmang_result.get("interactions", [])
        }
        result["gongmang_analysis"] = gongmang_result

    # 10. 삼재(三災) 궁합 분석 (최대 +8/-5)
    samjae_result = analyze_samjae_compatibility(person1, person2)
    if samjae_result.get("score", 0) != 0:
        samjae_capped = max(-5, min(8, samjae_result["score"]))
        saju_adjustment += samjae_capped
        saju_details["삼재"] = {
            "score": samjae_capped,
            "detail": samjae_result.get("summary", ""),
            "interaction": samjae_result.get("interaction", ""),
            "effect": samjae_result.get("effect", "")
        }
        result["samjae_analysis"] = samjae_result

    # 11. 용신(用神)/기신(忌神) 상호작용 분석 (최대 +15/-10)
    yongsin_result = analyze_yongsin_interaction(person1, person2)
    if yongsin_result.get("score", 0) != 0:
        yongsin_capped = max(-10, min(15, yongsin_result["score"]))
        saju_adjustment += yongsin_capped
        saju_details["용신기신"] = {
            "score": yongsin_capped,
            "detail": yongsin_result.get("summary", ""),
            "mutual_support": yongsin_result.get("mutual_support", False),
            "potential_conflict": yongsin_result.get("potential_conflict", False),
            "details": yongsin_result.get("compatibility_details", [])
        }
        result["yongsin_analysis"] = yongsin_result

    # 12. 반합/방합 상세 분석 (최대 +18)
    banhap_banghap_result = analyze_banhap_banghap_detailed(person1, person2)
    if banhap_banghap_result.get("combined_score", 0) > 0:
        banhap_capped = min(18, banhap_banghap_result["combined_score"])
        saju_adjustment += banhap_capped
        saju_details["반합방합"] = {
            "score": banhap_capped,
            "detail": banhap_banghap_result.get("summary", ""),
            "banhap": banhap_banghap_result.get("banhap_analysis", {}),
            "banghap": banhap_banghap_result.get("banghap_analysis", {}),
            "harmony_level": banhap_banghap_result.get("harmony_level", "")
        }
        result["banhap_banghap_analysis"] = banhap_banghap_result

    # 사주 최종 점수
    result["saju_score"] = max(0, min(100, saju_base + saju_adjustment))
    result["saju_breakdown"] = saju_details

    # ===============================================
    # 점성술 100점 계산
    # ===============================================
    astro_base = 50
    astro_adjustment = 0
    astro_details = {}

    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})
    sun1 = astro1.get("sunSign", "").lower()
    sun2 = astro2.get("sunSign", "").lower()
    moon1 = astro1.get("moonSign", "").lower()
    moon2 = astro2.get("moonSign", "").lower()
    venus1 = astro1.get("venusSign", sun1).lower()
    venus2 = astro2.get("venusSign", sun2).lower()
    mars1 = astro1.get("marsSign", sun1).lower()
    mars2 = astro2.get("marsSign", sun2).lower()

    # 1. 태양-태양 궁합 (최대 +20)
    if sun1 and sun2:
        sun_result = analyze_astro_compatibility(sun1, sun2)
        sun_bonus = (sun_result.get("score", 70) - 70) * 0.4
        astro_adjustment += sun_bonus
        astro_details["태양태양"] = {"score": round(sun_bonus), "detail": sun_result.get("meaning", "")}

    # 2. 달-달 궁합 (최대 +18)
    if moon1 and moon2:
        moon_result = analyze_astro_compatibility(moon1, moon2)
        moon_bonus = (moon_result.get("score", 70) - 70) * 0.36
        astro_adjustment += moon_bonus
        astro_details["달달"] = {"score": round(moon_bonus), "detail": moon_result.get("meaning", "")}

    # 3. 금성-화성 케미스트리 (최대 +25 - 연애에서 가장 중요)
    venus1_elem = ZODIAC_ELEMENTS.get(venus1, "")
    venus2_elem = ZODIAC_ELEMENTS.get(venus2, "")
    mars1_elem = ZODIAC_ELEMENTS.get(mars1, "")
    mars2_elem = ZODIAC_ELEMENTS.get(mars2, "")

    venus_mars_total = 0
    if venus1_elem and mars2_elem:
        key = (venus1_elem, mars2_elem)
        if key in VENUS_MARS_SYNASTRY:
            venus_mars_total += VENUS_MARS_SYNASTRY[key]["score"]
    if venus2_elem and mars1_elem:
        key = (venus2_elem, mars1_elem)
        if key in VENUS_MARS_SYNASTRY:
            venus_mars_total += VENUS_MARS_SYNASTRY[key]["score"]

    if venus_mars_total > 0:
        venus_mars_bonus = (venus_mars_total / 2 - 70) * 0.5
        astro_adjustment += min(25, venus_mars_bonus)
        astro_details["금성화성"] = {"score": round(venus_mars_bonus), "detail": "연애 케미스트리"}

    # 4. 행성 애스펙트 분석 (최대 +20)
    planetary = analyze_planetary_synastry(person1, person2)
    if planetary.get("total_score"):
        aspect_bonus = planetary["total_score"] * 0.3
        astro_adjustment += min(20, max(-15, aspect_bonus))
        astro_details["애스펙트"] = {
            "score": round(aspect_bonus),
            "detail": f"조화:{planetary.get('harmony_count', 0)} / 긴장:{planetary.get('tension_count', 0)}"
        }

    # 5. 반대궁 끌림 (최대 +10)
    if sun1 and sun2:
        if ZODIAC_OPPOSITES.get(sun1) == sun2:
            astro_adjustment += 10
            astro_details["반대궁"] = {"score": 10, "detail": "강한 끌림 (반대궁)"}

    # 6. 추가 행성 (Jupiter, Neptune, Pluto) - 최대 +15
    extra_bonus = 0
    # Jupiter-Venus (축복받은 사랑)
    jupiter1 = astro1.get("jupiterSign", "").lower()
    jupiter2 = astro2.get("jupiterSign", "").lower()
    if jupiter1 and venus2:
        jup_elem = ZODIAC_ELEMENTS.get(jupiter1, "")
        ven_elem = ZODIAC_ELEMENTS.get(venus2, "")
        if jup_elem == ven_elem:
            extra_bonus += 8
            astro_details["목성금성"] = {"score": 8, "detail": "풍요로운 사랑"}

    astro_adjustment += min(15, extra_bonus)

    # 7. 12하우스 궁합 분석 (최대 +12)
    house_result = analyze_house_compatibility(person1, person2)
    if house_result.get("score", 0) > 0:
        house_capped = min(12, house_result["score"])
        astro_adjustment += house_capped
        astro_details["하우스궁합"] = {
            "score": house_capped,
            "detail": house_result.get("summary", ""),
            "person1_house": house_result.get("person1_houses", {}),
            "person2_house": house_result.get("person2_houses", {}),
            "interactions": house_result.get("house_interactions", [])
        }
        result["house_analysis"] = house_result

    # 8. ASC/DSC 축 궁합 분석 (최대 +20)
    asc_dsc_result = analyze_asc_dsc_compatibility(person1, person2)
    if asc_dsc_result.get("score", 0) > 0:
        asc_dsc_capped = min(20, asc_dsc_result["score"])
        astro_adjustment += asc_dsc_capped
        astro_details["ASC_DSC"] = {
            "score": asc_dsc_capped,
            "detail": asc_dsc_result.get("summary", ""),
            "person1_asc": asc_dsc_result.get("person1_asc", ""),
            "person2_asc": asc_dsc_result.get("person2_asc", ""),
            "person1_dsc": asc_dsc_result.get("person1_dsc", ""),
            "person2_dsc": asc_dsc_result.get("person2_dsc", ""),
            "relationship_style": asc_dsc_result.get("relationship_style", ""),
            "interactions": asc_dsc_result.get("interactions", []),
            "partner_needs_match": asc_dsc_result.get("partner_needs_match", [])
        }
        result["asc_dsc_analysis"] = asc_dsc_result

    # 9. Lilith/Chiron 시나스트리 분석 (최대 +15)
    lilith_chiron_result = analyze_lilith_chiron_synastry(person1, person2)
    if lilith_chiron_result.get("combined_score", 0) > 0:
        lilith_chiron_capped = min(15, lilith_chiron_result["combined_score"])
        astro_adjustment += lilith_chiron_capped
        astro_details["릴리스카이론"] = {
            "score": lilith_chiron_capped,
            "detail": lilith_chiron_result.get("summary", ""),
            "lilith_analysis": lilith_chiron_result.get("lilith_analysis", {}),
            "chiron_analysis": lilith_chiron_result.get("chiron_analysis", {}),
            "shadow_work": lilith_chiron_result.get("shadow_work", []),
            "healing_potential": lilith_chiron_result.get("healing_potential", [])
        }
        result["lilith_chiron_analysis"] = lilith_chiron_result

    # 10. Progression(프로그레션) 시나스트리 분석 (최대 +12)
    progression_result = analyze_progression_synastry(person1, person2)
    if progression_result.get("score", 0) != 0:
        progression_capped = max(-5, min(12, progression_result["score"]))
        astro_adjustment += progression_capped
        astro_details["프로그레션"] = {
            "score": progression_capped,
            "detail": progression_result.get("summary", ""),
            "timing_assessment": progression_result.get("timing_assessment", ""),
            "relationship_phase": progression_result.get("relationship_phase", ""),
            "person1_progression": progression_result.get("person1_progression", {}),
            "person2_progression": progression_result.get("person2_progression", {}),
            "progressed_moon_phase": progression_result.get("progressed_moon_phase", {}),
            "daeun_progression_link": progression_result.get("daeun_progression_link", {})
        }
        result["progression_analysis"] = progression_result

    # 점성술 최종 점수
    result["astro_score"] = max(0, min(100, astro_base + astro_adjustment))
    result["astro_breakdown"] = astro_details

    # ===============================================
    # 융합 분석
    # ===============================================
    # 두 점수가 비슷하면 균형 잡힌 관계
    score_diff = abs(result["saju_score"] - result["astro_score"])

    if score_diff <= 10:
        result["balance_assessment"] = "균형 잡힌 궁합 - 동서양 체계 모두 긍정적"
        result["fusion_synergy"] = 5
    elif score_diff <= 20:
        result["balance_assessment"] = "약간의 차이 - 특정 영역에서 더 강점"
        result["fusion_synergy"] = 2
    else:
        result["balance_assessment"] = "대조적인 결과 - 다양한 관점에서 분석 필요"
        result["fusion_synergy"] = 0

    # 두 점수 모두 높으면 추가 보너스
    if result["saju_score"] >= 75 and result["astro_score"] >= 75:
        result["fusion_synergy"] += 10
        result["balance_assessment"] = "천생연분! 동서양 체계 모두 최고 궁합"

    # 종합 점수 (두 점수 평균 + 융합 시너지)
    result["combined_score"] = min(100, round((result["saju_score"] + result["astro_score"]) / 2 + result["fusion_synergy"]))

    return result


def calculate_comprehensive_score(person1: dict, person2: dict, relationship_type: str = "lover") -> dict:
    """
    종합 궁합 점수 계산 - 모든 분석 통합

    Returns:
        dict with all scores and detailed breakdown
    """
    result = {
        "dual_scores": None,
        "composite": None,
        "timing": None,
        "final_score": 0,
        "interpretation_level": "",
        "summary": "",
    }

    # 1. 사주/점성 독립 점수
    result["dual_scores"] = calculate_dual_score_system(person1, person2)

    # 2. 컴포지트 차트 분석
    result["composite"] = analyze_composite_chart(person1, person2)

    # 3. 타이밍 분석
    result["timing"] = analyze_daeun_seun_interaction(person1, person2)

    # 4. 최종 점수 계산
    base_score = result["dual_scores"]["combined_score"]
    composite_bonus = (result["composite"]["score"] - 70) * 0.1  # 컴포지트 10% 반영
    timing_bonus = result["timing"]["timing_score"] * 0.05  # 타이밍 5% 반영

    final = min(100, max(0, base_score + composite_bonus + timing_bonus))
    result["final_score"] = round(final)

    # 5. 해석 레벨
    if final >= 90:
        result["interpretation_level"] = "천생연분"
        result["summary"] = "동서양 체계 모두가 인정하는 최고의 궁합입니다!"
    elif final >= 80:
        result["interpretation_level"] = "매우 좋음"
        result["summary"] = "자연스럽게 잘 맞는 관계입니다. 결혼해도 좋을 궁합이에요."
    elif final >= 70:
        result["interpretation_level"] = "좋음"
        result["summary"] = "기본적으로 좋은 궁합입니다. 노력하면 더 좋아질 수 있어요."
    elif final >= 60:
        result["interpretation_level"] = "보통"
        result["summary"] = "평범한 궁합입니다. 서로 이해하고 배려하면 잘 될 수 있어요."
    elif final >= 50:
        result["interpretation_level"] = "노력 필요"
        result["summary"] = "도전적인 궁합이지만, 노력하면 성장하는 관계가 될 수 있습니다."
    else:
        result["interpretation_level"] = "신중 필요"
        result["summary"] = "많은 노력이 필요한 궁합입니다. 신중하게 결정하세요."

    return result
