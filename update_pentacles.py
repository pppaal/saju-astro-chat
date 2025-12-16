import re

# Advice data for Pentacles cards
advice_data = {
    64: {
        "upright": ("Seize this opportunity. Plant the seed of prosperity now.",
                   "이 기회를 잡으세요. 지금 번영의 씨앗을 심으세요."),
        "reversed": ("Don't let greed blind you. Plan carefully for stability.",
                    "탐욕에 눈멀지 마세요. 안정을 위해 신중히 계획하세요.")
    },
    65: {
        "upright": ("Keep juggling skillfully. Adaptability is your strength.",
                   "균형을 유지하세요. 적응력이 당신의 강점입니다."),
        "reversed": ("Prioritize ruthlessly. You can't do everything at once.",
                    "과감하게 우선순위를 정하세요. 모든 것을 한꺼번에 할 수 없습니다.")
    },
    66: {
        "upright": ("Collaborate with others. Teamwork elevates your work.",
                   "다른 사람들과 협력하세요. 팀워크가 작업을 높입니다."),
        "reversed": ("Improve team communication. Competition hurts collaboration.",
                    "팀 소통을 개선하세요. 경쟁은 협력을 해칩니다.")
    },
    67: {
        "upright": ("Save wisely but don't hoard. Security shouldn't become a prison.",
                   "현명하게 저축하되 모으지만 마세요. 안정이 감옥이 되어선 안 됩니다."),
        "reversed": ("Find balance between saving and generosity.",
                    "저축과 관대함 사이의 균형을 찾으세요.")
    },
    68: {
        "upright": ("Seek help. You don't have to struggle alone.",
                   "도움을 구하세요. 혼자 힘들어할 필요 없습니다."),
        "reversed": ("Accept help graciously. Recovery is underway.",
                    "도움을 기꺼이 받으세요. 회복이 진행 중입니다.")
    },
    69: {
        "upright": ("Give generously. The flow of giving and receiving benefits all.",
                   "너그럽게 베푸세요. 주고받음의 흐름이 모두에게 이롭습니다."),
        "reversed": ("Beware strings attached. Give without expectation.",
                    "숨은 조건을 조심하세요. 기대 없이 베푸세요.")
    },
    70: {
        "upright": ("Be patient. Your investments will grow with time.",
                   "인내하세요. 투자는 시간이 지나면 성장합니다."),
        "reversed": ("Reassess your investments. Is patience or pivot needed?",
                    "투자를 재평가하세요. 인내가 필요한가요, 전환이 필요한가요?")
    },
    71: {
        "upright": ("Keep refining your skills. Mastery comes through practice.",
                   "기술을 계속 연마하세요. 숙달은 연습에서 옵니다."),
        "reversed": ("Balance perfectionism with progress. Don't settle for mediocrity.",
                    "완벽주의와 진전의 균형을 맞추세요. 평범함에 안주하지 마세요.")
    },
    72: {
        "upright": ("Enjoy your success. You've earned this abundance.",
                   "성공을 즐기세요. 이 풍요를 얻을 자격이 있습니다."),
        "reversed": ("Live within your means. True abundance is sustainable.",
                    "분수에 맞게 살아가세요. 진정한 풍요는 지속 가능합니다.")
    },
    73: {
        "upright": ("Build a lasting legacy. Think generationally.",
                   "지속적인 유산을 쌓으세요. 세대를 넘어 생각하세요."),
        "reversed": ("Resolve family financial conflicts. Protect your legacy.",
                    "가족 재정 갈등을 해결하세요. 유산을 보호하세요.")
    },
    74: {
        "upright": ("Approach opportunities with eagerness to learn.",
                   "배우려는 열의로 기회에 접근하세요."),
        "reversed": ("Stop procrastinating. Take practical action now.",
                    "미루기를 그만두세요. 지금 실제적인 행동을 취하세요.")
    },
    75: {
        "upright": ("Stay steady and methodical. Consistency brings results.",
                   "꾸준하고 체계적으로 하세요. 일관성이 결과를 가져옵니다."),
        "reversed": ("Break the monotony. Don't let perfectionism stop progress.",
                    "단조로움을 깨세요. 완벽주의가 진전을 막지 않게 하세요.")
    },
    76: {
        "upright": ("Balance home and work wisely. Nurture while staying practical.",
                   "가정과 일의 균형을 현명하게 맞추세요. 실용적이면서 돌보세요."),
        "reversed": ("Prioritize self-care. Address work-life imbalance.",
                    "자기 관리를 우선시하세요. 일-삶 불균형을 해결하세요.")
    },
    77: {
        "upright": ("Lead with business wisdom. Your success is well-earned.",
                   "사업적 지혜로 이끄세요. 당신의 성공은 정당합니다."),
        "reversed": ("Don't let greed corrupt your leadership. Balance profit with ethics.",
                    "탐욕이 리더십을 부패시키지 않게 하세요. 이익과 윤리의 균형을 맞추세요.")
    }
}

# Read the file
with open(r'c:\dev\saju-astro-chat\src\lib\Tarot\tarot-data.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# For each card ID from 64 to 77
for card_id in range(64, 78):
    upright_advice, upright_advice_ko = advice_data[card_id]["upright"]
    reversed_advice, reversed_advice_ko = advice_data[card_id]["reversed"]

    # Pattern to find card definition and add arcana/suit after nameKo
    pattern1 = rf"(  \{{\n    id: {card_id},\n    name: '[^']+',\n    nameKo: '[^']+',\n)(    image:)"
    replacement1 = rf"\1    arcana: 'minor',\n    suit: 'pentacles',\n\2"
    content = re.sub(pattern1, replacement1, content)

    # Pattern to add advice to upright section (after keywordsKo)
    pattern2 = rf"(    id: {card_id},[\s\S]*?upright: \{{\n      keywords: \[[^\]]+\],\n      keywordsKo: \[[^\]]+\],\n)(      meaning:)"
    replacement2 = rf"\1      advice: '{upright_advice}',\n      adviceKo: '{upright_advice_ko}',\n\2"
    content = re.sub(pattern2, replacement2, content)

    # Pattern to add advice to reversed section (after keywordsKo)
    pattern3 = rf"(    id: {card_id},[\s\S]*?reversed: \{{\n      keywords: \[[^\]]+\],\n      keywordsKo: \[[^\]]+\],\n)(      meaning:)"
    replacement3 = rf"\1      advice: '{reversed_advice}',\n      adviceKo: '{reversed_advice_ko}',\n\2"
    content = re.sub(pattern3, replacement3, content)

# Write back
with open(r'c:\dev\saju-astro-chat\src\lib\Tarot\tarot-data.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated all 14 Pentacles cards!")
