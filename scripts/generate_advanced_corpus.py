#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
사주/점성학 심화 해석 코퍼스 생성기
- 대운/세운 상세 해석
- 트랜짓 조합별 해석
- 격국/용신 심화 해석
- 특수 신살 상세 해석
"""

import json
import os

# =============================================================================
# 1. 대운/세운 상세 해석
# =============================================================================

SIPSUNG = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]
SIBIJI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]
OHAENG = ["목", "화", "토", "금", "수"]

def generate_daeun_interpretations():
    """대운(10년 운) 상세 해석"""
    interpretations = []

    # 십성별 대운 해석
    sipsung_daeun = {
        "비견": {
            "theme": "자립과 경쟁의 시기",
            "career": "독립사업, 프리랜서, 경쟁적 환경에서 성장. 동업은 신중히.",
            "wealth": "들어오는 만큼 나가기 쉬움. 투자보다 저축 권장. 형제나 친구와 금전 문제 주의.",
            "relationship": "자기주장이 강해져 충돌 가능. 배우자와 역할 분담 필요.",
            "health": "과로, 스트레스 관리 필요. 근육, 관절 건강 주의.",
            "advice": "혼자의 힘으로 성취하되, 협력의 가치도 인식하세요. 고집을 내려놓으면 더 멀리 갑니다."
        },
        "겁재": {
            "theme": "도전과 변화의 시기",
            "career": "큰 변화가 올 수 있음. 이직, 전직 고려. 투기성 사업 주의.",
            "wealth": "재물 손실 위험. 보증, 투자 매우 신중히. 도박성 행위 금지.",
            "relationship": "삼각관계, 배신 주의. 신뢰할 수 있는 사람 선별 필요.",
            "health": "사고, 수술 가능성. 안전에 특히 유의.",
            "advice": "욕심을 줄이고 안정을 추구하세요. 이 시기를 지혜롭게 보내면 다음 운에서 도약합니다."
        },
        "식신": {
            "theme": "풍요와 창조의 시기",
            "career": "창작, 기획, 교육 분야 발전. 재능을 발휘할 기회.",
            "wealth": "안정적 수입. 부동산, 식품 관련 사업 유리.",
            "relationship": "연애운 좋음. 자녀운 좋아 임신 가능성. 가정 화목.",
            "health": "식욕 증가, 체중 관리 필요. 소화기 건강 주의.",
            "advice": "여유를 즐기되 나태해지지 마세요. 이 시기에 쌓은 것이 미래의 자산이 됩니다."
        },
        "상관": {
            "theme": "표현과 변혁의 시기",
            "career": "기존 틀을 깨는 혁신 가능. 예술, 기술 분야 발전. 단, 상사와 충돌 주의.",
            "wealth": "수입 불안정할 수 있으나 큰 기회도 존재. 투자는 신중히.",
            "relationship": "솔직한 표현이 오해를 부를 수 있음. 말조심. 이혼 가능성 주의.",
            "health": "신경성 질환, 불면 주의. 스트레스 해소 중요.",
            "advice": "창의성을 발휘하되 예의를 지키세요. 날카로운 통찰이 칼이 되지 않도록."
        },
        "편재": {
            "theme": "기회와 투자의 시기",
            "career": "사업 확장, 투자 기회. 영업, 무역, 금융 분야 유리.",
            "wealth": "큰 돈이 들어올 수 있으나 나가기도 쉬움. 투자 수익 기대.",
            "relationship": "이성 인연 많아짐. 유흥, 외도 주의. 가정에 충실.",
            "health": "과로, 음주로 인한 건강 악화 주의.",
            "advice": "기회를 잡되 욕심은 절제하세요. 들어오는 것의 30%는 저축하세요."
        },
        "정재": {
            "theme": "안정과 축적의 시기",
            "career": "직장 안정, 승진 가능. 정규직, 공무원 유리.",
            "wealth": "꾸준한 수입, 저축 증가. 부동산 매입 좋은 시기.",
            "relationship": "결혼운 좋음. 가정 경제 안정. 배우자 덕.",
            "health": "전반적으로 건강. 정기검진 권장.",
            "advice": "안정 속에서 미래를 준비하세요. 이 시기의 저축이 노후를 보장합니다."
        },
        "편관": {
            "theme": "시련과 성장의 시기",
            "career": "경쟁 심화, 압박 증가. 그러나 극복하면 크게 성장. 법적 문제 주의.",
            "wealth": "예상치 못한 지출. 소송, 벌금 가능성. 보험 점검.",
            "relationship": "권력 다툼, 갈등. 양보와 타협 필요.",
            "health": "사고, 수술 가능성. 정기검진 필수. 안전 최우선.",
            "advice": "도전을 피하지 말고 정면 돌파하세요. 이 시련이 당신을 더 강하게 만듭니다."
        },
        "정관": {
            "theme": "성취와 인정의 시기",
            "career": "승진, 합격, 성취. 사회적 지위 상승. 리더십 발휘.",
            "wealth": "정당한 보상. 급여 인상. 안정적 자산 증가.",
            "relationship": "결혼운 좋음. 사회적 인정으로 자존감 상승.",
            "health": "과중한 책임으로 인한 스트레스. 휴식 필요.",
            "advice": "책임감 있게 역할을 수행하세요. 이 시기의 신뢰가 평생의 자산입니다."
        },
        "편인": {
            "theme": "학습과 변화의 시기",
            "career": "전문성 강화, 자격증 취득 좋음. 독특한 분야 발전.",
            "wealth": "불규칙한 수입. 부업, 투잡 가능.",
            "relationship": "외로움을 느낄 수 있음. 내면 성찰의 시간.",
            "health": "우울, 불안 주의. 정신건강 관리 중요.",
            "advice": "배움에 투자하세요. 이 시기에 쌓은 지식이 다음 운에서 빛납니다."
        },
        "정인": {
            "theme": "지혜와 보호의 시기",
            "career": "학업 성취, 연구 발전. 귀인의 도움. 멘토 만남.",
            "wealth": "안정적이나 큰 변화 없음. 부모님 유산 가능성.",
            "relationship": "어른들의 도움. 결혼 시 중매 좋음.",
            "health": "정신적 안정. 명상, 종교 활동 좋음.",
            "advice": "감사하는 마음으로 받은 것을 나누세요. 베푸는 만큼 돌아옵니다."
        }
    }

    for ss, data in sipsung_daeun.items():
        interpretations.append({
            "id": f"daeun_{ss}",
            "type": "대운",
            "sipsung": ss,
            "theme": data["theme"],
            "career": data["career"],
            "wealth": data["wealth"],
            "relationship": data["relationship"],
            "health": data["health"],
            "advice": data["advice"],
            "duration": "10년",
            "full_text": f"대운 {ss} ({data['theme']}): 직업운 - {data['career']} 재물운 - {data['wealth']} 관계운 - {data['relationship']} 건강운 - {data['health']} 조언 - {data['advice']}"
        })

    return interpretations


def generate_seun_interpretations():
    """세운(연운) 상세 해석"""
    interpretations = []

    sipsung_seun = {
        "비견": {
            "theme": "경쟁과 자립",
            "overall": "올해는 독립심이 강해지고 경쟁이 치열해집니다. 형제, 친구, 동료와의 관계에서 갈등이 생기기 쉽습니다.",
            "monthly_peak": "인월(2월), 묘월(3월)",
            "lucky_months": "5월, 6월 - 식신 에너지와 조화",
            "caution_months": "8월, 9월 - 편관과 충돌",
            "action": "단독 프로젝트 추진, 개인 역량 강화에 집중"
        },
        "겁재": {
            "theme": "변화와 도전",
            "overall": "올해는 큰 변화가 예상됩니다. 재물 손실을 조심하고, 보증이나 투자는 피하세요.",
            "monthly_peak": "묘월(3월), 유월(9월)",
            "lucky_months": "4월, 5월 - 식신/상관과 균형",
            "caution_months": "7월, 10월 - 편재와 충돌로 손실 위험",
            "action": "현상 유지, 새로운 시작보다 마무리에 집중"
        },
        "식신": {
            "theme": "풍요와 여유",
            "overall": "올해는 풍요롭고 여유로운 한 해입니다. 창작 활동, 취미 생활이 빛을 발합니다.",
            "monthly_peak": "사월(4월), 오월(5월)",
            "lucky_months": "전반적으로 좋으나 특히 여름",
            "caution_months": "11월, 12월 - 겨울 건강 주의",
            "action": "새로운 시작, 창업, 연애 모두 좋음"
        },
        "상관": {
            "theme": "표현과 변혁",
            "overall": "올해는 자기표현 욕구가 강해집니다. 창의적이지만 충돌도 많은 해입니다.",
            "monthly_peak": "오월(5월), 미월(6월)",
            "lucky_months": "3월, 4월 - 봄의 에너지와 조화",
            "caution_months": "1월, 2월 - 정관과 충돌, 직장 갈등 주의",
            "action": "예술 활동, 프리랜서 전환 고려"
        },
        "편재": {
            "theme": "투자와 기회",
            "overall": "올해는 재물 기회가 많습니다. 하지만 들어오는 만큼 나가기도 쉽습니다.",
            "monthly_peak": "신월(8월), 유월(9월)",
            "lucky_months": "가을 전반 - 금 에너지 왕성",
            "caution_months": "3월, 4월 - 목 에너지와 충돌",
            "action": "적극적 투자, 영업 활동, 사업 확장"
        },
        "정재": {
            "theme": "안정과 축적",
            "overall": "올해는 재정적으로 안정되고 저축이 늘어나는 해입니다.",
            "monthly_peak": "술월(9월), 축월(12월)",
            "lucky_months": "연중 안정적",
            "caution_months": "특별히 나쁜 달 없음",
            "action": "부동산 매입, 저축, 결혼 좋음"
        },
        "편관": {
            "theme": "시련과 성장",
            "overall": "올해는 도전과 시련이 예상됩니다. 건강과 안전에 주의하세요.",
            "monthly_peak": "인월(2월), 신월(8월)",
            "lucky_months": "5월, 6월 - 식신의 제어로 균형",
            "caution_months": "2월, 8월 - 편관 에너지 극대화",
            "action": "건강검진, 보험 정비, 법적 문제 예방"
        },
        "정관": {
            "theme": "성취와 인정",
            "overall": "올해는 사회적 성취와 인정을 받는 해입니다. 승진, 합격 가능성 높음.",
            "monthly_peak": "유월(9월), 해월(11월)",
            "lucky_months": "가을~겨울 전반",
            "caution_months": "4월, 5월 - 상관과 충돌 주의",
            "action": "시험, 면접, 승진 도전에 최적"
        },
        "편인": {
            "theme": "학습과 변화",
            "overall": "올해는 배움과 자기개발에 좋은 해입니다. 새로운 분야 도전.",
            "monthly_peak": "해월(11월), 자월(12월)",
            "lucky_months": "겨울~봄",
            "caution_months": "여름 - 화 에너지와 충돌",
            "action": "자격증, 어학, 전문기술 습득"
        },
        "정인": {
            "theme": "보호와 지혜",
            "overall": "올해는 귀인의 도움과 보호를 받는 해입니다. 학업 성취 우수.",
            "monthly_peak": "자월(12월), 축월(1월)",
            "lucky_months": "연초와 연말",
            "caution_months": "6월, 7월 - 편재와 충돌",
            "action": "진학, 연구, 종교/철학 탐구"
        }
    }

    for ss, data in sipsung_seun.items():
        interpretations.append({
            "id": f"seun_{ss}",
            "type": "세운",
            "sipsung": ss,
            "theme": data["theme"],
            "overall": data["overall"],
            "monthly_peak": data["monthly_peak"],
            "lucky_months": data["lucky_months"],
            "caution_months": data["caution_months"],
            "action": data["action"],
            "duration": "1년",
            "full_text": f"세운 {ss} ({data['theme']}): {data['overall']} 활동 최적기 - {data['monthly_peak']}, 행운의 달 - {data['lucky_months']}, 주의할 달 - {data['caution_months']}, 행동지침 - {data['action']}"
        })

    return interpretations


# =============================================================================
# 2. 격국/용신 심화 해석
# =============================================================================

def generate_geokguk_interpretations():
    """격국 상세 해석"""
    interpretations = []

    geokguk_data = {
        "정관격": {
            "description": "정관이 월지에서 투출하거나 월지 장간에 정관이 있는 격",
            "personality": "책임감 있고 정직하며 규칙을 중시합니다. 리더십이 있고 사회적 인정을 받으려 합니다.",
            "career": "공무원, 대기업, 법조계, 행정직 적합. 조직 내에서 승진하며 성장.",
            "wealth": "안정적이고 정당한 수입. 급격한 변화보다 꾸준한 축적.",
            "relationship": "예의 바르고 신뢰할 수 있는 파트너. 결혼 후 가정에 충실.",
            "strengths": "신뢰성, 책임감, 조직력, 도덕성",
            "weaknesses": "융통성 부족, 권위주의, 변화 두려움",
            "yongsin": "정관을 보호하는 인성이 용신이 되기 쉬움",
            "advice": "규칙을 지키되 유연성도 기르세요. 권위에 집착하지 마세요."
        },
        "편관격": {
            "description": "편관(칠살)이 월지에서 투출하거나 월지 장간에 편관이 있는 격",
            "personality": "강인하고 추진력이 있으며 도전적입니다. 권력 지향적이지만 정의감도 강합니다.",
            "career": "군인, 경찰, 검찰, 외과의사, 스포츠선수. 경쟁적 환경에서 두각.",
            "wealth": "위험을 감수한 투자로 큰 수익 가능. 하지만 손실도 클 수 있음.",
            "relationship": "지배적일 수 있으나 보호 본능 강함. 갈등 시 격렬.",
            "strengths": "결단력, 추진력, 용기, 정의감",
            "weaknesses": "폭력성, 충동성, 독선",
            "yongsin": "식신이 편관을 제어하는 식신제살이 이상적",
            "advice": "힘을 정의롭게 사용하세요. 분노 조절이 성공의 열쇠입니다."
        },
        "정인격": {
            "description": "정인이 월지에서 투출하거나 월지 장간에 정인이 있는 격",
            "personality": "지적이고 학문을 좋아하며 온화합니다. 어머니나 귀인의 도움을 받습니다.",
            "career": "교육자, 연구원, 학자, 의사. 지적 직업에서 성공.",
            "wealth": "안정적이나 큰 욕심 없음. 지적 성취가 재물보다 중요.",
            "relationship": "헌신적이고 이해심 깊음. 과보호 경향 주의.",
            "strengths": "지혜, 학습능력, 인내, 배려",
            "weaknesses": "우유부단, 소극적, 의존적",
            "yongsin": "인성을 생하는 관성이 용신이 되기 쉬움",
            "advice": "배움을 나누세요. 지식은 공유할 때 더 커집니다."
        },
        "편인격": {
            "description": "편인이 월지에서 투출하거나 월지 장간에 편인이 있는 격",
            "personality": "독창적이고 비범하며 예술적입니다. 독특한 관점을 가집니다.",
            "career": "예술가, 철학자, 종교인, 점술가, 의료인. 비주류 분야 성공.",
            "wealth": "불규칙하지만 독특한 방법으로 수입 가능.",
            "relationship": "고독을 즐기며 깊은 관계 소수만 유지.",
            "strengths": "창의성, 직관력, 독립성, 영성",
            "weaknesses": "고립, 기이함, 사회 부적응",
            "yongsin": "편인의 단점을 제어하는 편재가 용신이 될 수 있음",
            "advice": "독특함을 장점으로 살리되 현실과의 연결고리를 유지하세요."
        },
        "식신격": {
            "description": "식신이 월지에서 투출하거나 월지 장간에 식신이 있는 격",
            "personality": "낙천적이고 여유로우며 창의적입니다. 표현력이 풍부합니다.",
            "career": "요리사, 예술가, 작가, 교육자. 창작과 표현 분야 적합.",
            "wealth": "안정적 수입. 먹고 사는 것에 부족함 없음.",
            "relationship": "다정다감하고 배려심 깊음. 좋은 부모가 됨.",
            "strengths": "창의력, 표현력, 낙관, 포용력",
            "weaknesses": "게으름, 탐식, 현실 안주",
            "yongsin": "식신을 생하는 비겁이나 식신이 생하는 재성",
            "advice": "여유를 즐기되 나태해지지 마세요. 재능을 낭비하지 마세요."
        },
        "상관격": {
            "description": "상관이 월지에서 투출하거나 월지 장간에 상관이 있는 격",
            "personality": "총명하고 언변이 좋으며 반항적입니다. 기존 질서에 도전합니다.",
            "career": "변호사, 기자, 비평가, 혁신가. 말과 글로 승부.",
            "wealth": "기복이 있지만 능력으로 큰 부 가능.",
            "relationship": "매력적이지만 갈등도 많음. 이혼 가능성 주의.",
            "strengths": "언변, 창의력, 비판력, 혁신",
            "weaknesses": "반항, 불손, 독설, 관계 파탄",
            "yongsin": "상관을 제어하는 인성이나 상관생재 구조",
            "advice": "날카로운 혀를 지혜롭게 사용하세요. 파괴보다 창조에 집중."
        },
        "정재격": {
            "description": "정재가 월지에서 투출하거나 월지 장간에 정재가 있는 격",
            "personality": "근면 성실하고 검소합니다. 현실적이고 실용적.",
            "career": "회계사, 은행원, 사업가. 재정 관리 능력 탁월.",
            "wealth": "꾸준히 모으며 안정적 자산 형성. 부자 가능성 높음.",
            "relationship": "헌신적이고 가정적. 배우자 복 있음.",
            "strengths": "근면, 절약, 현실감각, 신뢰성",
            "weaknesses": "인색, 소심, 보수적, 재미없음",
            "yongsin": "재성을 생하는 식상이나 재성을 보호하는 관성",
            "advice": "돈 모으는 것도 좋지만 적절히 쓸 줄도 아세요."
        },
        "편재격": {
            "description": "편재가 월지에서 투출하거나 월지 장간에 편재가 있는 격",
            "personality": "사교적이고 활동적이며 기회 포착 능력이 뛰어납니다.",
            "career": "영업, 무역, 투자, 연예. 사람 상대하는 일 적합.",
            "wealth": "큰 돈이 들어오고 나가는 구조. 투자 재능.",
            "relationship": "이성 인연 많음. 바람기 주의.",
            "strengths": "사교성, 적응력, 모험심, 기회 포착",
            "weaknesses": "낭비, 바람기, 신뢰 부족",
            "yongsin": "편재를 컨트롤하는 비겁이나 생하는 식상",
            "advice": "기회를 잡되 탐욕은 경계하세요. 신용을 지키세요."
        },
        "건록격": {
            "description": "일간이 월지에 녹(祿)을 얻은 격. 자기 자리에서 강함.",
            "personality": "자신감 있고 독립적이며 자수성가형입니다.",
            "career": "어떤 분야든 자기 역량으로 성공. 전문직 적합.",
            "wealth": "자신의 노력으로 재물 획득.",
            "relationship": "독립적이라 의존하지 않음. 평등한 관계 선호.",
            "strengths": "자신감, 독립성, 추진력, 건강",
            "weaknesses": "고집, 자만, 타인 무시",
            "yongsin": "식상이나 재성으로 에너지 발산",
            "advice": "혼자서도 잘하지만 협력하면 더 큽니다."
        },
        "양인격": {
            "description": "일간이 월지에 양인(羊刃)을 얻은 격. 에너지가 극강.",
            "personality": "강인하고 과감하며 위험을 두려워하지 않습니다.",
            "career": "군인, 외과의, 운동선수, 위험직종. 극한 환경에서 빛남.",
            "wealth": "큰 투자로 큰 수익. 도박적 요소.",
            "relationship": "강렬하지만 폭풍 같은 관계.",
            "strengths": "용기, 결단력, 강인함, 돌파력",
            "weaknesses": "폭력성, 무모함, 파괴성",
            "yongsin": "양인을 제어하는 관성이 필수",
            "advice": "칼날 같은 에너지를 정의롭게 사용하세요."
        }
    }

    for name, data in geokguk_data.items():
        interpretations.append({
            "id": f"geokguk_{name}",
            "name": name,
            "type": "격국",
            **data,
            "full_text": f"{name}: {data['description']} 성격 - {data['personality']} 직업 - {data['career']} 재물 - {data['wealth']} 관계 - {data['relationship']} 강점 - {data['strengths']} 약점 - {data['weaknesses']} 용신 - {data['yongsin']} 조언 - {data['advice']}"
        })

    return interpretations


def generate_yongsin_interpretations():
    """용신 상세 해석"""
    interpretations = []

    # 일간별 용신 판단 기준
    ilgan_yongsin = {
        "갑": {
            "strong_case": {
                "yongsin": ["금", "화"],
                "description": "갑목이 강하면 금(편관/정관)으로 제어하거나 화(식신/상관)로 설기",
                "career": "법조계, 공무원, 예술가, 교육자",
                "advice": "강한 에너지를 사회적으로 발산하세요"
            },
            "weak_case": {
                "yongsin": ["수", "목"],
                "description": "갑목이 약하면 수(인성)로 생하거나 목(비겁)으로 도움",
                "career": "교육, 연구, 상담, 협동사업",
                "advice": "내면을 키우고 동료와 협력하세요"
            }
        },
        "을": {
            "strong_case": {
                "yongsin": ["금", "화"],
                "description": "을목이 강하면 금(관성)이나 화(식상)가 필요",
                "career": "예술, 서비스업, 의료, 패션",
                "advice": "유연함을 유지하며 기회를 잡으세요"
            },
            "weak_case": {
                "yongsin": ["수", "목"],
                "description": "을목이 약하면 수(인성)나 목(비겁)이 필요",
                "career": "교육, 복지, 환경, 농업",
                "advice": "자기 뿌리를 강화하세요"
            }
        },
        "병": {
            "strong_case": {
                "yongsin": ["수", "토"],
                "description": "병화가 강하면 수(관성)로 제어하거나 토(식상)로 설기",
                "career": "언론, 방송, 외교, 요식업",
                "advice": "뜨거운 열정을 지혜롭게 사용하세요"
            },
            "weak_case": {
                "yongsin": ["목", "화"],
                "description": "병화가 약하면 목(인성)이나 화(비겁)가 필요",
                "career": "교육, 종교, 철학, 예술",
                "advice": "내면의 불꽃을 키우세요"
            }
        },
        "정": {
            "strong_case": {
                "yongsin": ["수", "토"],
                "description": "정화가 강하면 수(관성)나 토(식상)가 필요",
                "career": "예술, 디자인, 조명, 정밀기술",
                "advice": "섬세한 빛을 세상에 비추세요"
            },
            "weak_case": {
                "yongsin": ["목", "화"],
                "description": "정화가 약하면 목(인성)이나 화(비겁)가 필요",
                "career": "문학, 심리, 상담, 치료",
                "advice": "작은 불꽃도 어둠을 밝힙니다"
            }
        },
        "무": {
            "strong_case": {
                "yongsin": ["목", "금"],
                "description": "무토가 강하면 목(관성)으로 소토하거나 금(식상)으로 설기",
                "career": "건축, 부동산, 농업, 제조업",
                "advice": "단단한 기반 위에 유연함을 더하세요"
            },
            "weak_case": {
                "yongsin": ["화", "토"],
                "description": "무토가 약하면 화(인성)나 토(비겁)가 필요",
                "career": "교육, 중재, 부동산 관리",
                "advice": "중심을 잡고 흔들리지 마세요"
            }
        },
        "기": {
            "strong_case": {
                "yongsin": ["목", "금"],
                "description": "기토가 강하면 목(관성)이나 금(식상)이 필요",
                "career": "농업, 식품, 원예, 환경",
                "advice": "비옥한 토양처럼 많은 것을 키우세요"
            },
            "weak_case": {
                "yongsin": ["화", "토"],
                "description": "기토가 약하면 화(인성)나 토(비겁)가 필요",
                "career": "교육, 요식업, 서비스업",
                "advice": "자기 자리에서 성실히 일하세요"
            }
        },
        "경": {
            "strong_case": {
                "yongsin": ["화", "수"],
                "description": "경금이 강하면 화(관성)로 제련하거나 수(식상)로 설기",
                "career": "법조계, 금융, 제조업, IT",
                "advice": "강철 같은 의지를 정제하세요"
            },
            "weak_case": {
                "yongsin": ["토", "금"],
                "description": "경금이 약하면 토(인성)나 금(비겁)이 필요",
                "career": "기술직, 엔지니어링, 연구",
                "advice": "기반을 다지고 전문성을 쌓으세요"
            }
        },
        "신": {
            "strong_case": {
                "yongsin": ["화", "수"],
                "description": "신금이 강하면 화(관성)나 수(식상)가 필요",
                "career": "보석, 정밀기계, 예술, 음악",
                "advice": "날카로운 재능을 빛내세요"
            },
            "weak_case": {
                "yongsin": ["토", "금"],
                "description": "신금이 약하면 토(인성)나 금(비겁)이 필요",
                "career": "공예, 디자인, 악기연주",
                "advice": "섬세함을 키우세요"
            }
        },
        "임": {
            "strong_case": {
                "yongsin": ["토", "목"],
                "description": "임수가 강하면 토(관성)로 제방하거나 목(식상)으로 설기",
                "career": "무역, 물류, 여행, 교육",
                "advice": "넘치는 에너지를 생산적으로 쓰세요"
            },
            "weak_case": {
                "yongsin": ["금", "수"],
                "description": "임수가 약하면 금(인성)이나 수(비겁)가 필요",
                "career": "연구, 철학, 상담, IT",
                "advice": "지혜의 샘을 채우세요"
            }
        },
        "계": {
            "strong_case": {
                "yongsin": ["토", "목"],
                "description": "계수가 강하면 토(관성)나 목(식상)이 필요",
                "career": "의료, 심리, 비서, 보조직",
                "advice": "섬세한 감수성을 활용하세요"
            },
            "weak_case": {
                "yongsin": ["금", "수"],
                "description": "계수가 약하면 금(인성)이나 수(비겁)가 필요",
                "career": "학문, 예술, 치료, 종교",
                "advice": "작은 물방울이 바위를 뚫습니다"
            }
        }
    }

    for ilgan, cases in ilgan_yongsin.items():
        for case_type, data in cases.items():
            case_name = "신강" if case_type == "strong_case" else "신약"
            interpretations.append({
                "id": f"yongsin_{ilgan}_{case_type}",
                "ilgan": ilgan,
                "case": case_name,
                "yongsin_elements": data["yongsin"],
                "description": data["description"],
                "career": data["career"],
                "advice": data["advice"],
                "full_text": f"일간 {ilgan}이 {case_name}일 때: {data['description']} 용신은 {', '.join(data['yongsin'])}. 적합 직업 - {data['career']}. 조언 - {data['advice']}"
            })

    return interpretations


# =============================================================================
# 3. 특수 신살 상세 해석
# =============================================================================

def generate_shinsal_interpretations():
    """신살 상세 해석"""
    interpretations = []

    shinsal_data = {
        "천을귀인": {
            "category": "길신",
            "description": "하늘이 내린 귀한 사람. 어려울 때 귀인이 나타나 돕습니다.",
            "effect": "위기 시 구원, 귀인 도움, 사회적 존경",
            "career": "모든 분야에서 귀인 만남. 특히 공직, 대기업 유리.",
            "relationship": "좋은 배우자, 후원자 만남",
            "health": "위험에서 보호받음",
            "advice": "받은 은혜를 베풀면 더 큰 복이 옵니다"
        },
        "천덕귀인": {
            "category": "길신",
            "description": "하늘의 덕을 받은 사람. 자연스럽게 복이 따릅니다.",
            "effect": "액운 해소, 자연스러운 행운, 덕망",
            "career": "종교, 교육, 봉사 분야 적합",
            "relationship": "덕으로 사람을 모음",
            "health": "병이 있어도 잘 낫음",
            "advice": "덕을 쌓으면 복은 저절로 옵니다"
        },
        "월덕귀인": {
            "category": "길신",
            "description": "달의 덕을 받은 사람. 부드럽고 포용력 있음.",
            "effect": "액막이, 부드러운 성품, 모성애",
            "career": "교육, 의료, 상담 적합",
            "relationship": "가정 화목, 좋은 어머니/아버지",
            "health": "정신적 안정",
            "advice": "부드러움이 강함을 이깁니다"
        },
        "문창귀인": {
            "category": "길신",
            "description": "학문과 글재주의 별. 공부와 시험에 강합니다.",
            "effect": "학업 성취, 시험 합격, 문서운",
            "career": "학자, 작가, 교사, 공무원 적합",
            "relationship": "지적인 대화 중시",
            "health": "정신 활동 왕성",
            "advice": "배움을 멈추지 마세요. 평생 공부가 행운입니다."
        },
        "학당귀인": {
            "category": "길신",
            "description": "배움의 전당. 학교와 교육에서 빛납니다.",
            "effect": "학업운, 자격증, 교육 분야 성공",
            "career": "교육자, 강사, 연구원",
            "relationship": "스승 복, 제자 복",
            "health": "두뇌 건강",
            "advice": "가르치는 것이 배우는 것입니다"
        },
        "역마살": {
            "category": "중성신살",
            "description": "이동과 변화의 별. 한 곳에 머물지 않습니다.",
            "effect": "잦은 이동, 해외 인연, 변화 많음",
            "career": "무역, 여행, 운송, 외교관 적합",
            "relationship": "원거리 연애, 잦은 이별",
            "health": "교통사고 주의",
            "advice": "움직임 속에서 기회를 잡으세요. 정착보다 유동성."
        },
        "화개살": {
            "category": "중성신살",
            "description": "예술과 종교의 별. 화려하지만 고독합니다.",
            "effect": "예술적 재능, 종교심, 고독",
            "career": "예술가, 종교인, 철학자 적합",
            "relationship": "깊은 관계 소수, 정신적 교류 중시",
            "health": "정신건강 관리 필요",
            "advice": "고독은 창조의 어머니입니다. 예술로 승화하세요."
        },
        "도화살": {
            "category": "중성신살",
            "description": "아름다움과 매력의 별. 이성을 끌어당깁니다.",
            "effect": "이성 인기, 예술적 감각, 유혹",
            "career": "연예, 서비스, 영업 적합",
            "relationship": "연애 많음, 삼각관계 주의",
            "health": "성병, 과음 주의",
            "advice": "매력을 올바르게 사용하세요. 탐욕은 화를 부릅니다."
        },
        "양인살": {
            "category": "흉신",
            "description": "칼날의 별. 강한 에너지지만 위험합니다.",
            "effect": "결단력, 추진력, 사고 위험",
            "career": "군인, 외과의, 스포츠선수",
            "relationship": "갈등 많음, 이혼 가능성",
            "health": "수술, 사고 주의",
            "advice": "칼날 같은 에너지를 정의롭게 쓰세요. 분노 조절 필수."
        },
        "겁살": {
            "category": "흉신",
            "description": "두려움과 손실의 별. 예상치 못한 재난.",
            "effect": "사기, 도난, 급작스러운 손실",
            "career": "보안, 보험 관련 종사",
            "relationship": "배신 주의",
            "health": "급성 질환 주의",
            "advice": "보험 들고, 계약서 꼼꼼히, 보증 서지 마세요."
        },
        "재살": {
            "category": "흉신",
            "description": "재앙과 재물손실의 별.",
            "effect": "재물 손실, 소송, 벌금",
            "career": "법무, 회계 관련 주의",
            "relationship": "금전 문제로 갈등",
            "health": "스트레스성 질환",
            "advice": "욕심을 줄이고 정도를 걸으세요."
        },
        "천살": {
            "category": "흉신",
            "description": "하늘의 재앙. 갑작스러운 불운.",
            "effect": "불의의 사고, 자연재해",
            "career": "위험직종 주의",
            "relationship": "이별, 사별",
            "health": "건강검진 필수",
            "advice": "안전 제일. 무리한 도전 자제."
        },
        "지살": {
            "category": "흉신",
            "description": "땅의 재앙. 부동산, 주거 문제.",
            "effect": "부동산 손실, 이사 문제",
            "career": "부동산 투자 주의",
            "relationship": "가정 불화",
            "health": "다리, 허리 건강 주의",
            "advice": "땅 관련 투자 신중히. 임대차 계약 꼼꼼히."
        },
        "원진살": {
            "category": "흉신",
            "description": "원한과 갈등의 별. 관계 트러블.",
            "effect": "인간관계 갈등, 소송",
            "career": "서비스업 주의",
            "relationship": "오해, 배신",
            "health": "스트레스",
            "advice": "말조심, 관계 정리 필요할 수 있음."
        },
        "백호살": {
            "category": "흉신",
            "description": "흰 호랑이의 기운. 피를 보는 살.",
            "effect": "수술, 교통사고, 유혈사고",
            "career": "외과의, 정육업은 오히려 좋음",
            "relationship": "배우자 건강 주의",
            "health": "수술 가능성, 헌혈로 해소",
            "advice": "정기적 헌혈, 건강검진으로 액막이."
        },
        "괴강살": {
            "category": "특수",
            "description": "하늘과 땅의 강한 기운. 극단적 운명.",
            "effect": "대성공 또는 대실패, 극단적 삶",
            "career": "CEO, 정치인, 예술가",
            "relationship": "지배적, 파란만장",
            "health": "강건하나 과로 주의",
            "advice": "중용의 도를 지키세요. 극단은 피하세요."
        }
    }

    for name, data in shinsal_data.items():
        interpretations.append({
            "id": f"shinsal_{name}",
            "name": name,
            "category": data["category"],
            "description": data["description"],
            "effect": data["effect"],
            "career": data["career"],
            "relationship": data["relationship"],
            "health": data["health"],
            "advice": data["advice"],
            "full_text": f"신살 {name} ({data['category']}): {data['description']} 효과 - {data['effect']} 직업 - {data['career']} 관계 - {data['relationship']} 건강 - {data['health']} 조언 - {data['advice']}"
        })

    return interpretations


# =============================================================================
# 4. 트랜짓 조합별 상세 해석 (점성학)
# =============================================================================

def generate_detailed_transit_interpretations():
    """트랜짓 상세 해석 (외행성 → 내행성/각도)"""
    interpretations = []

    outer_planets = {
        "Jupiter": {"ko": "목성", "theme": "확장, 행운, 성장"},
        "Saturn": {"ko": "토성", "theme": "제한, 책임, 성숙"},
        "Uranus": {"ko": "천왕성", "theme": "변화, 혁신, 자유"},
        "Neptune": {"ko": "해왕성", "theme": "영감, 환상, 혼란"},
        "Pluto": {"ko": "명왕성", "theme": "변환, 재생, 권력"}
    }

    natal_points = {
        "Sun": {"ko": "태양", "area": "자아, 정체성"},
        "Moon": {"ko": "달", "area": "감정, 무의식"},
        "Mercury": {"ko": "수성", "area": "사고, 소통"},
        "Venus": {"ko": "금성", "area": "사랑, 가치"},
        "Mars": {"ko": "화성", "area": "행동, 의지"},
        "ASC": {"ko": "상승점", "area": "외모, 첫인상"},
        "MC": {"ko": "천정", "area": "직업, 사회적 위치"}
    }

    aspects = {
        "conjunction": {"ko": "합", "effect": "강력한 융합, 새로운 시작"},
        "opposition": {"ko": "충", "effect": "긴장, 인식, 균형 필요"},
        "square": {"ko": "사각", "effect": "도전, 성장 압력"},
        "trine": {"ko": "삼합", "effect": "조화, 자연스러운 흐름"},
        "sextile": {"ko": "육합", "effect": "기회, 부드러운 자극"}
    }

    # 주요 조합 상세 해석
    transit_details = {
        ("Jupiter", "Sun", "conjunction"): {
            "theme": "자아 확장의 절정",
            "duration": "약 2주 (오브 5도 기준)",
            "positive": "자신감 폭발, 성공 기회, 인정받음",
            "challenge": "과대망상, 과욕 주의",
            "advice": "기회를 잡되 겸손을 유지하세요. 약속은 신중히."
        },
        ("Jupiter", "Moon", "conjunction"): {
            "theme": "감정적 풍요",
            "duration": "약 2주",
            "positive": "정서적 만족, 가정 행복, 임신 가능",
            "challenge": "감정 과잉, 과식 주의",
            "advice": "가족과 시간을 보내세요. 집 관련 좋은 시기."
        },
        ("Saturn", "Sun", "conjunction"): {
            "theme": "책임과 성숙의 시험",
            "duration": "약 1-2개월",
            "positive": "성숙, 인정, 장기 성취",
            "challenge": "우울, 제한, 건강 주의",
            "advice": "인내하세요. 이 시기를 통과하면 더 강해집니다."
        },
        ("Saturn", "Moon", "conjunction"): {
            "theme": "감정적 시련",
            "duration": "약 1-2개월",
            "positive": "감정 성숙, 내면 정리",
            "challenge": "우울, 고독, 가정 문제",
            "advice": "혼자만의 시간이 필요합니다. 과거를 정리하세요."
        },
        ("Uranus", "Sun", "conjunction"): {
            "theme": "정체성 혁명",
            "duration": "약 1년",
            "positive": "자유, 각성, 새로운 시작",
            "challenge": "불안정, 돌발 상황",
            "advice": "변화를 두려워하지 마세요. 새로운 당신이 됩니다."
        },
        ("Uranus", "Moon", "conjunction"): {
            "theme": "감정적 해방",
            "duration": "약 1년",
            "positive": "자유로운 감정, 독립",
            "challenge": "불안, 가정 변화",
            "advice": "익숙한 것과의 이별이 필요할 수 있습니다."
        },
        ("Neptune", "Sun", "conjunction"): {
            "theme": "자아의 용해와 재창조",
            "duration": "약 2년",
            "positive": "영감, 영성, 예술적 표현",
            "challenge": "혼란, 자기기만, 건강 불명확",
            "advice": "명상과 예술 활동이 좋습니다. 중요한 결정은 미루세요."
        },
        ("Neptune", "Moon", "conjunction"): {
            "theme": "감정의 바다",
            "duration": "약 2년",
            "positive": "직관 강화, 영적 성장",
            "challenge": "감정 혼란, 의존성",
            "advice": "현실과 환상을 구분하세요. 술, 약물 주의."
        },
        ("Pluto", "Sun", "conjunction"): {
            "theme": "완전한 변환",
            "duration": "약 2-3년",
            "positive": "재탄생, 권력, 심층 변화",
            "challenge": "강박, 권력투쟁, 위기",
            "advice": "낡은 자아를 죽이고 새로운 자아로 다시 태어나세요."
        },
        ("Pluto", "Moon", "conjunction"): {
            "theme": "감정의 심연 탐험",
            "duration": "약 2-3년",
            "positive": "감정 정화, 심리적 통찰",
            "challenge": "집착, 조종, 가족 위기",
            "advice": "심리치료가 도움됩니다. 과거의 상처를 치유하세요."
        }
    }

    # 기본 조합 생성
    for outer, outer_data in outer_planets.items():
        for natal, natal_data in natal_points.items():
            for asp, asp_data in aspects.items():
                key = (outer, natal, asp)
                detail = transit_details.get(key, {})

                base_interpretation = {
                    "id": f"transit_{outer}_{asp}_{natal}",
                    "transit_planet": outer,
                    "transit_planet_ko": outer_data["ko"],
                    "natal_point": natal,
                    "natal_point_ko": natal_data["ko"],
                    "aspect": asp,
                    "aspect_ko": asp_data["ko"],
                    "theme": detail.get("theme", f"{outer_data['ko']}이 {natal_data['ko']}과 {asp_data['ko']}"),
                    "duration": detail.get("duration", f"행성에 따라 다름"),
                    "positive": detail.get("positive", f"{outer_data['theme']}의 긍정적 영향이 {natal_data['area']}에 작용"),
                    "challenge": detail.get("challenge", f"주의 필요한 부분 있음"),
                    "advice": detail.get("advice", f"이 에너지를 의식적으로 활용하세요"),
                    "full_text": f"트랜짓 {outer_data['ko']} {asp_data['ko']} 네이탈 {natal_data['ko']}: {detail.get('theme', outer_data['theme'])} | {detail.get('positive', '기회')} | {detail.get('challenge', '주의')} | {detail.get('advice', '활용하세요')}"
                }

                interpretations.append(base_interpretation)

    return interpretations


# =============================================================================
# 메인 함수
# =============================================================================

def main():
    """메인 실행 함수"""
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

    saju_output_dir = os.path.join(os.path.dirname(__file__), '..', 'backend_ai', 'data', 'graph', 'saju', 'interpretations')
    astro_output_dir = os.path.join(os.path.dirname(__file__), '..', 'backend_ai', 'data', 'graph', 'astro_database', 'interpretations')

    os.makedirs(saju_output_dir, exist_ok=True)
    os.makedirs(astro_output_dir, exist_ok=True)

    print("=== 심화 해석 코퍼스 생성 ===\n")

    # 1. 대운 해석
    print("1. 대운 해석 생성 중...")
    daeun = generate_daeun_interpretations()
    with open(os.path.join(saju_output_dir, 'daeun_detailed.json'), 'w', encoding='utf-8') as f:
        json.dump({"meta": {"type": "daeun", "count": len(daeun)}, "interpretations": daeun}, f, ensure_ascii=False, indent=2)
    print(f"   ✓ {len(daeun)}개 생성 완료")

    # 2. 세운 해석
    print("2. 세운 해석 생성 중...")
    seun = generate_seun_interpretations()
    with open(os.path.join(saju_output_dir, 'seun_detailed.json'), 'w', encoding='utf-8') as f:
        json.dump({"meta": {"type": "seun", "count": len(seun)}, "interpretations": seun}, f, ensure_ascii=False, indent=2)
    print(f"   ✓ {len(seun)}개 생성 완료")

    # 3. 격국 해석
    print("3. 격국 해석 생성 중...")
    geokguk = generate_geokguk_interpretations()
    with open(os.path.join(saju_output_dir, 'geokguk_detailed.json'), 'w', encoding='utf-8') as f:
        json.dump({"meta": {"type": "geokguk", "count": len(geokguk)}, "interpretations": geokguk}, f, ensure_ascii=False, indent=2)
    print(f"   ✓ {len(geokguk)}개 생성 완료")

    # 4. 용신 해석
    print("4. 용신 해석 생성 중...")
    yongsin = generate_yongsin_interpretations()
    with open(os.path.join(saju_output_dir, 'yongsin_detailed.json'), 'w', encoding='utf-8') as f:
        json.dump({"meta": {"type": "yongsin", "count": len(yongsin)}, "interpretations": yongsin}, f, ensure_ascii=False, indent=2)
    print(f"   ✓ {len(yongsin)}개 생성 완료")

    # 5. 신살 해석
    print("5. 신살 해석 생성 중...")
    shinsal = generate_shinsal_interpretations()
    with open(os.path.join(saju_output_dir, 'shinsal_detailed.json'), 'w', encoding='utf-8') as f:
        json.dump({"meta": {"type": "shinsal", "count": len(shinsal)}, "interpretations": shinsal}, f, ensure_ascii=False, indent=2)
    print(f"   ✓ {len(shinsal)}개 생성 완료")

    # 6. 트랜짓 상세 해석
    print("6. 트랜짓 상세 해석 생성 중...")
    transits = generate_detailed_transit_interpretations()
    with open(os.path.join(astro_output_dir, 'transits_comprehensive.json'), 'w', encoding='utf-8') as f:
        json.dump({"meta": {"type": "transits", "count": len(transits)}, "interpretations": transits}, f, ensure_ascii=False, indent=2)
    print(f"   ✓ {len(transits)}개 생성 완료")

    # 총계
    total = len(daeun) + len(seun) + len(geokguk) + len(yongsin) + len(shinsal) + len(transits)
    print(f"\n=== 총 {total}개 심화 해석 생성 완료 ===")
    print(f"사주: {saju_output_dir}")
    print(f"점성학: {astro_output_dir}")


if __name__ == "__main__":
    main()
