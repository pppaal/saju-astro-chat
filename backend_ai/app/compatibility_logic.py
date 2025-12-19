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
    from signal_extractor import extract_signals
    from signal_summary import summarize_signals
    HAS_SIGNALS = True
except ImportError:
    HAS_SIGNALS = False
    print("[compatibility_logic] Signal extractor not available")


def get_openai_client():
    """Get OpenAI client for GPT."""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is missing.")
    from openai import OpenAI
    return OpenAI(api_key=OPENAI_API_KEY)


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

        # Build prompt with fusion context
        prompt = build_compatibility_prompt(
            people=people,
            relationship_type=relationship_type,
            locale=locale,
            reference_data=reference_data,
        )

        # Add fusion context to prompt
        if fusion_context:
            prompt += f"\n\n## 추가 분석 컨텍스트 (Fusion System)\n{fusion_context}"

        # Add timing info to prompt
        if timing_analysis.get("current_month"):
            month_info = timing_analysis["current_month"]
            prompt += f"\n\n## 현재 월운 분석\n현재 월지: {month_info.get('branch')} ({month_info.get('element')})\n분석: {month_info.get('analysis')}"

        # Call GPT
        client = get_openai_client()

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """당신은 따뜻하고 공감 능력이 뛰어난 궁합 상담사입니다.
사주(四柱)와 점성학을 융합하여 두 사람의 관계를 분석해주세요.

분석 원칙:
- 사주 오행과 점성학 원소를 교차 분석 (木↔Air, 火↔Fire, 土↔Earth, 金↔Metal, 水↔Water)
- 두 시스템이 같은 인사이트를 가리키는 부분 찾기
- 관계의 강점을 먼저 언급하고, 보완점은 건설적으로

상담 스타일:
- 따뜻하고 공감하는 말투 ("~하시는군요", "~하실 수 있어요")
- 단정적 판단 대신 가능성과 성장 방향 제시
- 실질적인 타이밍 조언 포함"""
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.5,
        )

        interpretation = response.choices[0].message.content.strip()

        # Extract score if mentioned (simple regex)
        import re
        score_match = re.search(r'(?:점수|score)[:\s]*(\d+)', interpretation, re.IGNORECASE)
        overall_score = int(score_match.group(1)) if score_match else 75

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "relationship_type": relationship_type,
            "locale": locale,
            "overall_score": overall_score,
            "interpretation": interpretation,
            "people_count": len(people),
            "model": "gpt-4o-mini",
            # NEW: Timing and Action Items
            "timing": timing_analysis,
            "action_items": action_items,
            "fusion_enabled": HAS_MULTILAYER or HAS_RULE_ENGINE or HAS_SIGNALS,
        }

    except Exception as e:
        print(f"[interpret_compatibility] Error: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
            "trace": traceback.format_exc(),
        }


def interpret_compatibility_group(
    people: list,
    relationship_type: str = "family",
    locale: str = "ko",
) -> dict:
    """
    Group compatibility for 3-4 people (family, team, etc.)
    """
    try:
        if len(people) < 3:
            return interpret_compatibility(people, relationship_type, locale)

        if len(people) > 4:
            return {
                "status": "error",
                "message": "최대 4명까지만 지원합니다.",
            }

        # Load reference data
        reference_data = load_compatibility_data()

        # Format people
        people_text = "\n\n".join([
            format_person_data(p, i+1) for i, p in enumerate(people)
        ])

        lang_instruction = "한국어로 답변하세요." if locale == "ko" else "Answer in English."

        prompt = f"""당신은 사주명리학과 서양 점성술을 융합(Fusion)하여 그룹 역학을 분석하는 전문가입니다.

⚠️ 핵심 원칙: 사주와 점성술을 따로 분석하지 말고, 두 체계가 교차하는 지점을 찾아 그룹 인사이트를 제공하세요!

## 분석 대상 ({len(people)}명)
{people_text}

## 관계 유형
{relationship_type}

## 🔥 교차 분석 가이드 (FUSION APPROACH)
### 오행(五行)과 점성술 원소 매핑
- 목(木) ↔ Air - 성장, 확장, 아이디어
- 화(火) ↔ Fire - 열정, 에너지, 행동
- 토(土) ↔ Earth - 안정, 실용, 신뢰
- 금(金) ↔ Water/Earth - 정교함, 구조
- 수(水) ↔ Water - 지혜, 적응, 직관

## 분석 구조

### 1. 🎯 그룹 전체 조화도 (0-100)
점수와 "이 그룹의 핵심 에너지" 한 줄 요약

### 2. ⚡ 그룹 융합 인사이트 (FUSION CORE)
사주와 점성술이 동시에 보여주는 그룹 역학:
- 그룹 전체의 오행 분포 + 점성술 원소 분포 통합 분석
- 보완되는 에너지 조합
- 충돌할 수 있는 에너지 조합

### 3. 👥 개별 궁합 매트릭스 (교차 분석)
각 1:1 조합을 사주+점성 융합으로 분석:
- A↔B: [사주 관계] + [점성 관계] → [통합 인사이트]

### 4. 🌟 그룹 역학 (사주+점성 기반)
- 리더십 역할: 누구의 일간/태양이 리더십 에너지인가?
- 조화 역할: 누가 그룹의 균형을 잡아주는가?
- 촉매 역할: 누가 그룹에 에너지를 불어넣는가?
- 주의 조합: 어떤 1:1 관계가 긴장을 만드는가?

### 5. 💪 그룹 강점 & ⚠️ 약점
(사주+점성 근거와 함께)

### 6. 💡 그룹 시너지 조언
- 함께할 때 최고의 성과를 내는 활동
- 피해야 할 상황이나 주제
- 그룹 조화를 위한 실천 조언 3가지

---
{lang_instruction}

⚠️ 품질 규칙:
1. 각 사람을 개별 분석하지 말고 그룹 전체 관점에서 융합 분석
2. 사주와 점성술을 교차하여 통합 인사이트 제공
3. 구체적 근거 제시 (예: "A의 丙火 + B의 사자자리 = 리더십 경쟁 가능")
"""

        client = get_openai_client()

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """당신은 따뜻하고 공감 능력이 뛰어난 그룹 궁합 상담사입니다.
사주(四柱)와 점성학을 융합하여 그룹 역학을 분석해주세요.

분석 원칙:
- 각 구성원의 오행을 점성학 원소와 매핑 (木↔Air, 火↔Fire, 土↔Earth, 金↔Metal, 水↔Water)
- 그룹 전체의 원소 균형 분석
- 구성원 간 시너지와 보완 관계 찾기

상담 스타일:
- 그룹의 강점을 먼저 강조
- 따뜻하고 공감하는 말투
- 실질적인 그룹 활동 조언 포함"""
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.5,
        )

        interpretation = response.choices[0].message.content.strip()

        import re
        score_match = re.search(r'(?:점수|score|조화도)[:\s]*(\d+)', interpretation, re.IGNORECASE)
        overall_score = int(score_match.group(1)) if score_match else 70

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "relationship_type": relationship_type,
            "locale": locale,
            "overall_score": overall_score,
            "interpretation": interpretation,
            "people_count": len(people),
            "model": "gpt-4o-mini",
            "is_group": True,
        }

    except Exception as e:
        print(f"[interpret_compatibility_group] Error: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
        }
