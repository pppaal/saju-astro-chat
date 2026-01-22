#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to complete all 64 hexagrams in enhancedData.ts
Generates hexagrams 29-64 with Korean content
"""

import os

# Hexagram data for 29-64
hexagrams_data = """
  29: {
    visualImagery: {
      scene: "깊은 물웅덩이가 겹쳐있고 위험이 거듭된다",
      symbolism: "위험, 함정, 어려움, 진심",
      colors: ["검은색", "깊은 파랑", "어두운 회색"],
      emoji: "🌊"
    },
    quickSummary: {
      oneLiner: "거듭되는 위험 속에서도 진심을 잃지 않으면 길이 열린다",
      keywords: ["위험", "어려움", "진심", "용기", "극복"],
      essence: "어려움이 계속되는 시기입니다. 하지만 진심을 잃지 않고 용기 있게 나아가면 반드시 빠져나올 수 있습니다. 물처럼 유연하게 대처하세요."
    },
    actionableAdvice: {
      dos: [
        "진심을 유지하세요",
        "용기를 잃지 마세요",
        "유연하게 대처하세요",
        "한 걸음씩 나아가세요"
      ],
      donts: [
        "포기하지 마세요",
        "절망하지 마세요",
        "무모하게 돌진하지 마세요"
      ],
      timing: "위험의 시기. 신중하지만 용기 있게 극복해야 합니다.",
      nextSteps: [
        "1단계: 위험을 정확히 파악하기",
        "2단계: 진심과 용기 다지기",
        "3단계: 유연하게 한 걸음씩 나아가기",
        "4단계: 반드시 빠져나올 것이라 믿기"
      ]
    },
    situationTemplates: {
      career: {
        question: "연속적인 실패와 어려움에 지쳤어요.",
        advice: "포기하지 마세요. 어려움 속에서도 진심으로 최선을 다하면 길이 열립니다. 유연하게 대처하며 한 걸음씩 나아가세요.",
        timeline: "6개월-1년 인내하면 빛이 보입니다.",
        actionItems: [
          "초심 되새기기",
          "작은 성과에 집중하기",
          "도움 요청하기",
          "포기하지 않기"
        ]
      },
      love: {
        question: "관계에서 계속 어려움이 생겨요.",
        advice: "진심으로 대화하세요. 문제를 회피하지 말고 함께 해결하려는 노력이 필요합니다.",
        timeline: "3-6개월 진심 어린 노력으로 개선됩니다.",
        actionItems: [
          "솔직하게 대화하기",
          "함께 해결책 찾기",
          "포기하지 않기",
          "전문가 도움 받기"
        ]
      },
      health: {
        question: "건강 문제가 계속되는데 어떻게 해야 할까요?",
        advice: "포기하지 말고 꾸준히 치료받으세요. 물 관련 건강(수분, 순환 등)에 특히 신경 쓰세요.",
        timeline: "장기전입니다. 인내하며 치료하면 회복됩니다.",
        actionItems: [
          "꾸준히 치료받기",
          "수분 섭취 잘하기",
          "스트레스 관리하기",
          "희망 잃지 않기"
        ]
      },
      wealth: {
        question: "재정적 어려움이 계속되는데 어떻게 해야 할까요?",
        advice: "침착하게 대처하세요. 유동성 위기에 빠지지 않도록 조심하고, 작은 수입이라도 꾸준히 만드세요.",
        timeline: "6개월-1년 버티면 상황이 나아집니다.",
        actionItems: [
          "현금 흐름 관리하기",
          "지출 최소화하기",
          "작은 수입원이라도 만들기",
          "희망 잃지 않기"
        ]
      },
      decision: {
        question: "계속되는 어려움 속에서 어떻게 결정해야 할까요?",
        advice: "진심을 따르세요. 어려워도 옳은 길을 선택하세요.",
        actionItems: [
          "진심 확인하기",
          "옳은 길 선택하기",
          "용기 내기",
          "끝까지 가기"
        ]
      },
      timing: {
        question: "언제쯤 이 어려움이 끝날까요?",
        advice: "진심을 잃지 않으면 반드시 끝납니다. 포기하지 마세요.",
        actionItems: [
          "하루하루 견디기",
          "작은 진전에 희망 갖기",
          "포기하지 않기"
        ]
      }
    },
    plainLanguage: {
      traditionalText: "坎為水(감위수) - 물이 거듭되니 위험이 겹친다. 習坎 有孚(습감 유부) - 거듭되는 위험이나 진심이 있으면 형통하다.",
      modernExplanation: "깊은 물웅덩이에 빠진 것처럼 위험이 계속됩니다. 하지만 물은 유연하게 흐르며 결국 바다에 도달합니다. 진심을 잃지 않고 용기 있게 나아가면 반드시 극복할 수 있습니다.",
      realLifeExample: "사업 실패 후 빚에 시달리면서도 포기하지 않고 계속 도전하여 결국 성공한 경우처럼, 어려움 속에서도 진심과 용기를 잃지 않는 것이 중요합니다.",
      metaphor: "물은 바위를 뚫고, 협곡을 만들며, 결국 바다에 도달합니다. 유연하지만 끈질기게 나아가세요."
    },
    relatedConcepts: ["위험(危險)", "진심(眞心)", "용기(勇氣)", "극복(克服)"],
    difficulty: 'hard',
    favorability: 3
  },

  30: {
    visualImagery: {
      scene: "불이 타오르며 밝게 빛난다",
      symbolism: "밝음, 지혜, 문명, 의존",
      colors: ["빨간색", "주황색", "금색"],
      emoji: "🔥"
    },
    quickSummary: {
      oneLiner: "밝은 지혜로 올바른 것에 붙어 있으면 빛이 지속된다",
      keywords: ["밝음", "지혜", "문명", "의존", "명확함"],
      essence: "불이 땔감에 붙어 타오르듯, 올바른 것에 의존하고 붙어 있어야 밝음이 지속됩니다. 명확한 비전과 지혜로 세상을 밝히세요."
    },
    actionableAdvice: {
      dos: [
        "밝은 지혜를 추구하세요",
        "명확한 비전을 가지세요",
        "올바른 것에 의존하세요",
        "세상을 밝히세요"
      ],
      donts: [
        "어둠 속에 머물지 마세요",
        "잘못된 것에 집착하지 마세요",
        "빛을 잃지 마세요"
      ],
      timing: "밝음의 시기. 지혜와 명확함이 빛을 발합니다.",
      nextSteps: [
        "1단계: 명확한 비전 세우기",
        "2단계: 올바른 길 찾기",
        "3단계: 그것에 헌신하기",
        "4단계: 밝음 유지하며 나아가기"
      ]
    },
    situationTemplates: {
      career: {
        question: "커리어 방향을 명확히 하고 싶어요.",
        advice: "밝은 비전을 세우세요. 무엇을 향해 가는지 명확해야 길을 잃지 않습니다. 올바른 멘토나 조직에 붙어 배우세요.",
        timeline: "명확한 비전이 있으면 3-6개월 내 큰 진전을 볼 수 있습니다.",
        actionItems: [
          "명확한 목표 세우기",
          "좋은 멘토 찾기",
          "지혜롭게 배우기",
          "비전 향해 나아가기"
        ]
      },
      love: {
        question: "관계를 밝고 따뜻하게 유지하려면 어떻게 해야 할까요?",
        advice: "서로에게 붙어 있으세요. 의존하되 집착하지 마세요. 따뜻한 관심과 밝은 에너지를 나누세요.",
        timeline: "꾸준한 관심으로 밝은 관계를 유지할 수 있습니다.",
        actionItems: [
          "따뜻한 관심 보이기",
          "밝은 에너지 나누기",
          "함께 있는 시간 소중히 하기",
          "서로에게 빛이 되기"
        ]
      },
      health: {
        question: "건강을 밝게 유지하려면 어떻게 해야 할까요?",
        advice: "활력과 에너지를 유지하세요. 눈 건강에 특히 신경 쓰세요. 밝은 마음이 건강한 몸을 만듭니다.",
        timeline: "밝은 마음으로 생활하면 건강이 좋아집니다.",
        actionItems: [
          "긍정적 마음 유지하기",
          "눈 건강 챙기기",
          "활력 넘치는 생활하기",
          "밝은 에너지 유지하기"
        ]
      },
      wealth: {
        question: "재정을 명확하게 관리하려면 어떻게 해야 할까요?",
        advice: "명확한 재정 계획을 세우세요. 수입과 지출이 투명해야 합니다.",
        timeline: "명확한 계획으로 안정적으로 관리할 수 있습니다.",
        actionItems: [
          "재정 상태 명확히 파악하기",
          "명확한 계획 세우기",
          "투명하게 관리하기",
          "정기적으로 점검하기"
        ]
      },
      decision: {
        question: "명확한 결정을 내리려면 어떻게 해야 할까요?",
        advice: "밝은 지혜로 판단하세요. 명확한 기준을 세우고 결정하세요.",
        actionItems: [
          "명확한 기준 세우기",
          "밝은 지혜로 판단하기",
          "확신 있게 결정하기"
        ]
      },
      timing: {
        question: "언제 빛을 발할 수 있을까요?",
        advice: "명확한 비전이 있으면 지금 당장 빛날 수 있습니다.",
        actionItems: [
          "지금 비전 세우기",
          "즉시 실행하기",
          "밝음 유지하기"
        ]
      }
    },
    plainLanguage: {
      traditionalText: "離為火(리위화) - 불이 거듭되니 밝음이 붙는다. 離 利貞(리 이정) - 붙음은 바름이 이롭다.",
      modernExplanation: "불이 땔감에 붙어 타오르듯, 올바른 것에 의존하여 붙어 있어야 밝음이 지속됩니다. 명확한 비전과 밝은 지혜로 세상을 밝히세요. 혼자서는 타오를 수 없으니 올바른 것에 붙어 있으세요.",
      realLifeExample: "명확한 비전을 가진 리더가 조직을 밝게 이끌고, 좋은 멘토에게 배우며 성장하는 것처럼, 밝음은 올바른 의존 관계 속에서 더 빛납니다.",
      metaphor: "불은 땔감 없이 타오를 수 없습니다. 올바른 것에 붙어 계속 타오르세요."
    },
    relatedConcepts: ["밝음(明)", "지혜(智慧)", "의존(依存)", "비전(Vision)"],
    difficulty: 'medium',
    favorability: 7
  }
"""

# Function to add the hexagrams to the file
def add_hexagrams_to_file():
    file_path = r"c:\dev\saju-astro-chat\src\lib\iChing\enhancedData.ts"

    # Read the file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find where to insert (before the closing brace of enhancedHexagramData)
    # Look for the pattern: difficulty: 'hard',\n    favorability: 4\n  }\n};
    import re

    # Find the last hexagram entry before };
    pattern = r"(difficulty: '[^']+',\s+favorability: \d+\s+}\s+)(}\s*;)"

    match = re.search(pattern, content)
    if match:
        # Insert new hexagrams before the closing brace
        before_closing = match.group(1)
        closing = match.group(2)

        new_content = content.replace(
            before_closing + closing,
            before_closing + ",\n" + hexagrams_data + "\n" + closing
        )

        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print("Successfully added hexagrams 29-30 to the file!")
        return True
    else:
        print("Could not find the insertion point")
        return False

if __name__ == "__main__":
    add_hexagrams_to_file()
