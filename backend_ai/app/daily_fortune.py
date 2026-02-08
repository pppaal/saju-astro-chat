# backend_ai/app/daily_fortune.py
"""
Daily Fortune Service - 실시간 일일 운세
==========================================
매일 자동 업데이트되는 운세 정보 제공

Features:
1. 실시간 행성 트랜짓 (Swiss Ephemeris)
2. 사주 일진(日辰) 계산
3. 달의 위상
4. 개인 맞춤 운세 (출생정보 기반)
5. Redis 캐싱 (일 단위)
"""

import hashlib
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from functools import lru_cache

logger = logging.getLogger(__name__)

# Timezone
try:
    from zoneinfo import ZoneInfo
    KST = ZoneInfo("Asia/Seoul")
except ImportError:
    from datetime import timezone as tz
    KST = tz(timedelta(hours=9))


# ===============================================================
# 천간지지 Constants
# ===============================================================
CHEONGAN = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
CHEONGAN_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
JIJI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]
JIJI_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

# 오행 매핑
OHAENG_MAP = {
    "갑": "목", "을": "목",
    "병": "화", "정": "화",
    "무": "토", "기": "토",
    "경": "금", "신": "금",
    "임": "수", "계": "수",
    "자": "수", "축": "토", "인": "목", "묘": "목",
    "진": "토", "사": "화", "오": "화", "미": "토",
    "신": "금", "유": "금", "술": "토", "해": "수"
}

OHAENG_EMOJI = {"목": "🌳", "화": "🔥", "토": "🏔️", "금": "⚙️", "수": "💧"}

# 십성(십신) 관계
SIPSUNG_RELATIONS = {
    ("목", "목"): "비겁",
    ("목", "화"): "식상",
    ("목", "토"): "재성",
    ("목", "금"): "관성",
    ("목", "수"): "인성",
    ("화", "화"): "비겁",
    ("화", "토"): "식상",
    ("화", "금"): "재성",
    ("화", "수"): "관성",
    ("화", "목"): "인성",
    ("토", "토"): "비겁",
    ("토", "금"): "식상",
    ("토", "수"): "재성",
    ("토", "목"): "관성",
    ("토", "화"): "인성",
    ("금", "금"): "비겁",
    ("금", "수"): "식상",
    ("금", "목"): "재성",
    ("금", "화"): "관성",
    ("금", "토"): "인성",
    ("수", "수"): "비겁",
    ("수", "목"): "식상",
    ("수", "화"): "재성",
    ("수", "토"): "관성",
    ("수", "금"): "인성",
}

SIPSUNG_MEANING = {
    "비겁": {"name": "비견/겁재", "theme": "자아, 경쟁, 독립", "emoji": "⚔️"},
    "식상": {"name": "식신/상관", "theme": "표현, 창작, 재능", "emoji": "🎨"},
    "재성": {"name": "정재/편재", "theme": "재물, 현실, 실용", "emoji": "💰"},
    "관성": {"name": "정관/편관", "theme": "책임, 명예, 직장", "emoji": "👔"},
    "인성": {"name": "정인/편인", "theme": "학습, 지혜, 보호", "emoji": "📚"},
}


# ===============================================================
# 일진 계산
# ===============================================================
def calculate_iljin(date: datetime = None) -> Dict:
    """
    오늘의 일진(日辰) 계산

    기준일: 2000년 1월 1일 = 갑진(甲辰)일
    """
    if date is None:
        date = datetime.now(KST)

    # 기준일 설정 (2000-01-01 = 갑진일, 천간 index=0, 지지 index=4)
    base_date = datetime(2000, 1, 1)
    if hasattr(date, 'tzinfo') and date.tzinfo:
        date = date.replace(tzinfo=None)

    days_diff = (date - base_date).days

    # 천간: 10일 주기, 기준일은 갑(0)
    cheongan_idx = days_diff % 10
    # 지지: 12일 주기, 기준일은 진(4)
    jiji_idx = (days_diff + 4) % 12

    cheongan = CHEONGAN[cheongan_idx]
    jiji = JIJI[jiji_idx]

    # 오행
    cheongan_ohaeng = OHAENG_MAP[cheongan]
    jiji_ohaeng = OHAENG_MAP[jiji]

    # 60갑자 순서 (1-60)
    ganji_idx = (days_diff % 60) + 1

    return {
        "date": date.strftime("%Y-%m-%d"),
        "weekday": ["월", "화", "수", "목", "금", "토", "일"][date.weekday()],
        "cheongan": cheongan,
        "cheongan_hanja": CHEONGAN_HANJA[cheongan_idx],
        "jiji": jiji,
        "jiji_hanja": JIJI_HANJA[jiji_idx],
        "ganji": f"{cheongan}{jiji}",
        "ganji_hanja": f"{CHEONGAN_HANJA[cheongan_idx]}{JIJI_HANJA[jiji_idx]}",
        "cheongan_ohaeng": cheongan_ohaeng,
        "jiji_ohaeng": jiji_ohaeng,
        "ohaeng_emoji": f"{OHAENG_EMOJI[cheongan_ohaeng]}{OHAENG_EMOJI[jiji_ohaeng]}",
        "ganji_order": ganji_idx,
    }


def get_iljin_sipsung(iljin: Dict, ilgan: str) -> Dict:
    """
    일진과 사용자 일간의 십성 관계 계산

    Args:
        iljin: 오늘의 일진 정보
        ilgan: 사용자의 일간 (예: "갑", "을", ...)
    """
    if not ilgan or ilgan not in CHEONGAN:
        return {"sipsung": None, "meaning": None}

    user_ohaeng = OHAENG_MAP[ilgan]
    day_ohaeng = iljin["cheongan_ohaeng"]

    relation = SIPSUNG_RELATIONS.get((user_ohaeng, day_ohaeng), "비겁")
    meaning = SIPSUNG_MEANING.get(relation, {})

    return {
        "sipsung": relation,
        "sipsung_name": meaning.get("name", relation),
        "theme": meaning.get("theme", ""),
        "emoji": meaning.get("emoji", ""),
        "description": _get_sipsung_daily_advice(relation),
    }


def _get_sipsung_daily_advice(sipsung: str) -> str:
    """십성별 일일 조언"""
    advices = {
        "비겁": "오늘은 자아 에너지가 강한 날입니다. 독립적인 활동에 적합하며, 협력보다는 개인 프로젝트에 집중하세요. 경쟁 상황에서 유리할 수 있습니다.",
        "식상": "창의력과 표현력이 좋아지는 날입니다. 아이디어를 발표하거나 예술 활동에 좋습니다. 말실수에는 주의하세요.",
        "재성": "재물과 현실적인 일에 유리한 날입니다. 쇼핑, 투자, 계약 등 실질적인 활동에 좋습니다. 과소비는 조심하세요.",
        "관성": "책임감과 규율이 강조되는 날입니다. 직장이나 공식적인 일에 유리합니다. 권위자와의 관계에 신경 쓰세요.",
        "인성": "학습과 자기 계발에 좋은 날입니다. 새로운 것을 배우거나 독서, 명상에 적합합니다. 조언자의 말에 귀 기울이세요.",
    }
    return advices.get(sipsung, "")


# ===============================================================
# 트랜짓 통합
# ===============================================================
def get_realtime_transits() -> Dict:
    """실시간 행성 트랜짓 가져오기"""
    try:
        # Try relative import first, then absolute
        try:
            from .realtime_astro import get_current_transits, get_transit_interpretation
        except ImportError:
            from backend_ai.app.realtime_astro import get_current_transits, get_transit_interpretation
        transits = get_current_transits()
        interpretation_ko = get_transit_interpretation(transits, "ko")
        return {
            "success": True,
            "data": transits,
            "interpretation": interpretation_ko,
        }
    except Exception as e:
        logger.warning(f"[DailyFortune] Transit fetch failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "data": {},
            "interpretation": "",
        }


def get_transit_rag_interpretation(transits: Dict) -> List[Dict]:
    """
    RAG 데이터베이스에서 트랜짓 해석 검색

    Args:
        transits: 현재 트랜짓 정보

    Returns:
        관련 해석 목록
    """
    interpretations = []

    try:
        try:
            from .saju_astro_rag import search_graphs
        except ImportError:
            from backend_ai.app.saju_astro_rag import search_graphs
    except ImportError:
        logger.warning("[DailyFortune] RAG not available")
        return interpretations

    if not transits.get("success"):
        return interpretations

    data = transits.get("data", {})

    # 1. 달의 위상 검색
    moon = data.get("moon", {})
    if moon:
        phase = moon.get("phase_name", "")
        if phase:
            query = f"moon phase {phase} 달 위상 {moon.get('phase_ko', '')}"
            results = search_graphs(query, top_k=2)
            for r in results:
                if r.get("score", 0) > 0.3:
                    interpretations.append({
                        "type": "moon_phase",
                        "source": "rag",
                        "content": r.get("description", "")[:300],
                        "score": r.get("score", 0),
                    })

    # 2. 역행 행성 검색
    retrogrades = data.get("retrogrades", [])
    for planet in retrogrades[:2]:  # 상위 2개만
        query = f"{planet} retrograde 역행 {_planet_ko(planet)}"
        results = search_graphs(query, top_k=2)
        for r in results:
            if r.get("score", 0) > 0.3:
                interpretations.append({
                    "type": "retrograde",
                    "planet": planet,
                    "source": "rag",
                    "content": r.get("description", "")[:300],
                    "score": r.get("score", 0),
                })

    # 3. 주요 상호작용 검색
    aspects = data.get("aspects", [])
    for aspect in aspects[:3]:  # 상위 3개만
        p1 = aspect.get("planet1", "")
        p2 = aspect.get("planet2", "")
        asp_type = aspect.get("aspect", "")

        query = f"{p1} {asp_type} {p2} transit"
        results = search_graphs(query, top_k=1)
        for r in results:
            if r.get("score", 0) > 0.35:
                interpretations.append({
                    "type": "aspect",
                    "aspect": f"{p1} {asp_type} {p2}",
                    "source": "rag",
                    "content": r.get("description", "")[:300],
                    "score": r.get("score", 0),
                })

    # 점수순 정렬
    interpretations.sort(key=lambda x: x.get("score", 0), reverse=True)

    return interpretations[:5]  # 상위 5개


def _planet_ko(planet: str) -> str:
    """행성 이름 한글 변환"""
    mapping = {
        "Sun": "태양", "Moon": "달", "Mercury": "수성",
        "Venus": "금성", "Mars": "화성", "Jupiter": "목성",
        "Saturn": "토성", "Uranus": "천왕성", "Neptune": "해왕성",
        "Pluto": "명왕성", "North Node": "북교점",
    }
    return mapping.get(planet, planet)


# ===============================================================
# 특별한 날 체크
# ===============================================================
def check_special_days(date: datetime, iljin: Dict) -> List[Dict]:
    """특별한 날 체크 (길일, 흉일 등)"""
    specials = []

    ganji = iljin["ganji"]
    day = date.day
    weekday = date.weekday()

    # 황도길일 (대략적인 기준)
    hwangdo_days = {1, 7, 13, 15, 21, 27}
    if day in hwangdo_days:
        specials.append({
            "type": "auspicious",
            "name": "황도길일",
            "description": "만사형통, 좋은 일을 시작하기 좋은 날",
            "emoji": "🌟"
        })

    # 삼재일 체크 (간단 버전)
    heuk_days = {4, 14, 24}
    if day in heuk_days:
        specials.append({
            "type": "caution",
            "name": "암흑일",
            "description": "중요한 결정은 신중하게",
            "emoji": "⚠️"
        })

    # 보름, 그믐 체크
    if day == 15:
        specials.append({
            "type": "lunar",
            "name": "보름",
            "description": "감정이 고조되는 시기, 완성과 수확의 에너지",
            "emoji": "🌕"
        })
    elif day == 1:
        specials.append({
            "type": "lunar",
            "name": "초하루",
            "description": "새로운 시작의 에너지",
            "emoji": "🌑"
        })

    # 특정 간지 (갑자일 = 60갑자 시작)
    if ganji == "갑자":
        specials.append({
            "type": "special",
            "name": "갑자일",
            "description": "60갑자의 시작, 새로운 주기의 시작",
            "emoji": "🔄"
        })

    return specials


# ===============================================================
# 일일 운세 종합
# ===============================================================
def get_daily_fortune(
    date: datetime = None,
    birth_data: Dict = None,
    include_transits: bool = True,
    locale: str = "ko"
) -> Dict:
    """
    일일 운세 종합 정보 생성

    Args:
        date: 대상 날짜 (기본: 오늘)
        birth_data: 사용자 출생 정보 (선택)
            - ilgan: 일간 (예: "갑")
            - natal_sun_sign: 태양 별자리
        include_transits: 트랜짓 정보 포함 여부
        locale: 언어 (ko/en)

    Returns:
        일일 운세 종합 정보
    """
    if date is None:
        date = datetime.now(KST)

    # 1. 일진 계산
    iljin = calculate_iljin(date)

    # 2. 개인 십성 관계 (출생정보 있는 경우)
    personal_sipsung = None
    if birth_data and birth_data.get("ilgan"):
        personal_sipsung = get_iljin_sipsung(iljin, birth_data["ilgan"])

    # 3. 특별한 날 체크
    special_days = check_special_days(date, iljin)

    # 4. 트랜짓 정보
    transit_info = None
    rag_interpretations = []
    if include_transits:
        transit_info = get_realtime_transits()
        # RAG 기반 트랜짓 해석 추가
        if transit_info.get("success"):
            rag_interpretations = get_transit_rag_interpretation(transit_info)

    # 5. 종합 점수 계산 (0-100)
    score = _calculate_daily_score(iljin, personal_sipsung, special_days, transit_info)

    # 6. 일일 조언 생성
    advice = _generate_daily_advice(iljin, personal_sipsung, special_days, transit_info, locale)

    result = {
        "date": iljin["date"],
        "weekday": iljin["weekday"],
        "iljin": iljin,
        "special_days": special_days,
        "overall_score": score,
        "advice": advice,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    if personal_sipsung:
        result["personal_sipsung"] = personal_sipsung

    if transit_info and transit_info.get("success"):
        result["transits"] = {
            "moon": transit_info["data"].get("moon", {}),
            "retrogrades": transit_info["data"].get("retrogrades", []),
            "key_aspects": transit_info["data"].get("aspects", [])[:5],
            "interpretation": transit_info.get("interpretation", ""),
            "rag_insights": rag_interpretations,  # RAG 기반 심층 해석
        }

    return result


def _calculate_daily_score(
    iljin: Dict,
    personal_sipsung: Optional[Dict],
    special_days: List[Dict],
    transit_info: Optional[Dict]
) -> int:
    """일일 종합 점수 계산"""
    base_score = 60  # 기본 점수

    # 특별한 날 보정
    for special in special_days:
        if special["type"] == "auspicious":
            base_score += 15
        elif special["type"] == "caution":
            base_score -= 10
        elif special["type"] == "lunar" and "보름" in special["name"]:
            base_score += 5

    # 개인 십성 보정
    if personal_sipsung:
        sipsung = personal_sipsung.get("sipsung", "")
        sipsung_scores = {
            "비겁": 0,   # 중립
            "식상": 5,   # 약간 긍정
            "재성": 10,  # 긍정
            "관성": -5,  # 약간 부정 (압박)
            "인성": 8,   # 긍정
        }
        base_score += sipsung_scores.get(sipsung, 0)

    # 트랜짓 보정
    if transit_info and transit_info.get("success"):
        retros = transit_info["data"].get("retrogrades", [])
        if "Mercury" in retros:
            base_score -= 8  # 수성 역행
        if "Venus" in retros:
            base_score -= 5  # 금성 역행

        moon = transit_info["data"].get("moon", {})
        if moon.get("phase_name") == "Full Moon":
            base_score += 5

    # 범위 제한
    return max(20, min(95, base_score))


def _generate_daily_advice(
    iljin: Dict,
    personal_sipsung: Optional[Dict],
    special_days: List[Dict],
    transit_info: Optional[Dict],
    locale: str
) -> Dict:
    """일일 조언 생성"""

    # 기본 조언
    ganji = iljin["ganji"]
    ohaeng = iljin["cheongan_ohaeng"]

    ohaeng_advice = {
        "목": "성장과 시작의 에너지가 강합니다. 새로운 프로젝트를 시작하기 좋습니다.",
        "화": "열정과 활력이 넘칩니다. 적극적인 활동에 유리합니다.",
        "토": "안정과 균형의 에너지입니다. 중재나 조율에 좋습니다.",
        "금": "결단과 정리의 에너지입니다. 마무리 작업에 적합합니다.",
        "수": "지혜와 소통의 에너지입니다. 학습이나 대화에 좋습니다.",
    }

    main_advice = ohaeng_advice.get(ohaeng, "오늘도 좋은 하루 되세요.")

    # 개인 맞춤 조언
    personal_advice = ""
    if personal_sipsung:
        personal_advice = personal_sipsung.get("description", "")

    # 특별한 날 조언
    special_advice = ""
    for special in special_days:
        special_advice += f"{special['emoji']} {special['name']}: {special['description']}\n"

    # 트랜짓 조언
    transit_advice = ""
    if transit_info and transit_info.get("success"):
        moon = transit_info["data"].get("moon", {})
        if moon:
            transit_advice = f"{moon.get('emoji', '')} {moon.get('phase_ko', '')}"

        retros = transit_info["data"].get("retrogrades", [])
        if retros:
            transit_advice += f" | 역행 중: {', '.join(retros)}"

    return {
        "main": main_advice,
        "personal": personal_advice,
        "special": special_advice.strip(),
        "transit": transit_advice,
        "summary": _create_summary(iljin, personal_sipsung, special_days),
    }


def _create_summary(iljin: Dict, personal_sipsung: Optional[Dict], special_days: List[Dict]) -> str:
    """한 줄 요약 생성"""
    ganji = iljin["ganji_hanja"]
    ohaeng_emoji = iljin["ohaeng_emoji"]

    summary = f"{iljin['weekday']}요일 {ganji}일 {ohaeng_emoji}"

    if personal_sipsung:
        summary += f" | {personal_sipsung['emoji']} {personal_sipsung['sipsung_name']}"

    for special in special_days:
        if special["type"] == "auspicious":
            summary += f" | {special['emoji']} {special['name']}"

    return summary


# ===============================================================
# API 캐싱 래퍼
# ===============================================================
def get_cached_daily_fortune(
    date: datetime = None,
    birth_data: Dict = None,
    include_transits: bool = True,
    locale: str = "ko"
) -> Dict:
    """Redis 캐싱이 적용된 일일 운세"""
    try:
        try:
            from .redis_cache import get_cache
        except ImportError:
            from backend_ai.app.redis_cache import get_cache
        cache = get_cache()

        if date is None:
            date = datetime.now(KST)

        # 캐시 키 생성
        date_str = date.strftime("%Y-%m-%d")
        birth_hash = ""
        if birth_data:
            birth_hash = hashlib.md5(json.dumps(birth_data, sort_keys=True).encode()).hexdigest()[:8]

        cache_key = f"daily_fortune:{date_str}:{birth_hash}:{locale}"

        # 캐시 확인
        cached = cache.get(cache_key)
        if cached:
            logger.debug(f"[DailyFortune] Cache hit: {cache_key}")
            return cached

        # 새로 계산
        result = get_daily_fortune(date, birth_data, include_transits, locale)

        # 캐싱 (1시간)
        cache.set(cache_key, result, ttl=3600)

        return result

    except Exception as e:
        logger.warning(f"[DailyFortune] Cache error, falling back: {e}")
        return get_daily_fortune(date, birth_data, include_transits, locale)


# ===============================================================
# 주간/월간 운세
# ===============================================================
def get_weekly_fortune(start_date: datetime = None, birth_data: Dict = None) -> List[Dict]:
    """주간 운세 (7일)"""
    if start_date is None:
        start_date = datetime.now(KST)

    fortunes = []
    for i in range(7):
        day = start_date + timedelta(days=i)
        fortune = get_daily_fortune(day, birth_data, include_transits=(i == 0))  # 첫날만 트랜짓
        fortunes.append({
            "date": fortune["date"],
            "weekday": fortune["weekday"],
            "iljin": fortune["iljin"]["ganji_hanja"],
            "score": fortune["overall_score"],
            "summary": fortune["advice"]["summary"],
        })

    return fortunes


def get_monthly_fortune_overview(year: int, month: int, birth_data: Dict = None) -> Dict:
    """월간 운세 개요"""
    import calendar

    _, days_in_month = calendar.monthrange(year, month)
    start_date = datetime(year, month, 1)

    daily_scores = []
    best_days = []
    caution_days = []

    for day in range(1, days_in_month + 1):
        date = datetime(year, month, day)
        iljin = calculate_iljin(date)
        special = check_special_days(date, iljin)

        # 간단한 점수 계산
        score = 60
        for s in special:
            if s["type"] == "auspicious":
                score += 15
                best_days.append({"date": date.strftime("%Y-%m-%d"), "reason": s["name"]})
            elif s["type"] == "caution":
                score -= 10
                caution_days.append({"date": date.strftime("%Y-%m-%d"), "reason": s["name"]})

        daily_scores.append(score)

    return {
        "year": year,
        "month": month,
        "average_score": round(sum(daily_scores) / len(daily_scores), 1),
        "best_days": best_days[:5],
        "caution_days": caution_days[:5],
        "days_count": days_in_month,
    }


# ===============================================================
# 테스트
# ===============================================================
if __name__ == "__main__":
    print("=== Daily Fortune Test ===\n")

    # 오늘 일진
    iljin = calculate_iljin()
    print(f"오늘의 일진: {iljin['ganji']} ({iljin['ganji_hanja']})")
    print(f"오행: {iljin['ohaeng_emoji']}")
    print(f"60갑자 순서: {iljin['ganji_order']}/60")

    # 개인 맞춤 (예: 갑목 일간)
    print("\n--- 갑목 일간 기준 ---")
    sipsung = get_iljin_sipsung(iljin, "갑")
    print(f"오늘의 십성: {sipsung['sipsung_name']}")
    print(f"테마: {sipsung['theme']}")
    print(f"조언: {sipsung['description']}")

    # 종합 운세
    print("\n--- 종합 일일 운세 ---")
    fortune = get_daily_fortune(birth_data={"ilgan": "갑"})
    print(f"날짜: {fortune['date']} ({fortune['weekday']})")
    print(f"종합 점수: {fortune['overall_score']}/100")
    print(f"요약: {fortune['advice']['summary']}")

    if fortune.get("transits"):
        print(f"\n달의 위상: {fortune['transits']['moon'].get('phase_ko', 'N/A')}")
        if fortune['transits']['retrogrades']:
            print(f"역행 중: {', '.join(fortune['transits']['retrogrades'])}")
