#!/usr/bin/env python3
"""
사주명리학 상세 해석 코퍼스 생성 스크립트
- 십성 과다/부족/위치별 해석
- 오행 균형/불균형 해석
- 지지 충/합/형/파 해석
- 신살 해석
- 대운/세운 해석
- 일주별 상세 해석
"""

import os
import json
import asyncio
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# 프로젝트 루트
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "backend_ai" / "data"
GRAPH_DIR = DATA_DIR / "graph"
SAJU_DIR = GRAPH_DIR / "saju"
OUTPUT_DIR = SAJU_DIR / "interpretations"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# 기본 데이터 정의
# ============================================================

CHEONGAN = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
JIJI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]
OHAENG = {
    "목": {"cheongan": ["갑", "을"], "jiji": ["인", "묘"], "color": "청색", "season": "봄", "direction": "동"},
    "화": {"cheongan": ["병", "정"], "jiji": ["사", "오"], "color": "적색", "season": "여름", "direction": "남"},
    "토": {"cheongan": ["무", "기"], "jiji": ["진", "술", "축", "미"], "color": "황색", "season": "환절기", "direction": "중앙"},
    "금": {"cheongan": ["경", "신"], "jiji": ["신", "유"], "color": "백색", "season": "가을", "direction": "서"},
    "수": {"cheongan": ["임", "계"], "jiji": ["해", "자"], "color": "흑색", "season": "겨울", "direction": "북"}
}

SIPSUNG = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]

PILLARS = ["년주", "월주", "일주", "시주"]
PALACES = {
    "년주": {"area": "조상궁", "age": "0-15세", "meaning": "조상, 어린시절, 사회성"},
    "월주": {"area": "부모궁", "age": "15-30세", "meaning": "부모, 청년기, 직업"},
    "일주": {"area": "배우자궁", "age": "30-45세", "meaning": "배우자, 자아, 중년기"},
    "시주": {"area": "자녀궁", "age": "45세 이후", "meaning": "자녀, 말년, 결실"}
}


# ============================================================
# 십성(十星) 상세 해석 생성기
# ============================================================

class SipsungInterpretationGenerator:
    """십성 상세 해석 생성"""

    def __init__(self):
        self.output_file = OUTPUT_DIR / "sipsung_detailed.json"

    def generate(self) -> Dict:
        """십성 완전 해석 생성"""
        print("=" * 60)
        print("십성 상세 해석 생성")
        print("=" * 60)

        result = {
            "meta": {
                "type": "sipsung_detailed_interpretation",
                "version": "2.0",
                "generated_at": datetime.now().isoformat()
            },
            "quantity_analysis": self._generate_quantity_interpretations(),
            "position_analysis": self._generate_position_interpretations(),
            "combination_analysis": self._generate_combination_interpretations(),
            "balance_analysis": self._generate_balance_interpretations()
        }

        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"저장 완료: {self.output_file}")
        return result

    def _generate_quantity_interpretations(self) -> Dict:
        """십성 과다/적정/부족 해석"""
        interpretations = {}

        sipsung_data = {
            "비견": {
                "excessive": {
                    "personality": "독립심이 지나치고 고집이 세며 타협을 잘 못합니다. 형제나 동료와의 경쟁이 심하고, 자기 주장이 너무 강해 인간관계에서 충돌이 잦습니다.",
                    "wealth": "재물이 분산되기 쉽습니다. 비견이 재성을 극하므로 들어오는 만큼 나가고, 형제나 친구에게 빌려주거나 동업으로 손실을 볼 수 있습니다.",
                    "relationship": "배우자와 힘겨루기가 있고, 결혼 후에도 독립적으로 지내려 합니다. 친구는 많지만 깊은 관계보다 넓은 교류를 선호합니다.",
                    "career": "조직 내 상하관계가 불편하고 독자적인 일을 선호합니다. 프리랜서, 자영업, 경쟁이 있는 분야에서 능력을 발휘합니다.",
                    "health": "근골격계 질환, 스트레스성 질환 주의. 과로로 인한 탈진에 조심하세요.",
                    "advice": "협력의 가치를 배우고, 양보와 타협을 연습하세요. 재물 관리에 신경 쓰고, 보증은 서지 마세요."
                },
                "moderate": {
                    "personality": "적절한 독립심과 자존감을 가지고 있습니다. 형제, 친구와 좋은 관계를 유지하며 협력과 경쟁의 균형을 잡습니다.",
                    "wealth": "스스로 일하여 재물을 얻는 능력이 있습니다. 동료나 형제와 적절히 나누면서도 본인 몫을 지킵니다.",
                    "relationship": "동등한 파트너십을 형성하고, 서로의 독립성을 존중합니다.",
                    "career": "팀워크와 개인 능력을 모두 발휘합니다. 협업하면서도 자신의 역할을 명확히 합니다.",
                    "advice": "현재의 균형을 유지하면서 더 큰 목표를 향해 나아가세요."
                },
                "deficient": {
                    "personality": "독립심이 부족하고 남에게 의지하려는 경향이 있습니다. 자기 주장이 약하고 결정을 내리기 어려워합니다.",
                    "wealth": "혼자서 재물을 일으키기 어렵고, 누군가의 도움이 필요합니다.",
                    "relationship": "의존적인 관계를 형성하기 쉽고, 형제나 친구의 인연이 약할 수 있습니다.",
                    "career": "독립적인 업무보다 조직 내 역할이 더 맞을 수 있습니다.",
                    "advice": "자존감을 키우고, 작은 것부터 스스로 결정하는 연습을 하세요. 운동이나 경쟁 활동이 도움됩니다."
                }
            },
            "겁재": {
                "excessive": {
                    "personality": "승부욕이 강하고 남의 것을 탐내는 경향이 있습니다. 투기적 성향이 있고 도박, 무리한 투자에 빠지기 쉽습니다.",
                    "wealth": "재물이 들어와도 유지가 어렵습니다. 충동적인 지출이나 투자로 손실이 생기고, 사기를 당하기도 합니다.",
                    "relationship": "형제자매와 재산 분쟁이 생기기 쉽고, 친구에게 배신당할 수 있습니다. 연인이나 배우자를 빼앗기는 일도 조심하세요.",
                    "career": "경쟁이 심한 분야에서 성공할 수 있지만, 동료와의 갈등이 잦습니다. 무리한 확장으로 실패할 수 있습니다.",
                    "health": "간, 담 관련 질환. 사고, 부상 주의.",
                    "advice": "투기를 삼가고 안정적인 재테크를 하세요. 형제나 친구와의 금전 거래는 피하는 것이 좋습니다."
                },
                "moderate": {
                    "personality": "적절한 경쟁심과 추진력이 있습니다. 목표를 향해 적극적으로 나아가면서도 선을 지킵니다.",
                    "wealth": "기회를 잡는 능력이 있고, 적절한 투자로 재물을 불릴 수 있습니다.",
                    "relationship": "형제자매와 경쟁하면서도 서로 돕는 관계입니다.",
                    "career": "경쟁 상황에서 능력을 발휘하고, 적극적으로 기회를 잡습니다.",
                    "advice": "균형을 유지하면서 건전한 경쟁을 이어가세요."
                },
                "deficient": {
                    "personality": "경쟁심이 부족하고 소극적입니다. 기회가 와도 놓치기 쉽습니다.",
                    "wealth": "적극적으로 재물을 추구하지 않아 큰 부를 쌓기 어렵습니다.",
                    "advice": "좀 더 적극적으로 기회를 잡으세요. 건전한 경쟁심을 키우는 것이 도움됩니다."
                }
            },
            "식신": {
                "excessive": {
                    "personality": "먹는 것에 집착하고 게으른 경향이 있습니다. 생각이 많고 말이 많으며, 시작은 잘하나 끝맺음이 약합니다.",
                    "wealth": "아이디어는 많지만 실행력이 부족해 재물로 연결되지 않습니다. 음식, 유흥에 지출이 많습니다.",
                    "relationship": "말이 많아 구설에 오르기 쉽고, 비밀을 지키기 어렵습니다. 여자 사주에서 자녀에게 신경 쓰느라 지치기 쉽습니다.",
                    "career": "예술, 요리, 교육 분야에 재능이 있으나 집중력 부족으로 성과를 내기 어렵습니다.",
                    "health": "비만, 소화기 질환, 당뇨 주의.",
                    "advice": "절제하는 습관을 기르고, 하나에 집중하세요. 운동으로 에너지를 발산하는 것이 좋습니다."
                },
                "moderate": {
                    "personality": "창의적이고 표현력이 풍부합니다. 음식, 예술, 언어에 재능이 있으며 낙천적입니다.",
                    "wealth": "재능을 활용해 안정적인 수입을 얻습니다. 식신이 재성을 생해 재물운이 좋습니다.",
                    "relationship": "인복이 있고 주변에 사람이 모입니다. 자녀복이 있습니다.",
                    "career": "요리, 예술, 교육, 서비스업에서 성공할 수 있습니다.",
                    "advice": "타고난 재능을 꾸준히 발전시키세요."
                },
                "deficient": {
                    "personality": "표현력이 부족하고 창의성이 덜 발휘됩니다. 삶의 즐거움을 찾기 어렵습니다.",
                    "wealth": "재성을 생하는 힘이 약해 재물을 일으키기 쉽지 않습니다.",
                    "health": "소화 기능 약함, 식욕 부진.",
                    "advice": "창의적인 취미를 갖고, 자기 표현 연습을 하세요. 맛있는 음식을 즐기며 삶의 여유를 찾으세요."
                }
            },
            "상관": {
                "excessive": {
                    "personality": "반항적이고 권위에 도전합니다. 말이 날카롭고 비판적이며, 규칙을 어기는 경향이 있습니다. 천재적 재능이 있으나 불안정합니다.",
                    "wealth": "뛰어난 아이디어로 큰돈을 벌 수 있으나, 관운이 약해 안정적인 직장에서 오래 버티기 어렵습니다.",
                    "relationship": "말로 상처를 주기 쉽고, 부모나 상사와 갈등이 심합니다. 여자 사주에서 남편과 불화가 생기기 쉽습니다(상관견관).",
                    "career": "예술가, 작가, 변호사, 혁신가 등 창의적이고 독립적인 분야에 적합합니다. 공무원이나 대기업은 맞지 않습니다.",
                    "health": "신경계 질환, 우울증, 조울증 주의.",
                    "advice": "말을 아끼고 경청하는 연습을 하세요. 창의성을 건설적으로 발휘하고, 권위자와의 관계를 개선하세요."
                },
                "moderate": {
                    "personality": "창의적이고 독창적이며, 새로운 시각으로 문제를 봅니다. 예술적 재능이 있고 표현력이 뛰어납니다.",
                    "wealth": "창의적인 능력으로 특별한 가치를 만들어 재물을 얻습니다.",
                    "relationship": "독특한 매력으로 사람을 끌어당깁니다. 개성 있는 관계를 형성합니다.",
                    "career": "예술, 디자인, 연구, 혁신 분야에서 두각을 나타냅니다.",
                    "advice": "창의성을 긍정적인 방향으로 발휘하세요."
                },
                "deficient": {
                    "personality": "자기표현이 약하고 창의성을 발휘하기 어렵습니다. 기존 틀에 갇히기 쉽습니다.",
                    "career": "혁신적인 아이디어를 내기 어렵고, 관습적인 방식을 따릅니다.",
                    "advice": "새로운 것을 배우고 경험하세요. 예술 활동이 도움됩니다."
                }
            },
            "편재": {
                "excessive": {
                    "personality": "돈에 대한 욕심이 많고 투기적입니다. 여러 사업을 벌이고 큰 스케일로 움직이지만, 안정성이 부족합니다.",
                    "wealth": "큰돈이 들어왔다 나가는 변동이 심합니다. 투기, 도박으로 재산을 잃을 수 있습니다.",
                    "relationship": "남자 사주에서 여성 인연이 많고 바람끼가 있습니다. 아버지와의 관계가 좋지 않을 수 있습니다.",
                    "career": "사업, 투자, 무역, 유통에 재능이 있으나 리스크 관리가 필요합니다.",
                    "health": "스트레스성 질환, 과로.",
                    "advice": "투기를 줄이고 안정적인 재테크를 하세요. 한 우물을 파는 것이 좋습니다."
                },
                "moderate": {
                    "personality": "사업 수완이 있고 돈의 흐름을 잘 읽습니다. 융통성 있게 재물을 다룹니다.",
                    "wealth": "다양한 소득원을 개발하고, 적절한 투자로 재물을 불립니다.",
                    "relationship": "활발한 사회 활동으로 인맥이 넓습니다.",
                    "career": "사업, 영업, 투자, 무역에서 성공합니다.",
                    "advice": "기회를 잘 활용하면서도 리스크 관리를 철저히 하세요."
                },
                "deficient": {
                    "personality": "재물에 대한 욕심이 적고 사업적 감각이 부족합니다.",
                    "wealth": "큰 재물을 다루기 어렵고, 안정적인 수입을 선호합니다.",
                    "advice": "재테크 공부를 하고, 작은 투자부터 시작하세요."
                }
            },
            "정재": {
                "excessive": {
                    "personality": "근면 성실하지만 지나치게 절약하고 인색합니다. 돈에 집착해 삶의 여유가 없습니다.",
                    "wealth": "꾸준히 저축하지만 큰 투자나 모험을 못해 부를 크게 늘리기 어렵습니다.",
                    "relationship": "남자 사주에서 여자에게 인기가 있으나, 아내에 대한 기대가 높아 불만이 생길 수 있습니다.",
                    "career": "안정적인 직장, 공무원, 금융업에 적합합니다.",
                    "health": "과로, 스트레스.",
                    "advice": "돈을 적절히 쓰면서 삶의 질을 높이세요. 가끔은 자신에게 투자하세요."
                },
                "moderate": {
                    "personality": "성실하고 계획적이며, 재물 관리를 잘합니다. 정직하고 신뢰받습니다.",
                    "wealth": "꾸준한 노력으로 안정적인 재물을 축적합니다.",
                    "relationship": "성실한 배우자를 만나고, 안정적인 가정을 꾸립니다.",
                    "career": "회계, 금융, 관리직에서 능력을 발휘합니다.",
                    "advice": "꾸준함을 유지하며 작은 모험도 해보세요."
                },
                "deficient": {
                    "personality": "재물 관리 능력이 부족하고, 계획성이 없습니다.",
                    "wealth": "꾸준히 모으기 어렵고, 있는 대로 씁니다.",
                    "advice": "예산을 세우고 저축하는 습관을 들이세요."
                }
            },
            "편관": {
                "excessive": {
                    "personality": "권력욕이 강하고 강압적입니다. 규율에 엄격하며 융통성이 없습니다. 적이 많고 시비에 휘말리기 쉽습니다.",
                    "wealth": "권력이나 지위를 통해 재물을 얻으나, 무리한 욕심으로 화를 당할 수 있습니다.",
                    "relationship": "배우자에게 엄격하고 통제적입니다. 여자 사주에서 남자 인연이 복잡해질 수 있습니다.",
                    "career": "군인, 경찰, 검찰, 격투기 등 권력과 힘이 필요한 분야에 적합합니다.",
                    "health": "혈압, 심장, 사고 부상 주의.",
                    "advice": "유연성을 기르고, 권력을 남용하지 마세요. 운동으로 에너지를 조절하세요."
                },
                "moderate": {
                    "personality": "리더십이 있고 결단력이 있습니다. 어려운 상황에서 능력을 발휘합니다.",
                    "wealth": "책임있는 위치에서 적절한 대우를 받습니다.",
                    "career": "관리직, 공직, 법조계에서 성공합니다.",
                    "advice": "리더십을 긍정적으로 발휘하세요."
                },
                "deficient": {
                    "personality": "권위나 규율에 약하고, 통제력이 부족합니다.",
                    "career": "승진이나 인정을 받기 어려울 수 있습니다.",
                    "advice": "책임감을 기르고, 규칙을 지키는 연습을 하세요."
                }
            },
            "정관": {
                "excessive": {
                    "personality": "원칙에 지나치게 집착하고 융통성이 없습니다. 틀에 박힌 사고를 하고, 새로운 것을 받아들이기 어렵습니다.",
                    "wealth": "안정적이지만 큰 부를 쌓기 어렵습니다. 정해진 봉급에 만족합니다.",
                    "relationship": "가부장적이거나 보수적인 관계를 형성합니다.",
                    "career": "공무원, 대기업, 법조계에서 안정적으로 근무합니다.",
                    "health": "스트레스, 융통성 부족으로 인한 갈등.",
                    "advice": "열린 마음으로 변화를 받아들이세요. 규칙 속에서도 유연함을 가지세요."
                },
                "moderate": {
                    "personality": "원칙이 있고 신뢰받습니다. 책임감이 강하고 사회적으로 인정받습니다.",
                    "wealth": "안정적인 직업에서 꾸준한 수입을 얻습니다.",
                    "relationship": "성실한 배우자를 만나고, 안정적인 가정을 유지합니다. 여자 사주에서 좋은 남편을 만납니다.",
                    "career": "공무원, 관리직, 법조계, 교육계에서 성공합니다.",
                    "advice": "원칙을 지키면서 발전해 나가세요."
                },
                "deficient": {
                    "personality": "원칙의식이 약하고 책임감이 부족할 수 있습니다.",
                    "career": "공직이나 안정적인 직장에 적응하기 어려울 수 있습니다.",
                    "advice": "책임감과 원칙을 기르세요. 작은 약속부터 지키는 연습을 하세요."
                }
            },
            "편인": {
                "excessive": {
                    "personality": "생각이 많고 공상에 빠지기 쉽습니다. 현실보다 이상을 추구하고, 게으르거나 의존적일 수 있습니다. 계모 또는 양모의 인연이 있을 수 있습니다.",
                    "wealth": "실속 없이 공부만 하거나, 아이디어는 많으나 실현되지 않습니다.",
                    "relationship": "어머니와의 관계가 복잡하거나, 모성에 대한 결핍이 있을 수 있습니다. 편인이 식신을 극해(도식) 자녀운이 약할 수 있습니다.",
                    "career": "학자, 종교인, 점술가, 예술가에 적합합니다. 현실적인 직업보다 정신적 분야에 맞습니다.",
                    "health": "정신 건강 주의. 우울, 불안.",
                    "advice": "현실에 발을 딛고 실행력을 기르세요. 명상이나 영적 활동이 도움됩니다."
                },
                "moderate": {
                    "personality": "직관이 뛰어나고 영적, 학문적 재능이 있습니다. 다양한 분야에 관심이 많습니다.",
                    "wealth": "특수한 지식이나 재능으로 수입을 얻습니다.",
                    "relationship": "독특한 사람들과 인연이 있습니다.",
                    "career": "연구, 종교, 예술, 대체 의학 등 특수 분야에서 성공합니다.",
                    "advice": "직관을 활용하면서 현실감각도 유지하세요."
                },
                "deficient": {
                    "personality": "직관이나 영적 감각이 덜 발달합니다.",
                    "career": "특수 분야보다 실용적인 분야가 맞을 수 있습니다.",
                    "advice": "명상이나 학문 활동으로 내면을 개발하세요."
                }
            },
            "정인": {
                "excessive": {
                    "personality": "보수적이고 의존적입니다. 어머니에 대한 애착이 강하고, 자립심이 부족할 수 있습니다. 학력에 대한 집착이 있을 수 있습니다.",
                    "wealth": "공부는 잘하나 실제 돈 버는 능력이 부족할 수 있습니다.",
                    "relationship": "어머니의 영향력이 크고, 마마보이/마마걸이 될 수 있습니다.",
                    "career": "학자, 교사, 공무원에 적합합니다. 학력을 바탕으로 한 안정적 직업이 좋습니다.",
                    "health": "과보호로 인한 체력 약화.",
                    "advice": "독립심을 기르고, 경험을 통해 배우세요. 책에서 벗어나 실전을 경험하세요."
                },
                "moderate": {
                    "personality": "학습 능력이 뛰어나고 교양이 있습니다. 어머니의 사랑을 받고 자랐으며, 따뜻한 성품을 가집니다.",
                    "wealth": "지식을 바탕으로 안정적인 수입을 얻습니다.",
                    "relationship": "어머니와 좋은 관계이고, 배움을 중시하는 가정을 꾸립니다.",
                    "career": "교육, 학문, 출판, 공직에서 성공합니다.",
                    "advice": "지식을 나누고 베푸세요."
                },
                "deficient": {
                    "personality": "학습 환경이 부족하거나 어머니의 보살핌이 부족했을 수 있습니다.",
                    "career": "학력에 의존하기보다 실력으로 승부해야 합니다.",
                    "advice": "평생 학습하는 자세를 가지세요."
                }
            }
        }

        for ss_name in SIPSUNG:
            if ss_name in sipsung_data:
                interpretations[ss_name] = sipsung_data[ss_name]
            else:
                interpretations[ss_name] = {
                    "excessive": {"description": f"{ss_name}이 과다할 때의 해석"},
                    "moderate": {"description": f"{ss_name}이 적정할 때의 해석"},
                    "deficient": {"description": f"{ss_name}이 부족할 때의 해석"}
                }

        print(f"십성 과다/부족 해석: {len(interpretations)}개 생성")
        return interpretations

    def _generate_position_interpretations(self) -> Dict:
        """십성 위치별 해석 (어느 주에 있는가)"""
        interpretations = {}

        for ss_name in SIPSUNG:
            interpretations[ss_name] = {
                "년주": self._get_sipsung_in_year(ss_name),
                "월주": self._get_sipsung_in_month(ss_name),
                "일주": self._get_sipsung_in_day(ss_name),
                "시주": self._get_sipsung_in_hour(ss_name),
                "천간": self._get_sipsung_in_stem(ss_name),
                "지지": self._get_sipsung_in_branch(ss_name)
            }

        print(f"십성 위치별 해석: {len(interpretations) * 6}개 생성")
        return interpretations

    def _get_sipsung_in_year(self, sipsung: str) -> Dict:
        """년주 십성 해석"""
        interpretations = {
            "비견": {
                "meaning": "조상 중 형제가 많음. 유산 분쟁 가능. 어린 시절부터 경쟁 환경에 노출",
                "effect": "사회성이 강하고 형제자매 같은 친구를 사귐"
            },
            "겁재": {
                "meaning": "조상 대에 재산 분쟁이 있었거나, 어린 시절 경제적 변동",
                "effect": "어릴 때부터 경쟁심이 강함"
            },
            "식신": {
                "meaning": "복 있는 집안 출신. 어린 시절 풍요로움",
                "effect": "타고난 복으로 여유 있는 성장"
            },
            "상관": {
                "meaning": "조상 중 예술인이 있거나, 집안에 비범한 인물",
                "effect": "어릴 때부터 창의성 발현"
            },
            "편재": {
                "meaning": "조상이 사업가였거나 재산 변동이 많았음",
                "effect": "어릴 때부터 돈에 대한 감각 발달"
            },
            "정재": {
                "meaning": "안정적인 집안 출신. 성실한 조상",
                "effect": "근면한 가풍에서 성장"
            },
            "편관": {
                "meaning": "조상 중 군인, 관리가 있었음. 엄격한 가풍",
                "effect": "어릴 때부터 규율에 노출"
            },
            "정관": {
                "meaning": "명망 있는 집안 출신. 공직자 조상",
                "effect": "사회적 품위와 책임감 형성"
            },
            "편인": {
                "meaning": "조상 중 학자, 종교인. 특이한 가풍",
                "effect": "어릴 때부터 영적, 학문적 영향"
            },
            "정인": {
                "meaning": "학자 집안. 교육열이 높은 가정",
                "effect": "학업에 유리한 환경에서 성장"
            }
        }
        return interpretations.get(sipsung, {"meaning": "년주 해석", "effect": "영향"})

    def _get_sipsung_in_month(self, sipsung: str) -> Dict:
        """월주 십성 해석 (격국 결정의 핵심)"""
        interpretations = {
            "비견": {
                "meaning": "건록격의 가능성. 독립심 강함",
                "effect": "부모와 독립하여 자수성가"
            },
            "식신": {
                "meaning": "식신격. 복록이 있고 재물을 생함",
                "effect": "부모로부터 좋은 영향, 안정적 성장"
            },
            "상관": {
                "meaning": "상관격. 창의적이나 부모와 갈등 가능",
                "effect": "청년기에 반항이나 독립 욕구"
            },
            "편재": {
                "meaning": "편재격. 사업 수완, 아버지 영향",
                "effect": "청년기에 사업적 감각 발달"
            },
            "정재": {
                "meaning": "정재격. 성실한 직업인, 안정 추구",
                "effect": "부모의 성실함을 물려받음"
            },
            "편관": {
                "meaning": "편관격. 군인, 경찰, 무관의 기질",
                "effect": "청년기에 규율과 힘의 세계 경험"
            },
            "정관": {
                "meaning": "정관격. 가장 귀한 격. 공직, 관리에 유리",
                "effect": "사회적 인정과 출세"
            },
            "편인": {
                "meaning": "편인격. 학자, 종교인, 예술인의 기질",
                "effect": "특수한 분야에서 두각"
            },
            "정인": {
                "meaning": "정인격. 학문으로 성공. 교육자",
                "effect": "학업과 자격으로 사회 진출"
            },
            "겁재": {
                "meaning": "양인격의 가능성. 과감한 추진력",
                "effect": "청년기에 승부욕 발휘"
            }
        }
        return interpretations.get(sipsung, {"meaning": "월주 해석", "effect": "영향"})

    def _get_sipsung_in_day(self, sipsung: str) -> Dict:
        """일지(일주의 지지) 십성 해석"""
        interpretations = {
            "비견": {
                "meaning": "배우자가 형제 같음. 동등한 관계",
                "effect": "배우자와 경쟁 또는 협력"
            },
            "겁재": {
                "meaning": "배우자와 재물 문제 가능",
                "effect": "배우자의 경제 활동 활발"
            },
            "식신": {
                "meaning": "배우자복 있음. 의식주 풍요",
                "effect": "가정에 풍요로움"
            },
            "상관": {
                "meaning": "배우자가 예술적이거나 자유로움",
                "effect": "독특한 배우자 인연"
            },
            "편재": {
                "meaning": "남자: 배우자 외 여성 인연. 여자: 시아버지 영향",
                "effect": "배우자 관계의 복잡함"
            },
            "정재": {
                "meaning": "남자: 좋은 배우자. 여자: 시가의 도움",
                "effect": "안정적인 배우자 인연"
            },
            "편관": {
                "meaning": "여자: 남자 인연 많음. 남자: 엄격한 배우자",
                "effect": "배우자의 강한 성격"
            },
            "정관": {
                "meaning": "여자: 좋은 남편. 남자: 배우자의 사회성",
                "effect": "품위 있는 배우자"
            },
            "편인": {
                "meaning": "배우자가 독특하거나 영적",
                "effect": "특별한 배우자 인연"
            },
            "정인": {
                "meaning": "배우자가 학식 있거나 인자함",
                "effect": "현모양처/지혜로운 남편"
            }
        }
        return interpretations.get(sipsung, {"meaning": "일지 해석", "effect": "영향"})

    def _get_sipsung_in_hour(self, sipsung: str) -> Dict:
        """시주 십성 해석"""
        interpretations = {
            "비견": {
                "meaning": "말년에 형제, 동료의 도움. 자녀가 독립적",
                "effect": "노후에 사회 활동 지속"
            },
            "겁재": {
                "meaning": "말년에 경쟁이나 변동. 자녀로 인한 지출",
                "effect": "노후 재물 관리 필요"
            },
            "식신": {
                "meaning": "말년 복록. 자녀 효도. 건강한 노년",
                "effect": "행복한 노후"
            },
            "상관": {
                "meaning": "말년에 자유로움. 예술적 노년",
                "effect": "독특한 말년 생활"
            },
            "편재": {
                "meaning": "말년까지 사업. 자녀의 사업 도움",
                "effect": "활동적인 노후"
            },
            "정재": {
                "meaning": "안정적인 노후. 자녀의 효도",
                "effect": "경제적으로 안정된 말년"
            },
            "편관": {
                "meaning": "말년에 권위. 자녀에게 엄격",
                "effect": "권력을 유지하는 노년"
            },
            "정관": {
                "meaning": "존경받는 노년. 자녀의 사회적 성공",
                "effect": "품위 있는 말년"
            },
            "편인": {
                "meaning": "말년에 종교, 학문. 외로울 수 있음",
                "effect": "영적 성장의 노년"
            },
            "정인": {
                "meaning": "말년에 학문, 존경. 자녀의 학업 성취",
                "effect": "지혜로운 노후"
            }
        }
        return interpretations.get(sipsung, {"meaning": "시주 해석", "effect": "영향"})

    def _get_sipsung_in_stem(self, sipsung: str) -> Dict:
        """천간에 있는 십성 해석"""
        return {
            "meaning": f"{sipsung}이 천간에 드러나면 외부로 표현되고 행동으로 나타납니다",
            "effect": "사회적으로 발현, 타인이 알아볼 수 있는 특성"
        }

    def _get_sipsung_in_branch(self, sipsung: str) -> Dict:
        """지지에 있는 십성 해석"""
        return {
            "meaning": f"{sipsung}이 지지에 숨어 있으면 내면에 잠재하고 때가 되면 드러납니다",
            "effect": "내면의 특성, 은연중에 작용하는 힘"
        }

    def _generate_combination_interpretations(self) -> List[Dict]:
        """십성 조합 해석"""
        combinations = [
            {
                "pattern": "상관견관",
                "condition": "상관과 정관이 함께 있을 때",
                "interpretation": "상관이 정관을 극합니다. 권위에 도전하고 규칙을 어기려 합니다. 관운이 불안정하고, 여자 사주에서 남편과 갈등이 있을 수 있습니다. 다만 창의적인 분야에서는 큰 성공의 가능성도 있습니다.",
                "advice": "입조심하고, 윗사람과의 관계를 조심하세요. 창의적 분야로 진출하면 좋습니다."
            },
            {
                "pattern": "식신제살",
                "condition": "식신이 편관(칠살)을 제압할 때",
                "interpretation": "식신이 편관을 극합니다. 타고난 복으로 재앙을 막고, 권력을 부드럽게 다룹니다. 무관보다 문관에 적합하고, 음식이나 예술 관련 직업이 좋습니다.",
                "advice": "타고난 복을 잘 활용하고, 덕을 쌓으세요."
            },
            {
                "pattern": "도식",
                "condition": "편인이 식신을 극할 때",
                "interpretation": "편인이 식신을 극합니다(倒食). 복록이 줄고, 생각은 많으나 실속이 없습니다. 자녀운에 문제가 있거나 건강에 주의가 필요합니다.",
                "advice": "실행력을 기르고, 건강 관리에 신경 쓰세요."
            },
            {
                "pattern": "재다신약",
                "condition": "재성이 많고 일간이 약할 때",
                "interpretation": "재물은 있으나 감당하기 어렵습니다. 돈 때문에 고생하거나, 여자 때문에 힘들 수 있습니다. 체력적으로도 지칩니다.",
                "advice": "욕심을 줄이고 자기 그릇에 맞게 살아가세요."
            },
            {
                "pattern": "신강살왕",
                "condition": "일간이 강하고 관살도 강할 때",
                "interpretation": "힘과 힘이 부딪힙니다. 큰 성공도 큰 실패도 가능합니다. 군인, 경찰, 운동선수에게 유리합니다.",
                "advice": "에너지를 건설적으로 발산하세요."
            },
            {
                "pattern": "재인상충",
                "condition": "재성과 인성이 서로 극할 때",
                "interpretation": "돈을 추구하면 학문이 어렵고, 학문을 하면 돈을 벌기 어렵습니다. 현실과 이상 사이에서 갈등합니다.",
                "advice": "하나에 집중하거나 균형점을 찾으세요."
            },
            {
                "pattern": "관인상생",
                "condition": "정관이 정인을 생할 때",
                "interpretation": "가장 좋은 조합 중 하나입니다. 사회적 지위가 학문과 인덕을 낳고, 이것이 다시 지위를 높입니다. 공직, 교육계에서 크게 성공합니다.",
                "advice": "덕을 쌓고 배움을 게을리하지 마세요."
            },
            {
                "pattern": "식상생재",
                "condition": "식신/상관이 재성을 생할 때",
                "interpretation": "재능으로 돈을 법니다. 아이디어, 기술, 서비스로 사업에 성공합니다.",
                "advice": "재능을 계속 개발하고 사업에 활용하세요."
            }
        ]

        print(f"십성 조합 해석: {len(combinations)}개 생성")
        return combinations

    def _generate_balance_interpretations(self) -> Dict:
        """십성 균형 해석"""
        return {
            "all_present": {
                "meaning": "모든 십성이 고루 갖춰진 사주",
                "interpretation": "다재다능하고 어디서든 적응합니다. 다만 뚜렷한 특징이 없을 수 있습니다.",
                "advice": "하나에 집중하면 더 큰 성과를 낼 수 있습니다."
            },
            "bigyup_dominant": {
                "meaning": "비겁(비견/겁재)이 강한 사주",
                "interpretation": "독립심이 강하고 형제나 동료와의 인연이 깊습니다. 재물이 분산되기 쉽습니다.",
                "advice": "협력과 양보를 배우세요."
            },
            "siksang_dominant": {
                "meaning": "식상(식신/상관)이 강한 사주",
                "interpretation": "표현력과 창의력이 뛰어납니다. 말이 많고 아이디어가 풍부합니다.",
                "advice": "실행력을 기르세요."
            },
            "jaesung_dominant": {
                "meaning": "재성(편재/정재)이 강한 사주",
                "interpretation": "돈에 대한 감각이 뛰어나고 현실적입니다.",
                "advice": "정신적 가치도 추구하세요."
            },
            "gwansung_dominant": {
                "meaning": "관성(편관/정관)이 강한 사주",
                "interpretation": "책임감이 강하고 사회적 인정을 중시합니다.",
                "advice": "유연성을 기르세요."
            },
            "insung_dominant": {
                "meaning": "인성(편인/정인)이 강한 사주",
                "interpretation": "학문과 사색을 좋아합니다. 사람들에게 인정받습니다.",
                "advice": "현실 감각도 유지하세요."
            },
            "no_gwansung": {
                "meaning": "관성이 없는 사주",
                "interpretation": "자유로우나 사회적 제약이 약해 방종할 수 있습니다.",
                "advice": "스스로 규율을 세우세요."
            },
            "no_insung": {
                "meaning": "인성이 없는 사주",
                "interpretation": "학업운이 약하거나 어머니 인연이 옅을 수 있습니다.",
                "advice": "평생 학습으로 보완하세요."
            },
            "no_jaesung": {
                "meaning": "재성이 없는 사주",
                "interpretation": "돈에 대한 관심이 적거나 재물 운이 약합니다.",
                "advice": "재테크를 배우고 실천하세요."
            },
            "no_siksang": {
                "meaning": "식상이 없는 사주",
                "interpretation": "표현력이 부족하고 재능을 발휘하기 어렵습니다.",
                "advice": "창의적 활동을 시작하세요."
            }
        }


# ============================================================
# 지지 관계(충합형파해) 해석 생성기
# ============================================================

class JijiRelationGenerator:
    """지지 관계 해석 생성"""

    def __init__(self):
        self.output_file = OUTPUT_DIR / "jiji_relations_detailed.json"

    def generate(self) -> Dict:
        """지지 관계 해석 생성"""
        print("=" * 60)
        print("지지 관계 상세 해석 생성")
        print("=" * 60)

        result = {
            "meta": {
                "type": "jiji_relations",
                "version": "2.0",
                "generated_at": datetime.now().isoformat()
            },
            "yukchung": self._generate_yukchung(),  # 육충
            "yukhab": self._generate_yukhab(),      # 육합
            "samhab": self._generate_samhab(),      # 삼합
            "banghab": self._generate_banghab(),    # 방합
            "hyung": self._generate_hyung(),        # 형
            "pa": self._generate_pa(),              # 파
            "hae": self._generate_hae(),            # 해
            "won": self._generate_won()             # 원진
        }

        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"저장 완료: {self.output_file}")
        return result

    def _generate_yukchung(self) -> Dict:
        """육충(六沖) 해석"""
        chung_pairs = {
            "자오충": {
                "branches": ["자", "오"],
                "meaning": "물과 불의 충돌. 가장 강렬한 충",
                "effects": {
                    "general": "급격한 변화, 이사, 이별, 사고 주의",
                    "career": "직장 변동, 전업",
                    "relationship": "배우자나 자녀와 갈등, 이별",
                    "health": "심장, 신장, 혈액 관련 질환 주의",
                    "year_month": "어린 시절 가정 불안정",
                    "month_day": "직업과 배우자 사이 갈등",
                    "day_hour": "배우자, 자녀와 멀어짐"
                },
                "advice": "변화를 받아들이고 유연하게 대처하세요"
            },
            "축미충": {
                "branches": ["축", "미"],
                "meaning": "토와 토의 충돌. 가장 약한 충",
                "effects": {
                    "general": "고집 충돌, 완고한 대립",
                    "career": "부동산, 농업 관련 변동",
                    "relationship": "고집으로 인한 갈등",
                    "health": "위장, 비장, 피부 질환"
                },
                "advice": "유연한 사고를 가지세요"
            },
            "인신충": {
                "branches": ["인", "신"],
                "meaning": "목과 금의 충돌. 역마충으로 이동성 강함",
                "effects": {
                    "general": "잦은 이동, 변화, 바쁜 생활",
                    "career": "출장이 많거나 이직이 잦음",
                    "relationship": "멀리 떨어져 지내는 관계",
                    "health": "간, 폐, 신경계 질환",
                    "travel": "해외 인연, 이민"
                },
                "advice": "변화를 기회로 활용하세요"
            },
            "묘유충": {
                "branches": ["묘", "유"],
                "meaning": "목과 금의 충돌. 도화충으로 이성 문제",
                "effects": {
                    "general": "이성 관계 복잡, 구설수",
                    "career": "예술 분야에서 큰 변동",
                    "relationship": "이성으로 인한 갈등, 불륜 주의",
                    "health": "간, 폐, 피부, 시력"
                },
                "advice": "이성 관계를 정리하고 절제하세요"
            },
            "진술충": {
                "branches": ["진", "술"],
                "meaning": "토와 토의 충돌. 천라지망",
                "effects": {
                    "general": "법적 문제, 큰 사건 사고",
                    "career": "사업 실패 또는 대성공",
                    "relationship": "큰 변화를 겪는 관계",
                    "health": "위장, 당뇨, 피부"
                },
                "advice": "신중하게 행동하고 법을 지키세요"
            },
            "사해충": {
                "branches": ["사", "해"],
                "meaning": "화와 수의 충돌",
                "effects": {
                    "general": "계획이 엎어지는 경우가 많음",
                    "career": "사업 변동, 투자 실패 주의",
                    "relationship": "갑작스러운 이별",
                    "health": "심장, 신장, 혈압"
                },
                "advice": "계획을 신중히 세우고 대비하세요"
            }
        }

        return chung_pairs

    def _generate_yukhab(self) -> Dict:
        """육합(六合) 해석"""
        hab_pairs = {
            "자축합토": {
                "branches": ["자", "축"],
                "result": "토",
                "meaning": "수와 토가 합하여 토가 됨",
                "effects": {
                    "general": "안정, 결속, 새로운 결합",
                    "career": "파트너십, 계약",
                    "relationship": "연인의 인연, 결혼"
                }
            },
            "인해합목": {
                "branches": ["인", "해"],
                "result": "목",
                "meaning": "목과 수가 합하여 목이 됨",
                "effects": {
                    "general": "발전, 성장, 새로운 시작",
                    "career": "귀인의 도움",
                    "relationship": "지지해주는 인연"
                }
            },
            "묘술합화": {
                "branches": ["묘", "술"],
                "result": "화",
                "meaning": "목과 토가 합하여 화가 됨",
                "effects": {
                    "general": "열정, 밝은 에너지",
                    "career": "새로운 프로젝트",
                    "relationship": "뜨거운 만남"
                }
            },
            "진유합금": {
                "branches": ["진", "유"],
                "result": "금",
                "meaning": "토와 금이 합하여 금이 됨",
                "effects": {
                    "general": "결실, 재물, 성취",
                    "career": "금전적 이득",
                    "relationship": "현실적 결합"
                }
            },
            "사신합수": {
                "branches": ["사", "신"],
                "result": "수",
                "meaning": "화와 금이 합하여 수가 됨",
                "effects": {
                    "general": "지혜, 변화, 유동성",
                    "career": "유연한 대처",
                    "relationship": "지적인 만남"
                }
            },
            "오미합": {
                "branches": ["오", "미"],
                "result": "화토",
                "meaning": "화와 토가 합함",
                "effects": {
                    "general": "따뜻함, 안정",
                    "career": "협력",
                    "relationship": "부부의 인연"
                }
            }
        }

        return hab_pairs

    def _generate_samhab(self) -> Dict:
        """삼합(三合) 해석"""
        return {
            "인오술_화국": {
                "branches": ["인", "오", "술"],
                "result": "화",
                "meaning": "화의 삼합. 열정, 명예, 활동력",
                "effects": {
                    "general": "강력한 추진력과 열정",
                    "career": "리더십 발휘, 큰 성취",
                    "relationship": "열정적인 관계",
                    "health": "심장, 눈 관련 주의"
                }
            },
            "해묘미_목국": {
                "branches": ["해", "묘", "미"],
                "result": "목",
                "meaning": "목의 삼합. 성장, 인덕, 학문",
                "effects": {
                    "general": "발전과 성장의 에너지",
                    "career": "학문, 교육 분야 성공",
                    "relationship": "인덕이 있음",
                    "health": "간, 담 관련 주의"
                }
            },
            "신자진_수국": {
                "branches": ["신", "자", "진"],
                "result": "수",
                "meaning": "수의 삼합. 지혜, 유동성, 재물",
                "effects": {
                    "general": "지혜롭고 유연한 대처",
                    "career": "금융, 유통, 무역 유리",
                    "relationship": "지적인 교류",
                    "health": "신장, 방광 관련 주의"
                }
            },
            "사유축_금국": {
                "branches": ["사", "유", "축"],
                "result": "금",
                "meaning": "금의 삼합. 결단, 재물, 결실",
                "effects": {
                    "general": "결단력과 실행력",
                    "career": "재물 축적, 사업 성공",
                    "relationship": "현실적 결합",
                    "health": "폐, 대장 관련 주의"
                }
            }
        }

    def _generate_banghab(self) -> Dict:
        """방합(方合) 해석"""
        return {
            "인묘진_동방목": {
                "branches": ["인", "묘", "진"],
                "result": "목",
                "meaning": "동방 목의 방합. 봄의 에너지",
                "effects": "새로운 시작, 성장, 발전의 힘"
            },
            "사오미_남방화": {
                "branches": ["사", "오", "미"],
                "result": "화",
                "meaning": "남방 화의 방합. 여름의 에너지",
                "effects": "열정, 명예, 화려함"
            },
            "신유술_서방금": {
                "branches": ["신", "유", "술"],
                "result": "금",
                "meaning": "서방 금의 방합. 가을의 에너지",
                "effects": "결실, 수확, 재물"
            },
            "해자축_북방수": {
                "branches": ["해", "자", "축"],
                "result": "수",
                "meaning": "북방 수의 방합. 겨울의 에너지",
                "effects": "저장, 지혜, 심화"
            }
        }

    def _generate_hyung(self) -> Dict:
        """형(刑) 해석"""
        return {
            "인사형": {
                "branches": ["인", "사"],
                "type": "무례지형",
                "meaning": "예의 없이 부딪힘",
                "effects": "법적 문제, 건강 문제, 배신"
            },
            "사신형": {
                "branches": ["사", "신"],
                "type": "무례지형",
                "meaning": "감정 충돌",
                "effects": "다툼, 고소고발"
            },
            "인신형": {
                "branches": ["인", "신"],
                "type": "무례지형",
                "meaning": "강한 충돌",
                "effects": "사고, 수술, 이별"
            },
            "축술미형": {
                "branches": ["축", "술", "미"],
                "type": "무은지형",
                "meaning": "배은망덕",
                "effects": "신뢰 문제, 배신"
            },
            "자묘형": {
                "branches": ["자", "묘"],
                "type": "무례지형",
                "meaning": "예의 없음",
                "effects": "불화, 이성 문제"
            },
            "진진형": {
                "branches": ["진", "진"],
                "type": "자형",
                "meaning": "스스로 해침",
                "effects": "고집, 자충수"
            },
            "오오형": {
                "branches": ["오", "오"],
                "type": "자형",
                "meaning": "스스로 해침",
                "effects": "급한 성격으로 인한 문제"
            },
            "유유형": {
                "branches": ["유", "유"],
                "type": "자형",
                "meaning": "스스로 해침",
                "effects": "외로움, 고독"
            },
            "해해형": {
                "branches": ["해", "해"],
                "type": "자형",
                "meaning": "스스로 해침",
                "effects": "우유부단, 결정 장애"
            }
        }

    def _generate_pa(self) -> Dict:
        """파(破) 해석"""
        return {
            "자유파": {"branches": ["자", "유"], "effects": "계획 무산"},
            "오묘파": {"branches": ["오", "묘"], "effects": "불화, 갈등"},
            "진축파": {"branches": ["진", "축"], "effects": "답답함"},
            "술미파": {"branches": ["술", "미"], "effects": "지연, 방해"},
            "인해파": {"branches": ["인", "해"], "effects": "불신"},
            "사신파": {"branches": ["사", "신"], "effects": "손재"}
        }

    def _generate_hae(self) -> Dict:
        """해(害) 해석"""
        return {
            "자미해": {"branches": ["자", "미"], "effects": "육친 이별, 건강 문제"},
            "축오해": {"branches": ["축", "오"], "effects": "관재, 구설"},
            "인사해": {"branches": ["인", "사"], "effects": "사기, 손재"},
            "묘진해": {"branches": ["묘", "진"], "effects": "질병, 이별"},
            "신해해": {"branches": ["신", "해"], "effects": "도난, 손실"},
            "유술해": {"branches": ["유", "술"], "effects": "관재, 질병"}
        }

    def _generate_won(self) -> Dict:
        """원진(怨嗔) 해석"""
        return {
            "자미원진": {"branches": ["자", "미"], "effects": "서로 미워하나 떨어지지 못함"},
            "축오원진": {"branches": ["축", "오"], "effects": "앙숙"},
            "인유원진": {"branches": ["인", "유"], "effects": "충돌"},
            "묘신원진": {"branches": ["묘", "신"], "effects": "갈등"},
            "진해원진": {"branches": ["진", "해"], "effects": "불화"},
            "사술원진": {"branches": ["사", "술"], "effects": "반목"}
        }


# ============================================================
# 오행 해석 생성기
# ============================================================

class OhaengInterpretationGenerator:
    """오행 균형/불균형 해석 생성"""

    def __init__(self):
        self.output_file = OUTPUT_DIR / "ohaeng_detailed.json"

    def generate(self) -> Dict:
        """오행 해석 생성"""
        print("=" * 60)
        print("오행 상세 해석 생성")
        print("=" * 60)

        result = {
            "meta": {
                "type": "ohaeng_interpretation",
                "version": "2.0",
                "generated_at": datetime.now().isoformat()
            },
            "individual": self._generate_individual_ohaeng(),
            "balance": self._generate_balance_interpretations(),
            "ilgan_by_ohaeng": self._generate_ilgan_ohaeng()
        }

        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"저장 완료: {self.output_file}")
        return result

    def _generate_individual_ohaeng(self) -> Dict:
        """개별 오행 해석"""
        return {
            "목": {
                "nature": "나무, 봄, 동쪽, 청색",
                "personality": "성장, 발전, 인자, 끈기",
                "positive": ["인자함", "성장", "유연성", "창의성", "계획성"],
                "negative": ["우유부단", "지나친 계획", "분노", "질투"],
                "body": ["간", "담", "눈", "근육", "손발톱"],
                "disease": "간 질환, 안과 질환, 근육통, 신경계 문제",
                "career": ["교육", "출판", "디자인", "농업", "목재업"],
                "excessive": "분노가 많고 급함. 간, 담 질환 주의",
                "deficient": "결단력 부족, 계획성 없음. 체력 약화"
            },
            "화": {
                "nature": "불, 여름, 남쪽, 적색",
                "personality": "열정, 명예, 예의, 표현력",
                "positive": ["열정", "활기", "예의", "표현력", "리더십"],
                "negative": ["성급함", "화를 잘 냄", "허영심", "산만함"],
                "body": ["심장", "소장", "혀", "혈관"],
                "disease": "심장 질환, 고혈압, 눈 피로, 열병",
                "career": ["예술", "연예", "IT", "전기", "요리"],
                "excessive": "성급하고 산만함. 심장, 혈압 주의",
                "deficient": "활력 부족, 냉담. 순환계 약화"
            },
            "토": {
                "nature": "흙, 환절기, 중앙, 황색",
                "personality": "신뢰, 안정, 중재, 포용",
                "positive": ["믿음직함", "안정", "중립", "인내", "포용력"],
                "negative": ["고집", "느림", "보수적", "의심"],
                "body": ["비장", "위장", "입", "살", "근육"],
                "disease": "소화기 질환, 당뇨, 비만, 피부 질환",
                "career": ["부동산", "농업", "건설", "금융", "중재"],
                "excessive": "고집세고 보수적. 비만, 당뇨 주의",
                "deficient": "신뢰받지 못함, 불안정. 소화 기능 약화"
            },
            "금": {
                "nature": "쇠, 가을, 서쪽, 백색",
                "personality": "결단, 의리, 정의, 냉철",
                "positive": ["결단력", "의리", "정의감", "실행력", "끈기"],
                "negative": ["냉정함", "독선", "융통성 부족", "비관"],
                "body": ["폐", "대장", "코", "피부", "치아"],
                "disease": "폐 질환, 피부병, 호흡기, 변비",
                "career": ["금융", "법률", "의료", "금속업", "보석"],
                "excessive": "지나치게 냉정하고 독선적. 폐, 피부 주의",
                "deficient": "결단력 부족, 우유부단. 호흡기 약화"
            },
            "수": {
                "nature": "물, 겨울, 북쪽, 흑색",
                "personality": "지혜, 유연, 인내, 적응",
                "positive": ["지혜", "유연성", "침착함", "적응력", "직관"],
                "negative": ["두려움", "변덕", "우울", "게으름"],
                "body": ["신장", "방광", "귀", "뼈", "골수"],
                "disease": "신장 질환, 비뇨기, 귀 질환, 관절",
                "career": ["해운", "무역", "수산업", "철학", "연구"],
                "excessive": "두려움이 많고 변덕. 신장, 방광 주의",
                "deficient": "지혜 부족, 경직됨. 골격, 관절 약화"
            }
        }

    def _generate_balance_interpretations(self) -> Dict:
        """오행 균형 해석"""
        return {
            "all_balanced": {
                "meaning": "오행이 고루 갖춰짐",
                "interpretation": "균형 잡힌 성격, 어디서든 적응, 큰 기복 없음",
                "advice": "균형을 유지하면서 한 분야에 집중하세요"
            },
            "mok_dominant": {
                "meaning": "목이 강한 사주",
                "interpretation": "성장과 발전에 유리, 인자함. 다만 분노 조절 필요",
                "advice": "금의 기운(결단력)을 보충하세요"
            },
            "hwa_dominant": {
                "meaning": "화가 강한 사주",
                "interpretation": "열정적이고 표현력 좋음. 다만 성급할 수 있음",
                "advice": "수의 기운(침착함)을 보충하세요"
            },
            "to_dominant": {
                "meaning": "토가 강한 사주",
                "interpretation": "안정적이고 신뢰받음. 다만 변화에 느림",
                "advice": "목의 기운(변화)을 보충하세요"
            },
            "geum_dominant": {
                "meaning": "금이 강한 사주",
                "interpretation": "결단력과 실행력 있음. 다만 냉정할 수 있음",
                "advice": "화의 기운(따뜻함)을 보충하세요"
            },
            "su_dominant": {
                "meaning": "수가 강한 사주",
                "interpretation": "지혜롭고 유연함. 다만 두려움이 많을 수 있음",
                "advice": "토의 기운(안정)을 보충하세요"
            },
            "mok_deficient": {
                "meaning": "목이 없거나 약함",
                "interpretation": "성장 동력 부족, 결단력 약함",
                "advice": "녹색 계열, 동쪽 방향, 봄 시즌 활용"
            },
            "hwa_deficient": {
                "meaning": "화가 없거나 약함",
                "interpretation": "열정 부족, 표현력 약함",
                "advice": "붉은색 계열, 남쪽 방향, 여름 시즌 활용"
            },
            "to_deficient": {
                "meaning": "토가 없거나 약함",
                "interpretation": "안정감 부족, 중심 없음",
                "advice": "황색 계열, 환절기 활용"
            },
            "geum_deficient": {
                "meaning": "금이 없거나 약함",
                "interpretation": "결단력 부족, 실행력 약함",
                "advice": "흰색 계열, 서쪽 방향, 가을 시즌 활용"
            },
            "su_deficient": {
                "meaning": "수가 없거나 약함",
                "interpretation": "지혜 부족, 유연성 없음",
                "advice": "검은색 계열, 북쪽 방향, 겨울 시즌 활용"
            }
        }

    def _generate_ilgan_ohaeng(self) -> Dict:
        """일간별 오행 특성"""
        return {
            "갑": {"ohaeng": "목", "yin_yang": "양", "nature": "양목 - 큰 나무, 리더십, 개척"},
            "을": {"ohaeng": "목", "yin_yang": "음", "nature": "음목 - 작은 풀, 유연함, 협력"},
            "병": {"ohaeng": "화", "yin_yang": "양", "nature": "양화 - 태양, 밝음, 열정"},
            "정": {"ohaeng": "화", "yin_yang": "음", "nature": "음화 - 촛불, 따뜻함, 섬세"},
            "무": {"ohaeng": "토", "yin_yang": "양", "nature": "양토 - 산, 우직함, 신뢰"},
            "기": {"ohaeng": "토", "yin_yang": "음", "nature": "음토 - 논밭, 양육, 수용"},
            "경": {"ohaeng": "금", "yin_yang": "양", "nature": "양금 - 큰 쇠, 결단, 의리"},
            "신": {"ohaeng": "금", "yin_yang": "음", "nature": "음금 - 보석, 세련, 예리"},
            "임": {"ohaeng": "수", "yin_yang": "양", "nature": "양수 - 큰 물, 지혜, 포용"},
            "계": {"ohaeng": "수", "yin_yang": "음", "nature": "음수 - 이슬, 섬세, 직관"}
        }


# ============================================================
# 메인 실행
# ============================================================

async def main():
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

    parser = argparse.ArgumentParser(description="사주 해석 코퍼스 생성")
    parser.add_argument('--all', action='store_true', help='모든 해석 생성')
    parser.add_argument('--sipsung', action='store_true', help='십성 해석 생성')
    parser.add_argument('--jiji', action='store_true', help='지지 관계 해석 생성')
    parser.add_argument('--ohaeng', action='store_true', help='오행 해석 생성')

    args = parser.parse_args()

    if args.all or args.sipsung:
        gen = SipsungInterpretationGenerator()
        gen.generate()

    if args.all or args.jiji:
        gen = JijiRelationGenerator()
        gen.generate()

    if args.all or args.ohaeng:
        gen = OhaengInterpretationGenerator()
        gen.generate()

    if not any([args.all, args.sipsung, args.jiji, args.ohaeng]):
        print("사용법: python generate_saju_interpretation_corpus.py --all")
        print("옵션: --sipsung, --jiji, --ohaeng")


if __name__ == "__main__":
    asyncio.run(main())
