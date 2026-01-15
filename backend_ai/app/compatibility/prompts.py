# backend_ai/app/compatibility/prompts.py
"""
Compatibility Prompt Generation Functions
=========================================
AI 해석을 위한 프롬프트 생성 함수들

Functions:
- build_pair_prompt: 1:1 궁합 프롬프트 생성
- build_group_prompt: 그룹 궁합 프롬프트 생성
- format_compatibility_report: 텍스트 리포트 포맷팅
- format_group_compatibility_report: 그룹 리포트 포맷팅
"""

from typing import List, Dict, Any


def build_pair_prompt(
    person1: dict,
    person2: dict,
    pair_analysis: dict,
    relationship_type: str = "general",
    locale: str = "ko"
) -> str:
    """
    1:1 궁합 AI 해석 프롬프트 생성

    Args:
        person1, person2: 각 사람의 데이터
        pair_analysis: 점수 및 분석 데이터
        relationship_type: 관계 유형
        locale: 언어 설정

    Returns:
        str: AI 프롬프트
    """
    name1 = person1.get("name", "Person A")
    name2 = person2.get("name", "Person B")

    saju1 = person1.get("saju", {})
    saju2 = person2.get("saju", {})
    astro1 = person1.get("astro", {})
    astro2 = person2.get("astro", {})

    dm1 = saju1.get("dayMaster", {})
    dm2 = saju2.get("dayMaster", {})
    dm1_name = dm1.get("name", "") if isinstance(dm1, dict) else str(dm1)
    dm2_name = dm2.get("name", "") if isinstance(dm2, dict) else str(dm2)
    dm1_element = dm1.get("element", "") if isinstance(dm1, dict) else ""
    dm2_element = dm2.get("element", "") if isinstance(dm2, dict) else ""

    sun1 = astro1.get("sunSign", "")
    sun2 = astro2.get("sunSign", "")

    score = pair_analysis.get("score", 70)
    saju_details = pair_analysis.get("saju_details", [])
    astro_details = pair_analysis.get("astro_details", [])
    fusion_insights = pair_analysis.get("fusion_insights", [])
    sipsung = pair_analysis.get("sipsung", {})

    relationship_labels = {
        "general": "일반 관계",
        "lover": "연인",
        "spouse": "배우자",
        "friend": "친구",
        "business": "사업 파트너",
        "family": "가족",
    }

    prompt = f"""당신은 사주와 점성술을 융합하여 궁합을 분석하는 전문가입니다.
두 체계를 교차 분석하여 깊이 있는 인사이트를 제공해주세요.

## 분석 대상
- **{name1}**: 일간 {dm1_name}({dm1_element}), 태양별자리 {sun1}
- **{name2}**: 일간 {dm2_name}({dm2_element}), 태양별자리 {sun2}

## 관계 유형: {relationship_labels.get(relationship_type, '일반 관계')}

## 사전 계산된 분석 결과
- **총점**: {score}/100점
- **요약**: {pair_analysis.get('summary', '')}

### 사주 분석 결과
{chr(10).join(f'- {d}' for d in saju_details) if saju_details else '- 분석 데이터 없음'}

### 점성술 분석 결과
{chr(10).join(f'- {d}' for d in astro_details) if astro_details else '- 분석 데이터 없음'}

### 융합 인사이트
{chr(10).join(f'- {d}' for d in fusion_insights) if fusion_insights else '- 추가 인사이트 없음'}

### 십성 관계
- A→B: {sipsung.get('a_to_b', {}).get('sipsung', '분석 불가')} - {sipsung.get('a_to_b', {}).get('meaning', '')}
- B→A: {sipsung.get('b_to_a', {}).get('sipsung', '분석 불가')} - {sipsung.get('b_to_a', {}).get('meaning', '')}

## 분석 요청
위 정보를 바탕으로 다음 구조로 궁합 해석을 작성해주세요:

1. **전체 궁합 점수 해설** (2-3문장)
2. **핵심 케미스트리** - 두 사람이 잘 맞는 부분 (3-4개)
3. **주의할 점** - 갈등이 생길 수 있는 부분과 해결 방법 (2-3개)
4. **관계 발전 조언** - {relationship_labels.get(relationship_type, '일반 관계')}로서 어떻게 발전시킬 수 있는지
5. **종합 한 줄 요약**

자연스럽고 따뜻한 톤으로 작성해주세요. 이모지를 적절히 사용해주세요.
"""

    return prompt


def build_group_prompt(
    people: List[dict],
    pairwise_matrix: List[dict],
    element_distribution: dict,
    group_roles: dict,
    synergy_score: dict,
    group_timing: dict,
    relationship_type: str = "general",
    locale: str = "ko"
) -> str:
    """
    그룹 궁합 AI 해석 프롬프트 생성

    Args:
        people: 사람 데이터 리스트
        pairwise_matrix: 1:1 궁합 매트릭스
        element_distribution: 원소 분포
        group_roles: 그룹 역할
        synergy_score: 시너지 점수
        group_timing: 타이밍 분석
        relationship_type: 관계 유형
        locale: 언어 설정

    Returns:
        str: AI 프롬프트
    """
    # 사람 정보 텍스트
    people_text = ""
    for i, person in enumerate(people):
        name = person.get("name", f"Person {i+1}")
        dm = person.get("saju", {}).get("dayMaster", {})
        dm_name = dm.get("name", "") if isinstance(dm, dict) else str(dm)
        dm_element = dm.get("element", "") if isinstance(dm, dict) else ""
        sun_sign = person.get("astro", {}).get("sunSign", "")
        people_text += f"- **{name}**: 일간 {dm_name}({dm_element}), 태양 {sun_sign}\n"

    # 원소 분포 텍스트
    oheng = element_distribution.get("oheng", {})
    astro = element_distribution.get("astro", {})
    oheng_text = ", ".join([f"{k}: {v}명" for k, v in oheng.items() if v > 0])
    astro_text = ", ".join([f"{k}: {v}명" for k, v in astro.items() if v > 0])

    # 역할 텍스트
    roles_text = ""
    role_labels = {
        "leader": "리더",
        "mediator": "중재자",
        "catalyst": "촉매",
        "stabilizer": "안정자",
        "creative": "창의력",
        "emotional": "감정 지지",
    }
    for role, members in group_roles.items():
        if members:
            role_label = role_labels.get(role, role)
            roles_text += f"- **{role_label}**: {', '.join(members)}\n"

    # 1:1 궁합 텍스트
    pairs_text = ""
    for p in pairwise_matrix:
        pairs_text += f"- **{p['pair']}** ({p['score']}점): {p.get('summary', '')}\n"

    # 최고/최저 궁합
    best_pair = synergy_score.get("best_pair", {})
    weakest_pair = synergy_score.get("weakest_pair", {})

    prompt = f"""당신은 사주와 점성술을 융합하여 그룹 궁합을 분석하는 전문가입니다.
{len(people)}명으로 구성된 그룹의 역학을 분석해주세요.

핵심 원칙: 사주와 점성술을 따로 분석하지 말고, 두 체계가 교차하는 지점을 찾아 그룹 인사이트를 제공하세요!

## 분석 대상 ({len(people)}명)
{people_text}

## 관계 유형: {relationship_type}

## 그룹 원소 분포
- 오행 분포: {oheng_text}
- 점성 원소 분포: {astro_text}
- 지배적 오행: {element_distribution.get('dominant_oheng', '없음')}
- 지배적 점성 원소: {element_distribution.get('dominant_astro', '없음')}

## 그룹 시너지 점수
- **총합 점수: {synergy_score['overall_score']}점**
- 1:1 평균 점수: {synergy_score['avg_pair_score']}점
- 오행 다양성 보너스: +{synergy_score['oheng_bonus']}점
- 점성 원소 다양성 보너스: +{synergy_score['astro_bonus']}점
- 역할 균형 보너스: +{synergy_score['role_bonus']}점
- 최고 궁합: {best_pair.get('pair', 'N/A')} ({best_pair.get('score', 0)}점)
- 주의 궁합: {weakest_pair.get('pair', 'N/A')} ({weakest_pair.get('score', 0)}점)

## 모든 1:1 조합 ({len(pairwise_matrix)}개)
{pairs_text}

## 잠재적 역할 분석
{roles_text if roles_text else '- 역할 미분석'}

## 타이밍 분석
- 이번 달 에너지: {group_timing.get('current_month', {}).get('analysis', '')}

## 분석 요청
위 정보를 바탕으로 다음 구조로 그룹 궁합 해석을 작성해주세요:

1. **그룹 전체 조화도** - {synergy_score['overall_score']}점에 대한 해설
2. **그룹 에너지 프로필** - 지배적 에너지와 부족한 에너지
3. **1:1 궁합 하이라이트** - 최고 궁합과 주의 궁합 설명
4. **그룹 역할 분석** - 누가 어떤 역할을 하면 좋은지
5. **그룹 다이나믹스** - 화합/갈등 패턴
6. **그룹 강점 TOP 3**
7. **주의할 점 & 해결 방법** (3개)
8. **실천 조언** - 함께하면 좋은 활동, 피해야 할 상황
9. **종합 한 줄 요약**

자연스럽고 따뜻한 톤으로 작성해주세요. 이모지를 적절히 사용해주세요.
"""

    return prompt


def format_compatibility_report(
    person1: dict,
    person2: dict,
    pair_analysis: dict,
    relationship_type: str = "general",
    locale: str = "ko"
) -> str:
    """
    1:1 궁합 텍스트 리포트 포맷팅 (AI 없이)

    Args:
        person1, person2: 각 사람의 데이터
        pair_analysis: 점수 및 분석 데이터
        relationship_type: 관계 유형
        locale: 언어 설정

    Returns:
        str: 포맷팅된 리포트
    """
    name1 = person1.get("name", "Person A")
    name2 = person2.get("name", "Person B")

    score = pair_analysis.get("score", 70)
    summary = pair_analysis.get("summary", "")
    saju_details = pair_analysis.get("saju_details", [])
    astro_details = pair_analysis.get("astro_details", [])
    fusion_insights = pair_analysis.get("fusion_insights", [])

    report = f"""
## {name1}님과 {name2}님의 궁합 분석

### 총점: {score}/100점
**{summary}**

### 사주 분석
"""
    for detail in saju_details[:5]:
        report += f"- {detail}\n"

    report += "\n### 점성술 분석\n"
    for detail in astro_details[:5]:
        report += f"- {detail}\n"

    if fusion_insights:
        report += "\n### 융합 인사이트\n"
        for insight in fusion_insights[:3]:
            report += f"- {insight}\n"

    # 점수에 따른 조언
    if score >= 80:
        report += "\n### 종합 조언\n"
        report += "- 매우 좋은 궁합입니다! 서로의 장점을 살려주는 관계입니다.\n"
        report += "- 자연스러운 조화가 있으니 편안하게 관계를 발전시켜 나가세요.\n"
    elif score >= 65:
        report += "\n### 종합 조언\n"
        report += "- 좋은 궁합입니다. 서로의 다른 점을 보완해줄 수 있습니다.\n"
        report += "- 소통을 통해 더 깊은 이해를 쌓아가세요.\n"
    else:
        report += "\n### 종합 조언\n"
        report += "- 서로 다른 에너지를 가지고 있어 성장의 기회가 됩니다.\n"
        report += "- 차이점을 존중하고 인내심을 가지고 관계를 발전시켜 보세요.\n"

    return report


def format_group_compatibility_report(
    people: List[dict],
    pairwise_matrix: List[dict],
    element_distribution: dict,
    group_roles: dict,
    synergy_score: dict,
    group_timing: dict,
    group_actions: List[dict],
    relationship_type: str = "general",
    locale: str = "ko"
) -> str:
    """
    그룹 궁합 텍스트 리포트 포맷팅 (AI 없이)

    Args:
        people: 사람 데이터 리스트
        pairwise_matrix: 1:1 궁합 매트릭스
        element_distribution: 원소 분포
        group_roles: 그룹 역할
        synergy_score: 시너지 점수
        group_timing: 타이밍 분석
        group_actions: 행동 권고사항
        relationship_type: 관계 유형
        locale: 언어 설정

    Returns:
        str: 포맷팅된 리포트
    """
    overall_score = synergy_score.get("overall_score", 70)

    # 점수에 따른 요약
    if overall_score >= 85:
        score_summary = "최고의 그룹 궁합! 서로의 강점이 잘 어우러지는 드림팀입니다."
    elif overall_score >= 75:
        score_summary = "좋은 그룹 궁합입니다. 협력하면 시너지가 발생합니다."
    elif overall_score >= 65:
        score_summary = "괜찮은 그룹 궁합입니다. 서로의 차이를 존중하면 더 좋아집니다."
    elif overall_score >= 55:
        score_summary = "평균적인 그룹 궁합입니다. 의식적인 노력이 필요합니다."
    else:
        score_summary = "도전적인 그룹 궁합입니다. 각자의 역할을 명확히 하세요."

    report = f"""
## 그룹 궁합 분석 ({len(people)}명)

### 총점: {overall_score}/100점
**{score_summary}**

### 점수 구성
- 1:1 궁합 평균: {synergy_score.get('avg_pair_score', 0)}점
- 오행 다양성 보너스: +{synergy_score.get('oheng_bonus', 0)}점
- 점성 원소 다양성 보너스: +{synergy_score.get('astro_bonus', 0)}점
- 역할 균형 보너스: +{synergy_score.get('role_bonus', 0)}점

### 원소 분포
**오행**: {', '.join([f'{k}: {v}명' for k, v in element_distribution.get('oheng', {}).items() if v > 0])}
**점성 원소**: {', '.join([f'{k}: {v}명' for k, v in element_distribution.get('astro', {}).items() if v > 0])}

### 1:1 궁합 매트릭스
"""

    for p in pairwise_matrix:
        report += f"- **{p['pair']}**: {p['score']}점 - {p.get('summary', '')}\n"

    # 역할 분석
    report += "\n### 그룹 역할\n"
    role_labels = {
        "leader": "리더",
        "mediator": "중재자",
        "catalyst": "촉매",
        "stabilizer": "안정자",
        "creative": "창의력",
        "emotional": "감정 지지",
    }
    for role, members in group_roles.items():
        if members:
            role_label = role_labels.get(role, role)
            report += f"- **{role_label}**: {', '.join(members)}\n"

    # 타이밍
    report += "\n### 이번 달 그룹 에너지\n"
    report += f"{group_timing.get('current_month', {}).get('analysis', '')}\n"

    # 행동 권고사항
    if group_actions:
        report += "\n### 실천 조언\n"
        for action in group_actions[:5]:
            report += f"- {action.get('action', '')}\n"

    return report
