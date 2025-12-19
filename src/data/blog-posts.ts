export interface BlogPost {
  slug: string;
  title: string;
  titleKo: string;
  excerpt: string;
  excerptKo: string;
  content: string;
  contentKo: string;
  category: string;
  categoryKo: string;
  icon: string;
  date: string;
  readTime: number;
  featured?: boolean;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "what-is-saju-four-pillars-destiny",
    title: "What is Saju? A Complete Guide to the Four Pillars of Destiny",
    titleKo: "사주란 무엇인가? 사주팔자 완벽 가이드",
    excerpt: "Discover the ancient Korean-Chinese divination system that reveals your life path through the four pillars of your birth time.",
    excerptKo: "태어난 시간의 네 기둥을 통해 인생의 길을 밝히는 한국-중국 고대 점술 체계를 알아보세요.",
    category: "Saju",
    categoryKo: "사주",
    icon: "四",
    date: "2024-12-15",
    readTime: 8,
    featured: true,
    content: `
## Introduction to Saju (Four Pillars of Destiny)

Saju (사주, 四柱), also known as the Four Pillars of Destiny, is an ancient divination system that originated in China and has been practiced in Korea for over a thousand years. The term "Saju" literally translates to "four pillars," referring to the four components of your birth time: year, month, day, and hour.

## The Philosophy Behind Saju

At the core of Saju lies the concept of the Five Elements (五行, Ohaeng): Wood (木), Fire (火), Earth (土), Metal (金), and Water (水). These elements interact with each other in cycles of creation and destruction, influencing every aspect of our lives.

Each person's birth chart contains a unique combination of these elements, expressed through the Heavenly Stems (天干) and Earthly Branches (地支). The balance and interaction of these elements determine your:

- **Personality traits** and natural tendencies
- **Career aptitudes** and professional success
- **Relationship compatibility** with others
- **Health patterns** and vulnerabilities
- **Fortune cycles** throughout your life

## The Four Pillars Explained

### Year Pillar (年柱, Yeonju)
Represents your ancestral influences, social position, and early childhood environment. It shows how the world perceives you and your relationship with society.

### Month Pillar (月柱, Wolju)
Reflects your parents' influence, career path, and young adult life. This pillar often indicates your primary profession and public achievements.

### Day Pillar (日柱, Ilju)
The most important pillar—it represents your core self, your spouse, and your adult life. The Day Master (日主, Ilju) is considered your true essence.

### Hour Pillar (時柱, Siju)
Represents your children, creativity, later years, and legacy. It shows what you leave behind for future generations.

## How Saju Differs from Western Astrology

While both systems analyze birth time, Saju and Western Astrology have key differences:

| Saju | Western Astrology |
|------|-------------------|
| Based on lunar calendar | Based on solar calendar |
| Uses Five Elements theory | Uses planetary influences |
| 60-year cycle (sexagenary) | 12-month zodiac cycle |
| Focuses on elemental balance | Focuses on planetary aspects |

## Understanding Your Saju Reading

A professional Saju reading analyzes:

1. **Day Master strength**: Is your core element strong or weak?
2. **Elemental balance**: Which elements are excessive or lacking?
3. **Favorable elements**: Which elements support your success?
4. **Luck cycles (大運, Daeun)**: 10-year periods of fortune
5. **Annual fortune (歲運, Seun)**: Yearly energy influences

## Practical Applications

Saju is used in Korea for:

- **Naming children**: Choosing characters that balance the child's chart
- **Marriage compatibility**: Analyzing if couples are harmonious
- **Business decisions**: Timing important ventures
- **Career guidance**: Finding suitable professions
- **Health management**: Understanding vulnerabilities

## Conclusion

Saju offers profound insights into your life's blueprint. While it doesn't predict fixed destinies, it reveals tendencies and potentials that can guide your decisions. Understanding your Saju is the first step toward living in harmony with your natural energy patterns.

Ready to discover your Four Pillars? Try our AI-powered Saju analysis for personalized insights.
    `,
    contentKo: `
## 사주(四柱) 소개

사주(四柱)는 중국에서 유래하여 천 년 이상 한국에서 실천되어 온 고대 점술 체계입니다. '사주'라는 용어는 문자 그대로 '네 개의 기둥'을 의미하며, 출생 시간의 네 가지 구성 요소인 년(年), 월(月), 일(日), 시(時)를 나타냅니다.

## 사주의 철학적 배경

사주의 핵심에는 오행(五行) 개념이 있습니다: 목(木), 화(火), 토(土), 금(金), 수(水). 이러한 요소들은 상생(相生)과 상극(相剋)의 순환 속에서 서로 작용하며 우리 삶의 모든 측면에 영향을 미칩니다.

각 사람의 사주 명식에는 천간(天干)과 지지(地支)를 통해 표현되는 고유한 오행 조합이 담겨 있습니다. 이러한 요소들의 균형과 상호작용이 다음을 결정합니다:

- **성격 특성**과 타고난 성향
- **직업 적성**과 전문적 성공
- **대인 관계**에서의 궁합
- **건강 패턴**과 취약점
- **인생 전반의 운세** 흐름

## 사주팔자의 네 기둥

### 년주(年柱)
조상의 영향, 사회적 지위, 어린 시절 환경을 나타냅니다. 세상이 당신을 어떻게 인식하는지와 사회와의 관계를 보여줍니다.

### 월주(月柱)
부모의 영향, 직업 경로, 청년기를 반영합니다. 이 기둥은 종종 주요 직업과 대중적 성취를 나타냅니다.

### 일주(日柱)
가장 중요한 기둥입니다. 핵심 자아, 배우자, 성인 생활을 나타냅니다. 일주의 일간(日干)은 진정한 본질로 여겨집니다.

### 시주(時柱)
자녀, 창의성, 말년, 유산을 나타냅니다. 미래 세대에 남기는 것을 보여줍니다.

## 사주와 서양 점성술의 차이

두 체계 모두 출생 시간을 분석하지만, 사주와 서양 점성술에는 주요 차이점이 있습니다:

| 사주 | 서양 점성술 |
|------|------------|
| 음력 기반 | 양력 기반 |
| 오행 이론 사용 | 행성 영향 사용 |
| 60년 주기(육십갑자) | 12개월 황도대 주기 |
| 오행 균형 중시 | 행성 배치 중시 |

## 사주 해석 이해하기

전문적인 사주 해석은 다음을 분석합니다:

1. **일간 강약**: 핵심 오행이 강한가 약한가?
2. **오행 균형**: 어떤 오행이 과다하거나 부족한가?
3. **용신(用神)**: 어떤 오행이 성공을 지원하는가?
4. **대운(大運)**: 10년 단위의 운세 주기
5. **세운(歲運)**: 연간 에너지 영향

## 실용적 활용

한국에서 사주는 다음에 활용됩니다:

- **작명**: 아이의 사주 균형을 맞추는 한자 선택
- **궁합**: 커플의 조화 분석
- **사업 결정**: 중요한 사업의 타이밍
- **진로 지도**: 적합한 직업 찾기
- **건강 관리**: 취약점 이해

## 결론

사주는 인생의 청사진에 대한 깊은 통찰을 제공합니다. 고정된 운명을 예측하지는 않지만, 결정을 안내할 수 있는 경향과 잠재력을 드러냅니다. 사주를 이해하는 것은 타고난 에너지 패턴과 조화롭게 살아가는 첫걸음입니다.

나의 사주팔자를 알아보고 싶으신가요? AI 기반 사주 분석으로 맞춤형 인사이트를 받아보세요.
    `,
  },
  {
    slug: "understanding-western-astrology-birth-chart",
    title: "Understanding Your Birth Chart: A Beginner's Guide to Western Astrology",
    titleKo: "출생 차트 이해하기: 서양 점성술 입문 가이드",
    excerpt: "Learn how to read your natal chart and discover what the stars reveal about your personality, relationships, and life purpose.",
    excerptKo: "출생 차트를 읽는 방법을 배우고 별이 당신의 성격, 관계, 인생 목적에 대해 무엇을 드러내는지 알아보세요.",
    category: "Astrology",
    categoryKo: "점성술",
    icon: "✦",
    date: "2024-12-10",
    readTime: 10,
    content: `
## What is a Birth Chart?

A birth chart, also known as a natal chart, is a snapshot of the sky at the exact moment you were born. It shows the positions of the Sun, Moon, planets, and other celestial bodies relative to the Earth, mapped onto the 12 houses of the zodiac.

Think of it as your cosmic DNA—a unique blueprint that influences your personality, strengths, challenges, and life path.

## The Three Key Components

### 1. Sun Sign
Your Sun sign represents your core identity, ego, and life purpose. It's determined by the zodiac constellation the Sun occupied at your birth.

**The 12 Sun Signs:**
- **Aries** (Mar 21 - Apr 19): Bold, ambitious, pioneering
- **Taurus** (Apr 20 - May 20): Stable, sensual, determined
- **Gemini** (May 21 - Jun 20): Curious, adaptable, communicative
- **Cancer** (Jun 21 - Jul 22): Nurturing, intuitive, protective
- **Leo** (Jul 23 - Aug 22): Creative, confident, generous
- **Virgo** (Aug 23 - Sep 22): Analytical, helpful, precise
- **Libra** (Sep 23 - Oct 22): Harmonious, diplomatic, aesthetic
- **Scorpio** (Oct 23 - Nov 21): Intense, transformative, perceptive
- **Sagittarius** (Nov 22 - Dec 21): Adventurous, philosophical, optimistic
- **Capricorn** (Dec 22 - Jan 19): Ambitious, disciplined, practical
- **Aquarius** (Jan 20 - Feb 18): Innovative, humanitarian, independent
- **Pisces** (Feb 19 - Mar 20): Compassionate, artistic, intuitive

### 2. Moon Sign
Your Moon sign governs your emotional nature, instincts, and subconscious patterns. It reveals how you process feelings and what makes you feel secure.

### 3. Rising Sign (Ascendant)
Your Rising sign is the zodiac sign that was ascending on the eastern horizon at your birth. It represents your outer personality—how others perceive you and how you approach new situations.

## The 12 Houses

The birth chart is divided into 12 houses, each governing different life areas:

1. **First House** - Self, identity, appearance
2. **Second House** - Money, values, possessions
3. **Third House** - Communication, siblings, short trips
4. **Fourth House** - Home, family, roots
5. **Fifth House** - Creativity, romance, children
6. **Sixth House** - Health, work, daily routines
7. **Seventh House** - Partnerships, marriage, contracts
8. **Eighth House** - Transformation, shared resources, intimacy
9. **Ninth House** - Higher learning, travel, philosophy
10. **Tenth House** - Career, public image, authority
11. **Eleventh House** - Friends, groups, hopes
12. **Twelfth House** - Spirituality, subconscious, solitude

## Planetary Influences

Each planet brings specific energies to your chart:

- **Mercury** - Communication, thinking, learning
- **Venus** - Love, beauty, values
- **Mars** - Action, desire, assertiveness
- **Jupiter** - Expansion, luck, wisdom
- **Saturn** - Structure, discipline, lessons
- **Uranus** - Innovation, rebellion, sudden change
- **Neptune** - Dreams, intuition, spirituality
- **Pluto** - Transformation, power, rebirth

## Understanding Aspects

Aspects are the angular relationships between planets in your chart:

- **Conjunction (0°)** - Merging, intensification
- **Sextile (60°)** - Harmony, opportunity
- **Square (90°)** - Tension, challenge, growth
- **Trine (120°)** - Flow, ease, natural talent
- **Opposition (180°)** - Balance, awareness, polarity

## How to Use Your Birth Chart

Your birth chart is a tool for self-discovery, not a fixed destiny. Use it to:

1. **Understand your strengths** and leverage them
2. **Recognize challenges** and work with them consciously
3. **Improve relationships** by understanding compatibility
4. **Time important decisions** using transits
5. **Discover your life purpose** through the North Node

## Getting Started

Ready to explore your cosmic blueprint? Generate your free birth chart using our Astrology tool. All you need is your:
- Birth date
- Birth time (as accurate as possible)
- Birth location

Your journey to self-understanding through the stars begins now.
    `,
    contentKo: `
## 출생 차트란?

출생 차트(네이탈 차트)는 당신이 태어난 정확한 순간의 하늘을 스냅샷으로 담은 것입니다. 태양, 달, 행성 및 기타 천체들의 지구 대비 위치를 황도대 12하우스에 매핑하여 보여줍니다.

이것을 우주적 DNA라고 생각하세요—당신의 성격, 강점, 도전, 인생 경로에 영향을 미치는 고유한 청사진입니다.

## 세 가지 핵심 요소

### 1. 태양 별자리
태양 별자리는 핵심 정체성, 자아, 인생 목적을 나타냅니다. 출생 시 태양이 위치한 황도대 별자리에 의해 결정됩니다.

**12개의 태양 별자리:**
- **양자리** (3/21 - 4/19): 대담함, 야망, 개척 정신
- **황소자리** (4/20 - 5/20): 안정적, 감각적, 결단력
- **쌍둥이자리** (5/21 - 6/20): 호기심, 적응력, 소통력
- **게자리** (6/21 - 7/22): 양육적, 직관적, 보호적
- **사자자리** (7/23 - 8/22): 창의적, 자신감, 관대함
- **처녀자리** (8/23 - 9/22): 분석적, 도움, 정확함
- **천칭자리** (9/23 - 10/22): 조화로움, 외교적, 미적 감각
- **전갈자리** (10/23 - 11/21): 강렬함, 변화, 통찰력
- **사수자리** (11/22 - 12/21): 모험적, 철학적, 낙관적
- **염소자리** (12/22 - 1/19): 야망, 규율, 실용적
- **물병자리** (1/20 - 2/18): 혁신적, 인도주의적, 독립적
- **물고기자리** (2/19 - 3/20): 자비로움, 예술적, 직관적

### 2. 달 별자리
달 별자리는 감정적 본성, 본능, 무의식적 패턴을 지배합니다. 감정을 처리하는 방식과 안정감을 느끼는 것을 드러냅니다.

### 3. 상승궁 (어센던트)
상승궁은 출생 시 동쪽 지평선에 떠오르던 황도대 별자리입니다. 외적 성격—다른 사람들이 당신을 인식하는 방식과 새로운 상황에 접근하는 방식—을 나타냅니다.

## 12개의 하우스

출생 차트는 각각 다른 삶의 영역을 지배하는 12개의 하우스로 나뉩니다:

1. **1하우스** - 자아, 정체성, 외모
2. **2하우스** - 돈, 가치관, 소유물
3. **3하우스** - 소통, 형제, 단거리 여행
4. **4하우스** - 가정, 가족, 뿌리
5. **5하우스** - 창의성, 로맨스, 자녀
6. **6하우스** - 건강, 일, 일상
7. **7하우스** - 파트너십, 결혼, 계약
8. **8하우스** - 변화, 공유 자원, 친밀감
9. **9하우스** - 고등 교육, 여행, 철학
10. **10하우스** - 커리어, 대중적 이미지, 권위
11. **11하우스** - 친구, 단체, 희망
12. **12하우스** - 영성, 무의식, 고독

## 행성의 영향

각 행성은 차트에 특정 에너지를 가져옵니다:

- **수성** - 소통, 사고, 학습
- **금성** - 사랑, 아름다움, 가치
- **화성** - 행동, 욕망, 주장
- **목성** - 확장, 행운, 지혜
- **토성** - 구조, 규율, 교훈
- **천왕성** - 혁신, 반항, 갑작스러운 변화
- **해왕성** - 꿈, 직관, 영성
- **명왕성** - 변화, 권력, 재탄생

## 애스펙트 이해하기

애스펙트는 차트에서 행성 간의 각도 관계입니다:

- **합(0°)** - 융합, 강화
- **육분위(60°)** - 조화, 기회
- **스퀘어(90°)** - 긴장, 도전, 성장
- **트라인(120°)** - 흐름, 편안함, 타고난 재능
- **충(180°)** - 균형, 인식, 극성

## 출생 차트 활용법

출생 차트는 고정된 운명이 아닌 자기 발견의 도구입니다. 다음을 위해 활용하세요:

1. **강점을 이해**하고 활용하기
2. **도전을 인식**하고 의식적으로 다루기
3. **궁합 이해**로 관계 개선하기
4. **운행을 활용**해 중요한 결정 타이밍 잡기
5. **노스 노드**를 통해 인생 목적 발견하기

## 시작하기

우주적 청사진을 탐험할 준비가 되셨나요? Astrology 도구로 무료 출생 차트를 생성하세요. 필요한 것:
- 생년월일
- 출생 시간 (가능한 정확하게)
- 출생 장소

별을 통한 자기 이해의 여정이 지금 시작됩니다.
    `,
  },
  {
    slug: "tarot-card-meanings-beginners-guide",
    title: "Tarot Card Meanings: A Beginner's Guide to the 78 Cards",
    titleKo: "타로 카드 의미: 78장 카드 입문 가이드",
    excerpt: "Explore the symbolism and meanings of Major and Minor Arcana cards to enhance your tarot reading skills.",
    excerptKo: "메이저 아르카나와 마이너 아르카나 카드의 상징과 의미를 탐구하여 타로 리딩 실력을 향상시키세요.",
    category: "Tarot",
    categoryKo: "타로",
    icon: "🎴",
    date: "2024-12-05",
    readTime: 12,
    content: `
## Introduction to Tarot

Tarot is a powerful tool for self-reflection, guidance, and exploring possibilities. A standard tarot deck consists of 78 cards divided into two main sections: the Major Arcana (22 cards) and the Minor Arcana (56 cards).

## The Major Arcana

The Major Arcana represents significant life events, karmic lessons, and spiritual growth. These cards carry deeper, more profound meanings.

### The Fool's Journey

The 22 Major Arcana cards tell the story of The Fool's journey through life:

**0 - The Fool**
New beginnings, innocence, spontaneity, free spirit. The start of a journey into the unknown.

**I - The Magician**
Manifestation, willpower, skill, resourcefulness. You have all the tools you need.

**II - The High Priestess**
Intuition, mystery, inner knowledge, the subconscious. Trust your inner voice.

**III - The Empress**
Abundance, fertility, creativity, nurturing. Connection to nature and feminine energy.

**IV - The Emperor**
Authority, structure, stability, father figure. Establishing order and control.

**V - The Hierophant**
Tradition, conformity, spiritual wisdom, institutions. Following established paths.

**VI - The Lovers**
Love, harmony, relationships, choices. Important decisions about partnerships.

**VII - The Chariot**
Determination, willpower, triumph, control. Moving forward with confidence.

**VIII - Strength**
Courage, patience, inner strength, compassion. Gentle power over brute force.

**IX - The Hermit**
Introspection, solitude, wisdom, guidance. Taking time for inner reflection.

**X - Wheel of Fortune**
Destiny, cycles, change, luck. The turning point of fate.

**XI - Justice**
Fairness, truth, law, karma. Cause and effect, accountability.

**XII - The Hanged Man**
Surrender, new perspectives, letting go. Seeing things differently.

**XIII - Death**
Endings, transformation, transition. The end of one chapter, beginning of another.

**XIV - Temperance**
Balance, moderation, patience, harmony. Finding the middle path.

**XV - The Devil**
Bondage, addiction, materialism, shadow self. Breaking free from limitations.

**XVI - The Tower**
Sudden change, upheaval, revelation, awakening. Necessary destruction.

**XVII - The Star**
Hope, inspiration, serenity, renewal. Light after darkness.

**XVIII - The Moon**
Illusion, intuition, uncertainty, the subconscious. Things are not what they seem.

**XIX - The Sun**
Joy, success, vitality, confidence. Positivity and celebration.

**XX - Judgement**
Rebirth, inner calling, absolution, reflection. A spiritual awakening.

**XXI - The World**
Completion, integration, accomplishment, travel. The end of a cycle.

## The Minor Arcana

The Minor Arcana deals with everyday situations and practical matters. It's divided into four suits:

### Wands (Fire) - Action, Creativity, Will
- **Ace**: New inspiration, opportunities
- **Two**: Planning, future decisions
- **Three**: Expansion, foresight
- **Four**: Celebration, harmony
- **Five**: Conflict, competition
- **Six**: Victory, recognition
- **Seven**: Perseverance, defense
- **Eight**: Swift action, movement
- **Nine**: Resilience, persistence
- **Ten**: Burden, responsibility

### Cups (Water) - Emotions, Relationships, Intuition
- **Ace**: New love, emotional beginning
- **Two**: Partnership, mutual attraction
- **Three**: Celebration, friendship
- **Four**: Meditation, contemplation
- **Five**: Loss, regret, disappointment
- **Six**: Nostalgia, childhood memories
- **Seven**: Fantasy, choices, illusion
- **Eight**: Walking away, seeking deeper meaning
- **Nine**: Wish fulfillment, satisfaction
- **Ten**: Emotional fulfillment, family happiness

### Swords (Air) - Thoughts, Communication, Conflict
- **Ace**: Mental clarity, breakthrough
- **Two**: Difficult decisions, stalemate
- **Three**: Heartbreak, sorrow
- **Four**: Rest, recuperation
- **Five**: Conflict, defeat
- **Six**: Transition, moving on
- **Seven**: Deception, strategy
- **Eight**: Restriction, self-imprisonment
- **Nine**: Anxiety, nightmares
- **Ten**: Painful ending, rock bottom

### Pentacles (Earth) - Material World, Money, Health
- **Ace**: New financial opportunity
- **Two**: Balance, adaptability
- **Three**: Teamwork, skill development
- **Four**: Security, conservation
- **Five**: Financial loss, isolation
- **Six**: Generosity, sharing wealth
- **Seven**: Long-term investment, patience
- **Eight**: Skill development, diligence
- **Nine**: Abundance, luxury
- **Ten**: Wealth, family legacy

## Reading Tips for Beginners

1. **Start with daily one-card draws** to build familiarity
2. **Trust your intuition** over memorized meanings
3. **Notice the imagery** - colors, symbols, figures
4. **Consider card positions** in spreads
5. **Journal your readings** to track patterns

## Reversed Cards

When a card appears upside-down, it can indicate:
- Blocked or delayed energy
- Internal aspects of the meaning
- The shadow side of the card
- Resistance or need for attention

## Conclusion

Tarot is a lifelong learning journey. Start with the basics, practice regularly, and let the cards speak to you. Each reading is an opportunity for insight and growth.

Ready to practice? Try our AI-powered Tarot readings for guided interpretations.
    `,
    contentKo: `
## 타로 소개

타로는 자기 성찰, 안내, 가능성 탐구를 위한 강력한 도구입니다. 표준 타로 덱은 78장의 카드로 구성되며, 메이저 아르카나(22장)와 마이너 아르카나(56장)로 나뉩니다.

## 메이저 아르카나

메이저 아르카나는 중요한 인생 사건, 업보적 교훈, 영적 성장을 나타냅니다. 이 카드들은 더 깊고 심오한 의미를 담고 있습니다.

### 바보의 여정

22장의 메이저 아르카나 카드는 바보(The Fool)의 인생 여정을 이야기합니다:

**0 - 바보 (The Fool)**
새로운 시작, 순수함, 자발성, 자유로운 영혼. 미지의 세계로 떠나는 여정의 시작.

**I - 마법사 (The Magician)**
현현, 의지력, 기술, 자원 활용력. 필요한 모든 도구를 가지고 있습니다.

**II - 여사제 (The High Priestess)**
직관, 신비, 내면의 지식, 잠재의식. 내면의 목소리를 믿으세요.

**III - 여황제 (The Empress)**
풍요, 다산, 창의성, 양육. 자연과 여성 에너지와의 연결.

**IV - 황제 (The Emperor)**
권위, 구조, 안정, 아버지 상. 질서와 통제의 확립.

**V - 교황 (The Hierophant)**
전통, 순응, 영적 지혜, 제도. 확립된 길을 따르기.

**VI - 연인들 (The Lovers)**
사랑, 조화, 관계, 선택. 파트너십에 관한 중요한 결정.

**VII - 전차 (The Chariot)**
결단력, 의지력, 승리, 통제. 자신감을 가지고 전진하기.

**VIII - 힘 (Strength)**
용기, 인내, 내면의 힘, 연민. 무력보다는 부드러운 힘.

**IX - 은둔자 (The Hermit)**
성찰, 고독, 지혜, 안내. 내면 성찰을 위한 시간.

**X - 운명의 수레바퀴 (Wheel of Fortune)**
운명, 순환, 변화, 행운. 운명의 전환점.

**XI - 정의 (Justice)**
공정함, 진실, 법, 업보. 인과응보, 책임.

**XII - 매달린 남자 (The Hanged Man)**
항복, 새로운 관점, 놓아주기. 다르게 보기.

**XIII - 죽음 (Death)**
끝, 변화, 전환. 한 장의 끝, 다른 장의 시작.

**XIV - 절제 (Temperance)**
균형, 절제, 인내, 조화. 중도 찾기.

**XV - 악마 (The Devil)**
속박, 중독, 물질주의, 그림자 자아. 한계에서 벗어나기.

**XVI - 탑 (The Tower)**
갑작스러운 변화, 격변, 계시, 각성. 필요한 파괴.

**XVII - 별 (The Star)**
희망, 영감, 평온, 갱신. 어둠 후의 빛.

**XVIII - 달 (The Moon)**
환상, 직관, 불확실성, 잠재의식. 보이는 것이 전부가 아닙니다.

**XIX - 태양 (The Sun)**
기쁨, 성공, 활력, 자신감. 긍정과 축하.

**XX - 심판 (Judgement)**
재탄생, 내면의 부름, 사면, 성찰. 영적 각성.

**XXI - 세계 (The World)**
완성, 통합, 성취, 여행. 한 순환의 끝.

## 마이너 아르카나

마이너 아르카나는 일상적 상황과 실용적 문제를 다룹니다. 네 가지 수트로 나뉩니다:

### 완드 (불) - 행동, 창의성, 의지
- **에이스**: 새로운 영감, 기회
- **2**: 계획, 미래 결정
- **3**: 확장, 선견지명
- **4**: 축하, 조화
- **5**: 갈등, 경쟁
- **6**: 승리, 인정
- **7**: 인내, 방어
- **8**: 신속한 행동, 움직임
- **9**: 회복력, 끈기
- **10**: 부담, 책임

### 컵 (물) - 감정, 관계, 직관
- **에이스**: 새로운 사랑, 감정적 시작
- **2**: 파트너십, 상호 끌림
- **3**: 축하, 우정
- **4**: 명상, 숙고
- **5**: 상실, 후회, 실망
- **6**: 향수, 어린 시절 추억
- **7**: 환상, 선택, 환영
- **8**: 떠나기, 더 깊은 의미 찾기
- **9**: 소원 성취, 만족
- **10**: 감정적 충족, 가족 행복

### 소드 (공기) - 생각, 소통, 갈등
- **에이스**: 정신적 명확성, 돌파구
- **2**: 어려운 결정, 교착 상태
- **3**: 이별의 아픔, 슬픔
- **4**: 휴식, 회복
- **5**: 갈등, 패배
- **6**: 전환, 나아가기
- **7**: 속임, 전략
- **8**: 제약, 자기 감금
- **9**: 불안, 악몽
- **10**: 고통스러운 끝, 바닥

### 펜타클 (땅) - 물질 세계, 돈, 건강
- **에이스**: 새로운 재정적 기회
- **2**: 균형, 적응력
- **3**: 팀워크, 기술 개발
- **4**: 안전, 보존
- **5**: 재정적 손실, 고립
- **6**: 관대함, 부의 공유
- **7**: 장기 투자, 인내
- **8**: 기술 개발, 근면
- **9**: 풍요, 사치
- **10**: 부, 가족 유산

## 초보자를 위한 리딩 팁

1. **매일 한 장 뽑기**로 친숙해지기
2. 암기한 의미보다 **직관을 믿기**
3. **이미지 주목하기** - 색상, 상징, 인물
4. 스프레드에서 **카드 위치 고려하기**
5. 패턴 추적을 위해 **리딩 기록하기**

## 역방향 카드

카드가 거꾸로 나오면 다음을 나타낼 수 있습니다:
- 막히거나 지연된 에너지
- 의미의 내적 측면
- 카드의 그림자 면
- 저항 또는 주의 필요

## 결론

타로는 평생의 학습 여정입니다. 기본부터 시작하여 규칙적으로 연습하고 카드가 당신에게 말하게 하세요. 각 리딩은 통찰과 성장의 기회입니다.

연습할 준비가 되셨나요? AI 기반 타로 리딩으로 가이드 해석을 받아보세요.
    `,
  },
  {
    slug: "numerology-life-path-numbers-explained",
    title: "Numerology Life Path Numbers: Discover Your Destiny Through Numbers",
    titleKo: "수비학 생명 경로 숫자: 숫자로 운명 발견하기",
    excerpt: "Calculate your Life Path Number and learn what it reveals about your personality, purpose, and potential.",
    excerptKo: "생명 경로 숫자를 계산하고 성격, 목적, 잠재력에 대해 무엇을 드러내는지 알아보세요.",
    category: "Numerology",
    categoryKo: "수비학",
    icon: "🔢",
    date: "2024-11-28",
    readTime: 7,
    content: `
## What is Numerology?

Numerology is the ancient study of numbers and their mystical significance. It believes that numbers carry vibrational energies that influence our lives, personalities, and destinies.

## The Life Path Number

Your Life Path Number is the most important number in numerology. It reveals your life purpose, natural talents, and the opportunities and challenges you'll encounter.

### How to Calculate Your Life Path Number

Reduce your birth date to a single digit (or Master Number):

**Example: December 15, 1990**
- Month: 12 → 1 + 2 = 3
- Day: 15 → 1 + 5 = 6
- Year: 1990 → 1 + 9 + 9 + 0 = 19 → 1 + 9 = 10 → 1 + 0 = 1

Life Path = 3 + 6 + 1 = 10 → 1 + 0 = **1**

## Life Path Number Meanings

### Life Path 1 - The Leader
**Keywords**: Independence, innovation, ambition, originality

You're a natural-born leader with a pioneering spirit. Your path involves learning to stand on your own, take initiative, and forge new paths. Challenges include overcoming self-doubt and avoiding ego-driven decisions.

**Career paths**: Entrepreneur, CEO, inventor, freelancer

### Life Path 2 - The Diplomat
**Keywords**: Cooperation, sensitivity, balance, partnership

You excel in collaborative environments and have a gift for bringing people together. Your purpose involves learning patience, diplomacy, and the power of gentle persuasion.

**Career paths**: Mediator, counselor, team leader, artist

### Life Path 3 - The Communicator
**Keywords**: Creativity, expression, joy, social butterfly

You're blessed with creative talents and natural charisma. Your journey involves learning to express yourself authentically and bringing joy to others through your gifts.

**Career paths**: Writer, performer, speaker, designer

### Life Path 4 - The Builder
**Keywords**: Stability, hard work, practicality, dedication

You're the foundation builder of society. Your path involves creating lasting structures, whether physical buildings or organizational systems. You value discipline and reliability.

**Career paths**: Engineer, architect, manager, accountant

### Life Path 5 - The Adventurer
**Keywords**: Freedom, change, versatility, exploration

You crave variety and new experiences. Your purpose involves learning to embrace change while maintaining some stability. You're here to experience all of life's offerings.

**Career paths**: Travel guide, journalist, entrepreneur, sales

### Life Path 6 - The Nurturer
**Keywords**: Responsibility, love, family, healing

You're a natural caregiver with a strong sense of duty. Your path involves learning to balance giving and receiving while creating harmonious environments for others.

**Career paths**: Teacher, healer, counselor, designer

### Life Path 7 - The Seeker
**Keywords**: Wisdom, introspection, spirituality, analysis

You're a deep thinker drawn to life's mysteries. Your purpose involves seeking truth, developing intuition, and sharing spiritual insights with others.

**Career paths**: Researcher, analyst, spiritual teacher, writer

### Life Path 8 - The Powerhouse
**Keywords**: Abundance, authority, achievement, material mastery

You're here to master the material world and achieve success. Your path involves learning to balance material and spiritual wealth while using power responsibly.

**Career paths**: Executive, banker, lawyer, politician

### Life Path 9 - The Humanitarian
**Keywords**: Compassion, wisdom, completion, global consciousness

You're an old soul with a broad perspective. Your purpose involves serving humanity, completing karmic cycles, and inspiring others through selfless action.

**Career paths**: Humanitarian, artist, teacher, healer

## Master Numbers

Master Numbers (11, 22, 33) carry intensified energies:

### Life Path 11 - The Intuitive
Heightened intuition, spiritual insight, inspiration. You're a channel for higher wisdom.

### Life Path 22 - The Master Builder
Ability to turn dreams into reality on a large scale. You're here to create lasting legacies.

### Life Path 33 - The Master Teacher
Highest level of service and compassion. You're here to heal and uplift humanity.

## Other Important Numbers

- **Expression Number**: Derived from your full birth name
- **Soul Urge Number**: Your inner desires and motivations
- **Birthday Number**: Day of birth influences
- **Personal Year**: Current yearly cycle (1-9)

## Using Numerology

Apply numerology insights to:
1. **Career decisions** - align work with your path
2. **Relationships** - understand compatibility
3. **Timing** - know favorable periods for action
4. **Self-development** - work on your challenges

Ready to explore your numbers? Try our comprehensive Numerology calculator for detailed analysis.
    `,
    contentKo: `
## 수비학이란?

수비학은 숫자와 그 신비로운 의미에 대한 고대 연구입니다. 숫자가 우리의 삶, 성격, 운명에 영향을 미치는 진동 에너지를 담고 있다고 믿습니다.

## 생명 경로 숫자

생명 경로 숫자는 수비학에서 가장 중요한 숫자입니다. 인생 목적, 타고난 재능, 만나게 될 기회와 도전을 드러냅니다.

### 생명 경로 숫자 계산법

생년월일을 한 자리 숫자(또는 마스터 넘버)로 축소합니다:

**예시: 1990년 12월 15일**
- 월: 12 → 1 + 2 = 3
- 일: 15 → 1 + 5 = 6
- 년: 1990 → 1 + 9 + 9 + 0 = 19 → 1 + 9 = 10 → 1 + 0 = 1

생명 경로 = 3 + 6 + 1 = 10 → 1 + 0 = **1**

## 생명 경로 숫자 의미

### 생명 경로 1 - 리더
**키워드**: 독립, 혁신, 야망, 독창성

타고난 리더로 개척 정신을 가졌습니다. 당신의 경로는 스스로 서고, 주도권을 잡고, 새로운 길을 개척하는 것을 배우는 것입니다.

**직업 경로**: 기업가, CEO, 발명가, 프리랜서

### 생명 경로 2 - 외교관
**키워드**: 협력, 민감성, 균형, 파트너십

협력적 환경에서 뛰어나며 사람들을 하나로 모으는 재능이 있습니다. 인내, 외교, 부드러운 설득의 힘을 배우는 것이 목적입니다.

**직업 경로**: 중재자, 상담사, 팀 리더, 아티스트

### 생명 경로 3 - 소통자
**키워드**: 창의성, 표현, 기쁨, 사교적

창의적 재능과 타고난 카리스마를 축복받았습니다. 자신을 진정성 있게 표현하고 재능으로 다른 이들에게 기쁨을 주는 것이 여정입니다.

**직업 경로**: 작가, 공연자, 연사, 디자이너

### 생명 경로 4 - 건설자
**키워드**: 안정, 노력, 실용성, 헌신

사회의 기반을 세우는 사람입니다. 물리적 건물이든 조직 시스템이든 지속적인 구조를 만드는 것이 경로입니다.

**직업 경로**: 엔지니어, 건축가, 매니저, 회계사

### 생명 경로 5 - 모험가
**키워드**: 자유, 변화, 다재다능, 탐험

다양성과 새로운 경험을 갈망합니다. 안정을 유지하면서 변화를 수용하는 것을 배우는 것이 목적입니다.

**직업 경로**: 여행 가이드, 저널리스트, 기업가, 영업

### 생명 경로 6 - 양육자
**키워드**: 책임, 사랑, 가족, 치유

강한 의무감을 가진 타고난 돌봄이입니다. 주고받음의 균형을 배우면서 조화로운 환경을 만드는 것이 경로입니다.

**직업 경로**: 교사, 치유사, 상담사, 디자이너

### 생명 경로 7 - 탐구자
**키워드**: 지혜, 성찰, 영성, 분석

삶의 신비에 끌리는 깊은 사상가입니다. 진실을 추구하고, 직관을 개발하고, 영적 통찰을 공유하는 것이 목적입니다.

**직업 경로**: 연구원, 분석가, 영적 교사, 작가

### 생명 경로 8 - 파워하우스
**키워드**: 풍요, 권위, 성취, 물질적 숙달

물질 세계를 마스터하고 성공을 달성하기 위해 여기 있습니다. 물질적, 영적 부의 균형을 배우는 것이 경로입니다.

**직업 경로**: 임원, 은행가, 변호사, 정치인

### 생명 경로 9 - 인도주의자
**키워드**: 연민, 지혜, 완성, 글로벌 의식

넓은 시야를 가진 오래된 영혼입니다. 인류에 봉사하고, 업보적 순환을 완료하고, 이타적 행동으로 영감을 주는 것이 목적입니다.

**직업 경로**: 인도주의자, 아티스트, 교사, 치유사

## 마스터 넘버

마스터 넘버(11, 22, 33)는 강화된 에너지를 담습니다:

### 생명 경로 11 - 직관적 존재
고양된 직관, 영적 통찰, 영감. 더 높은 지혜의 채널입니다.

### 생명 경로 22 - 마스터 빌더
꿈을 대규모로 현실로 만드는 능력. 지속적인 유산을 만들기 위해 여기 있습니다.

### 생명 경로 33 - 마스터 티처
가장 높은 수준의 봉사와 연민. 인류를 치유하고 고양시키기 위해 여기 있습니다.

## 다른 중요한 숫자들

- **표현 숫자**: 전체 출생 이름에서 파생
- **영혼 충동 숫자**: 내면의 욕망과 동기
- **생일 숫자**: 생일의 영향
- **개인 연도**: 현재 연간 순환 (1-9)

## 수비학 활용하기

수비학 통찰을 적용하세요:
1. **진로 결정** - 경로에 맞는 일
2. **관계** - 궁합 이해
3. **타이밍** - 행동에 유리한 시기 파악
4. **자기 개발** - 도전 과제 작업

숫자를 탐구할 준비가 되셨나요? 종합 수비학 계산기로 상세한 분석을 받아보세요.
    `,
  },
  {
    slug: "iching-beginners-guide-hexagrams",
    title: "I Ching Guide: Understanding the Ancient Book of Changes",
    titleKo: "주역 가이드: 고대 변화의 책 이해하기",
    excerpt: "Learn the basics of I Ching divination, how to consult the oracle, and interpret the 64 hexagrams.",
    excerptKo: "주역 점술의 기본, 신탁에 묻는 법, 64괘 해석법을 배워보세요.",
    category: "I Ching",
    categoryKo: "주역",
    icon: "☯",
    date: "2024-11-20",
    readTime: 9,
    content: `
## What is the I Ching?

The I Ching (易經), also known as the Book of Changes, is one of the oldest and most profound divination systems in the world. Dating back over 3,000 years, it originated in ancient China and continues to provide wisdom and guidance today.

## The Philosophy of Change

At its core, the I Ching teaches that change is the only constant in life. By understanding the nature of change and your current position within it, you can navigate life's challenges with greater wisdom.

The system is based on the interplay of two fundamental forces:
- **Yin (陰)** - Receptive, dark, feminine, yielding
- **Yang (陽)** - Creative, light, masculine, active

## The Structure of Hexagrams

The I Ching consists of 64 hexagrams, each made of six horizontal lines that are either:
- **Solid line (—)** - Yang
- **Broken line (- -)** - Yin

Each hexagram is composed of two trigrams (three-line symbols):
- Upper trigram (outer world)
- Lower trigram (inner world)

## The Eight Trigrams

The eight basic building blocks are:

| Trigram | Name | Element | Attribute |
|---------|------|---------|-----------|
| ☰ | Qian | Heaven | Creative |
| ☷ | Kun | Earth | Receptive |
| ☳ | Zhen | Thunder | Arousing |
| ☵ | Kan | Water | Abysmal |
| ☶ | Gen | Mountain | Keeping Still |
| ☴ | Xun | Wind | Gentle |
| ☲ | Li | Fire | Clinging |
| ☱ | Dui | Lake | Joyous |

## How to Consult the I Ching

### Traditional Methods

**Yarrow Stalks Method**
The most authentic approach uses 50 yarrow stalks in an elaborate ritual that takes about 20 minutes per hexagram.

**Three Coins Method**
A simpler method using three coins:
1. Assign values: heads = 3, tails = 2
2. Throw all three coins together
3. Sum the values:
   - 6 = Old Yin (changing to Yang)
   - 7 = Young Yang (stable)
   - 8 = Young Yin (stable)
   - 9 = Old Yang (changing to Yin)
4. Repeat six times, building from bottom to top

### Modern Methods
Digital random number generators can also be used, as the I Ching responds to the moment of sincere inquiry.

## Asking Your Question

The quality of your question affects the quality of guidance:

**Good questions:**
- "What do I need to understand about this situation?"
- "What is the best approach to this challenge?"
- "What are the dynamics at play here?"

**Avoid:**
- Yes/no questions
- Questions about others without their involvement
- Trivial matters asked frivolously

## Key Hexagrams to Know

### Hexagram 1 - Qian (The Creative)
Six yang lines. Pure creative force. Success through perseverance. The power of heaven.

### Hexagram 2 - Kun (The Receptive)
Six yin lines. Pure receptive force. Success through yielding. The power of earth.

### Hexagram 11 - Tai (Peace)
Heaven below, Earth above. Harmony between opposites. A time of flourishing.

### Hexagram 12 - Pi (Standstill)
Earth below, Heaven above. Stagnation. A time to retreat and wait.

### Hexagram 63 - Ji Ji (After Completion)
Fire over Water. Everything in its place. Maintain order carefully.

### Hexagram 64 - Wei Ji (Before Completion)
Water over Fire. Almost there. Careful action needed.

## Interpreting Your Reading

1. **Read the hexagram judgment** - The main message
2. **Consider the image** - Visual metaphor for the situation
3. **Check changing lines** - Specific advice for moving lines
4. **Calculate the resulting hexagram** - Where the situation is heading
5. **Reflect on the trigram relationship** - Inner and outer dynamics

## Changing Lines

When you receive old yin (6) or old yang (9), these lines are "changing":
- They carry specific messages for your situation
- They transform into their opposite
- Create a second hexagram showing the outcome

## Living the I Ching

The I Ching is more than divination—it's a philosophy for life:

- **Accept change** as natural and inevitable
- **Balance** yin and yang in all things
- **Act appropriately** for each moment
- **Cultivate virtue** through conscious choice
- **Find wisdom** in nature's patterns

## Conclusion

The I Ching offers timeless wisdom for navigating life's uncertainties. Whether you seek practical guidance or philosophical insight, this ancient oracle meets you where you are.

Ready to consult the oracle? Try our AI-enhanced I Ching reading for modern interpretation of ancient wisdom.
    `,
    contentKo: `
## 주역이란?

주역(易經)은 변화의 책으로도 알려진, 세계에서 가장 오래되고 심오한 점술 체계 중 하나입니다. 3,000년 이상 전에 고대 중국에서 기원하여 오늘날까지 지혜와 안내를 제공하고 있습니다.

## 변화의 철학

핵심적으로 주역은 변화가 삶에서 유일하게 변하지 않는 것임을 가르칩니다. 변화의 본질과 그 안에서 현재 위치를 이해함으로써 더 큰 지혜로 삶의 도전을 헤쳐나갈 수 있습니다.

이 체계는 두 가지 근본적인 힘의 상호작용에 기반합니다:
- **음(陰)** - 수용적, 어두움, 여성적, 순응적
- **양(陽)** - 창조적, 밝음, 남성적, 능동적

## 괘의 구조

주역은 64개의 괘로 구성되며, 각각 6개의 수평선으로 이루어집니다:
- **실선(—)** - 양
- **끊어진 선(- -)** - 음

각 괘는 두 개의 소성괘(3선 상징)로 구성됩니다:
- 상괘 (외부 세계)
- 하괘 (내부 세계)

## 팔괘

여덟 가지 기본 구성 요소:

| 괘 | 이름 | 요소 | 속성 |
|---|------|------|------|
| ☰ | 건 | 하늘 | 창조 |
| ☷ | 곤 | 땅 | 수용 |
| ☳ | 진 | 천둥 | 움직임 |
| ☵ | 감 | 물 | 심연 |
| ☶ | 간 | 산 | 멈춤 |
| ☴ | 손 | 바람 | 부드러움 |
| ☲ | 이 | 불 | 붙음 |
| ☱ | 태 | 못 | 기쁨 |

## 주역에 묻는 법

### 전통적 방법

**시초 방법**
가장 전통적인 접근법으로 50개의 시초를 사용하며, 괘당 약 20분이 소요됩니다.

**삼전법 (동전 방법)**
세 개의 동전을 사용하는 간단한 방법:
1. 값 할당: 앞면 = 3, 뒷면 = 2
2. 세 동전을 함께 던지기
3. 값의 합:
   - 6 = 노음 (양으로 변함)
   - 7 = 소양 (안정)
   - 8 = 소음 (안정)
   - 9 = 노양 (음으로 변함)
4. 여섯 번 반복, 아래에서 위로 쌓기

### 현대적 방법
디지털 난수 생성기도 사용할 수 있습니다. 주역은 진심 어린 질문의 순간에 응답하기 때문입니다.

## 질문하기

질문의 질이 안내의 질에 영향을 미칩니다:

**좋은 질문:**
- "이 상황에서 무엇을 이해해야 하나요?"
- "이 도전에 가장 좋은 접근법은?"
- "여기서 작용하는 역학은?"

**피할 것:**
- 예/아니오 질문
- 본인 관여 없이 타인에 대한 질문
- 가볍게 묻는 사소한 문제

## 알아야 할 주요 괘

### 1괘 - 건(乾) 창조
여섯 양효. 순수한 창조력. 인내를 통한 성공. 하늘의 힘.

### 2괘 - 곤(坤) 수용
여섯 음효. 순수한 수용력. 순응을 통한 성공. 땅의 힘.

### 11괘 - 태(泰) 평화
하늘이 아래, 땅이 위. 반대의 조화. 번성의 시기.

### 12괘 - 비(否) 정체
땅이 아래, 하늘이 위. 정체. 물러나 기다리는 시기.

### 63괘 - 기제(旣濟) 완성 후
불 위에 물. 모든 것이 제자리. 질서를 신중히 유지.

### 64괘 - 미제(未濟) 완성 전
물 위에 불. 거의 다 왔음. 신중한 행동 필요.

## 점괘 해석하기

1. **괘사 읽기** - 주요 메시지
2. **상 고려하기** - 상황의 시각적 은유
3. **변효 확인** - 변하는 효에 대한 구체적 조언
4. **지괘 계산** - 상황이 향하는 곳
5. **괘 관계 성찰** - 내외적 역학

## 변효

노음(6) 또는 노양(9)을 받으면 이 효들은 "변하는" 것입니다:
- 상황에 대한 특정 메시지를 담음
- 반대로 변환됨
- 결과를 보여주는 두 번째 괘 생성

## 주역으로 살기

주역은 점술 이상—삶의 철학입니다:

- **변화를 받아들이세요** 자연스럽고 필연적인 것으로
- **균형을 이루세요** 모든 것에서 음양의
- **적절히 행동하세요** 각 순간에
- **덕을 기르세요** 의식적 선택을 통해
- **지혜를 찾으세요** 자연의 패턴에서

## 결론

주역은 삶의 불확실성을 헤쳐나가는 시대를 초월한 지혜를 제공합니다. 실용적 안내든 철학적 통찰이든, 이 고대 신탁은 당신이 있는 곳에서 만납니다.

신탁에 물을 준비가 되셨나요? AI 강화 주역 리딩으로 고대 지혜의 현대적 해석을 받아보세요.
    `,
  },
  {
    slug: "dream-interpretation-symbols-meanings",
    title: "Dream Interpretation: Common Symbols and Their Hidden Meanings",
    titleKo: "꿈 해몽: 일반적인 상징과 숨겨진 의미",
    excerpt: "Unlock the messages in your dreams by understanding universal dream symbols and their psychological significance.",
    excerptKo: "보편적인 꿈 상징과 심리적 의미를 이해하여 꿈 속 메시지를 해독하세요.",
    category: "Dream",
    categoryKo: "꿈해몽",
    icon: "💭",
    date: "2024-11-15",
    readTime: 8,
    content: `
## Why Do We Dream?

Dreams have fascinated humanity since the beginning of recorded history. From ancient oracles to modern psychology, dreams have been seen as windows to our unconscious mind, messages from the divine, or processing of daily experiences.

While science continues to explore the biological purpose of dreams, many find that understanding dream symbolism provides valuable insights into their inner world.

## How to Interpret Dreams

### Keep a Dream Journal
Write down your dreams immediately upon waking. Include:
- Main symbols and characters
- Emotions felt during the dream
- Colors, numbers, and locations
- Any words spoken

### Consider Personal Context
Universal symbols have general meanings, but your personal associations matter more. A dog might represent loyalty to one person and fear to another based on their experiences.

### Look for Patterns
Recurring dreams or symbols often point to unresolved issues or important messages your subconscious is trying to communicate.

## Common Dream Symbols

### Animals

**Dog**
- Loyalty, friendship, protection
- Your instinctual nature
- If aggressive: betrayal fears or anger issues

**Cat**
- Independence, feminine energy
- Intuition and mystery
- Hidden aspects of self

**Snake**
- Transformation, healing, rebirth
- Hidden fears or threats
- Kundalini energy, sexuality

**Bird**
- Freedom, perspective, spiritual messages
- Goals and aspirations
- The soul or spirit

### Nature

**Water**
- Emotions, the unconscious
- Clear water: emotional clarity
- Murky water: confusion, uncertainty
- Flooding: emotional overwhelm

**Fire**
- Transformation, passion, destruction
- Anger or creative energy
- Purification

**Trees**
- Growth, life stages, family
- Deep roots: connection to ancestors
- Bare tree: feeling exposed or depleted

**Mountains**
- Obstacles or achievements
- Spiritual journey
- Reaching for higher goals

### Places

**House**
- The self, different rooms = aspects of psyche
- Basement: unconscious, hidden aspects
- Attic: memories, higher consciousness
- New rooms: undiscovered potential

**School**
- Learning life lessons
- Feeling tested or judged
- Unfinished business

**Road/Path**
- Life direction
- Forks: decisions ahead
- Dead end: feeling stuck

### Actions

**Flying**
- Freedom, transcending limitations
- New perspective
- Spiritual growth

**Falling**
- Loss of control
- Anxiety about failure
- Letting go of something

**Being Chased**
- Avoiding an issue
- Running from fear
- Repressed emotions

**Teeth Falling Out**
- Fear of aging or loss
- Communication issues
- Feeling powerless

**Being Naked**
- Vulnerability, exposure
- Fear of judgment
- Authenticity

### People

**Strangers**
- Unknown aspects of self
- New opportunities
- Shadow self

**Authority Figures**
- Inner critic or guide
- Power dynamics
- Parental influences

**The Shadow**
- Repressed traits
- Hidden potential
- Aspects needing integration

## Numbers in Dreams

| Number | Meaning |
|--------|---------|
| 1 | Beginnings, self |
| 2 | Balance, partnership |
| 3 | Creativity, growth |
| 4 | Stability, foundation |
| 5 | Change, freedom |
| 6 | Harmony, responsibility |
| 7 | Spirituality, wisdom |
| 8 | Power, abundance |
| 9 | Completion, service |

## Colors in Dreams

- **White** - Purity, new beginnings
- **Black** - Unknown, unconscious
- **Red** - Passion, anger, vitality
- **Blue** - Calm, truth, spirituality
- **Green** - Growth, healing, envy
- **Yellow** - Intellect, caution, joy
- **Purple** - Intuition, royalty, mystery

## Types of Dreams

### Lucid Dreams
When you become aware you're dreaming and can sometimes control the dream. Great for exploration and problem-solving.

### Prophetic Dreams
Dreams that seem to predict future events. Often reflect intuitive insights about current situations.

### Recurring Dreams
Repeat until the message is understood or the issue is resolved.

### Nightmares
Intense emotional processing. May indicate:
- Unresolved trauma
- Current stress
- Physical discomfort
- Medication effects

## Working with Your Dreams

1. **Ask for dreams** before sleep with specific questions
2. **Create a bedtime ritual** to enhance dream recall
3. **Meditate on symbols** that appear repeatedly
4. **Draw or paint** vivid dream imagery
5. **Discuss dreams** with trusted friends or therapists

## Conclusion

Dreams are a rich source of self-knowledge. While interpretations can guide you, ultimately you are the best interpreter of your own dreams. Trust your intuition and let the symbols speak to you.

Want deeper insight into your dreams? Try our AI-powered Dream Interpretation for personalized analysis.
    `,
    contentKo: `
## 왜 꿈을 꾸는가?

꿈은 기록된 역사의 시작부터 인류를 매료시켜 왔습니다. 고대 신탁에서 현대 심리학까지, 꿈은 무의식의 창, 신성한 메시지, 또는 일상 경험의 처리로 여겨져 왔습니다.

과학이 꿈의 생물학적 목적을 계속 탐구하는 동안, 많은 이들이 꿈 상징을 이해하는 것이 내면 세계에 대한 가치 있는 통찰을 제공한다고 느낍니다.

## 꿈 해석하는 법

### 꿈 일기 쓰기
깨어나자마자 꿈을 적으세요. 포함할 것:
- 주요 상징과 인물
- 꿈에서 느낀 감정
- 색상, 숫자, 장소
- 말한 단어들

### 개인적 맥락 고려하기
보편적 상징에는 일반적 의미가 있지만, 개인적 연상이 더 중요합니다. 개는 한 사람에게는 충성을, 다른 사람에게는 경험에 따라 두려움을 나타낼 수 있습니다.

### 패턴 찾기
반복되는 꿈이나 상징은 종종 해결되지 않은 문제나 무의식이 전달하려는 중요한 메시지를 가리킵니다.

## 일반적인 꿈 상징

### 동물

**개**
- 충성, 우정, 보호
- 본능적 본성
- 공격적이면: 배신 두려움 또는 분노 문제

**고양이**
- 독립, 여성 에너지
- 직관과 신비
- 자아의 숨겨진 측면

**뱀**
- 변화, 치유, 재탄생
- 숨겨진 두려움이나 위협
- 쿤달리니 에너지, 성욕

**새**
- 자유, 관점, 영적 메시지
- 목표와 포부
- 영혼 또는 정신

### 자연

**물**
- 감정, 무의식
- 맑은 물: 감정적 명확성
- 탁한 물: 혼란, 불확실
- 홍수: 감정적 압도

**불**
- 변화, 열정, 파괴
- 분노 또는 창조적 에너지
- 정화

**나무**
- 성장, 인생 단계, 가족
- 깊은 뿌리: 조상과의 연결
- 앙상한 나무: 노출되거나 고갈된 느낌

**산**
- 장애물 또는 성취
- 영적 여정
- 더 높은 목표 도달

### 장소

**집**
- 자아, 다른 방 = 정신의 측면들
- 지하실: 무의식, 숨겨진 측면
- 다락: 기억, 높은 의식
- 새 방: 발견되지 않은 잠재력

**학교**
- 인생 교훈 배우기
- 시험받거나 평가받는 느낌
- 미완의 일

**길/경로**
- 인생 방향
- 갈림길: 앞으로의 결정
- 막다른 길: 막힌 느낌

### 행동

**날기**
- 자유, 한계 초월
- 새로운 관점
- 영적 성장

**떨어지기**
- 통제력 상실
- 실패에 대한 불안
- 무언가를 놓아주기

**쫓기기**
- 문제 회피
- 두려움에서 도망
- 억압된 감정

**이빨 빠지기**
- 노화나 상실 두려움
- 소통 문제
- 무력감

**벌거벗기**
- 취약함, 노출
- 판단에 대한 두려움
- 진정성

### 사람

**낯선 사람**
- 자아의 알려지지 않은 측면
- 새로운 기회
- 그림자 자아

**권위적 인물**
- 내면의 비평가 또는 안내자
- 권력 역학
- 부모 영향

**그림자**
- 억압된 특성
- 숨겨진 잠재력
- 통합이 필요한 측면

## 꿈의 숫자

| 숫자 | 의미 |
|------|------|
| 1 | 시작, 자아 |
| 2 | 균형, 파트너십 |
| 3 | 창의성, 성장 |
| 4 | 안정, 기초 |
| 5 | 변화, 자유 |
| 6 | 조화, 책임 |
| 7 | 영성, 지혜 |
| 8 | 권력, 풍요 |
| 9 | 완성, 봉사 |

## 꿈의 색상

- **흰색** - 순수, 새로운 시작
- **검은색** - 미지, 무의식
- **빨간색** - 열정, 분노, 활력
- **파란색** - 평온, 진실, 영성
- **초록색** - 성장, 치유, 질투
- **노란색** - 지성, 주의, 기쁨
- **보라색** - 직관, 왕족, 신비

## 꿈의 종류

### 자각몽
꿈을 꾸고 있다는 것을 인식하고 때때로 꿈을 통제할 수 있을 때. 탐구와 문제 해결에 좋습니다.

### 예지몽
미래 사건을 예측하는 것처럼 보이는 꿈. 종종 현재 상황에 대한 직관적 통찰을 반영합니다.

### 반복되는 꿈
메시지가 이해되거나 문제가 해결될 때까지 반복됩니다.

### 악몽
강렬한 감정 처리. 다음을 나타낼 수 있습니다:
- 해결되지 않은 트라우마
- 현재 스트레스
- 신체적 불편
- 약물 효과

## 꿈과 함께 일하기

1. 잠들기 전 특정 질문으로 **꿈을 요청하세요**
2. 꿈 기억력 향상을 위한 **취침 의식 만들기**
3. 반복적으로 나타나는 상징에 대해 **명상하기**
4. 생생한 꿈 이미지를 **그리거나 그리기**
5. 신뢰하는 친구나 치료사와 **꿈 이야기하기**

## 결론

꿈은 자기 지식의 풍부한 원천입니다. 해석이 안내할 수 있지만, 궁극적으로 당신이 자신의 꿈을 가장 잘 해석하는 사람입니다. 직관을 믿고 상징이 당신에게 말하게 하세요.

꿈에 대한 더 깊은 통찰을 원하시나요? AI 기반 꿈 해몽으로 맞춤형 분석을 받아보세요.
    `,
  },
  {
    slug: "compatibility-astrology-relationship-guide",
    title: "Relationship Compatibility: How Astrology Reveals Your Perfect Match",
    titleKo: "관계 궁합: 점성술로 완벽한 짝 찾기",
    excerpt: "Discover how zodiac signs interact in love, friendship, and partnership through astrological compatibility analysis.",
    excerptKo: "점성술 궁합 분석을 통해 황도대 별자리가 사랑, 우정, 파트너십에서 어떻게 상호작용하는지 알아보세요.",
    category: "Compatibility",
    categoryKo: "궁합",
    icon: "💕",
    date: "2024-11-10",
    readTime: 10,
    content: `
## Understanding Astrological Compatibility

Compatibility in astrology goes far beyond just comparing Sun signs. A thorough compatibility analysis considers multiple factors including Moon signs, Venus and Mars placements, and the aspects between two charts.

## The Elements: Foundation of Compatibility

The 12 zodiac signs are grouped into four elements, each with distinct energies:

### Fire Signs (Aries, Leo, Sagittarius)
- Passionate, enthusiastic, spontaneous
- Need excitement and adventure
- Best with: Fire and Air signs

### Earth Signs (Taurus, Virgo, Capricorn)
- Practical, stable, sensual
- Value security and reliability
- Best with: Earth and Water signs

### Air Signs (Gemini, Libra, Aquarius)
- Intellectual, communicative, social
- Need mental stimulation
- Best with: Air and Fire signs

### Water Signs (Cancer, Scorpio, Pisces)
- Emotional, intuitive, deep
- Seek emotional connection
- Best with: Water and Earth signs

## Element Compatibility Chart

| Combination | Compatibility | Dynamic |
|-------------|---------------|---------|
| Fire + Fire | High | Passionate but competitive |
| Fire + Air | High | Inspiring and stimulating |
| Fire + Earth | Medium | Challenging but grounding |
| Fire + Water | Low | Steam or evaporation |
| Earth + Earth | High | Stable but potentially stagnant |
| Earth + Water | High | Nurturing and secure |
| Air + Air | High | Mentally connected but flighty |
| Air + Water | Low | Different languages |
| Water + Water | High | Deep but can drown together |

## Sun Sign Compatibility Quick Guide

### Aries (Mar 21 - Apr 19)
- **Most Compatible**: Leo, Sagittarius, Gemini, Aquarius
- **Challenging**: Cancer, Capricorn
- **Love Style**: Direct, passionate, independent

### Taurus (Apr 20 - May 20)
- **Most Compatible**: Virgo, Capricorn, Cancer, Pisces
- **Challenging**: Leo, Aquarius
- **Love Style**: Sensual, loyal, possessive

### Gemini (May 21 - Jun 20)
- **Most Compatible**: Libra, Aquarius, Aries, Leo
- **Challenging**: Virgo, Pisces
- **Love Style**: Communicative, playful, curious

### Cancer (Jun 21 - Jul 22)
- **Most Compatible**: Scorpio, Pisces, Taurus, Virgo
- **Challenging**: Aries, Libra
- **Love Style**: Nurturing, emotional, protective

### Leo (Jul 23 - Aug 22)
- **Most Compatible**: Aries, Sagittarius, Gemini, Libra
- **Challenging**: Taurus, Scorpio
- **Love Style**: Generous, dramatic, devoted

### Virgo (Aug 23 - Sep 22)
- **Most Compatible**: Taurus, Capricorn, Cancer, Scorpio
- **Challenging**: Gemini, Sagittarius
- **Love Style**: Devoted, practical, perfectionist

### Libra (Sep 23 - Oct 22)
- **Most Compatible**: Gemini, Aquarius, Leo, Sagittarius
- **Challenging**: Cancer, Capricorn
- **Love Style**: Romantic, harmonious, indecisive

### Scorpio (Oct 23 - Nov 21)
- **Most Compatible**: Cancer, Pisces, Virgo, Capricorn
- **Challenging**: Leo, Aquarius
- **Love Style**: Intense, loyal, transformative

### Sagittarius (Nov 22 - Dec 21)
- **Most Compatible**: Aries, Leo, Libra, Aquarius
- **Challenging**: Virgo, Pisces
- **Love Style**: Adventurous, honest, freedom-loving

### Capricorn (Dec 22 - Jan 19)
- **Most Compatible**: Taurus, Virgo, Scorpio, Pisces
- **Challenging**: Aries, Libra
- **Love Style**: Committed, ambitious, traditional

### Aquarius (Jan 20 - Feb 18)
- **Most Compatible**: Gemini, Libra, Aries, Sagittarius
- **Challenging**: Taurus, Scorpio
- **Love Style**: Independent, unconventional, friendly

### Pisces (Feb 19 - Mar 20)
- **Most Compatible**: Cancer, Scorpio, Taurus, Capricorn
- **Challenging**: Gemini, Sagittarius
- **Love Style**: Romantic, intuitive, self-sacrificing

## Beyond Sun Signs: Deeper Compatibility

### Moon Sign Compatibility
Your Moon sign reveals emotional needs and instinctive responses. Compatible Moon signs create emotional understanding and comfort.

### Venus Sign Compatibility
Venus shows how you express love and what you value in relationships. Harmonious Venus placements create romantic flow.

### Mars Sign Compatibility
Mars indicates passion, sexuality, and how you assert yourself. Compatible Mars placements create physical chemistry.

### Synastry Aspects
The angles between planets in two charts reveal the dynamics of interaction:
- **Conjunctions**: Intensification
- **Trines**: Easy flow
- **Sextiles**: Opportunities
- **Squares**: Tension and growth
- **Oppositions**: Balance and awareness

## Types of Compatibility

### Romantic Compatibility
Look for harmonious Venus-Mars connections, compatible Moon signs for emotional bonding, and supportive Sun-Moon aspects.

### Friendship Compatibility
Mercury connections support communication, Jupiter aspects bring joy and growth, while Uranus connections add excitement.

### Business Partnership
Saturn aspects provide stability, Mercury ensures communication, and Mars-Jupiter connections drive success.

## Making Any Relationship Work

Even "incompatible" signs can thrive with:
- **Awareness** of each other's needs
- **Communication** about differences
- **Respect** for different approaches
- **Compromise** and flexibility
- **Growth mindset** embracing challenges

## Conclusion

Astrology provides a map for understanding relationship dynamics, but it's not destiny. Use compatibility insights as tools for understanding, not limitations. Every relationship requires effort, communication, and mutual respect.

Ready to explore your compatibility? Try our comprehensive Compatibility Analysis for detailed insights into your relationships.
    `,
    contentKo: `
## 점성술 궁합 이해하기

점성술에서 궁합은 단순히 태양 별자리 비교를 훨씬 넘어섭니다. 철저한 궁합 분석은 달 별자리, 금성과 화성 배치, 두 차트 간의 애스펙트를 포함한 여러 요소를 고려합니다.

## 원소: 궁합의 기초

12개의 황도대 별자리는 각각 고유한 에너지를 가진 네 가지 원소로 그룹화됩니다:

### 불 별자리 (양자리, 사자자리, 사수자리)
- 열정적, 열광적, 즉흥적
- 흥분과 모험 필요
- 최적: 불과 공기 별자리

### 땅 별자리 (황소자리, 처녀자리, 염소자리)
- 실용적, 안정적, 감각적
- 안전과 신뢰 중시
- 최적: 땅과 물 별자리

### 공기 별자리 (쌍둥이자리, 천칭자리, 물병자리)
- 지적, 소통적, 사교적
- 정신적 자극 필요
- 최적: 공기와 불 별자리

### 물 별자리 (게자리, 전갈자리, 물고기자리)
- 감정적, 직관적, 깊음
- 감정적 연결 추구
- 최적: 물과 땅 별자리

## 원소 궁합 차트

| 조합 | 궁합 | 역학 |
|------|------|------|
| 불 + 불 | 높음 | 열정적이지만 경쟁적 |
| 불 + 공기 | 높음 | 영감을 주고 자극적 |
| 불 + 땅 | 중간 | 도전적이지만 안정적 |
| 불 + 물 | 낮음 | 증기 또는 증발 |
| 땅 + 땅 | 높음 | 안정적이지만 정체 가능 |
| 땅 + 물 | 높음 | 양육적이고 안전함 |
| 공기 + 공기 | 높음 | 정신적 연결이지만 가벼움 |
| 공기 + 물 | 낮음 | 다른 언어 |
| 물 + 물 | 높음 | 깊지만 함께 빠질 수 있음 |

## 태양 별자리 궁합 빠른 가이드

### 양자리 (3/21 - 4/19)
- **가장 궁합**: 사자자리, 사수자리, 쌍둥이자리, 물병자리
- **도전적**: 게자리, 염소자리
- **사랑 스타일**: 직접적, 열정적, 독립적

### 황소자리 (4/20 - 5/20)
- **가장 궁합**: 처녀자리, 염소자리, 게자리, 물고기자리
- **도전적**: 사자자리, 물병자리
- **사랑 스타일**: 감각적, 충성적, 소유욕

### 쌍둥이자리 (5/21 - 6/20)
- **가장 궁합**: 천칭자리, 물병자리, 양자리, 사자자리
- **도전적**: 처녀자리, 물고기자리
- **사랑 스타일**: 소통적, 장난스러움, 호기심

### 게자리 (6/21 - 7/22)
- **가장 궁합**: 전갈자리, 물고기자리, 황소자리, 처녀자리
- **도전적**: 양자리, 천칭자리
- **사랑 스타일**: 양육적, 감정적, 보호적

### 사자자리 (7/23 - 8/22)
- **가장 궁합**: 양자리, 사수자리, 쌍둥이자리, 천칭자리
- **도전적**: 황소자리, 전갈자리
- **사랑 스타일**: 관대함, 드라마틱, 헌신적

### 처녀자리 (8/23 - 9/22)
- **가장 궁합**: 황소자리, 염소자리, 게자리, 전갈자리
- **도전적**: 쌍둥이자리, 사수자리
- **사랑 스타일**: 헌신적, 실용적, 완벽주의

### 천칭자리 (9/23 - 10/22)
- **가장 궁합**: 쌍둥이자리, 물병자리, 사자자리, 사수자리
- **도전적**: 게자리, 염소자리
- **사랑 스타일**: 로맨틱, 조화로움, 우유부단

### 전갈자리 (10/23 - 11/21)
- **가장 궁합**: 게자리, 물고기자리, 처녀자리, 염소자리
- **도전적**: 사자자리, 물병자리
- **사랑 스타일**: 강렬함, 충성, 변화

### 사수자리 (11/22 - 12/21)
- **가장 궁합**: 양자리, 사자자리, 천칭자리, 물병자리
- **도전적**: 처녀자리, 물고기자리
- **사랑 스타일**: 모험적, 정직, 자유 추구

### 염소자리 (12/22 - 1/19)
- **가장 궁합**: 황소자리, 처녀자리, 전갈자리, 물고기자리
- **도전적**: 양자리, 천칭자리
- **사랑 스타일**: 헌신적, 야망, 전통적

### 물병자리 (1/20 - 2/18)
- **가장 궁합**: 쌍둥이자리, 천칭자리, 양자리, 사수자리
- **도전적**: 황소자리, 전갈자리
- **사랑 스타일**: 독립적, 비전통적, 친근함

### 물고기자리 (2/19 - 3/20)
- **가장 궁합**: 게자리, 전갈자리, 황소자리, 염소자리
- **도전적**: 쌍둥이자리, 사수자리
- **사랑 스타일**: 로맨틱, 직관적, 희생적

## 태양 별자리를 넘어서: 더 깊은 궁합

### 달 별자리 궁합
달 별자리는 감정적 필요와 본능적 반응을 드러냅니다. 호환되는 달 별자리는 감정적 이해와 편안함을 만듭니다.

### 금성 별자리 궁합
금성은 사랑 표현 방식과 관계에서 가치있게 여기는 것을 보여줍니다. 조화로운 금성 배치는 로맨틱한 흐름을 만듭니다.

### 화성 별자리 궁합
화성은 열정, 성욕, 자기 주장 방식을 나타냅니다. 호환되는 화성 배치는 신체적 케미스트리를 만듭니다.

### 시내스트리 애스펙트
두 차트의 행성 간 각도는 상호작용 역학을 드러냅니다:
- **합**: 강화
- **트라인**: 쉬운 흐름
- **섹스타일**: 기회
- **스퀘어**: 긴장과 성장
- **충**: 균형과 인식

## 궁합의 종류

### 연애 궁합
조화로운 금성-화성 연결, 감정적 유대를 위한 호환 달 별자리, 지지하는 태양-달 애스펙트를 찾으세요.

### 우정 궁합
수성 연결은 소통을 지원하고, 목성 애스펙트는 기쁨과 성장을, 천왕성 연결은 흥분을 더합니다.

### 비즈니스 파트너십
토성 애스펙트는 안정을, 수성은 소통을, 화성-목성 연결은 성공을 이끕니다.

## 어떤 관계든 성공시키기

"맞지 않는" 별자리도 다음으로 번성할 수 있습니다:
- 서로의 필요에 대한 **인식**
- 차이점에 대한 **소통**
- 다른 접근법에 대한 **존중**
- **타협**과 유연성
- 도전을 수용하는 **성장 마인드셋**

## 결론

점성술은 관계 역학을 이해하는 지도를 제공하지만 운명은 아닙니다. 궁합 통찰을 제한이 아닌 이해를 위한 도구로 사용하세요. 모든 관계는 노력, 소통, 상호 존중이 필요합니다.

궁합을 탐구할 준비가 되셨나요? 종합 궁합 분석으로 관계에 대한 상세한 통찰을 받아보세요.
    `,
  },
];

export const categories = [
  { id: "all", name: "All", nameKo: "전체" },
  { id: "Saju", name: "Saju", nameKo: "사주" },
  { id: "Astrology", name: "Astrology", nameKo: "점성술" },
  { id: "Tarot", name: "Tarot", nameKo: "타로" },
  { id: "Numerology", name: "Numerology", nameKo: "수비학" },
  { id: "I Ching", name: "I Ching", nameKo: "주역" },
  { id: "Dream", name: "Dream", nameKo: "꿈해몽" },
  { id: "Compatibility", name: "Compatibility", nameKo: "궁합" },
];
