#!/usr/bin/env python3
import re
import time

# Read the file
with open('src/lib/Tarot/tarot-data.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Card updates with arcana, suit, and advice
cards = [
    {
        'id': 1,
        'name': 'The Magician',
        'nameKo': '마법사',
        'upright_advice': 'Use your skills and resources wisely. You have everything you need to succeed.',
        'upright_adviceKo': '기술과 자원을 현명하게 사용하세요. 성공에 필요한 모든 것을 가지고 있습니다.',
        'reversed_advice': 'Be honest with yourself and others. Reconnect with your true abilities.',
        'reversed_adviceKo': '자신과 타인에게 정직하세요. 진정한 능력과 다시 연결하세요.'
    },
    {
        'id': 2,
        'name': 'The High Priestess',
        'nameKo': '여사제',
        'upright_advice': 'Trust your intuition. Be still and listen to your inner wisdom.',
        'upright_adviceKo': '직관을 믿으세요. 고요히 내면의 지혜에 귀 기울이세요.',
        'reversed_advice': 'Reconnect with your inner voice. Be wary of hidden agendas around you.',
        'reversed_adviceKo': '내면의 목소리와 다시 연결하세요. 주변의 숨겨진 의도를 경계하세요.'
    },
    {
        'id': 3,
        'name': 'The Empress',
        'nameKo': '여황제',
        'upright_advice': 'Nurture yourself and others. Embrace creativity and connect with nature.',
        'upright_adviceKo': '자신과 타인을 돌보세요. 창의성을 받아들이고 자연과 연결하세요.',
        'reversed_advice': "Find balance in nurturing. Don't neglect your own creative needs.",
        'reversed_adviceKo': '양육의 균형을 찾으세요. 자신의 창조적 필요를 방치하지 마세요.'
    },
    {
        'id': 4,
        'name': 'The Emperor',
        'nameKo': '황제',
        'upright_advice': 'Take charge with clear boundaries. Create structure and lead with wisdom.',
        'upright_adviceKo': '명확한 경계로 책임을 지세요. 구조를 만들고 지혜로 이끄세요.',
        'reversed_advice': 'Examine your relationship with power. Find balance between control and flexibility.',
        'reversed_adviceKo': '권력과의 관계를 점검하세요. 통제와 유연성 사이의 균형을 찾으세요.'
    },
    {
        'id': 5,
        'name': 'The Hierophant',
        'nameKo': '교황',
        'upright_advice': 'Seek wisdom from established traditions. Consider working with a mentor.',
        'upright_adviceKo': '확립된 전통에서 지혜를 구하세요. 멘토와 함께 일하는 것을 고려하세요.',
        'reversed_advice': "Trust your own spiritual journey. Don't be afraid to question traditions.",
        'reversed_adviceKo': '자신만의 영적 여정을 믿으세요. 전통에 의문을 품는 것을 두려워하지 마세요.'
    },
    {
        'id': 6,
        'name': 'The Lovers',
        'nameKo': '연인',
        'upright_advice': 'Follow your heart in matters of love. Align your choices with your values.',
        'upright_adviceKo': '사랑의 문제에서 마음을 따르세요. 선택을 가치관과 일치시키세요.',
        'reversed_advice': 'Examine your values and relationships. Address imbalances honestly.',
        'reversed_adviceKo': '가치관과 관계를 점검하세요. 불균형을 정직하게 해결하세요.'
    },
    {
        'id': 7,
        'name': 'The Chariot',
        'nameKo': '전차',
        'upright_advice': 'Stay focused on your goals. Use your willpower to overcome challenges.',
        'upright_adviceKo': '목표에 집중하세요. 의지력을 사용해 도전을 극복하세요.',
        'reversed_advice': 'Regain your focus. Channel your energy constructively, not aggressively.',
        'reversed_adviceKo': '집중력을 되찾으세요. 에너지를 공격적이 아닌 건설적으로 사용하세요.'
    },
    {
        'id': 8,
        'name': 'Strength',
        'nameKo': '힘',
        'upright_advice': 'Lead with compassion, not force. Your inner strength will guide you through.',
        'upright_adviceKo': '힘이 아닌 연민으로 이끄세요. 내면의 힘이 당신을 인도할 것입니다.',
        'reversed_advice': 'Build your inner confidence. Face your fears with gentle courage.',
        'reversed_adviceKo': '내면의 자신감을 키우세요. 부드러운 용기로 두려움에 맞서세요.'
    },
    {
        'id': 9,
        'name': 'The Hermit',
        'nameKo': '은둔자',
        'upright_advice': 'Take time for solitude and reflection. The answers you seek are within.',
        'upright_adviceKo': '고독과 성찰의 시간을 가지세요. 찾는 답은 내면에 있습니다.',
        'reversed_advice': "Balance solitude with connection. Don't isolate yourself too much.",
        'reversed_adviceKo': '고독과 연결의 균형을 맞추세요. 너무 고립되지 마세요.'
    },
    {
        'id': 10,
        'name': 'Wheel of Fortune',
        'nameKo': '운명의 수레바퀴',
        'upright_advice': 'Embrace change. This is a fortunate turning point in your journey.',
        'upright_adviceKo': '변화를 받아들이세요. 이것은 여정의 행운의 전환점입니다.',
        'reversed_advice': 'Accept that change is inevitable. Work to break negative cycles.',
        'reversed_adviceKo': '변화가 불가피함을 받아들이세요. 부정적 순환을 끊도록 노력하세요.'
    }
]

for card in cards:
    card_id = card['id']
    name_ko = card['nameKo']

    # Add arcana and suit after nameKo
    pattern = rf"(\s+id: {card_id},\s+name: '{card['name']}',\s+nameKo: '{name_ko}',)"
    replacement = rf"\1\n    arcana: 'major',\n    suit: 'major',"
    content = re.sub(pattern, replacement, content)

    # Add upright advice
    # Find the upright meaningKo and add advice after it
    pattern = rf"(id: {card_id}[\s\S]*?upright: \{{[\s\S]*?meaningKo: '[^']*')"
    replacement = rf"\1,\n      advice: '{card['upright_advice']}',\n      adviceKo: '{card['upright_adviceKo']}'"
    content = re.sub(pattern, replacement, content, count=1)

    # Add reversed advice
    # Find the reversed meaningKo and add advice after it
    pattern = rf"(id: {card_id}[\s\S]*?reversed: \{{[\s\S]*?meaningKo: '[^']*')(\s+\}})"
    replacement = rf"\1,\n      advice: '{card['reversed_advice']}',\n      adviceKo: '{card['reversed_adviceKo']}'\2"
    content = re.sub(pattern, replacement, content, count=1)

# Write back to file
with open('src/lib/Tarot/tarot-data.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated cards 1-10!")
