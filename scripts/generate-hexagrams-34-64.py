import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Load the reference data
with open(r'c:\dev\saju-astro-chat\backend_ai\data\graph\rules\iching\hexagrams_full.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

hexagrams = data['hexagrams']

# Helper function to get emoji based on trigrams
def get_emoji(upper, lower):
    emoji_map = {
        ('thunder', 'heaven'): '⚡',
        ('fire', 'earth'): '☀️',
        ('earth', 'fire'): '🌑',
        ('wind', 'fire'): '👨‍👩‍👧‍👦',
        ('water', 'fire'): '💔',
        ('fire', 'water'): '⚖️',
        ('mountain', 'water'): '🚧',
        ('wind', 'mountain'): '🌱',
        ('heaven', 'fire'): '🤝',
        ('fire', 'heaven'): '🔥',
        ('earth', 'mountain'): '🙏',
        ('thunder', 'water'): '⚡',
        ('wind', 'thunder'): '💪',
        ('fire', 'lake'): '🌟',
        ('lake', 'fire'): '😊',
        ('thunder', 'earth'): '🎯',
        ('earth', 'thunder'): '🌾',
        ('lake', 'wind'): '🗣️',
        ('wind', 'lake'): '⚠️',
        ('water', 'mountain'): '⛰️',
        ('mountain', 'wind'): '🪶',
        ('thunder', 'fire'): '🍽️',
        ('mountain', 'fire'): '🎨',
        ('fire', 'mountain'): '✈️',
        ('lake', 'earth'): '💧',
        ('wind', 'earth'): '👁️',
        ('earth', 'wind'): '📚',
        ('lake', 'water'): '🌊',
        ('water', 'lake'): '🎓',
        ('wind', 'wind'): '🌬️',
        ('fire', 'fire'): '🔆',
        ('lake', 'lake'): '😄',
        ('thunder', 'thunder'): '⚡',
        ('mountain', 'mountain'): '⛰️',
        ('water', 'water'): '💧',
        ('heaven', 'heaven'): '☰',
        ('earth', 'earth'): '☷',
    }
    return emoji_map.get((upper, lower), '🔮')

# Generate TypeScript code for hexagrams 34-64
output = []

for i in range(34, 65):
    hex_data = hexagrams[str(i)]
    upper = hex_data['trigram_upper']
    lower = hex_data['trigram_lower']
    emoji = get_emoji(upper, lower)

    # Determine colors based on element
    element = hex_data.get('element', 'earth')
    color_map = {
        'wood': ['초록색', '연두색', '갈색'],
        'fire': ['빨강색', '주황색', '노랑색'],
        'earth': ['노랑색', '갈색', '베이지색'],
        'metal': ['흰색', '회색', '은색'],
        'water': ['파랑색', '검정색', '남색']
    }
    colors = color_map.get(element, ['회색', '흰색', '파랑색'])

    # Determine favorability based on judgment and themes
    judgment_ko = hex_data.get('judgment', {}).get('ko', '')
    favorability = 7
    if '흉' in judgment_ko or '어려움' in judgment_ko:
        favorability = 4
    elif '길' in judgment_ko or '이롭' in judgment_ko:
        favorability = 8
    elif '경계' in judgment_ko or '조심' in judgment_ko:
        favorability = 5

    # Determine difficulty
    difficulty = 'medium'
    if i in [36, 39, 47, 48, 63, 64]:  # Harder hexagrams
        difficulty = 'hard'
    elif i in [35, 37, 42, 50, 58, 61]:  # Easier hexagrams
        difficulty = 'easy'

    name_ko = hex_data.get('name_ko', '')
    name_hanja = hex_data.get('name_hanja', '')
    core_meaning = hex_data.get('core_meaning', {}).get('ko', '')

    themes = hex_data.get('themes', {})
    career = themes.get('career', {}).get('ko', '')
    love = themes.get('love', {}).get('ko', '')
    health = themes.get('health', {}).get('ko', '')
    wealth = themes.get('wealth', {}).get('ko', '')
    timing = themes.get('timing', {}).get('ko', '')

    # Generate scene description based on trigrams
    trigram_desc = {
        'heaven': '하늘',
        'earth': '땅',
        'thunder': '우레',
        'wind': '바람',
        'water': '물',
        'fire': '불',
        'mountain': '산',
        'lake': '호수'
    }
    upper_ko = trigram_desc.get(upper, upper)
    lower_ko = trigram_desc.get(lower, lower)
    scene = f"{upper_ko} 위에 {lower_ko}이(가) 있다"

    # Extract symbolism from core meaning
    symbolism_parts = core_meaning.split('.')[:2]
    symbolism = ', '.join([s.strip() for s in symbolism_parts])

    # Generate one-liner from core meaning
    one_liner = core_meaning.split('.')[0] if '.' in core_meaning else core_meaning

    # Extract keywords from themes
    keywords = []
    if '발전' in career or '승진' in career:
        keywords.append('발전')
    if '사랑' in love or '관계' in love:
        keywords.append('관계')
    if '건강' in health:
        keywords.append('건강')
    if '재물' in wealth or '재정' in wealth:
        keywords.append('재물')
    if '시기' in timing:
        keywords.append('타이밍')
    if len(keywords) < 3:
        keywords.extend(['지혜', '인내', '성공'][:3-len(keywords)])

    # Generate essence from core meaning and judgment
    essence = f"{core_meaning.split('.')[0]}. {judgment_ko}" if judgment_ko else core_meaning

    code = f'''
  {i}: {{
    visualImagery: {{
      scene: "{scene}",
      symbolism: "{symbolism}",
      colors: {json.dumps(colors, ensure_ascii=False)},
      emoji: "{emoji}"
    }},
    quickSummary: {{
      oneLiner: "{one_liner}",
      keywords: {json.dumps(keywords[:5], ensure_ascii=False)},
      essence: "{essence}"
    }},
    actionableAdvice: {{
      dos: [
        "{career.split('.')[0] if career else '적극적으로 행동하세요'}",
        "{love.split('.')[0] if love else '진심을 다하세요'}",
        "{wealth.split('.')[0] if wealth else '신중하게 관리하세요'}"
      ],
      donts: [
        "성급하게 판단하지 마세요",
        "조급하게 서두르지 마세요",
        "과신하지 마세요"
      ],
      timing: "{timing}",
      nextSteps: [
        "1단계: 현재 상황 파악하기",
        "2단계: 적절한 행동 계획 세우기",
        "3단계: 신중하게 실행하기",
        "4단계: 결과 확인하고 조정하기"
      ]
    }},
    situationTemplates: {{
      career: {{
        question: "직장에서 어떻게 처신해야 할까요?",
        advice: "{career}",
        timeline: "3-6개월 내 변화가 있을 것입니다.",
        actionItems: [
          "현재 업무에 집중하기",
          "상사와 좋은 관계 유지하기",
          "실력 향상하기"
        ]
      }},
      love: {{
        question: "연애를 어떻게 해야 할까요?",
        advice: "{love}",
        timeline: "인내심을 갖고 기다리면 좋은 결과가 있습니다.",
        actionItems: [
          "솔직하게 대화하기",
          "상대방 입장 이해하기",
          "꾸준히 관심 표현하기"
        ]
      }},
      health: {{
        question: "건강 관리를 어떻게 해야 할까요?",
        advice: "{health}",
        timeline: "꾸준히 관리하면 개선됩니다.",
        actionItems: [
          "규칙적인 생활 습관 유지하기",
          "적절한 운동하기",
          "건강검진 받기"
        ]
      }},
      wealth: {{
        question: "재정 관리를 어떻게 해야 할까요?",
        advice: "{wealth}",
        timeline: "장기적인 관점에서 접근하세요.",
        actionItems: [
          "수입과 지출 관리하기",
          "저축하기",
          "투자 공부하기"
        ]
      }},
      decision: {{
        question: "중요한 결정을 어떻게 해야 할까요?",
        advice: "{judgment_ko}",
        actionItems: [
          "충분히 생각하기",
          "조언 구하기",
          "신중하게 결정하기"
        ]
      }},
      timing: {{
        question: "언제 행동해야 할까요?",
        advice: "{timing}",
        actionItems: [
          "적절한 시기 기다리기",
          "준비 철저히 하기",
          "기회 놓치지 않기"
        ]
      }}
    }},
    plainLanguage: {{
      traditionalText: "{name_hanja} - {name_ko}. {judgment_ko}",
      modernExplanation: "{core_meaning}",
      realLifeExample: "실제 삶에서는 {one_liner.lower()}",
      metaphor: "자연에서는 {scene.lower()}과 같습니다."
    }},
    relatedConcepts: {json.dumps(keywords, ensure_ascii=False)},
    difficulty: '{difficulty}',
    favorability: {favorability}
  }},'''

    output.append(code)

# Print the complete code
print('\n'.join(output))
