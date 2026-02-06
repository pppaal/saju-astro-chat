"""
Fortune Score Routes
실시간 통합 운세 점수 계산 (사주 + 점성학).
Extracted from app.py for better maintainability.
"""
import logging
import time
from datetime import datetime
from flask import Blueprint, request, jsonify, g

logger = logging.getLogger(__name__)

# Blueprint definition
fortune_bp = Blueprint('fortune', __name__, url_prefix='/api/fortune')

# ===============================================================
# Lazy-loaded dependencies
# ===============================================================
_fortune_module = None
_realtime_module = None
HAS_FORTUNE_SCORE = True
HAS_REALTIME = True


def _get_fortune_module():
    """Lazy load fortune_score_engine module."""
    global _fortune_module, HAS_FORTUNE_SCORE
    if _fortune_module is None:
        try:
            from backend_ai.app.fortune_score_engine import (
                calculate_fortune_score as _calc_score,
                get_fortune_score_engine as _get_engine
            )
            # Create a simple namespace to hold the functions
            _fortune_module = type('FortuneModule', (), {
                'calculate_fortune_score': staticmethod(_calc_score),
                'get_fortune_score_engine': staticmethod(_get_engine)
            })()
        except ImportError as e:
            logger.warning(f"[Fortune] Could not import fortune_score_engine: {e}")
            HAS_FORTUNE_SCORE = False
            return None
    return _fortune_module


def _get_realtime_module():
    """Lazy load realtime_astro module."""
    global _realtime_module, HAS_REALTIME
    if _realtime_module is None:
        try:
            from backend_ai.app import realtime_astro as _ra
            _realtime_module = _ra
        except ImportError as e:
            logger.warning(f"[Fortune] Could not import realtime_astro: {e}")
            HAS_REALTIME = False
            return None
    return _realtime_module


def calculate_fortune_score(saju_data, astro_data):
    """Calculate fortune score."""
    mod = _get_fortune_module()
    if mod is None:
        raise RuntimeError("Fortune score module not available")
    return mod.calculate_fortune_score(saju_data, astro_data)


def get_fortune_score_engine():
    """Get fortune score engine instance."""
    mod = _get_fortune_module()
    if mod is None:
        raise RuntimeError("Fortune score module not available")
    return mod.get_fortune_score_engine()


def get_current_transits():
    """Get current transits from realtime astro."""
    mod = _get_realtime_module()
    if mod is None:
        return {}
    return mod.get_current_transits()


# ===============================================================
# HELPER FUNCTIONS
# ===============================================================

def _calculate_simple_saju(birth_date: str, birth_time: str = "12:00") -> dict:
    """
    생년월일시로 기본 사주 데이터 계산 (만세력 간이 버전)
    """
    from datetime import datetime as dt_module

    # 천간/지지 데이터
    STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
    BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
    STEM_ELEMENTS = {"甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
                     "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水"}
    BRANCH_ELEMENTS = {"子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土", "巳": "火",
                       "午": "火", "未": "土", "申": "金", "酉": "金", "戌": "土", "亥": "水"}

    # 십신 계산 헬퍼
    def get_sibsin(day_stem: str, target_stem: str) -> str:
        dm_idx = STEMS.index(day_stem)
        t_idx = STEMS.index(target_stem)
        diff = (t_idx - dm_idx) % 10
        sibsin_map = {0: "비견", 1: "겁재", 2: "식신", 3: "상관", 4: "편재",
                      5: "정재", 6: "편관", 7: "정관", 8: "편인", 9: "정인"}
        return sibsin_map.get(diff, "비견")

    try:
        # Parse birth date
        bd = dt_module.strptime(birth_date, "%Y-%m-%d")
        year, month, day = bd.year, bd.month, bd.day

        # Parse birth time
        hour = 12
        if birth_time:
            try:
                hour = int(birth_time.split(":")[0])
            except (ValueError, IndexError, AttributeError):
                hour = 12

        # 년주 계산 (1984=甲子 기준)
        year_offset = (year - 1984) % 60
        year_stem = STEMS[year_offset % 10]
        year_branch = BRANCHES[year_offset % 12]

        # 월주 계산 (간략화 - 실제로는 절기 고려 필요)
        month_branch_idx = (month + 1) % 12  # 寅월(1월)부터 시작
        month_branch = BRANCHES[month_branch_idx]
        # 월간 계산 (년간 기준)
        year_stem_idx = STEMS.index(year_stem)
        month_stem_idx = (year_stem_idx * 2 + month) % 10
        month_stem = STEMS[month_stem_idx]

        # 일주 계산 (JDN 기반)
        a = (14 - month) // 12
        y = year + 4800 - a
        m = month + 12 * a - 3
        jdn = day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
        day_offset = (jdn - 11) % 60  # 甲子일 보정
        day_stem = STEMS[day_offset % 10]
        day_branch = BRANCHES[day_offset % 12]

        # 시주 계산
        hour_branch_idx = ((hour + 1) // 2) % 12
        hour_branch = BRANCHES[hour_branch_idx]
        day_stem_idx = STEMS.index(day_stem)
        hour_stem_idx = (day_stem_idx * 2 + hour_branch_idx) % 10
        hour_stem = STEMS[hour_stem_idx]

        # 일간 (day master)
        dm_element = STEM_ELEMENTS[day_stem]

        # 십신 분포 계산
        sibsin_dist = {}
        for stem in [year_stem, month_stem, hour_stem]:
            s = get_sibsin(day_stem, stem)
            sibsin_dist[s] = sibsin_dist.get(s, 0) + 1

        # 오늘 일진 계산
        today = dt_module.now()
        today_jdn = today.day + (153 * ((today.month + 12 * ((14 - today.month) // 12) - 3)) + 2) // 5 + \
                    365 * (today.year + 4800 - ((14 - today.month) // 12)) + \
                    (today.year + 4800 - ((14 - today.month) // 12)) // 4 - \
                    (today.year + 4800 - ((14 - today.month) // 12)) // 100 + \
                    (today.year + 4800 - ((14 - today.month) // 12)) // 400 - 32045
        today_offset = (today_jdn - 11) % 60
        today_stem = STEMS[today_offset % 10]
        today_branch = BRANCHES[today_offset % 12]
        today_element = STEM_ELEMENTS[today_stem]

        # 형충회합 간이 계산
        CHONG_PAIRS = [("子", "午"), ("丑", "未"), ("寅", "申"), ("卯", "酉"), ("辰", "戌"), ("巳", "亥")]
        HAP_PAIRS = [("子", "丑"), ("寅", "亥"), ("卯", "戌"), ("辰", "酉"), ("巳", "申"), ("午", "未")]

        natal_branches = [year_branch, month_branch, day_branch, hour_branch]
        chung_list = []
        hap_list = []
        for b in natal_branches:
            if (b, today_branch) in CHONG_PAIRS or (today_branch, b) in CHONG_PAIRS:
                chung_list.append(f"{b}-{today_branch}")
            if (b, today_branch) in HAP_PAIRS or (today_branch, b) in HAP_PAIRS:
                hap_list.append(f"{b}-{today_branch}")

        return {
            "dayMaster": {"name": day_stem, "element": dm_element},
            "pillars": {
                "year": year_stem + year_branch,
                "month": month_stem + month_branch,
                "day": day_stem + day_branch,
                "time": hour_stem + hour_branch,
            },
            "unse": {
                "iljin": [{"gan": today_stem, "ji": today_branch, "element": today_element}],
                "monthly": [{"element": STEM_ELEMENTS.get(month_stem, "土")}],
                "annual": [{"element": STEM_ELEMENTS.get(year_stem, "土")}],
            },
            "advancedAnalysis": {
                "sibsin": {"distribution": sibsin_dist},
                "hyeongchung": {"chung": chung_list, "hap": hap_list},
                "yongsin": {"primary": {"element": dm_element}},  # 간이 용신
                "geokguk": {"grade": "중"},
            },
        }
    except Exception as e:
        logger.warning(f"[SimpleSaju] Calculation error: {e}")
        # Fallback minimal data
        return {
            "dayMaster": {"name": "甲", "element": "木"},
            "pillars": {"year": "甲子", "month": "甲寅", "day": "甲午", "time": "甲子"},
            "unse": {"iljin": [{"element": "木"}], "monthly": [{"element": "木"}], "annual": [{"element": "木"}]},
            "advancedAnalysis": {
                "sibsin": {"distribution": {}},
                "hyeongchung": {"chung": [], "hap": []},
            },
        }


# ===============================================================
# ROUTE HANDLERS
# ===============================================================

@fortune_bp.route('/score', methods=['POST'])
def fortune_score():
    """
    실시간 통합 운세 점수 계산.
    사주 + 점성학 모든 데이터를 교차 분석하여 0-100 점수 산출.
    """
    if not HAS_FORTUNE_SCORE:
        return jsonify({"status": "error", "message": "Fortune score engine not available"}), 501

    try:
        data = request.get_json(force=True)
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})

        if not saju_data and not astro_data:
            return jsonify({
                "status": "error",
                "message": "At least one of saju or astro data is required"
            }), 400

        start_time = time.time()
        score_result = calculate_fortune_score(saju_data, astro_data)
        elapsed = time.time() - start_time

        request_id = getattr(g, 'request_id', 'unknown')
        logger.info(f"[FORTUNE] id={request_id} Score calculated: {score_result['total']}/100 in {elapsed:.3f}s")

        return jsonify({
            "status": "success",
            "score": score_result,
            "timestamp": datetime.utcnow().isoformat(),
            "processing_time_ms": round(elapsed * 1000, 2)
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/fortune/score failed: {e}")
        return jsonify({"status": "error", "message": "서버 처리 중 오류가 발생했습니다."}), 500


@fortune_bp.route('/score/breakdown', methods=['POST'])
def fortune_score_breakdown():
    """
    상세 점수 내역과 함께 점수 계산.
    각 항목별 가중치와 계산 로직을 포함.
    """
    if not HAS_FORTUNE_SCORE:
        return jsonify({"status": "error", "message": "Fortune score engine not available"}), 501

    try:
        data = request.get_json(force=True)
        saju_data = data.get("saju", {})
        astro_data = data.get("astro", {})

        engine = get_fortune_score_engine()
        breakdown = engine.calculate_score(saju_data, astro_data)

        # Add detailed breakdown info
        result = breakdown.to_dict()
        result["weights"] = {
            "saju_max": 50,
            "astro_max": 50,
            "cross_bonus_range": [-10, 10],
            "components": {
                "saju": {
                    "iljin": {"max": 12, "desc": "일진 궁합"},
                    "wolun": {"max": 10, "desc": "월운 흐름"},
                    "yongsin": {"max": 10, "desc": "용신 활성"},
                    "geokguk": {"max": 8, "desc": "격국 에너지"},
                    "sibsin": {"max": 5, "desc": "십신 균형"},
                    "hyeongchung": {"range": [-5, 5], "desc": "형충회합"},
                },
                "astro": {
                    "transit": {"range": [-10, 15], "desc": "주요 트랜짓"},
                    "moon": {"max": 10, "desc": "달 위상/사인"},
                    "planetary_hour": {"max": 8, "desc": "행성시"},
                    "voc": {"range": [-5, 0], "desc": "VOC 공허시간"},
                    "retrograde": {"range": [-5, 0], "desc": "역행 영향"},
                    "aspects": {"range": [-5, 10], "desc": "현재 aspects"},
                    "progression": {"max": 7, "desc": "progressions"},
                },
            },
        }

        return jsonify({
            "status": "success",
            "breakdown": result,
            "timestamp": datetime.utcnow().isoformat(),
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/fortune/score/breakdown failed: {e}")
        return jsonify({"status": "error", "message": "서버 처리 중 오류가 발생했습니다."}), 500


@fortune_bp.route('/daily', methods=['POST'])
def fortune_daily():
    """
    일일 운세 점수 (간단한 버전).
    생년월일만으로 빠르게 점수 계산.
    """
    if not HAS_FORTUNE_SCORE:
        return jsonify({"status": "error", "message": "Fortune score engine not available"}), 501

    try:
        data = request.get_json(force=True)
        birth_date = data.get("birthDate")  # YYYY-MM-DD
        birth_time = data.get("birthTime")  # HH:MM (optional)

        if not birth_date:
            return jsonify({"status": "error", "message": "birthDate is required"}), 400

        # Calculate saju data from birth info (simplified backend calculation)
        saju_data = _calculate_simple_saju(birth_date, birth_time or "12:00")

        # Get REAL-TIME astrology data
        realtime_transits = get_current_transits()
        moon_data = realtime_transits.get("moon", {})
        retrogrades = realtime_transits.get("retrogrades", [])
        aspects = realtime_transits.get("aspects", [])
        planets = realtime_transits.get("planets", [])

        # Determine planetary hour from current hour
        from datetime import datetime as dt_module
        current_hour = dt_module.now().hour
        planetary_hours = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"]
        planetary_hour_ruler = planetary_hours[current_hour % 7]

        # Build astro_data with real values
        astro_data = {
            "planets": planets,
            "transits": [{"planet": a["planet1"], "aspect": a["aspect"], "natalPlanet": a["planet2"]} for a in aspects[:5]],
            "aspects": aspects,
            "electional": {
                "moonPhase": {"phase": moon_data.get("phase_name", "Unknown")},
                "planetaryHour": {"planet": planetary_hour_ruler},
                "voidOfCourse": {"isVoid": False},
                "retrograde": retrogrades,
            }
        }

        score_result = calculate_fortune_score(saju_data, astro_data)

        # Extract score breakdown
        saju_breakdown = score_result.get("saju", {})
        astro_breakdown = score_result.get("astro", {})
        total_score = score_result["total"]

        # =====================================================
        # 영역별 점수 계산 (사주 십신 + 오행 + 점성술 교차 분석)
        # =====================================================

        # Get day master and current unse elements
        day_master = saju_data.get("dayMaster", {})
        dm_element = day_master.get("element", "木") if isinstance(day_master, dict) else "木"

        # Get today's pillar element from unse
        unse = saju_data.get("unse", {})
        iljin = unse.get("iljin", [{}])
        today_element = iljin[0].get("element", "木") if iljin else "木"

        # Get sibsin distribution
        adv = saju_data.get("advancedAnalysis", {})
        sibsin = adv.get("sibsin", {})
        sibsin_dist = sibsin.get("distribution", {}) or sibsin.get("counts", {})

        # 영역별 관련 십성 및 오행 (사주 전통 이론 기반)
        AREA_CONFIG = {
            "love": {
                "boost_sibsin": ["정관", "정재", "식신"],
                "penalty_sibsin": ["편관", "상관"],
                "related_elements": ["火", "木"],
                "astro_boost": ["Venus", "Moon"],
            },
            "career": {
                "boost_sibsin": ["정관", "편관", "정인"],
                "penalty_sibsin": ["상관"],
                "related_elements": ["金", "土"],
                "astro_boost": ["Saturn", "Jupiter", "Sun"],
            },
            "wealth": {
                "boost_sibsin": ["정재", "편재", "식신"],
                "penalty_sibsin": ["겁재", "비견"],
                "related_elements": ["土", "金"],
                "astro_boost": ["Jupiter", "Venus"],
            },
            "health": {
                "boost_sibsin": ["정인", "비견"],
                "penalty_sibsin": ["편관", "상관"],
                "related_elements": ["木", "水"],
                "astro_boost": ["Moon", "Sun"],
            },
        }

        # 오행 상생상극 관계
        ELEMENT_GENERATING = {"木": "火", "火": "土", "土": "金", "金": "水", "水": "木"}
        ELEMENT_CONTROLLING = {"木": "土", "土": "水", "水": "火", "火": "金", "金": "木"}

        # 행성별 유리한/불리한 사인 (Dignity/Detriment)
        PLANET_DIGNITY = {
            "Venus": {"dignity": ["Taurus", "Libra"], "detriment": ["Scorpio", "Aries"]},
            "Mars": {"dignity": ["Aries", "Scorpio"], "detriment": ["Libra", "Taurus"]},
            "Jupiter": {"dignity": ["Sagittarius", "Pisces"], "detriment": ["Gemini", "Virgo"]},
            "Saturn": {"dignity": ["Capricorn", "Aquarius"], "detriment": ["Cancer", "Leo"]},
            "Mercury": {"dignity": ["Gemini", "Virgo"], "detriment": ["Sagittarius", "Pisces"]},
            "Sun": {"dignity": ["Leo"], "detriment": ["Aquarius"]},
            "Moon": {"dignity": ["Cancer"], "detriment": ["Capricorn"]},
        }

        ASPECT_SCORES = {
            "conjunction": 3, "trine": 4, "sextile": 2,
            "square": -3, "opposition": -2,
        }

        AREA_ASTRO_SIGNS = {
            "love": ["Libra", "Taurus", "Cancer", "Pisces"],
            "career": ["Capricorn", "Leo", "Aries", "Virgo"],
            "wealth": ["Taurus", "Scorpio", "Cancer", "Capricorn"],
            "health": ["Virgo", "Aries", "Scorpio", "Leo"],
        }

        def calc_area_score(area: str) -> int:
            config = AREA_CONFIG[area]
            score = 50  # 기본점수

            # ========== 사주 요소 (50%) ==========

            # 1. 십신 가산/감산 - 최대 ±15점
            for boost in config["boost_sibsin"]:
                if sibsin_dist.get(boost, 0) > 0:
                    score += 4 * min(sibsin_dist.get(boost, 0), 3)
            for penalty in config["penalty_sibsin"]:
                if sibsin_dist.get(penalty, 0) > 1:
                    score -= 3 * (sibsin_dist.get(penalty, 0) - 1)

            # 2. 오늘 운세 오행과 영역 관련 오행 매칭 - 최대 +12점
            if today_element in config["related_elements"]:
                score += 12

            # 3. 일간과 오늘 오행의 관계 - 최대 ±10점
            if today_element == dm_element:
                score += 4  # 비화
            elif ELEMENT_GENERATING.get(today_element) == dm_element:
                score += 10  # 생조
            elif ELEMENT_CONTROLLING.get(today_element) == dm_element:
                score -= 8  # 극입
            elif ELEMENT_GENERATING.get(dm_element) == today_element:
                score -= 4  # 설기

            # 4. 형충회합 - 최대 ±8점
            hc = adv.get("hyeongchung", {})
            if area == "love":
                score += len(hc.get("hap", [])) * 3
                score -= len(hc.get("chung", [])) * 4
            elif area == "career":
                score += len(hc.get("samhap", [])) * 2
                score -= len(hc.get("hyeong", [])) * 2

            # ========== 점성술 요소 (50%) ==========

            # 5. 관련 행성 상태 (순행/역행 + Dignity) - 최대 ±15점
            for planet in planets:
                planet_name = planet.get("name", "")
                planet_sign = planet.get("sign", "")

                if planet_name in config["astro_boost"]:
                    if not planet.get("retrograde"):
                        score += 3
                    else:
                        score -= 2

                    dignity_info = PLANET_DIGNITY.get(planet_name, {})
                    if planet_sign in dignity_info.get("dignity", []):
                        score += 5
                    elif planet_sign in dignity_info.get("detriment", []):
                        score -= 3

            # 6. 현재 행성이 영역 관련 사인에 있는지 - 최대 +10점
            area_signs = AREA_ASTRO_SIGNS.get(area, [])
            for planet in planets[:5]:
                if planet.get("sign") in area_signs:
                    score += 2

            # 7. 트랜짓 Aspects 분석 - 최대 ±12점
            for asp in aspects:
                p1 = asp.get("planet1", "")
                p2 = asp.get("planet2", "")
                asp_type = asp.get("aspect", "").lower()

                if p1 in config["astro_boost"] or p2 in config["astro_boost"]:
                    asp_score = ASPECT_SCORES.get(asp_type, 0)
                    score += asp_score

            # 8. 달 위상 - 최대 ±8점
            moon_phase = moon_data.get("phase_name", "")
            moon_scores = {
                "Full Moon": 8, "Waxing Gibbous": 5, "First Quarter": 3,
                "Waxing Crescent": 2, "New Moon": -3, "Waning Crescent": -2,
                "Last Quarter": 0, "Waning Gibbous": 1,
            }
            base_moon = moon_scores.get(moon_phase, 0)
            if area in ["love", "health"]:
                score += int(base_moon * 1.2)
            else:
                score += int(base_moon * 0.7)

            # 9. 역행 영향 (영역별 차등) - 최대 -8점
            if "Mercury" in retrogrades:
                if area == "career":
                    score -= 5
                elif area == "wealth":
                    score -= 4
            if "Venus" in retrogrades:
                if area == "love":
                    score -= 6
                elif area == "wealth":
                    score -= 3
            if "Mars" in retrogrades:
                if area == "career":
                    score -= 4
                elif area == "health":
                    score -= 3
            if "Jupiter" in retrogrades:
                if area in ["wealth", "career"]:
                    score -= 3

            return max(0, min(100, score))

        love_score = calc_area_score("love")
        career_score = calc_area_score("career")
        wealth_score = calc_area_score("wealth")
        health_score = calc_area_score("health")

        # Overall = 영역별 가중 평균 + FortuneScoreEngine cross_bonus 반영
        cross_bonus = score_result.get("cross_bonus", 0)
        overall_score = int((love_score + career_score + wealth_score + health_score) / 4 + cross_bonus)
        overall_score = max(0, min(100, overall_score))

        return jsonify({
            "status": "success",
            "fortune": {
                "overall": overall_score,
                "love": love_score,
                "career": career_score,
                "wealth": wealth_score,
                "health": health_score,
            },
            "breakdown": score_result,
            "realtime_astro": {
                "moon_phase": moon_data.get("phase_name"),
                "moon_illumination": moon_data.get("illumination"),
                "retrogrades": retrogrades,
                "planetary_hour": planetary_hour_ruler,
            },
            "alerts": score_result.get("alerts", []),
            "timestamp": datetime.utcnow().isoformat(),
        })

    except Exception as e:
        logger.exception(f"[ERROR] /api/fortune/daily failed: {e}")
        return jsonify({"status": "error", "message": "서버 처리 중 오류가 발생했습니다."}), 500
