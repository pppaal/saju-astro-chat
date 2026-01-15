# backend_ai/app/compatibility/analysis.py
"""
Compatibility Analysis Functions
================================
사주(四柱) 궁합 분석의 핵심 함수들

Functions:
- analyze_stem_compatibility: 천간(일간) 궁합 분석
- analyze_branch_compatibility: 지지(일지) 궁합 분석
- analyze_shinsal_compatibility: 신살 궁합 분석
- analyze_twelve_stages_compatibility: 12운성 궁합 분석
- analyze_naeum_compatibility: 납음오행 궁합 분석
- analyze_gongmang_interaction: 공망 상호작용 분석
- analyze_house_compatibility: 12하우스 궁합 분석
- analyze_samjae_compatibility: 삼재 궁합 분석
- analyze_yongsin_interaction: 용신/기신 상호작용 분석
- analyze_banhap_banghap_detailed: 반합/방합 상세 분석
"""

from .constants import (
    STEM_COMBINATIONS,
    STEM_CLASHES,
    BRANCH_YUKHAP,
    BRANCH_BANHAP,
    BRANCH_BANGHAP,
    BRANCH_BANGHAP_HALF,
    BRANCH_SAMHAP,
    BRANCH_CHUNG,
    BRANCH_WONGJIN,
    BRANCH_HAE,
    BRANCH_HYUNG,
    SHINSAL_COMPATIBILITY,
    SHINSAL_DETERMINATION,
    GUIIN_DETERMINATION,
    TWELVE_STAGES_COMPATIBILITY,
    GANJI_TO_NAEUM,
    NAEUM_TO_ELEMENT,
    NAEUM_ELEMENT_COMPATIBILITY,
    GONGMANG_BY_CYCLE,
    BRANCH_TO_HOUSE,
    SAME_HOUSE_SCORE,
    HOUSE_AXIS_COMPATIBILITY,
    HOUSE_COMPATIBILITY_MEANING,
    SAMJAE_GROUPS,
    SAMJAE_COMPATIBILITY_EFFECT,
    YONGSIN_CHARACTERISTICS,
    YONGSIN_INTERACTION,
)


def analyze_stem_compatibility(stem1: str, stem2: str) -> dict:
    """
    천간(일간) 궁합 분석 - 합/충 관계 확인

    Args:
        stem1: 첫 번째 사람의 일간 (예: "甲", "乙")
        stem2: 두 번째 사람의 일간

    Returns:
        dict with relationship type, score adjustment, meaning, and details
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
            result["details"].append(f"천간합: {data['meaning']}")
            return result

    # 천간충 확인
    for (s1, s2), data in STEM_CLASHES.items():
        if (stem1 == s1 and stem2 == s2) or (stem1 == s2 and stem2 == s1):
            result["relationship"] = "clash"
            result["score_adjustment"] = data["score"]
            result["meaning"] = data["meaning"]
            result["details"].append(f"천간충: {data['meaning']}")
            return result

    # 같은 천간 (비견 관계)
    if stem1 == stem2:
        result["relationship"] = "same"
        result["score_adjustment"] = 5
        result["meaning"] = "같은 일간 - 서로를 잘 이해하지만 경쟁 가능"
        result["details"].append("동일 일간: 비견 관계, 공감대 있지만 주도권 경쟁 주의")

    return result


def analyze_branch_compatibility(branch1: str, branch2: str, all_branches: list = None) -> dict:
    """
    지지(일지) 궁합 분석 - 삼합/반합/방합/육합/충/형/원진 확인

    Args:
        branch1: 첫 번째 사람의 일지 (예: "子", "丑")
        branch2: 두 번째 사람의 일지
        all_branches: 그룹 분석 시 모든 지지 리스트

    Returns:
        dict with relationships, score adjustment, meanings, and details
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
            result["details"].append(f"육합: {data['meaning']}")

    # 지지 반합 확인 (삼합 중 2개)
    if pair_set in BRANCH_BANHAP:
        data = BRANCH_BANHAP[pair_set]
        result["relationships"].append("banhap")
        result["score_adjustment"] += data["score"] - 70
        result["meanings"].append(data["meaning"])
        result["details"].append(f"반합: {data['meaning']}")

    # 방합 반합 확인 (방합 중 2개)
    if pair_set in BRANCH_BANGHAP_HALF:
        data = BRANCH_BANGHAP_HALF[pair_set]
        result["relationships"].append("banghap_half")
        result["score_adjustment"] += data["score"] - 70
        result["meanings"].append(data["meaning"])
        result["details"].append(f"방합 잠재력: {data['meaning']}")

    # 지지충 확인
    for (b1, b2), data in BRANCH_CHUNG.items():
        if (branch1 == b1 and branch2 == b2) or (branch1 == b2 and branch2 == b1):
            result["relationships"].append("chung")
            result["score_adjustment"] += data["score"]
            result["meanings"].append(data["meaning"])
            result["details"].append(f"지지충: {data['meaning']}")

    # 지지원진 확인
    for (b1, b2), data in BRANCH_WONGJIN.items():
        if (branch1 == b1 and branch2 == b2) or (branch1 == b2 and branch2 == b1):
            result["relationships"].append("wongjin")
            result["score_adjustment"] += data["score"]
            result["meanings"].append(data["meaning"])
            result["details"].append(f"원진: {data['meaning']}")

    # 지지해(害) 확인 - Quincunx에 해당
    for (b1, b2), data in BRANCH_HAE.items():
        if (branch1 == b1 and branch2 == b2) or (branch1 == b2 and branch2 == b1):
            result["relationships"].append("hae")
            result["score_adjustment"] += data["score"]
            result["meanings"].append(data["meaning"])
            result["details"].append(f"해(害): {data['meaning']} ({data.get('synastry', '')})")

    # 그룹 삼합 확인 (3명 이상일 때)
    if all_branches and len(all_branches) >= 3:
        branch_set = frozenset(all_branches)
        for samhap_set, data in BRANCH_SAMHAP.items():
            if samhap_set.issubset(branch_set):
                result["relationships"].append("samhap")
                result["score_adjustment"] += 15  # 그룹 보너스
                result["meanings"].append(data["meaning"])
                result["details"].append(f"삼합 완성: {data['meaning']}")

    # 그룹 방합 확인 (3명 이상일 때)
    if all_branches and len(all_branches) >= 3:
        branch_set = frozenset(all_branches)
        for banghap_set, data in BRANCH_BANGHAP.items():
            if banghap_set.issubset(branch_set):
                result["relationships"].append("banghap")
                result["score_adjustment"] += 12  # 방합 그룹 보너스
                result["meanings"].append(data["meaning"])
                result["details"].append(f"방합 완성: {data['meaning']}")

    # 그룹 형 확인
    if all_branches and len(all_branches) >= 2:
        branch_set = frozenset(all_branches)
        for hyung_set, data in BRANCH_HYUNG.items():
            if hyung_set.issubset(branch_set):
                result["relationships"].append("hyung")
                result["score_adjustment"] += data["score"]
                result["meanings"].append(data["meaning"])
                result["details"].append(f"형: {data['meaning']}")

    # 같은 지지
    if branch1 == branch2:
        result["relationships"].append("same")
        result["score_adjustment"] += 3
        result["details"].append("동일 일지: 비슷한 성향, 편안함")

    return result


def _get_branches_from_pillars(pillars: dict) -> list:
    """사주 기둥에서 지지 추출 헬퍼 함수"""
    branches = []
    for pillar_name in ["year", "month", "day", "hour"]:
        pillar = pillars.get(pillar_name, "")
        if len(pillar) >= 2:
            branches.append(pillar[1])
    return branches


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

    branches1 = _get_branches_from_pillars(pillars1)
    branches2 = _get_branches_from_pillars(pillars2)
    day_branch1 = branches1[2] if len(branches1) > 2 else ""
    day_branch2 = branches2[2] if len(branches2) > 2 else ""
    year_branch1 = branches1[0] if len(branches1) > 0 else ""
    year_branch2 = branches2[0] if len(branches2) > 0 else ""

    # 1. 도화살/역마살/화개살 분석 (지지 기반)
    for shinsal_name, branch_mapping in SHINSAL_DETERMINATION.items():
        person1_has = False
        person2_has = False

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
                score = shinsal_data.get("score_partner", 0)
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

        if dm1_name in stem_mapping:
            guiin_branches = stem_mapping[dm1_name]
            if isinstance(guiin_branches, list):
                for gb in guiin_branches:
                    if gb in branches1:
                        person1_has_guiin = True
                        break
            elif guiin_branches in branches1:
                person1_has_guiin = True

        if dm2_name in stem_mapping:
            guiin_branches = stem_mapping[dm2_name]
            if isinstance(guiin_branches, list):
                for gb in guiin_branches:
                    if gb in branches2:
                        person2_has_guiin = True
                        break
            elif guiin_branches in branches2:
                person2_has_guiin = True

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

    # 3. 양인살 체크
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

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})

    stage1 = saju1.get("twelveStage", saju1.get("twelve_stage", ""))
    stage2 = saju2.get("twelveStage", saju2.get("twelve_stage", ""))

    if not stage1 or not stage2:
        return result

    result["person1_stage"] = stage1
    result["person2_stage"] = stage2

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
        strong_stages = ["장생", "관대", "건록", "제왕"]
        moderate_stages = ["목욕", "양", "태"]
        weak_stages = ["쇠", "병", "사", "묘", "절"]

        score1 = 3 if stage1 in strong_stages else (2 if stage1 in moderate_stages else 1)
        score2 = 3 if stage2 in strong_stages else (2 if stage2 in moderate_stages else 1)

        result["score"] = (score1 + score2) * 2
        result["meaning"] = f"{stage1}과 {stage2}의 조합"

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

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    day1 = pillars1.get("day", "")
    day2 = pillars2.get("day", "")

    if not day1 or not day2 or len(day1) < 2 or len(day2) < 2:
        return result

    naeum1 = GANJI_TO_NAEUM.get(day1, "")
    naeum2 = GANJI_TO_NAEUM.get(day2, "")

    if not naeum1 or not naeum2:
        return result

    result["person1_naeum"] = naeum1
    result["person2_naeum"] = naeum2

    elem1 = NAEUM_TO_ELEMENT.get(naeum1, "")
    elem2 = NAEUM_TO_ELEMENT.get(naeum2, "")

    result["person1_element"] = elem1
    result["person2_element"] = elem2

    if not elem1 or not elem2:
        return result

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

    if naeum1 == naeum2:
        result["score"] += 5
        result["meaning"] = f"같은 납음({naeum1}) - 같은 운명적 성향"

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

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    day1 = pillars1.get("day", "")
    day2 = pillars2.get("day", "")

    if not day1 or not day2 or len(day1) < 2 or len(day2) < 2:
        return result

    gongmang1 = GONGMANG_BY_CYCLE.get(day1, [])
    gongmang2 = GONGMANG_BY_CYCLE.get(day2, [])

    result["person1_gongmang"] = gongmang1
    result["person2_gongmang"] = gongmang2

    branches1 = _get_branches_from_pillars(pillars1)
    branches2 = _get_branches_from_pillars(pillars2)

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

    common_gongmang = set(gongmang1) & set(gongmang2)
    if common_gongmang:
        result["interactions"].append({
            "type": "shared_gongmang",
            "branches": list(common_gongmang),
            "effect": f"같은 공망({', '.join(common_gongmang)}) - 같은 영역에서 공허함을 공유, 이해 가능",
            "score": 2
        })
        result["score_adjustment"] += 2

    if day_branch2 not in gongmang1 and day_branch1 not in gongmang2:
        result["interactions"].append({
            "type": "no_spouse_gongmang",
            "effect": "배우자궁 공망 없음 - 관계가 실질적으로 느껴짐",
            "score": 2
        })
        result["score_adjustment"] += 2

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

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    day1 = pillars1.get("day", "")
    day2 = pillars2.get("day", "")

    branch1 = day1[1] if len(day1) >= 2 else ""
    branch2 = day2[1] if len(day2) >= 2 else ""

    if not branch1 or not branch2:
        return result

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
    if h1_primary == 7 or h2_primary == 7:
        total_score += 5
        result["house_interactions"].append({
            "type": "partnership_house",
            "score": 5,
            "meaning": "파트너십 하우스 활성 - 관계에 적합"
        })

    if h1_primary == 5 or h2_primary == 5:
        total_score += 4
        result["house_interactions"].append({
            "type": "romance_house",
            "score": 4,
            "meaning": "로맨스 하우스 활성 - 즐거운 관계"
        })

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

    year1 = pillars1.get("year", "")
    year2 = pillars2.get("year", "")

    branch1 = year1[1] if len(year1) >= 2 else ""
    branch2 = year2[1] if len(year2) >= 2 else ""

    if not branch1 or not branch2:
        result["summary"] = "년지 정보가 없어 삼재 분석을 할 수 없습니다."
        return result

    result["person1_year_branch"] = branch1
    result["person2_year_branch"] = branch2

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

    elif group1_name and group1_name == group2_name:
        score += 3
        result["interaction"] = "same_group"
        effect_data = SAMJAE_COMPATIBILITY_EFFECT.get("same_group", {})
        result["effect"] = effect_data.get("effect", "같은 시기에 삼재 경험")
        result["recommendation"] = effect_data.get("recommendation", "")

    result["score"] = score

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

    # 4. 용신-기신 관계 체크
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

    result["score"] = max(-10, min(15, score))

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
        "total_score": 0,
        "summary": ""
    }

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})

    branches1 = _get_branches_from_pillars(pillars1)
    branches2 = _get_branches_from_pillars(pillars2)

    all_branches = branches1 + branches2

    # 반합 체크 (삼합 중 2개)
    for banhap_pair, data in BRANCH_BANHAP.items():
        if banhap_pair.issubset(set(all_branches)):
            result["banhap_analysis"]["found"].append({
                "branches": list(banhap_pair),
                "element": data.get("element", ""),
                "meaning": data.get("meaning", "")
            })
            result["banhap_analysis"]["score"] += data.get("score", 0) - 70

    # 방합 체크 (같은 방위)
    for banghap_set, data in BRANCH_BANGHAP.items():
        matching = banghap_set.intersection(set(all_branches))
        if len(matching) >= 2:
            result["banghap_analysis"]["found"].append({
                "branches": list(matching),
                "direction": data.get("direction", ""),
                "meaning": data.get("meaning", "")
            })
            result["banghap_analysis"]["score"] += len(matching) * 3

    result["total_score"] = result["banhap_analysis"]["score"] + result["banghap_analysis"]["score"]

    if result["total_score"] >= 10:
        result["summary"] = "반합/방합이 매우 강하게 형성됩니다. 에너지가 조화롭게 합쳐집니다."
    elif result["total_score"] >= 5:
        result["summary"] = "반합/방합이 있습니다. 특정 영역에서 시너지가 있습니다."
    elif result["total_score"] > 0:
        result["summary"] = "약간의 반합/방합이 있습니다."
    else:
        result["summary"] = "반합/방합이 없거나 미미합니다."

    return result
