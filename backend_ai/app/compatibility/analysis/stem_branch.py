# backend_ai/app/compatibility/analysis/stem_branch.py
"""
천간(天干)과 지지(地支) 궁합 분석
================================
- analyze_stem_compatibility: 천간(일간) 궁합 분석
- analyze_branch_compatibility: 지지(일지) 궁합 분석
"""

from typing import Dict, List, Optional

from ..constants import (
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
)


def _get_branches_from_pillars(pillars: dict) -> list:
    """사주 기둥에서 지지 추출 헬퍼 함수"""
    branches = []
    for pillar_name in ["year", "month", "day", "hour"]:
        pillar = pillars.get(pillar_name)
        # Null safety: ensure pillar is a string with at least 2 characters
        if pillar and isinstance(pillar, str) and len(pillar) >= 2:
            branches.append(pillar[1])
    return branches


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
