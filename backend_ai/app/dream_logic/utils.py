# backend_ai/app/dream_logic/utils.py
"""
Utility functions for dream interpretation.
Contains helper functions for merging, fallbacks, and caching.
"""

import json
import hashlib
from typing import List


def merge_unique(list1: list, list2: list) -> list:
    """Merge two lists preserving order, removing duplicates."""
    seen = set()
    result = []
    for item in list1 + list2:
        # Use first 100 chars as key to avoid near-duplicates
        key = item[:100] if isinstance(item, str) else str(item)[:100]
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


def get_fallback_interpretations(dream_text: str, locale: str = "en") -> list:
    """
    매칭되는 규칙이 없을 때 사용할 범용 해석 가이드라인
    Universal dream interpretation guidelines when no specific rules match
    """
    dream_lower = dream_text.lower()

    # 감정 키워드 감지
    emotion_hints = []
    if any(w in dream_lower for w in ['무섭', '두렵', 'scary', 'fear', 'afraid', '공포']):
        emotion_hints.append("꿈에서 느낀 두려움은 현실에서 회피하고 있는 문제나 불안을 반영할 수 있습니다.")
    if any(w in dream_lower for w in ['행복', '기쁨', 'happy', 'joy', '좋은', 'good']):
        emotion_hints.append("긍정적인 감정의 꿈은 현재 삶에서 만족감이나 희망을 나타냅니다.")
    if any(w in dream_lower for w in ['슬프', '울', 'sad', 'cry', '눈물']):
        emotion_hints.append("슬픔이나 눈물의 꿈은 해소되지 않은 감정이나 상실감을 처리하는 과정일 수 있습니다.")
    if any(w in dream_lower for w in ['화나', '분노', 'angry', 'rage', '짜증']):
        emotion_hints.append("분노의 꿈은 억눌린 좌절감이나 표현하지 못한 감정을 나타낼 수 있습니다.")

    # 상황 키워드 감지
    situation_hints = []
    if any(w in dream_lower for w in ['집', 'house', 'home', '방']):
        situation_hints.append("꿈에서 집은 자아(Self)를 상징합니다. 집의 상태가 현재 심리 상태를 반영합니다.")
    if any(w in dream_lower for w in ['사람', '친구', '가족', 'people', 'friend', 'family']):
        situation_hints.append("꿈에 등장하는 사람들은 그 관계에 대한 무의식적 생각이나 자신의 일부를 투영한 것일 수 있습니다.")
    if any(w in dream_lower for w in ['길', '도로', 'road', 'path', '여행']):
        situation_hints.append("길이나 여행의 꿈은 인생의 방향성과 선택에 대한 고민을 나타낼 수 있습니다.")

    # 기본 해석 가이드라인
    base_interpretations = [
        "꿈은 무의식이 의식에 보내는 메시지입니다. 융(Jung)에 따르면 꿈은 심리적 균형을 위한 보상 기능을 합니다.",
        "꿈의 해석에서 가장 중요한 것은 꿈꾼 사람 자신의 연상입니다. 꿈의 상징이 당신에게 어떤 의미인지 생각해보세요.",
        "반복되는 꿈은 특히 주목할 가치가 있습니다. 무의식이 계속해서 전달하려는 메시지가 있을 수 있습니다."
    ]

    # 한국 전통 해몽 기본
    korean_base = [
        "한국 해몽에서는 꿈을 길몽(좋은 꿈)과 흉몽(나쁜 꿈)으로 나누지만, 표면적 의미와 반대인 경우도 많습니다.",
        "전통 해몽에서 꿈은 미래의 징조로 해석되기도 하며, 특히 새벽꿈이 가장 영험하다고 합니다."
    ]

    return base_interpretations + emotion_hints + situation_hints + korean_base


def create_cache_key(facts: dict) -> str:
    """Create a cache key from dream facts."""
    # Include only relevant fields for caching
    cache_data = {
        "dream": facts.get("dream", ""),
        "symbols": sorted(facts.get("symbols", [])),
        "emotions": sorted(facts.get("emotions", [])),
        "themes": sorted(facts.get("themes", [])),
        "locale": facts.get("locale", "en"),
    }
    serialized = json.dumps(cache_data, sort_keys=True)
    return f"dream:{hashlib.sha256(serialized.encode()).hexdigest()[:16]}"


def build_system_instruction() -> str:
    """Build the system instruction for dream interpretation."""
    return """당신은 꿈 해석 전문가입니다. 반드시 JSON으로만 응답하세요.

🚫 절대 금지:
- "좋은 꿈이에요" "조심하세요" 같은 뜬구름 말
- 일반론적 해석 (모든 꿈에 적용되는 말)
- 데이터 없이 추측

✅ 올바른 답변:
- 위 프롬프트에서 제공된 DATA(사주 운세, 천체 배치, 문화별 상징 등)를 반드시 인용
- 구체적 시기/숫자/색상 언급 (예: "3월", "파란색", "숫자 7")
- "왜 지금 이 꿈을 꾸었는지" 사주/점성 데이터로 설명

예시:
❌ 나쁜 답: "뱀 꿈은 변화를 의미합니다."
✅ 좋은 답: "현재 을해(乙亥) 대운에서 수(水) 기운이 강해 무의식이 활성화되어 뱀 꿈을 꾸셨어요. 특히 오늘 일진이 갑자(甲子)로 목생수(木生水) 관계라 물과 관련된 상징(뱀, 용)이 나타나기 쉬운 날입니다. 달이 전갈자리에 있어 깊은 변환의 에너지가 꿈에 반영되었습니다."

summary는 반드시 7-10문장, 400자 이상으로 작성하세요."""


def parse_json_response(response_text: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""
    # Try to extract JSON from markdown code blocks
    if "```json" in response_text:
        json_start = response_text.find("```json") + 7
        json_end = response_text.find("```", json_start)
        response_text = response_text[json_start:json_end].strip()
    elif "```" in response_text:
        json_start = response_text.find("```") + 3
        json_end = response_text.find("```", json_start)
        response_text = response_text[json_start:json_end].strip()

    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        # If JSON parsing fails, return raw text
        return {
            "summary": response_text[:500],
            "dreamSymbols": [],
            "themes": [],
            "raw_response": response_text
        }
