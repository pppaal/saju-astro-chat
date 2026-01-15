# backend_ai/app/compatibility/scoring.py
"""
Compatibility Scoring Functions
===============================
궁합 점수 계산 및 평가 함수들

Functions:
- calculate_pair_score: 1:1 궁합 점수 계산
- calculate_group_synergy_score: 그룹 시너지 점수 계산
- analyze_oheng_relationship: 오행 상생상극 관계 분석
- get_score_summary: 점수 요약 메시지
- generate_pairwise_matrix: 모든 1:1 조합 점수 계산
"""

from .constants import (
    STEM_TO_ELEMENT,
    ZODIAC_ELEMENTS,
    ASTRO_ELEMENT_COMPATIBILITY,
    ASTRO_ELEMENT_TO_OHENG,
    BRANCH_SAMHAP,
    BRANCH_BANGHAP,
)
from .analysis import (
    analyze_stem_compatibility,
    analyze_branch_compatibility,
    analyze_shinsal_compatibility,
)
from .synastry import (
    calculate_sipsung,
    analyze_astro_compatibility,
    analyze_venus_mars_synastry,
)


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


def analyze_oheng_relationship(elem1: str, elem2: str) -> dict:
    """
    오행 상생상극 관계 분석

    Args:
        elem1: 첫 번째 사람의 오행
        elem2: 두 번째 사람의 오행

    Returns:
        dict with adjustment score and details
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
        result["details"] = f"상생: {sangsaeng[(elem1, elem2)]}"
    elif (elem2, elem1) in sangsaeng:
        result["adjustment"] = 8
        result["details"] = "상생: B가 A를 키워줌"

    # 상극 확인
    elif (elem1, elem2) in sanggeuk:
        result["adjustment"] = -8
        result["details"] = f"상극: {sanggeuk[(elem1, elem2)]}"
    elif (elem2, elem1) in sanggeuk:
        result["adjustment"] = -8
        result["details"] = "상극: B가 A를 제압할 수 있음"

    # 같은 오행
    elif elem1 == elem2:
        result["adjustment"] = 3
        result["details"] = "동일 오행: 비겁 관계, 공감대 형성"

    return result


def calculate_pair_score(person1: dict, person2: dict, relationship_type: str = "general") -> dict:
    """
    두 사람의 궁합 점수 계산 (사주 + 점성술 융합)

    Args:
        person1: 첫 번째 사람의 데이터 (saju, astro 포함)
        person2: 두 번째 사람의 데이터 (saju, astro 포함)
        relationship_type: 관계 유형 ("general", "lover", "spouse", "friend", "business")

    Returns:
        dict with score and detailed analysis
    """
    base_score = 70
    total_adjustment = 0
    saju_details = []
    astro_details = []
    fusion_insights = []

    # 사주 데이터 추출
    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    pillars1 = saju1.get("pillars", {})
    pillars2 = saju2.get("pillars", {})
    dm1 = saju1.get("dayMaster", {})
    dm2 = saju2.get("dayMaster", {})

    # 일간/일지 추출
    dm1_name = dm1.get("name", "") if isinstance(dm1, dict) else str(dm1)
    dm2_name = dm2.get("name", "") if isinstance(dm2, dict) else str(dm2)
    dm1_element = dm1.get("element", "") if isinstance(dm1, dict) else ""
    dm2_element = dm2.get("element", "") if isinstance(dm2, dict) else ""

    day1 = pillars1.get("day", "")
    day2 = pillars2.get("day", "")
    branch1 = day1[1] if len(day1) >= 2 else ""
    branch2 = day2[1] if len(day2) >= 2 else ""

    # 점성술 데이터 추출
    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})
    sun1 = astro1.get("sunSign", "")
    sun2 = astro2.get("sunSign", "")

    # 1. 천간 궁합 분석
    if dm1_name and dm2_name:
        stem_result = analyze_stem_compatibility(dm1_name, dm2_name)
        total_adjustment += stem_result["score_adjustment"] * 0.5
        if stem_result["details"]:
            saju_details.extend(stem_result["details"])

    # 2. 지지 궁합 분석
    if branch1 and branch2:
        branch_result = analyze_branch_compatibility(branch1, branch2)
        total_adjustment += branch_result["score_adjustment"] * 0.5
        if branch_result["details"]:
            saju_details.extend(branch_result["details"])

    # 3. 오행 상생상극 분석
    if dm1_element and dm2_element:
        oheng_result = analyze_oheng_relationship(dm1_element, dm2_element)
        total_adjustment += oheng_result["adjustment"]
        if oheng_result["details"]:
            saju_details.append(oheng_result["details"])

    # 4. 신살 궁합 분석
    try:
        shinsal_result = analyze_shinsal_compatibility(person1, person2)
        shinsal_contribution = shinsal_result.get("total_score", 0) * 0.3
        total_adjustment += shinsal_contribution
        if shinsal_result.get("positive_shinsals"):
            saju_details.extend(shinsal_result["positive_shinsals"][:2])
        if shinsal_result.get("negative_shinsals"):
            saju_details.extend(shinsal_result["negative_shinsals"][:2])
    except Exception:
        pass

    # 5. 점성술 태양 별자리 궁합
    if sun1 and sun2:
        astro_result = analyze_astro_compatibility(sun1, sun2)
        total_adjustment += astro_result["score_adjustment"] * 0.4
        if astro_result["details"]:
            astro_details.extend(astro_result["details"])

    # 6. 금성-화성 시나스트리 (연인/배우자 관계일 때)
    if relationship_type in ["lover", "spouse"]:
        venus_mars_result = analyze_venus_mars_synastry(person1, person2, relationship_type)
        if venus_mars_result.get("score_adjustment"):
            total_adjustment += venus_mars_result["score_adjustment"]
        if venus_mars_result.get("details"):
            astro_details.extend(venus_mars_result["details"])
        if venus_mars_result.get("fusion_insight"):
            fusion_insights.append(venus_mars_result["fusion_insight"])

    # 7. 십성 관계 분석
    sipsung_data = {"a_to_b": None, "b_to_a": None}
    if dm1_name and dm2_name:
        sipsung_a_to_b = calculate_sipsung(dm1_name, dm2_name)
        if sipsung_a_to_b["sipsung"] != "unknown":
            sipsung_data["a_to_b"] = sipsung_a_to_b
            saju_details.append(f"A→B 십성: {sipsung_a_to_b['sipsung']} - {sipsung_a_to_b['meaning']}")
            total_adjustment += (sipsung_a_to_b["score"] - 70) * 0.3

        sipsung_b_to_a = calculate_sipsung(dm2_name, dm1_name)
        if sipsung_b_to_a["sipsung"] != "unknown":
            sipsung_data["b_to_a"] = sipsung_b_to_a
            saju_details.append(f"B→A 십성: {sipsung_b_to_a['sipsung']} - {sipsung_b_to_a['meaning']}")
            total_adjustment += (sipsung_b_to_a["score"] - 70) * 0.3

    # 8. 사주↔점성 교차 분석
    elem1_astro = ZODIAC_ELEMENTS.get(sun1.lower(), "") if sun1 else ""
    elem2_astro = ZODIAC_ELEMENTS.get(sun2.lower(), "") if sun2 else ""

    if dm1_element and elem2_astro:
        mapped_oheng = ASTRO_ELEMENT_TO_OHENG.get(elem2_astro, "")
        if dm1_element == mapped_oheng:
            fusion_insights.append(f"A의 일간({dm1_element})과 B의 태양원소({elem2_astro}) 일치 - 자연스러운 조화")
            total_adjustment += 5

    if dm2_element and elem1_astro:
        mapped_oheng = ASTRO_ELEMENT_TO_OHENG.get(elem1_astro, "")
        if dm2_element == mapped_oheng:
            fusion_insights.append(f"B의 일간({dm2_element})과 A의 태양원소({elem1_astro}) 일치 - 자연스러운 조화")
            total_adjustment += 5

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


def generate_pairwise_matrix(people: list) -> list:
    """
    모든 1:1 조합 생성 (N명 → N*(N-1)/2 조합)
    상세 점수와 분석 포함

    Args:
        people: 사람 데이터 리스트

    Returns:
        list of pair analysis results
    """
    pairs = []
    n = len(people)

    for i in range(n):
        for j in range(i + 1, n):
            p1 = people[i]
            p2 = people[j]

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

            pair_analysis = calculate_pair_score(p1, p2)

            pairs.append({
                "pair": f"{name1} - {name2}",
                "index": (i+1, j+1),
                "saju": f"{dm1_name}({dm1_element}) - {dm2_name}({dm2_element})",
                "astro": f"{sun1} - {sun2}",
                "score": pair_analysis["score"],
                "summary": pair_analysis["summary"],
                "saju_details": pair_analysis["saju_details"],
                "astro_details": pair_analysis["astro_details"],
                "fusion_insights": pair_analysis["fusion_insights"],
            })

    return pairs


def calculate_group_synergy_score(
    people: list,
    pairwise_matrix: list,
    element_distribution: dict,
    group_roles: dict
) -> dict:
    """
    그룹 전체 시너지 점수 계산

    Args:
        people: 사람 데이터 리스트
        pairwise_matrix: 1:1 궁합 매트릭스
        element_distribution: 원소 분포
        group_roles: 그룹 역할 데이터

    Returns:
        dict with group synergy scores and analysis
    """
    n = len(people)

    # 1. 개별 궁합 점수 평균
    pair_scores = [p["score"] for p in pairwise_matrix]
    avg_pair_score = sum(pair_scores) / len(pair_scores) if pair_scores else 70

    # 2. 최저/최고 궁합 찾기
    min_pair = min(pairwise_matrix, key=lambda x: x["score"]) if pairwise_matrix else None
    max_pair = max(pairwise_matrix, key=lambda x: x["score"]) if pairwise_matrix else None

    # 3. 원소 균형 점수
    oheng = element_distribution.get("oheng", {})
    astro = element_distribution.get("astro", {})

    oheng_diversity = sum(1 for v in oheng.values() if v > 0)
    oheng_bonus = (oheng_diversity / 5) * 10

    astro_diversity = sum(1 for v in astro.values() if v > 0)
    astro_bonus = (astro_diversity / 4) * 8

    # 4. 역할 균형 점수
    filled_roles = sum(1 for members in group_roles.values() if members)
    role_bonus = (filled_roles / 6) * 7

    # 5. 그룹 사이즈 조정
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

    for samhap_set, data in BRANCH_SAMHAP.items():
        if samhap_set.issubset(branch_set):
            samhap_bonus = 10
            special_formations.append(data["meaning"])
            break

    for banghap_set, data in BRANCH_BANGHAP.items():
        if banghap_set.issubset(branch_set):
            banghap_bonus = 8
            special_formations.append(data["meaning"])
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
